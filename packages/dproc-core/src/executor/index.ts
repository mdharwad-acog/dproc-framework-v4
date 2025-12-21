import { Queue } from "bullmq";
import { pathToFileURL } from "url";
import { createDatabase } from "../db/factory.js";
import type { DatabaseAdapter } from "../db/adapter.js";
import { LLMProvider } from "../llm/provider.js";
import { TemplateRenderer } from "../template/renderer.js";
import { ConfigLoader } from "../config/index.js";
import { CacheManager } from "../cache/index.js";
import { WorkspaceManager } from "../config/workspace.js";
import * as fs from "fs/promises";
import * as path from "path";
import type {
  JobData,
  ProcessorContext,
  ProcessorResult,
  LLMEnrichmentResult,
  TemplateContext,
  PipelineSpec,
  LLMConfig,
} from "@aganitha/dproc-types";

export class ReportExecutor {
  private queue: Queue;
  private db: DatabaseAdapter;
  private llmProvider: LLMProvider;
  private templateRenderer: TemplateRenderer;
  private configLoader: ConfigLoader;
  private cacheStore: CacheManager;
  private workspace: WorkspaceManager;
  private activeJobs = new Map<string, AbortController>();

  constructor(
    private pipelinesDir: string,
    redisConfig: any
  ) {
    this.queue = new Queue("dproc-jobs", { connection: redisConfig });
    this.db = createDatabase();
    this.llmProvider = new LLMProvider();
    this.templateRenderer = new TemplateRenderer();
    this.configLoader = new ConfigLoader();
    this.cacheStore = new CacheManager();
    this.workspace = new WorkspaceManager();
  }

  /**
   * Cancel a running job
   */
  async cancelJob(executionId: string): Promise<boolean> {
    const controller = this.activeJobs.get(executionId);

    if (!controller) {
      console.log(`[${executionId}] Job not found or already completed`);
      return false;
    }

    console.log(`[${executionId}] Cancelling job...`);
    controller.abort();
    this.activeJobs.delete(executionId);

    await this.db.updateStatus(executionId, "cancelled", {
      completedAt: Date.now(),
      error: "Job cancelled by user",
    });

    return true;
  }

  /**
   * Add job to queue for async processing
   */
  async enqueueJob(jobData: JobData): Promise<string> {
    const job = await this.queue.add("process-pipeline", jobData, {
      priority:
        jobData.priority === "high" ? 1 : jobData.priority === "low" ? 10 : 5,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
    });

    await this.db.insertExecution({
      id: `exec-${Date.now()}`,
      jobId: job.id!,
      pipelineName: jobData.pipelineName,
      userId: jobData.userId,
      inputs: jobData.inputs,
      outputFormat: jobData.outputFormat,
      status: "queued",
      priority: jobData.priority,
      createdAt: Date.now(),
    });

    return job.id!;
  }

  /**
   * Main execution flow - called by worker
   */
  async execute(jobData: JobData): Promise<void> {
    const startTime = Date.now();

    const executions = await this.db.listExecutions({ limit: 1000 });
    const existingExecution = executions.find((e) => e.jobId === jobData.jobId);

    const executionId = existingExecution
      ? existingExecution.id
      : `exec-${Date.now()}-${jobData.jobId}`;

    // Create abort controller for cancellation support
    const abortController = new AbortController();
    this.activeJobs.set(executionId, abortController);

    const logger = {
      info: (msg: string) => console.log(`[${executionId}] INFO: ${msg}`),
      error: (msg: string) => console.error(`[${executionId}] ERROR: ${msg}`),
      debug: (msg: string) => console.log(`[${executionId}] DEBUG: ${msg}`),
      warn: (msg: string) => console.warn(`[${executionId}] WARN: ${msg}`),
    };

    try {
      // Check cancellation before starting
      if (abortController.signal.aborted) {
        throw new Error("Job cancelled before execution");
      }

      if (!existingExecution) {
        await this.db.insertExecution({
          id: executionId,
          jobId: jobData.jobId,
          pipelineName: jobData.pipelineName,
          userId: jobData.userId,
          inputs: jobData.inputs,
          outputFormat: jobData.outputFormat,
          status: "processing",
          priority: jobData.priority,
          createdAt: jobData.createdAt,
          startedAt: Date.now(),
        });
      } else {
        await this.db.updateStatus(executionId, "processing", {
          startedAt: Date.now(),
        });
      }

      // Use WorkspaceManager for pipeline path
      const pipelinePath = path.join(
        this.workspace.getPipelinesDir(),
        jobData.pipelineName
      );

      // ========================================================================
      // STEP 1: Load pipeline configuration
      // ========================================================================
      logger.info("Loading pipeline configuration...");
      const spec = await this.configLoader.loadPipelineSpec(pipelinePath);
      const config = await this.configLoader.loadPipelineConfig(pipelinePath);
      const vars = spec.variables ?? {};

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during configuration loading");
      }

      // ========================================================================
      // STEP 2: Execute data processor
      // ========================================================================
      logger.info("Executing data processor...");
      const processorResult = await this.executeProcessor(
        pipelinePath,
        jobData.inputs,
        executionId,
        abortController.signal
      );

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during processor execution");
      }

      const bundlePath = await this.saveBundle(
        pipelinePath,
        processorResult.attributes,
        executionId
      );
      logger.info(`Bundle saved: ${bundlePath}`);

      // ========================================================================
      // STEP 3: Load and render prompt templates
      // ========================================================================
      logger.info("Rendering prompts...");
      const prompts = await this.loadPrompts(pipelinePath);
      const renderedPrompts: Record<string, string> = {};

      for (const [name, template] of Object.entries(prompts)) {
        renderedPrompts[name] = this.templateRenderer.renderPrompt(template, {
          inputs: jobData.inputs,
          vars,
          data: processorResult.attributes,
        });
      }

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during prompt rendering");
      }

      // ========================================================================
      // STEP 4: LLM Enrichment with structured JSON extraction
      // ========================================================================
      logger.info("Calling LLM for enrichment...");
      const llmResult = await this.llmProvider.generate(config.llm, {
        prompt: renderedPrompts.main! || Object.values(renderedPrompts)[0]!,
        extractJson: true,
      });

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled after LLM call");
      }

      const llmEnrichment: LLMEnrichmentResult = {
        attributes: llmResult.json || {},
        rawOutput: llmResult.text,
        metadata: {
          tokensUsed: llmResult.usage?.totalTokens,
          model: llmResult.model,
          provider: llmResult.provider,
        },
      };

      logger.info(`LLM tokens used: ${llmResult.usage?.totalTokens}`);

      // ========================================================================
      // STEP 5: Build complete template context
      // ========================================================================
      const templateContext: TemplateContext = {
        inputs: jobData.inputs,
        vars,
        data: processorResult.attributes,
        llm: llmEnrichment.attributes,
        metadata: {
          executionTime: Date.now() - startTime,
          model: llmResult.model,
          timestamp: new Date().toISOString(),
          pipelineName: jobData.pipelineName,
          version: spec.pipeline.version,
          tokensUsed: llmResult.usage?.totalTokens,
        },
      };

      // ========================================================================
      // STEP 6: Render final template
      // ========================================================================
      logger.info("Rendering template...");
      const template = await this.loadTemplate(
        pipelinePath,
        jobData.outputFormat
      );
      const finalOutput = this.templateRenderer.render(
        template,
        templateContext
      );

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during template rendering");
      }

      // ========================================================================
      // STEP 7: Save output
      // ========================================================================
      const outputPath = await this.saveOutput(
        pipelinePath,
        finalOutput,
        jobData.outputFormat,
        executionId
      );
      logger.info(`Output saved: ${outputPath}`);

      // ========================================================================
      // STEP 8: Update database with success
      // ========================================================================
      await this.db.updateStatus(executionId, "completed", {
        completedAt: Date.now(),
        executionTime: Date.now() - startTime,
        outputPath,
        bundlePath,
        processorMetadata: processorResult.metadata,
        llmMetadata: llmEnrichment.metadata,
        tokensUsed: llmResult.usage?.totalTokens,
      });

      logger.info(`✓ Execution completed in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      if (error.message?.includes("cancelled")) {
        logger.warn(`Job cancelled: ${error.message}`);
        await this.db.updateStatus(executionId, "cancelled", {
          completedAt: Date.now(),
          executionTime: Date.now() - startTime,
          error: error.message,
        });
      } else {
        logger.error(`Execution failed: ${error.message}`);
        await this.db.updateStatus(executionId, "failed", {
          completedAt: Date.now(),
          executionTime: Date.now() - startTime,
          error: error.message,
        });
      }
      throw error;
    } finally {
      this.activeJobs.delete(executionId);
    }
  }

  /**
   * Execute processor.ts with abort signal support
   */
  private async executeProcessor(
    pipelinePath: string,
    inputs: Record<string, unknown>,
    executionId: string,
    signal: AbortSignal
  ): Promise<ProcessorResult> {
    const processorPath = path.join(pipelinePath, "processor.ts");

    if (signal.aborted) {
      throw new Error("Processor execution cancelled");
    }

    try {
      await fs.access(processorPath);
    } catch {
      throw new Error(`Processor not found: ${processorPath}`);
    }

    const context: ProcessorContext = {
      libs: {
        fetch,
        fs: await import("fs/promises"),
        path: await import("path"),
        csvParse: await import("csv-parse"),
        xml2js: await import("xml2js"),
        cheerio: await import("cheerio"),
        papaparse: await import("papaparse"),
        axios: await import("axios"),
      },
      readDataFile: async (filename: string) => {
        if (signal.aborted) throw new Error("Cancelled");

        const dataPath = path.join(pipelinePath, "data", filename);
        const content = await fs.readFile(dataPath, "utf-8");

        if (filename.endsWith(".json")) {
          return JSON.parse(content);
        } else if (filename.endsWith(".csv")) {
          const Papa = (await import("papaparse")).default;
          return Papa.parse(content, { header: true }).data;
        } else {
          return content;
        }
      },
      saveBundle: async (data: any, filename: string) => {
        if (signal.aborted) throw new Error("Cancelled");

        const bundlePath = path.join(
          pipelinePath,
          "output",
          "bundles",
          executionId,
          filename
        );
        await fs.mkdir(path.dirname(bundlePath), { recursive: true });
        await fs.writeFile(bundlePath, JSON.stringify(data, null, 2));
        return bundlePath;
      },
      cache: {
        get: async (key: string) => {
          return await this.cacheStore.get(`${pipelinePath}:${key}`);
        },
        set: async (key: string, value: any, ttl?: number) => {
          await this.cacheStore.set(`${pipelinePath}:${key}`, value, ttl);
        },
      },
      logger: {
        info: (msg: string) => console.log(`[${executionId}] INFO:`, msg),
        error: (msg: string) => console.error(`[${executionId}] ERROR:`, msg),
        debug: (msg: string) => console.debug(`[${executionId}] DEBUG:`, msg),
        warn: (msg: string) => console.warn(`[${executionId}] WARN:`, msg),
      },
    };

    // Use tsx to execute TypeScript files
    context.logger.debug(`Loading TypeScript processor: ${processorPath}`);

    try {
      // Dynamic import with tsx support via NODE_OPTIONS
      // tsx is already registered globally via NODE_OPTIONS="--import tsx/esm"
      const processorUrl = pathToFileURL(processorPath).href;
      const cacheBuster = Date.now();
      const processorModule = await import(processorUrl + "?t=" + cacheBuster);

      if (!processorModule.default) {
        throw new Error("Processor must export a default function");
      }

      const result = await processorModule.default(inputs, context);

      if (!result || typeof result !== "object") {
        throw new Error("Processor must return ProcessorResult object");
      }
      if (!result.attributes || typeof result.attributes !== "object") {
        throw new Error("Processor result must include 'attributes' object");
      }

      return result;
    } catch (error: any) {
      context.logger.error(`Failed to load processor: ${error.message}`);
      throw error;
    }
  }

  private async loadPrompts(
    pipelinePath: string
  ): Promise<Record<string, string>> {
    const promptsDir = path.join(pipelinePath, "prompts");

    try {
      const files = await fs.readdir(promptsDir);
      const prompts: Record<string, string> = {};

      for (const file of files) {
        if (file.endsWith(".md") || file.endsWith(".prompt.md")) {
          const name = file.replace(/\.prompt\.md$/, "").replace(/\.md$/, "");
          prompts[name] = await fs.readFile(
            path.join(promptsDir, file),
            "utf-8"
          );
        }
      }

      return prompts;
    } catch {
      throw new Error(`Prompts directory not found: ${promptsDir}`);
    }
  }

  private async loadTemplate(
    pipelinePath: string,
    format: string
  ): Promise<string> {
    const templatesDir = path.join(pipelinePath, "templates");

    const possibleNames = [
      `report.${format}.njk`,
      `${format}.njk`,
      `template.${format}.njk`,
    ];

    for (const name of possibleNames) {
      const templatePath = path.join(templatesDir, name);
      try {
        return await fs.readFile(templatePath, "utf-8");
      } catch {
        continue;
      }
    }

    throw new Error(`Template not found for format: ${format}`);
  }

  private async saveBundle(
    pipelinePath: string,
    data: any,
    executionId: string
  ): Promise<string> {
    const bundlePath = path.join(
      pipelinePath,
      "output",
      "bundles",
      `${executionId}.json`
    );
    await fs.mkdir(path.dirname(bundlePath), { recursive: true });
    await fs.writeFile(bundlePath, JSON.stringify(data, null, 2));
    return bundlePath;
  }

  private async saveOutput(
    pipelinePath: string,
    content: string,
    format: string,
    executionId: string
  ): Promise<string> {
    const outputPath = path.join(
      pipelinePath,
      "output",
      "reports",
      `${executionId}.${format}`
    );
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content);
    return outputPath;
  }
}
