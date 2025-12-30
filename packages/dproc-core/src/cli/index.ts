#!/usr/bin/env node

import { Command } from "commander";
import {
  ReportExecutor,
  PipelineLoader,
  SecretsManager,
  WorkspaceManager,
  DProcError,
  ExecutionRepository,
  PipelineStatsRepository,
} from "../index.js";
import type { PipelineStats } from "../types/index.js";
import path from "path";
import { mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import chalk from "chalk";
import inquirer from "inquirer";

const program = new Command();

// Read package.json for version
const packageJson = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf-8")
);

// Initialize workspace manager
const workspace = new WorkspaceManager();

// ========================================================================
// ✅ NEW: BEAUTIFUL ERROR HANDLER UTILITIES
// ========================================================================

/**
 * Display beautiful, user-friendly errors in the CLI
 */
function displayError(error: any): void {
  console.error("\n"); // Spacing

  if (error instanceof DProcError) {
    // ✅ Structured DProc error - beautiful display
    console.error(chalk.red.bold(`✗ ${error.name}`));
    console.error(chalk.white(error.userMessage));

    // Show error code
    console.error(chalk.dim(`\nError Code: ${error.code}`));

    // Show context if available
    if (error.context && Object.keys(error.context).length > 0) {
      console.error(chalk.dim("\nContext:"));
      Object.entries(error.context).forEach(([key, value]) => {
        console.error(chalk.dim(`  ${key}: ${value}`));
      });
    }

    // Show fix suggestions
    if (error.fixes.length > 0) {
      console.error(chalk.yellow("\n💡 How to fix:"));
      error.fixes.forEach((fix, i) => {
        console.error(chalk.yellow(`  ${i + 1}. ${fix}`));
      });
    }

    // Show technical details in debug mode
    if (process.env.DEBUG || process.env.DPROC_DEBUG) {
      console.error(chalk.dim("\nTechnical Details:"));
      console.error(chalk.dim(error.message));
      if (error.cause) {
        console.error(chalk.dim("\nCause:"));
        console.error(chalk.dim(error.cause));
      }
    }
  } else {
    // Generic error - simple display
    console.error(chalk.red.bold("✗ Error:"));
    console.error(chalk.white(error.message || String(error)));

    if (process.env.DEBUG || process.env.DPROC_DEBUG) {
      console.error(chalk.dim("\nStack:"));
      console.error(chalk.dim(error.stack));
    }
  }

  console.error("\n"); // Spacing
}

/**
 * Display helpful tip for debugging
 */
function showDebugTip(): void {
  if (!process.env.DEBUG && !process.env.DPROC_DEBUG) {
    console.error(chalk.dim("💡 Tip: Run with DEBUG=true for more details\n"));
  }
}

// ========================================================================
// PROGRAM SETUP
// ========================================================================

program
  .name("dproc")
  .description("DProc Framework - Build AI-powered report pipelines")
  .version(packageJson.version);

// ========================================================================
// COMMAND: init
// ========================================================================

program
  .command("init <name>")
  .description("Create a new pipeline with boilerplate structure")
  .option(
    "-d, --description <desc>",
    "Pipeline description",
    "My custom pipeline"
  )
  .option(
    "-t, --template <type>",
    "Template type (simple, api, file)",
    "simple"
  )
  .action(async (name, options) => {
    try {
      console.log(chalk.cyan(`🚀 Creating new pipeline: ${name}\n`));
      const pipelinePath = path.join(process.cwd(), "pipelines", name);

      // Create directory structure
      await mkdir(path.join(pipelinePath, "prompts"), { recursive: true });
      await mkdir(path.join(pipelinePath, "templates"), { recursive: true });
      await mkdir(path.join(pipelinePath, "data"), { recursive: true });
      await mkdir(path.join(pipelinePath, "output", "bundles"), {
        recursive: true,
      });
      await mkdir(path.join(pipelinePath, "output", "reports"), {
        recursive: true,
      });

      // Create spec.yml
      const spec = `pipeline:
  name: ${name}
  version: 1.0.0
  description: ${options.description}

inputs:
  - name: input1
    type: text
    label: Input Field
    required: true
    placeholder: Enter value...
  - name: maxResults
    type: number
    label: Maximum Results
    default: 50
    required: false

outputs:
  - md
  - html
  - pdf

variables:
  tone: professional
  detailLevel: comprehensive
`;
      await writeFile(path.join(pipelinePath, "spec.yml"), spec);
      console.log(chalk.green("✓ Created spec.yml"));

      // Create config.yml
      const config = `llm:
  provider: anthropic
  model: claude-sonnet-4-20250514
  temperature: 0.7
  maxTokens: 8192
  fallback:
    provider: openai
    model: gpt-4-turbo

execution:
  queuePriority: normal
  timeoutMinutes: 30
  retryAttempts: 3
`;
      await writeFile(path.join(pipelinePath, "config.yml"), config);
      console.log(chalk.green("✓ Created config.yml"));

      // Create processor.ts
      const processor = `import type { ProcessorContext, ProcessorResult } from "@aganitha/dproc-core";

/**
 * Data processor for ${name} pipeline
 */
export default async function processor(
  inputs: Record<string, unknown>,
  context: ProcessorContext
): Promise<ProcessorResult> {
  const startTime = Date.now();
  context.logger.info("Starting data processing...");

  // TODO: Implement your data fetching and processing logic here
  // Example:
  // const response = await context.libs.axios.default.get("https://api.example.com");
  // const data = response.data;

  const processedData = {
    // Your processed data attributes
    input: inputs.input1,
    timestamp: new Date().toISOString(),
    results: [],
  };

  context.logger.info("Processing complete");

  return {
    attributes: processedData,
    metadata: {
      source: "custom",
      recordCount: processedData.results.length,
      processingTime: Date.now() - startTime,
    },
  };
}
`;
      await writeFile(path.join(pipelinePath, "processor.ts"), processor);
      console.log(chalk.green("✓ Created processor.ts"));

      // Create prompt template
      const prompt = `# ${options.description}

## Input Data
User provided: {{ inputs.input1 }}

## Processed Data
{% if data.results %}
Results found: {{ data.results.length }}
{% else %}
No results available
{% endif %}

## Task
Generate a {{ vars.tone }} analysis based on the data above.

Return JSON format:
\`\`\`json
{
  "summary": "Executive summary here",
  "keyPoints": ["point1", "point2", "point3"],
  "analysis": "Detailed analysis here",
  "recommendations": ["rec1", "rec2"]
}
\`\`\`
`;
      await writeFile(
        path.join(pipelinePath, "prompts", "main.prompt.md"),
        prompt
      );
      console.log(chalk.green("✓ Created prompts/main.prompt.md"));

      // Create HTML template
      const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <title>{{ inputs.input1 }} - Report</title>
  <style>
    body { font-family: Arial; max-width: 800px; margin: 0 auto; padding: 20px; }
    .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; }
    .metadata { color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>{{ llm.summary }}</h1>
  
  <div class="metadata">
    <p>Generated: {{ metadata.timestamp }}</p>
    <p>Input: {{ inputs.input1 }}</p>
    <p>Model: {{ metadata.model }}</p>
    <p>Execution Time: {{ metadata.executionTime }}ms</p>
  </div>

  <h2>Executive Summary</h2>
  <div class="summary">{{ llm.summary }}</div>

  <h2>Key Points</h2>
  <ul>
  {% for point in llm.keyPoints %}
    <li>{{ point }}</li>
  {% endfor %}
  </ul>

  <h2>Analysis</h2>
  <p>{{ llm.analysis }}</p>

  <h2>Recommendations</h2>
  <ul>
  {% for rec in llm.recommendations %}
    <li>{{ rec }}</li>
  {% endfor %}
  </ul>
</body>
</html>
`;
      await writeFile(
        path.join(pipelinePath, "templates", "report.html.njk"),
        htmlTemplate
      );
      console.log(chalk.green("✓ Created templates/report.html.njk"));

      // Create Markdown template
      const mdTemplate = `# {{ llm.summary }}

**Generated:** {{ metadata.timestamp }}
**Input:** {{ inputs.input1 }}
**Model:** {{ metadata.model }}

---

## Executive Summary

{{ llm.summary }}

## Key Points

{% for point in llm.keyPoints %}
- {{ point }}
{% endfor %}

## Analysis

{{ llm.analysis }}

## Recommendations

{% for rec in llm.recommendations %}
- {{ rec }}
{% endfor %}

---

*Generated by DProc Framework v{{ metadata.version }}*
`;
      await writeFile(
        path.join(pipelinePath, "templates", "report.md.njk"),
        mdTemplate
      );
      console.log(chalk.green("✓ Created templates/report.md.njk"));

      // Create README
      const readme = `# ${name}

${options.description}

## Usage

\`\`\`bash
# Execute the pipeline
pnpm dproc execute ${name} \\
  --input '{"input1":"your value"}' \\
  --format html

# Or run directly
pnpm dproc run ${name}
\`\`\`

## Customization

1. Edit \`spec.yml\` to define your inputs and outputs
2. Implement \`processor.ts\` to fetch and process data
3. Customize \`prompts/main.prompt.md\` for LLM instructions
4. Modify templates in \`templates/\` for different output formats

## Testing

\`\`\`bash
# Validate pipeline structure
pnpm dproc validate ${name}

# Test with sample data
pnpm dproc test ${name}
\`\`\`
`;
      await writeFile(path.join(pipelinePath, "README.md"), readme);
      console.log(chalk.green("✓ Created README.md"));

      console.log(chalk.green.bold("\n✅ Pipeline created successfully!\n"));
      console.log(chalk.white("📂 Location:"), chalk.cyan(pipelinePath));
      console.log(chalk.white("\n📝 Next steps:"));
      console.log(chalk.gray(`  1. cd pipelines/${name}`));
      console.log(chalk.gray("  2. Edit spec.yml to define your inputs"));
      console.log(
        chalk.gray("  3. Implement processor.ts for data processing")
      );
      console.log(chalk.gray("  4. Customize prompts and templates"));
      console.log(chalk.gray(`  5. Test: pnpm dproc validate ${name}`));
      console.log(chalk.gray(`  6. Run: pnpm dproc run ${name}\n`));
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: run
// ========================================================================

program
  .command("run <pipelineName>")
  .description("Run pipeline with interactive prompts")
  .option("-f, --format <format>", "Output format", "html")
  .action(async (pipelineName, options) => {
    try {
      const pipelinesDir = path.join(process.cwd(), "pipelines");
      const loader = new PipelineLoader(pipelinesDir);

      // Load spec to get input definitions
      const spec = await loader.loadSpec(pipelineName);

      console.log(chalk.cyan(`\n🚀 Running pipeline: ${spec.pipeline.name}`));
      console.log(chalk.white(`📝 ${spec.pipeline.description}\n`));

      // For now, use default values or ask user to provide JSON
      console.log(
        chalk.yellow("💡 Tip: Use --input flag to provide inputs as JSON")
      );
      console.log(
        chalk.gray(
          `Example: pnpm dproc execute ${pipelineName} --input '{"field":"value"}'\n`
        )
      );

      // Build inputs with defaults
      const inputs: Record<string, unknown> = {};
      for (const input of spec.inputs) {
        inputs[input.name] = input.default || "";
      }

      console.log(
        chalk.white("Using default inputs:"),
        JSON.stringify(inputs, null, 2)
      );
      console.log(chalk.cyan("\n⏳ Enqueueing job...\n"));

      // Execute
      const executor = new ReportExecutor(pipelinesDir, {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
      });

      const jobId = await executor.enqueueJob({
        jobId: `job-${Date.now()}`,
        pipelineName,
        inputs,
        outputFormat: options.format,
        priority: "normal",
        createdAt: Date.now(),
      });

      console.log(chalk.green(`✅ Job enqueued: ${jobId}`));
      console.log(
        chalk.white(`\n📊 Monitor:`),
        chalk.cyan(`pnpm dproc history ${pipelineName}`)
      );
      console.log(
        chalk.white(`📁 Output:`),
        chalk.cyan(`pipelines/${pipelineName}/output/reports/\n`)
      );
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: execute
// ========================================================================

program
  .command("execute <pipelineName>")
  .description("Execute a pipeline and generate report")
  .option("-i, --input <json>", "Input parameters as JSON string")
  .option(
    "-f, --format <format>",
    "Output format (md, html, pdf, pptx)",
    "html"
  )
  .option(
    "-p, --priority <priority>",
    "Job priority (low, normal, high)",
    "normal"
  )
  .action(async (pipelineName, options) => {
    try {
      console.log(chalk.cyan(`🚀 Executing pipeline: ${pipelineName}`));

      // Parse inputs
      let inputs: Record<string, unknown> = {};
      if (options.input) {
        try {
          inputs = JSON.parse(options.input);
        } catch (e) {
          console.error(chalk.red("\n✗ Invalid JSON input"));
          console.error(chalk.white("Provided:"), chalk.gray(options.input));
          console.error(
            chalk.yellow('\n💡 Example: --input \'{"field":"value"}\'\n')
          );
          process.exit(1);
        }
      }

      // Create executor
      const executor = new ReportExecutor(workspace.getPipelinesDir(), {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD,
      });

      // Enqueue job
      const jobId = await executor.enqueueJob({
        jobId: `job-${Date.now()}`,
        pipelineName,
        inputs,
        outputFormat: options.format,
        priority: options.priority as "low" | "normal" | "high",
        createdAt: Date.now(),
      });

      console.log(chalk.green(`✓ Job enqueued: ${jobId}`));
      console.log(chalk.white(`\n📊 Monitor:`), chalk.cyan("dproc history"));
      console.log(
        chalk.white(`📁 Output:`),
        chalk.cyan(`${workspace.getOutputsDir()}/${pipelineName}/\n`)
      );
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: list
// ========================================================================

program
  .command("list")
  .description("List all available pipelines")
  .action(async () => {
    try {
      const pipelinesDir = workspace.getPipelinesDir();
      console.log(chalk.cyan("\n📂 Available Pipelines:\n"));

      const entries = await readdir(pipelinesDir);
      const pipelines = [];

      for (const entry of entries) {
        const entryPath = path.join(pipelinesDir, entry);
        const stats = await stat(entryPath);

        if (stats.isDirectory()) {
          try {
            const loader = new PipelineLoader(pipelinesDir);
            const spec = await loader.loadSpec(entry);
            pipelines.push({ name: entry, spec });
          } catch {
            pipelines.push({ name: entry, spec: null });
          }
        }
      }

      if (pipelines.length === 0) {
        console.log(chalk.gray("  No pipelines found."));
        console.log(
          chalk.yellow("\n💡 Create one with: dproc init my-pipeline\n")
        );
        return;
      }

      for (const pipeline of pipelines) {
        if (pipeline.spec) {
          console.log(chalk.white(`  📦 ${chalk.cyan(pipeline.name)}`));
          console.log(chalk.gray(`     ${pipeline.spec.pipeline.description}`));
          console.log(chalk.gray(`     v${pipeline.spec.pipeline.version}`));
        } else {
          console.log(
            chalk.white(`  📦 ${chalk.red(pipeline.name)}`),
            chalk.red("(invalid configuration)")
          );
        }
      }

      console.log(chalk.white(`\nTotal: ${pipelines.length} pipeline(s)\n`));
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: validate
// ========================================================================

program
  .command("validate <pipelineName>")
  .description("Validate pipeline configuration and structure")
  .action(async (pipelineName) => {
    try {
      console.log(chalk.cyan(`🔍 Validating pipeline: ${pipelineName}\n`));

      const pipelinesDir = workspace.getPipelinesDir();
      const loader = new PipelineLoader(pipelinesDir);

      const validation = await loader.validatePipeline(pipelineName);

      if (validation.valid) {
        console.log(chalk.green("✅ Pipeline structure is valid\n"));

        // Show pipeline info
        const spec = await loader.loadSpec(pipelineName);
        console.log(chalk.white("📋 Pipeline Information:"));
        console.log(chalk.gray(`  Name: ${spec.pipeline.name}`));
        console.log(chalk.gray(`  Version: ${spec.pipeline.version}`));
        console.log(chalk.gray(`  Inputs: ${spec.inputs.length}`));
        console.log(chalk.gray(`  Outputs: ${spec.outputs.join(", ")}`));
        console.log();
      } else {
        console.log(chalk.red("❌ Pipeline validation failed:\n"));
        validation.errors.forEach((error) => {
          console.log(chalk.red(`  ✗ ${error}`));
        });
        console.log();
        process.exit(1);
      }
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: stats
// ========================================================================

program
  .command("stats [pipeline]")
  .description("Show execution statistics")
  .action(async (pipelineName?: string) => {
    try {
      const executionRepo = new ExecutionRepository();
      const statsRepo = new PipelineStatsRepository();

      if (pipelineName) {
        const stats = (await statsRepo.getPipelineStats(
          pipelineName
        )) as PipelineStats;

        if (!stats) {
          console.log(
            chalk.yellow(
              `\n📊 No statistics found for pipeline: ${pipelineName}\n`
            )
          );
          await executionRepo.close();
          return;
        }

        console.log(chalk.cyan(`\n📊 Statistics for ${pipelineName}:\n`));
        console.log(
          chalk.white(`  Total Executions: ${stats.totalExecutions}`)
        );
        console.log(chalk.green(`  Successful: ${stats.successfulExecutions}`));
        console.log(chalk.red(`  Failed: ${stats.failedExecutions}`));
        console.log(
          chalk.white(
            `  Success Rate: ${((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(1)}%`
          )
        );
        console.log(
          chalk.white(
            `  Avg Execution Time: ${stats.avgExecutionTime.toFixed(2)}ms`
          )
        );
        console.log(
          chalk.white(
            `  Total Tokens Used: ${stats.totalTokensUsed.toLocaleString()}`
          )
        );
        console.log();
      } else {
        const allStats =
          (await statsRepo.getPipelineStats()) as PipelineStats[];
        console.log(chalk.cyan("\n📊 Global Statistics:\n"));

        if (allStats.length === 0) {
          console.log(chalk.gray("  No execution history found.\n"));
          await executionRepo.close();
          return;
        }

        for (const stats of allStats) {
          console.log(chalk.white(`  📦 ${chalk.cyan(stats.pipelineName)}:`));
          console.log(chalk.gray(`     Executions: ${stats.totalExecutions}`));
          console.log(
            chalk.gray(
              `     Success Rate: ${((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(1)}%`
            )
          );
          console.log(
            chalk.gray(`     Avg Time: ${stats.avgExecutionTime.toFixed(2)}ms`)
          );
        }

        console.log();
      }
      await executionRepo.close();
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: history
// ========================================================================

program
  .command("history [pipeline]")
  .description("View execution history")
  .option("-l, --limit <number>", "Number of records to show", "10")
  .action(async (pipelineName?: string, options?: { limit: string }) => {
    try {
      const executionRepo = new ExecutionRepository();
      const statsRepo = new PipelineStatsRepository();

      const executions = await executionRepo.listExecutions({
        pipelineName,
        limit: parseInt(options?.limit || "10"),
      });

      if (executions.length === 0) {
        console.log(chalk.yellow("\n📜 No execution history found.\n"));
        await executionRepo.close();
        return;
      }

      console.log(chalk.cyan("\n📜 Execution History:\n"));

      for (const exec of executions) {
        const duration = exec.executionTime ? `${exec.executionTime}ms` : "N/A";
        const status =
          exec.status === "completed"
            ? chalk.green("✅")
            : exec.status === "failed"
              ? chalk.red("❌")
              : exec.status === "cancelled"
                ? chalk.yellow("🚫")
                : chalk.blue("⏳");

        const date = new Date(exec.createdAt).toLocaleString();

        console.log(`  ${status} ${chalk.white(exec.id)}`);
        console.log(chalk.gray(`     Pipeline: ${exec.pipelineName}`));
        console.log(chalk.gray(`     Status: ${exec.status}`));
        console.log(chalk.gray(`     Duration: ${duration}`));
        console.log(chalk.gray(`     Created: ${date}`));

        if (exec.outputPath) {
          console.log(chalk.gray(`     Output: ${exec.outputPath}`));
        }

        if (exec.error) {
          console.log(chalk.red(`     Error: ${exec.error}`));
        }

        console.log();
      }

      await executionRepo.close();
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: configure
// ========================================================================

program
  .command("configure")
  .alias("config")
  .description("Configure API keys and settings")
  .action(async () => {
    try {
      const secretsManager = new SecretsManager();

      console.log(chalk.blue("\n🔐 DProc Configuration\n"));
      console.log(
        chalk.white("API keys will be stored securely in:"),
        chalk.gray(secretsManager.getSecretsPath())
      );
      console.log(chalk.dim("Leave blank to skip a provider\n"));

      const answers = await inquirer.prompt([
        {
          type: "password",
          name: "openai",
          message: "OpenAI API Key:",
          mask: "*",
        },
        {
          type: "password",
          name: "anthropic",
          message: "Anthropic API Key:",
          mask: "*",
        },
        {
          type: "password",
          name: "google",
          message: "Google API Key:",
          mask: "*",
        },
      ]);

      // Save non-empty keys
      const secrets = await secretsManager.load();

      if (answers.openai?.trim()) {
        secrets.apiKeys.openai = answers.openai.trim();
      }

      if (answers.anthropic?.trim()) {
        secrets.apiKeys.anthropic = answers.anthropic.trim();
      }

      if (answers.google?.trim()) {
        secrets.apiKeys.google = answers.google.trim();
      }

      await secretsManager.save(secrets);

      console.log(chalk.green("\n✓ Configuration saved successfully!\n"));

      const savedKeys = Object.keys(secrets.apiKeys).filter(
        (k) => secrets.apiKeys[k as keyof typeof secrets.apiKeys]
      );

      if (savedKeys.length > 0) {
        console.log(
          chalk.white("Configured providers:"),
          chalk.cyan(savedKeys.join(", "))
        );
        console.log();
      }
    } catch (error: any) {
      displayError(error);
      showDebugTip();
      process.exit(1);
    }
  });

// ========================================================================
// COMMAND: worker
// ========================================================================

program
  .command("worker")
  .description("Start background worker (use 'dproc-worker' instead)")
  .action(() => {
    console.log(chalk.yellow("\n💡 To start the worker, use:"));
    console.log(chalk.cyan("   dproc-worker\n"));
    console.log(
      chalk.gray("This will process jobs from the queue in the background.\n")
    );
  });

// ========================================================================
// PARSE COMMANDS
// ========================================================================

program.parse();
