import { PipelineStats, ExecutionRecord } from "../types/index.js";
import { FileStorage } from "../storage/file-storage.js";

export class PipelineStatsRepository {
  private storage: FileStorage<PipelineStats>;

  constructor(dataDir?: string) {
    const dir = dataDir || process.env.DATA_DIR || "./data";
    this.storage = new FileStorage<PipelineStats>(
      "pipeline-stats.json",
      "pipelineName", // Primary key field for PipelineStats
      dir
    );
  }

  async updateStats(execution: ExecutionRecord): Promise<void> {
    const existing = await this.storage.getById(execution.pipelineName);
    const now = Date.now();

    const isSuccess = execution.status === "completed";
    const isFailed = execution.status === "failed";

    if (!existing) {
      // Create new stats entry
      const newStats: PipelineStats = {
        pipelineName: execution.pipelineName,
        totalExecutions: 1,
        successfulExecutions: isSuccess ? 1 : 0,
        failedExecutions: isFailed ? 1 : 0,
        avgExecutionTime: execution.executionTime ?? 0,
        totalTokensUsed: execution.tokensUsed ?? 0,
        lastExecutedAt: now,
        updatedAt: now,
      };
      await this.storage.create(newStats);
    } else {
      // Update existing stats
      const totalExecs = existing.totalExecutions + 1;
      const newAvgTime =
        (existing.avgExecutionTime * existing.totalExecutions +
          (execution.executionTime ?? 0)) /
        totalExecs;

      await this.storage.update(execution.pipelineName, {
        totalExecutions: totalExecs,
        successfulExecutions:
          existing.successfulExecutions + (isSuccess ? 1 : 0),
        failedExecutions: existing.failedExecutions + (isFailed ? 1 : 0),
        avgExecutionTime: newAvgTime,
        totalTokensUsed: existing.totalTokensUsed + (execution.tokensUsed ?? 0),
        lastExecutedAt: now,
        updatedAt: now,
      });
    }
  }

  async getPipelineStats(
    pipelineName?: string
  ): Promise<PipelineStats | PipelineStats[] | null> {
    if (pipelineName) {
      return this.storage.getById(pipelineName);
    } else {
      const allStats = await this.storage.getAll();
      return allStats.sort((a, b) => b.totalExecutions - a.totalExecutions);
    }
  }

  async close(): Promise<void> {
    // No-op for file storage
  }
}
