#!/usr/bin/env node

import { Worker } from "bullmq";
import { ReportExecutor, DProcError } from "@aganitha/dproc-core"; // ✅ Import DProcError
import { WorkspaceManager } from "@aganitha/dproc-core";
import { SecretsManager } from "@aganitha/dproc-core";
import chalk from "chalk"; // ✅ Add chalk for colors
import "dotenv/config";

// Initialize workspace and secrets
const workspace = new WorkspaceManager();
const secrets = new SecretsManager();

// Load API keys from secrets.json and inject into process.env
let secretsData;
try {
  secretsData = await secrets.load();
} catch (error: any) {
  console.warn(chalk.yellow("⚠️  Could not load secrets.json:"), error.message);
  secretsData = { apiKeys: {}, lastUpdated: 0 };
}

// Inject secrets into process.env (only if not already set by env vars)
if (secretsData.apiKeys.google && !process.env.GOOGLE_API_KEY) {
  process.env.GOOGLE_API_KEY = secretsData.apiKeys.google;
}

if (secretsData.apiKeys.anthropic && !process.env.ANTHROPIC_API_KEY) {
  process.env.ANTHROPIC_API_KEY = secretsData.apiKeys.anthropic;
}

if (secretsData.apiKeys.openai && !process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = secretsData.apiKeys.openai;
}

// Check what API keys are available
const hasOpenAI = !!process.env.OPENAI_API_KEY;
const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
const hasGoogle = !!process.env.GOOGLE_API_KEY;

const missing = [];
if (!hasOpenAI) missing.push("OPENAI_API_KEY");
if (!hasAnthropic) missing.push("ANTHROPIC_API_KEY");
if (!hasGoogle) missing.push("GOOGLE_API_KEY");

if (missing.length > 0) {
  console.warn(
    chalk.yellow(`⚠️  Warning: Missing API keys: ${missing.join(", ")}`)
  );
  console.warn(
    chalk.gray("API keys can also be configured via 'dproc configure'\n")
  );
}

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

console.log(chalk.cyan("🚀 DProc Worker starting..."));
console.log(chalk.gray("📂 Workspace:"), workspace.getRoot());
console.log(chalk.gray("📂 Pipelines:"), workspace.getPipelinesDir());
console.log(chalk.gray("📊 Database:"), workspace.getDatabasePath());
console.log(chalk.gray("📡 Redis:"), `${redisConfig.host}:${redisConfig.port}`);

// Initialize executor
const executor = new ReportExecutor(workspace.getPipelinesDir(), redisConfig);

// Create BullMQ worker
const worker = new Worker(
  "dproc-jobs",
  async (job) => {
    console.log(
      chalk.blue(`\n[${new Date().toISOString()}] Processing job ${job.id}...`)
    );
    await executor.execute(job.data);
  },
  {
    connection: redisConfig,
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "2"),
    removeOnComplete: {
      count: 100,
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 500,
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  }
);

// ========================================================================
// ✅ ENHANCED EVENT HANDLERS WITH BETTER ERROR DISPLAY
// ========================================================================

worker.on("completed", (job) => {
  console.log(chalk.green(`✓ Job ${job.id} completed successfully`));
});

worker.on("failed", (job, err) => {
  console.error(chalk.red(`\n✗ Job ${job?.id} failed`));

  // ✅ Display structured error if available
  if (err instanceof DProcError) {
    console.error(chalk.white(err.userMessage));
    console.error(chalk.dim(`Error Code: ${err.code}`));

    if (err.fixes.length > 0) {
      console.error(chalk.yellow("\n💡 How to fix:"));
      err.fixes.forEach((fix, i) => {
        console.error(chalk.yellow(`  ${i + 1}. ${fix}`));
      });
    }
  } else {
    console.error(chalk.white(err.message));
  }
  console.error(); // Spacing
});

worker.on("error", (err) => {
  console.error(chalk.red("Worker error:"), err);
});

worker.on("stalled", (jobId) => {
  console.warn(chalk.yellow(`⚠️  Job ${jobId} stalled`));
});

worker.on("active", (job) => {
  console.log(chalk.blue(`▶ Job ${job.id} is now active`));
});

console.log(chalk.green("\n✓ DProc Worker ready!"));
console.log(
  chalk.gray(`  Concurrency: ${process.env.WORKER_CONCURRENCY || 2}`)
);
console.log(chalk.white("\n💻 Accepting jobs from:"));
console.log(chalk.gray("  - CLI: dproc execute <pipeline>"));
console.log(chalk.gray("  - Web UI: http://localhost:3000"));
console.log(chalk.white("\nWaiting for jobs...\n"));

// Graceful shutdown
const shutdown = async () => {
  console.log(chalk.yellow("\n🛑 Shutting down worker gracefully..."));
  try {
    await worker.close();
    console.log(chalk.green("✓ Worker closed successfully"));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red("Error during shutdown:"), error);
    process.exit(1);
  }
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
