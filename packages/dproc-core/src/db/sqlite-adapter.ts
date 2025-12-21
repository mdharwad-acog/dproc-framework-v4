import Database from "better-sqlite3";
import type { ExecutionRecord, PipelineStats } from "@aganitha/dproc-types";
import { DatabaseAdapter, ExecutionFilters } from "./adapter.js";
import { WorkspaceManager } from "../config/workspace.js";

export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Use WorkspaceManager if no path provided
    const path = dbPath || new WorkspaceManager().getDatabasePath();
    this.db = new Database(path);
    this.init();
  }

  private init() {
    // Executions table - add 'cancelled' status support
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        jobId TEXT NOT NULL UNIQUE,
        pipelineName TEXT NOT NULL,
        userId TEXT,
        inputs TEXT NOT NULL,
        outputFormat TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
        priority TEXT NOT NULL,
        outputPath TEXT,
        bundlePath TEXT,
        processorMetadata TEXT,
        llmMetadata TEXT,
        executionTime INTEGER,
        tokensUsed INTEGER,
        error TEXT,
        createdAt INTEGER NOT NULL,
        startedAt INTEGER,
        completedAt INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_jobId ON executions(jobId);
      CREATE INDEX IF NOT EXISTS idx_pipeline ON executions(pipelineName);
      CREATE INDEX IF NOT EXISTS idx_status ON executions(status);
      CREATE INDEX IF NOT EXISTS idx_created ON executions(createdAt DESC);
    `);

    // Pipeline stats table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pipeline_stats (
        pipelineName TEXT PRIMARY KEY,
        totalExecutions INTEGER DEFAULT 0,
        successfulExecutions INTEGER DEFAULT 0,
        failedExecutions INTEGER DEFAULT 0,
        avgExecutionTime REAL DEFAULT 0,
        totalTokensUsed INTEGER DEFAULT 0,
        lastExecutedAt INTEGER,
        updatedAt INTEGER
      );
    `);
  }

  async insertExecution(record: ExecutionRecord): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO executions (
        id, jobId, pipelineName, userId, inputs, outputFormat,
        status, priority, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.jobId,
      record.pipelineName,
      record.userId ?? null,
      JSON.stringify(record.inputs),
      record.outputFormat,
      record.status,
      record.priority,
      record.createdAt
    );
  }

  async updateStatus(
    id: string,
    status: ExecutionRecord["status"],
    updates: Partial<ExecutionRecord> = {}
  ): Promise<void> {
    const fields: string[] = ["status = ?"];
    const values: any[] = [status];

    if (updates.startedAt) {
      fields.push("startedAt = ?");
      values.push(updates.startedAt);
    }
    if (updates.completedAt) {
      fields.push("completedAt = ?");
      values.push(updates.completedAt);
    }
    if (updates.executionTime !== undefined) {
      fields.push("executionTime = ?");
      values.push(updates.executionTime);
    }
    if (updates.tokensUsed !== undefined) {
      fields.push("tokensUsed = ?");
      values.push(updates.tokensUsed);
    }
    if (updates.outputPath) {
      fields.push("outputPath = ?");
      values.push(updates.outputPath);
    }
    if (updates.bundlePath) {
      fields.push("bundlePath = ?");
      values.push(updates.bundlePath);
    }
    if (updates.processorMetadata) {
      fields.push("processorMetadata = ?");
      values.push(JSON.stringify(updates.processorMetadata));
    }
    if (updates.llmMetadata) {
      fields.push("llmMetadata = ?");
      values.push(JSON.stringify(updates.llmMetadata));
    }
    if (updates.error) {
      fields.push("error = ?");
      values.push(updates.error);
    }

    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE executions
      SET ${fields.join(", ")}
      WHERE id = ?
    `);

    stmt.run(...values);

    // Update pipeline stats if completed, failed, or cancelled
    if (
      status === "completed" ||
      status === "failed" ||
      status === "cancelled"
    ) {
      this.updatePipelineStats(id);
    }
  }

  private updatePipelineStats(executionId: string): void {
    // Get execution details (use sync version)
    const execution = this.getExecutionSync(executionId);
    if (!execution) return;

    const stmt = this.db.prepare(`
      INSERT INTO pipeline_stats (
        pipelineName, totalExecutions, successfulExecutions, failedExecutions,
        avgExecutionTime, totalTokensUsed, lastExecutedAt, updatedAt
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pipelineName) DO UPDATE SET
        totalExecutions = totalExecutions + 1,
        successfulExecutions = successfulExecutions + ?,
        failedExecutions = failedExecutions + ?,
        avgExecutionTime = ((avgExecutionTime * totalExecutions) + ?) / (totalExecutions + 1),
        totalTokensUsed = totalTokensUsed + ?,
        lastExecutedAt = ?,
        updatedAt = ?
    `);

    const isSuccess = execution.status === "completed" ? 1 : 0;
    const isFailed = execution.status === "failed" ? 1 : 0;
    const now = Date.now();

    stmt.run(
      execution.pipelineName,
      isSuccess,
      isFailed,
      execution.executionTime ?? 0,
      execution.tokensUsed ?? 0,
      now,
      now,
      isSuccess,
      isFailed,
      execution.executionTime ?? 0,
      execution.tokensUsed ?? 0,
      now,
      now
    );
  }

  private getExecutionSync(id: string): ExecutionRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM executions WHERE id = ?
    `);

    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      ...row,
      inputs: JSON.parse(row.inputs),
      processorMetadata: row.processorMetadata
        ? JSON.parse(row.processorMetadata)
        : undefined,
      llmMetadata: row.llmMetadata ? JSON.parse(row.llmMetadata) : undefined,
    };
  }

  async getExecution(id: string): Promise<ExecutionRecord | null> {
    return this.getExecutionSync(id);
  }

  async listExecutions(filters?: ExecutionFilters): Promise<ExecutionRecord[]> {
    let query = `
      SELECT * FROM executions WHERE 1=1
    `;

    const params: any[] = [];

    if (filters?.pipelineName) {
      query += ` AND pipelineName = ?`;
      params.push(filters.pipelineName);
    }
    if (filters?.userId) {
      query += ` AND userId = ?`;
      params.push(filters.userId);
    }
    if (filters?.status) {
      query += ` AND status = ?`;
      params.push(filters.status);
    }

    query += ` ORDER BY createdAt DESC LIMIT ?`;
    params.push(filters?.limit ?? 50);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => ({
      ...row,
      inputs: JSON.parse(row.inputs),
      processorMetadata: row.processorMetadata
        ? JSON.parse(row.processorMetadata)
        : undefined,
      llmMetadata: row.llmMetadata ? JSON.parse(row.llmMetadata) : undefined,
    }));
  }

  async getPipelineStats(
    pipelineName?: string
  ): Promise<PipelineStats | PipelineStats[]> {
    if (pipelineName) {
      const stmt = this.db.prepare(`
        SELECT * FROM pipeline_stats WHERE pipelineName = ?
      `);
      return stmt.get(pipelineName) as PipelineStats;
    } else {
      const stmt = this.db.prepare(`
        SELECT * FROM pipeline_stats ORDER BY totalExecutions DESC
      `);
      return stmt.all() as PipelineStats[];
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
