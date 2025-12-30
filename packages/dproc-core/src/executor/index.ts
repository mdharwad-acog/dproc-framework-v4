import { Queue } from "bullmq";
import { pathToFileURL } from "url";
import { ExecutionRepository } from "../index.js";
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
} from "../types/index.js";

// Import error system and validation
import {
  DProcError,
  ProcessorMissingError,
  ProcessingError,
  TemplateMissingError,
  TemplateRenderError,
} from "../errors/index.js";
import { PipelineValidator } from "../validation/index.js";
import { MDXRenderer } from "../template/mdx-renderer.js";

export class ReportExecutor {
  private queue: Queue;
  private executionRepo: ExecutionRepository;
  private llmProvider: LLMProvider;
  private templateRenderer: TemplateRenderer;
  private mdxRenderer: MDXRenderer;
  private configLoader: ConfigLoader;
  private cacheStore: CacheManager;
  private workspace: WorkspaceManager;
  private activeJobs = new Map<string, AbortController>();
  private validator: PipelineValidator;

  constructor(
    private pipelinesDir: string,
    redisConfig: any
  ) {
    this.queue = new Queue("dproc-jobs", { connection: redisConfig });
    this.executionRepo = new ExecutionRepository();
    this.llmProvider = new LLMProvider();
    this.templateRenderer = new TemplateRenderer();
    this.mdxRenderer = new MDXRenderer();
    this.configLoader = new ConfigLoader();
    this.cacheStore = new CacheManager();
    this.workspace = new WorkspaceManager();
    this.validator = new PipelineValidator();
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

    await this.executionRepo.updateStatus(executionId, "cancelled", {
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

    await this.executionRepo.insertExecution({
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
    const executions = await this.executionRepo.listExecutions({ limit: 1000 });
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
        await this.executionRepo.insertExecution({
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
        await this.executionRepo.updateStatus(executionId, "processing", {
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
      // PRE-EXECUTION VALIDATION WITH NORMALIZATION
      // ========================================================================
      logger.info("Validating execution requirements...");
      const outputDir = path.join(pipelinePath, "output", "reports");
      const validationResult = await this.validator.validateBeforeExecution(
        jobData.pipelineName,
        spec,
        config,
        jobData.inputs,
        outputDir
      );

      // Throw if validation fails (structured errors)
      this.validator.throwIfInvalid(validationResult, jobData.pipelineName);

      // USE NORMALIZED INPUTS for the rest of execution
      if (validationResult.normalizedInputs) {
        jobData.inputs = validationResult.normalizedInputs;
      }

      logger.info("✓ Validation passed");

      // ========================================================================
      // STEP 2: Execute data processor
      // ========================================================================
      logger.info("Executing data processor...");
      let processorResult: ProcessorResult;
      try {
        processorResult = await this.executeProcessor(
          pipelinePath,
          jobData.inputs,
          executionId,
          abortController.signal
        );
      } catch (error: any) {
        if (error instanceof DProcError) {
          throw error;
        }

        throw new ProcessingError(
          jobData.pipelineName,
          "data-processor",
          error.message || "Processor execution failed",
          error instanceof Error ? error : undefined
        );
      }

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
      let prompts: Record<string, string>;
      try {
        prompts = await this.loadPrompts(pipelinePath);
      } catch (error: any) {
        throw new ProcessingError(
          jobData.pipelineName,
          "prompt-loading",
          "Failed to load prompt templates",
          error instanceof Error ? error : undefined
        );
      }

      const renderedPrompts: Record<string, string> = {};
      for (const [name, template] of Object.entries(prompts)) {
        try {
          renderedPrompts[name] = this.templateRenderer.renderPrompt(template, {
            inputs: jobData.inputs,
            vars,
            data: processorResult.attributes,
          });
        } catch (error: any) {
          throw new TemplateRenderError(
            name,
            error.message || "Failed to render prompt template",
            error instanceof Error ? error : undefined
          );
        }
      }

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during prompt rendering");
      }

      // ========================================================================
      // STEP 4: LLM Enrichment
      // ========================================================================
      logger.info("Calling LLM for enrichment...");
      let llmResult: any;
      try {
        llmResult = await this.llmProvider.generate(config.llm, {
          prompt: renderedPrompts.main! || Object.values(renderedPrompts)[0]!,
          extractJson: true,
        });
      } catch (error: any) {
        if (error instanceof DProcError) {
          throw error;
        }

        throw new ProcessingError(
          jobData.pipelineName,
          "llm-enrichment",
          error.message || "LLM generation failed",
          error instanceof Error ? error : undefined
        );
      }

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
      // STEP 5: Build template context
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
      // STEP 6: Render MDX template (ALWAYS - for web UI)
      // ========================================================================
      logger.info("Rendering MDX template for web UI...");

      let mdxTemplate: string;
      try {
        mdxTemplate = await this.loadTemplate(pipelinePath, "mdx");
      } catch (error: any) {
        throw new TemplateMissingError(
          jobData.pipelineName,
          "report.mdx.njk",
          path.join(pipelinePath, "templates")
        );
      }

      let mdxOutput: string;
      try {
        // ✅ Process Nunjucks FIRST, then save as MDX
        mdxOutput = this.templateRenderer.render(mdxTemplate, templateContext);
      } catch (error: any) {
        throw new TemplateRenderError(
          "report.mdx.njk",
          error.message || "Failed to render MDX template",
          error instanceof Error ? error : undefined
        );
      }

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during MDX rendering");
      }

      // ========================================================================
      // STEP 7: Save MDX output (always saved, for web viewing)
      // ========================================================================
      const mdxOutputPath = await this.saveOutput(
        pipelinePath,
        mdxOutput,
        "mdx",
        executionId
      );
      logger.info(`MDX output saved: ${mdxOutputPath}`);

      // ========================================================================
      // STEP 8: Render user's requested format (if different from MDX)
      // ========================================================================
      let userOutputPath: string | undefined = undefined;

      if (jobData.outputFormat !== "mdx") {
        logger.info(`User requested format: ${jobData.outputFormat}`);

        try {
          const userTemplate = await this.loadTemplate(
            pipelinePath,
            jobData.outputFormat
          );

          let userOutput: string;
          try {
            userOutput = this.templateRenderer.render(
              userTemplate,
              templateContext
            );
          } catch (error: any) {
            throw new TemplateRenderError(
              `${jobData.outputFormat}.njk`,
              error.message || "Failed to render output template",
              error instanceof Error ? error : undefined
            );
          }

          userOutputPath = await this.saveOutput(
            pipelinePath,
            userOutput,
            jobData.outputFormat,
            executionId
          );
          logger.info(`User output saved: ${userOutputPath}`);
        } catch (error: any) {
          // If template doesn't exist, userOutputPath stays undefined
          // This means we'll convert from MDX on-demand during download
          logger.warn(
            `No template for ${jobData.outputFormat}, will convert from MDX on download`
          );
        }
      }

      if (abortController.signal.aborted) {
        throw new Error("Job cancelled during template rendering");
      }

      // ========================================================================
      // STEP 9: Update storage with success
      // ========================================================================
      await this.executionRepo.updateStatus(executionId, "completed", {
        completedAt: Date.now(),
        executionTime: Date.now() - startTime,
        outputPath: mdxOutputPath, // ✅ Always MDX for web viewing
        userOutputPath: userOutputPath, // ✅ User's format if template exists
        bundlePath,
        processorMetadata: processorResult.metadata,
        llmMetadata: llmEnrichment.metadata,
        tokensUsed: llmResult.usage?.totalTokens,
      });

      logger.info(`✓ Execution completed in ${Date.now() - startTime}ms`);
    } catch (error: any) {
      // ========================================================================
      // STRUCTURED ERROR HANDLING
      // ========================================================================
      if (error.message?.includes("cancelled")) {
        logger.warn(`Job cancelled: ${error.message}`);
        await this.executionRepo.updateStatus(executionId, "cancelled", {
          completedAt: Date.now(),
          executionTime: Date.now() - startTime,
          error: error.message,
        });
      } else {
        const errorMessage =
          error instanceof DProcError ? error.userMessage : error.message;
        const errorCode =
          error instanceof DProcError ? error.code : "UNKNOWN_ERROR";

        logger.error(`Execution failed [${errorCode}]: ${errorMessage}`);

        if (error instanceof DProcError && error.fixes.length > 0) {
          logger.info("How to fix:");
          error.fixes.forEach((fix, i) => {
            logger.info(`  ${i + 1}. ${fix}`);
          });
        }

        await this.executionRepo.updateStatus(executionId, "failed", {
          completedAt: Date.now(),
          executionTime: Date.now() - startTime,
          error: errorMessage,
        });
      }

      throw error;
    } finally {
      this.activeJobs.delete(executionId);
    }
  }

  /**
   * Execute processor.ts
   */
  private async executeProcessor(
    pipelinePath: string,
    inputs: Record<string, any>,
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
      throw new ProcessorMissingError(
        path.basename(pipelinePath),
        processorPath
      );
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

    context.logger.debug(`Loading TypeScript processor: ${processorPath}`);

    try {
      // Server-only: Dynamic import with file URL
      const processorUrl = pathToFileURL(processorPath).href;
      const cacheBuster = Date.now();

      // Use Function constructor to prevent Next.js from analyzing this import
      // This is safe because we're only running on the server
      const dynamicImport = new Function("url", "return import(url)");

      const processorModule = await dynamicImport(
        `${processorUrl}?t=${cacheBuster}`
      );

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

    // ✅ For MDX, look for .mdx.njk files (Nunjucks preprocessing)
    const possibleNames =
      format === "mdx"
        ? [
            `report.mdx.njk`,
            `${format}.mdx.njk`,
            `template.mdx.njk`,
            `report.mdx`, // Fallback to plain MDX
            `${format}.mdx`,
          ]
        : [`report.${format}.njk`, `${format}.njk`, `template.${format}.njk`];

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
