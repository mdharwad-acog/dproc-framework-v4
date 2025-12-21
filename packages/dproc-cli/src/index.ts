#!/usr/bin/env node
import { Command } from "commander";
import {
  ReportExecutor,
  PipelineLoader,
  SecretsManager,
  WorkspaceManager,
} from "@aganitha/dproc-core";
import { createDatabase } from "@aganitha/dproc-core";
import path from "path";
import { mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import type { PipelineStats } from "@aganitha/dproc-core";
import chalk from "chalk";
import inquirer from "inquirer";

const program = new Command();

// Read package.json for version
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf-8")
);

// Initialize workspace manager
const workspace = new WorkspaceManager();

program
  .name("dproc")
  .description("DProc Framework - Build AI-powered report pipelines")
  .version(packageJson.version);

// ... (keep all the init and run commands as they are) ...
/**
 * Initialize a new pipeline
 */
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
      console.log(`🚀 Creating new pipeline: ${name}\n`);

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
      console.log("✓ Created spec.yml");

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
      console.log("✓ Created config.yml");

      // Create processor.ts
      const processor = `import type { ProcessorContext, ProcessorResult } from "@dproc/types";

/**
 * Data processor for ${name} pipeline
 */
export default async function processor(
  inputs: Record<string, any>,
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
      console.log("✓ Created processor.ts");

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
      console.log("✓ Created prompts/main.prompt.md");

      // Create HTML template
      const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ inputs.input1 }} - Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            line-height: 1.6;
            color: #333;
        }
        h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #1d4ed8; margin-top: 30px; }
        .metadata { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .summary { background: #eff6ff; padding: 20px; border-left: 4px solid #3b82f6; }
        ul { list-style: none; padding: 0; }
        li { padding: 8px 0; padding-left: 25px; position: relative; }
        li:before { content: "•"; position: absolute; left: 0; color: #3b82f6; font-weight: bold; }
    </style>
</head>
<body>
    <h1>{{ llm.summary }}</h1>

    <div class="metadata">
        <p><strong>Generated:</strong> {{ metadata.timestamp }}</p>
        <p><strong>Input:</strong> {{ inputs.input1 }}</p>
        <p><strong>Model:</strong> {{ metadata.model }}</p>
        <p><strong>Execution Time:</strong> {{ metadata.executionTime }}ms</p>
    </div>

    <div class="summary">
        <h2>Executive Summary</h2>
        <p>{{ llm.summary }}</p>
    </div>

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

    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280;">
        <p>Generated by DProc Framework v{{ metadata.version }}</p>
    </footer>
</body>
</html>
`;

      await writeFile(
        path.join(pipelinePath, "templates", "report.html.njk"),
        htmlTemplate
      );
      console.log("✓ Created templates/report.html.njk");

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
      console.log("✓ Created templates/report.md.njk");

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
      console.log("✓ Created README.md");

      console.log("\n✅ Pipeline created successfully!\n");
      console.log("📂 Location:", pipelinePath);
      console.log("\n📝 Next steps:");
      console.log(`  1. cd pipelines/${name}`);
      console.log("  2. Edit spec.yml to define your inputs");
      console.log("  3. Implement processor.ts for data processing");
      console.log("  4. Customize prompts and templates");
      console.log(`  5. Test: pnpm dproc validate ${name}`);
      console.log(`  6. Run: pnpm dproc run ${name}\n`);
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

/**
 * Run pipeline interactively
 */
program
  .command("run <pipeline>")
  .description("Run pipeline with interactive prompts")
  .option("-f, --format <format>", "Output format", "html")
  .action(async (pipelineName, options) => {
    try {
      const pipelinesDir = path.join(process.cwd(), "pipelines");
      const loader = new PipelineLoader(pipelinesDir);

      // Load spec to get input definitions
      const spec = await loader.loadSpec(pipelineName);

      console.log(`\n🚀 Running pipeline: ${spec.pipeline.name}`);
      console.log(`📝 ${spec.pipeline.description}\n`);

      // For now, use default values or ask user to provide JSON
      console.log("💡 Tip: Use --input flag to provide inputs as JSON");
      console.log(
        `Example: pnpm dproc execute ${pipelineName} --input '{"field":"value"}'\n`
      );

      // Build inputs with defaults
      const inputs: Record<string, any> = {};
      for (const input of spec.inputs) {
        inputs[input.name] = input.default || "";
      }

      console.log("Using default inputs:", JSON.stringify(inputs, null, 2));
      console.log("\n⏳ Enqueueing job...\n");

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

      console.log(`✅ Job enqueued: ${jobId}`);
      console.log(`\n📊 Monitor: pnpm dproc history ${pipelineName}`);
      console.log(`📁 Output: pipelines/${pipelineName}/output/reports/\n`);
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

/**
 * Execute a pipeline
 */
program
  .command("execute <pipeline>")
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
      console.log(`🚀 Executing pipeline: ${pipelineName}`);

      // Parse inputs
      const inputs = options.input ? JSON.parse(options.input) : {};

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

      console.log(`✓ Job enqueued: ${jobId}`);
      console.log(`\n📊 Monitor: dproc history`);
      console.log(`📁 Output: ${workspace.getOutputsDir()}/${pipelineName}/\n`);
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

/**
 * List available pipelines
 */
program
  .command("list")
  .description("List all available pipelines")
  .action(async () => {
    try {
      const pipelinesDir = workspace.getPipelinesDir();

      console.log("\n📂 Available Pipelines:\n");

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
        console.log("  No pipelines found.");
        console.log("\n💡 Create one with: dproc init my-pipeline\n");
        return;
      }

      for (const pipeline of pipelines) {
        if (pipeline.spec) {
          console.log(`  📦 ${pipeline.name}`);
          console.log(`     ${pipeline.spec.pipeline.description}`);
          console.log(`     v${pipeline.spec.pipeline.version}`);
        } else {
          console.log(`  📦 ${pipeline.name} (invalid configuration)`);
        }
        console.log();
      }

      console.log(`Total: ${pipelines.length} pipeline(s)\n`);
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

/**
 * Validate pipeline structure
 */
program
  .command("validate <pipeline>")
  .description("Validate pipeline configuration and structure")
  .action(async (pipelineName) => {
    try {
      console.log(`🔍 Validating pipeline: ${pipelineName}\n`);

      const pipelinesDir = workspace.getPipelinesDir();
      const loader = new PipelineLoader(pipelinesDir);

      const validation = await loader.validatePipeline(pipelineName);

      if (validation.valid) {
        console.log("✅ Pipeline structure is valid\n");

        // Show pipeline info
        const spec = await loader.loadSpec(pipelineName);
        console.log("📋 Pipeline Information:");
        console.log(`   Name: ${spec.pipeline.name}`);
        console.log(`   Version: ${spec.pipeline.version}`);
        console.log(`   Inputs: ${spec.inputs.length}`);
        console.log(`   Outputs: ${spec.outputs.join(", ")}`);
        console.log();
      } else {
        console.log("❌ Pipeline validation failed:\n");
        validation.errors.forEach((error) => {
          console.log(`   ✗ ${error}`);
        });
        console.log();
        process.exit(1);
      }
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

/**
 * Show pipeline statistics
 */
program
  .command("stats [pipeline]")
  .description("Show execution statistics")
  .action(async (pipelineName?: string) => {
    try {
      const db = createDatabase();

      if (pipelineName) {
        const stats = (await db.getPipelineStats(
          pipelineName
        )) as PipelineStats;
        if (!stats) {
          console.log(
            `\n📊 No statistics found for pipeline: ${pipelineName}\n`
          );
          await db.close();
          return;
        }

        console.log(`\n📊 Statistics for ${pipelineName}:\n`);
        console.log(`  Total Executions: ${stats.totalExecutions}`);
        console.log(`  Successful: ${stats.successfulExecutions}`);
        console.log(`  Failed: ${stats.failedExecutions}`);
        console.log(
          `  Success Rate: ${((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(1)}%`
        );
        console.log(
          `  Avg Execution Time: ${stats.avgExecutionTime.toFixed(2)}ms`
        );
        console.log(
          `  Total Tokens Used: ${stats.totalTokensUsed.toLocaleString()}`
        );
      } else {
        const allStats = (await db.getPipelineStats()) as PipelineStats[];

        console.log("\n📊 Global Statistics:\n");

        if (allStats.length === 0) {
          console.log("  No execution history found.\n");
          await db.close();
          return;
        }

        for (const stats of allStats) {
          console.log(`  📦 ${stats.pipelineName}:`);
          console.log(`     Executions: ${stats.totalExecutions}`);
          console.log(
            `     Success Rate: ${((stats.successfulExecutions / stats.totalExecutions) * 100).toFixed(1)}%`
          );
          console.log(`     Avg Time: ${stats.avgExecutionTime.toFixed(2)}ms`);
        }
      }

      console.log();
      await db.close();
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

/**
 * View execution history
 */
program
  .command("history [pipeline]")
  .description("View execution history")
  .option("-l, --limit <number>", "Number of records to show", "10")
  .action(async (pipelineName?: string, options?: { limit: string }) => {
    try {
      const db = createDatabase();

      const executions = await db.listExecutions({
        pipelineName,
        limit: parseInt(options?.limit || "10"),
      });

      if (executions.length === 0) {
        console.log("\n📜 No execution history found.\n");
        await db.close();
        return;
      }

      console.log("\n📜 Execution History:\n");

      for (const exec of executions) {
        const duration = exec.executionTime ? `${exec.executionTime}ms` : "N/A";
        const status =
          exec.status === "completed"
            ? "✅"
            : exec.status === "failed"
              ? "❌"
              : exec.status === "cancelled"
                ? "🚫"
                : "⏳";
        const date = new Date(exec.createdAt).toLocaleString();

        console.log(`  ${status} ${exec.id}`);
        console.log(`     Pipeline: ${exec.pipelineName}`);
        console.log(`     Status: ${exec.status}`);
        console.log(`     Duration: ${duration}`);
        console.log(`     Created: ${date}`);
        if (exec.outputPath) {
          console.log(`     Output: ${exec.outputPath}`);
        }
        if (exec.error) {
          console.log(`     Error: ${exec.error}`);
        }
        console.log();
      }

      await db.close();
    } catch (error: any) {
      console.error("✗ Error:", error.message);
      process.exit(1);
    }
  });

program
  .command("configure")
  .alias("config")
  .description("Configure API keys and settings")
  .action(async () => {
    const secretsManager = new SecretsManager();

    console.log(chalk.blue("\n🔐 DProc Configuration\n"));
    console.log(
      "API keys will be stored securely in:",
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
      console.log("Configured providers:", chalk.cyan(savedKeys.join(", ")));
    }
  });

program
  .command("worker")
  .description("Start background worker (use 'dproc-worker' instead)")
  .action(() => {
    console.log("\n💡 To start the worker, use:");
    console.log("  dproc-worker\n");
    console.log("This will process jobs from the queue in the background.\n");
  });

program.parse();
