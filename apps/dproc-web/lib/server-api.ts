import "server-only";
import { createDatabase } from "@aganitha/dproc-core/dist/db/factory.js";
import type { DatabaseAdapter } from "@aganitha/dproc-core/dist/db/adapter.js";
import { PipelineLoader } from "@aganitha/dproc-core/dist/pipeline/loader.js";
import { WorkspaceManager } from "@aganitha/dproc-core/dist/config/workspace.js";
import type {
  JobData,
  ExecutionRecord,
  PipelineStats,
} from "@aganitha/dproc-types";
import path from "path";
import { Queue } from "bullmq";

// Singleton instances
let db: DatabaseAdapter | null = null;
let loader: PipelineLoader | null = null;
let jobQueue: Queue | null = null;
let workspace: WorkspaceManager | null = null;

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD,
};

function getWorkspace() {
  if (!workspace) {
    workspace = new WorkspaceManager();
  }
  return workspace;
}

function getDB() {
  if (!db) {
    db = createDatabase();
  }
  return db;
}

function getLoader() {
  if (!loader) {
    const ws = getWorkspace();
    loader = new PipelineLoader(ws.getPipelinesDir());
  }
  return loader;
}

function getJobQueue() {
  if (!jobQueue) {
    jobQueue = new Queue("dproc-jobs", {
      connection: redisConfig,
    });
  }
  return jobQueue;
}

// Pipeline Management
export async function listPipelines() {
  const pipelineLoader = getLoader();
  const pipelines = await pipelineLoader.listPipelines();

  const pipelineDetails = await Promise.all(
    pipelines.map(async (name) => {
      try {
        const spec = await pipelineLoader.loadSpec(name);
        const validation = await pipelineLoader.validatePipeline(name);
        return {
          name,
          spec,
          valid: validation.valid,
          errors: validation.errors,
        };
      } catch (error) {
        return {
          name,
          spec: null,
          valid: false,
          errors: [(error as Error).message],
        };
      }
    })
  );

  return pipelineDetails;
}

export async function getPipelineDetails(name: string) {
  const pipelineLoader = getLoader();
  const spec = await pipelineLoader.loadSpec(name);
  const config = await pipelineLoader.loadConfig(name);
  const validation = await pipelineLoader.validatePipeline(name);
  return { spec, config, validation };
}

// Job Execution
export async function executeJob(
  jobData: Omit<JobData, "jobId" | "createdAt">
) {
  const queue = getJobQueue();
  const database = getDB();

  const fullJobData: JobData = {
    ...jobData,
    jobId: `web-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
  };

  const executionId = `exec-${Date.now()}-${fullJobData.jobId}`;
  await database.insertExecution({
    id: executionId,
    jobId: fullJobData.jobId,
    pipelineName: fullJobData.pipelineName,
    userId: fullJobData.userId,
    inputs: fullJobData.inputs,
    outputFormat: fullJobData.outputFormat,
    status: "queued",
    priority: fullJobData.priority,
    createdAt: fullJobData.createdAt,
  });

  await queue.add(fullJobData.pipelineName, fullJobData, {
    priority:
      fullJobData.priority === "high"
        ? 1
        : fullJobData.priority === "low"
          ? 3
          : 2,
    jobId: fullJobData.jobId,
  });

  return {
    success: true,
    executionId,
    jobId: fullJobData.jobId,
  };
}

// Job Cancellation - NEW!
export async function cancelJob(executionId: string) {
  // This will be implemented when we add the executor instance
  // For now, just update the database
  const database = getDB();
  await database.updateStatus(executionId, "cancelled", {
    completedAt: Date.now(),
    error: "Job cancelled by user",
  });

  return { success: true };
}

// Query operations
export async function getExecutionHistory(filters?: {
  pipelineName?: string;
  limit?: number;
  status?: string;
}) {
  const database = getDB();
  return database.listExecutions(filters);
}

export async function getExecutionDetails(id: string) {
  const database = getDB();
  return database.getExecution(id);
}

export async function getPipelineStats(pipelineName?: string) {
  const database = getDB();
  return database.getPipelineStats(pipelineName);
}

export async function getGlobalStats() {
  const database = getDB();
  const stats = (await database.getPipelineStats()) as PipelineStats[];

  if (!stats || stats.length === 0) {
    return {
      totalExecutions: 0,
      successRate: 0,
      totalFailed: 0,
      avgExecutionTime: 0,
      totalTokensUsed: 0,
      pipelineCount: 0,
    };
  }

  const totalExecutions = stats.reduce((sum, s) => sum + s.totalExecutions, 0);
  const totalSuccess = stats.reduce(
    (sum, s) => sum + s.successfulExecutions,
    0
  );
  const totalFailed = stats.reduce((sum, s) => sum + s.failedExecutions, 0);
  const avgTime =
    stats.reduce((sum, s) => sum + s.avgExecutionTime, 0) / stats.length;
  const totalTokens = stats.reduce((sum, s) => sum + s.totalTokensUsed, 0);

  return {
    totalExecutions,
    successRate:
      totalExecutions > 0 ? (totalSuccess / totalExecutions) * 100 : 0,
    totalFailed,
    avgExecutionTime: avgTime,
    totalTokensUsed: totalTokens,
    pipelineCount: stats.length,
  };
}

export async function getJobStatus(executionId: string) {
  const database = getDB();
  const execution = await database.getExecution(executionId);

  if (!execution) {
    return null;
  }

  return {
    id: execution.id,
    status: execution.status,
    progress:
      execution.status === "completed"
        ? 100
        : execution.status === "processing"
          ? 50
          : execution.status === "cancelled"
            ? 0
            : 0,
    outputPath: execution.outputPath,
    error: execution.error,
    metadata: {
      executionTime: execution.executionTime,
      tokensUsed: execution.tokensUsed,
      createdAt: execution.createdAt,
      completedAt: execution.completedAt,
    },
  };
}
