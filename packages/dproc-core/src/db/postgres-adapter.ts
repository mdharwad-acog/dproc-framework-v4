import { Pool, PoolClient } from "pg";
import type { ExecutionRecord, PipelineStats } from "@aganitha/dproc-types";
import { DatabaseAdapter, ExecutionFilters } from "./adapter.js";

export class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString?: string) {
    this.pool = new Pool({
      connectionString: connectionString || process.env.DATABASE_URL,
    });
    this.init();
  }

  private async init() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS executions (
          id TEXT PRIMARY KEY,
          job_id TEXT NOT NULL UNIQUE,
          pipeline_name TEXT NOT NULL,
          user_id TEXT,
          inputs JSONB NOT NULL,
          output_format TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
          priority TEXT NOT NULL,
          output_path TEXT,
          bundle_path TEXT,
          processor_metadata JSONB,
          llm_metadata JSONB,
          execution_time INTEGER,
          tokens_used INTEGER,
          error TEXT,
          created_at BIGINT NOT NULL,
          started_at BIGINT,
          completed_at BIGINT
        );

        CREATE INDEX IF NOT EXISTS idx_job_id ON executions(job_id);
        CREATE INDEX IF NOT EXISTS idx_pipeline ON executions(pipeline_name);
        CREATE INDEX IF NOT EXISTS idx_status ON executions(status);
        CREATE INDEX IF NOT EXISTS idx_created ON executions(created_at DESC);
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS pipeline_stats (
          pipeline_name TEXT PRIMARY KEY,
          total_executions INTEGER DEFAULT 0,
          successful_executions INTEGER DEFAULT 0,
          failed_executions INTEGER DEFAULT 0,
          avg_execution_time REAL DEFAULT 0,
          total_tokens_used INTEGER DEFAULT 0,
          last_executed_at BIGINT,
          updated_at BIGINT
        );
      `);
    } finally {
      client.release();
    }
  }

  async insertExecution(record: ExecutionRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO executions (
        id, job_id, pipeline_name, user_id, inputs, output_format,
        status, priority, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        record.id,
        record.jobId,
        record.pipelineName,
        record.userId || null,
        JSON.stringify(record.inputs),
        record.outputFormat,
        record.status,
        record.priority,
        record.createdAt,
      ]
    );
  }

  async updateStatus(
    id: string,
    status: ExecutionRecord["status"],
    updates: Partial<ExecutionRecord> = {}
  ): Promise<void> {
    const fields = ["status = $1"];
    const values: any[] = [status];
    let paramCount = 2;

    if (updates.startedAt) {
      fields.push(`started_at = $${paramCount++}`);
      values.push(updates.startedAt);
    }
    if (updates.completedAt) {
      fields.push(`completed_at = $${paramCount++}`);
      values.push(updates.completedAt);
    }
    if (updates.executionTime !== undefined) {
      fields.push(`execution_time = $${paramCount++}`);
      values.push(updates.executionTime);
    }
    if (updates.tokensUsed !== undefined) {
      fields.push(`tokens_used = $${paramCount++}`);
      values.push(updates.tokensUsed);
    }
    if (updates.outputPath) {
      fields.push(`output_path = $${paramCount++}`);
      values.push(updates.outputPath);
    }
    if (updates.bundlePath) {
      fields.push(`bundle_path = $${paramCount++}`);
      values.push(updates.bundlePath);
    }
    if (updates.processorMetadata) {
      fields.push(`processor_metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.processorMetadata));
    }
    if (updates.llmMetadata) {
      fields.push(`llm_metadata = $${paramCount++}`);
      values.push(JSON.stringify(updates.llmMetadata));
    }
    if (updates.error) {
      fields.push(`error = $${paramCount++}`);
      values.push(updates.error);
    }

    values.push(id);

    await this.pool.query(
      `UPDATE executions SET ${fields.join(", ")} WHERE id = $${paramCount}`,
      values
    );
  }

  async getExecution(id: string): Promise<ExecutionRecord | null> {
    const result = await this.pool.query(
      "SELECT * FROM executions WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...row,
      jobId: row.job_id,
      pipelineName: row.pipeline_name,
      userId: row.user_id,
      inputs: row.inputs,
      outputFormat: row.output_format,
      outputPath: row.output_path,
      bundlePath: row.bundle_path,
      processorMetadata: row.processor_metadata,
      llmMetadata: row.llm_metadata,
      executionTime: row.execution_time,
      tokensUsed: row.tokens_used,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    };
  }

  async listExecutions(filters?: ExecutionFilters): Promise<ExecutionRecord[]> {
    let query = "SELECT * FROM executions WHERE 1=1";
    const values: any[] = [];
    let paramCount = 1;

    if (filters?.pipelineName) {
      query += ` AND pipeline_name = $${paramCount++}`;
      values.push(filters.pipelineName);
    }
    if (filters?.userId) {
      query += ` AND user_id = $${paramCount++}`;
      values.push(filters.userId);
    }
    if (filters?.status) {
      query += ` AND status = $${paramCount++}`;
      values.push(filters.status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
    values.push(filters?.limit ?? 50);

    const result = await this.pool.query(query, values);

    return result.rows.map((row) => ({
      ...row,
      jobId: row.job_id,
      pipelineName: row.pipeline_name,
      userId: row.user_id,
      outputFormat: row.output_format,
      outputPath: row.output_path,
      bundlePath: row.bundle_path,
      processorMetadata: row.processor_metadata,
      llmMetadata: row.llm_metadata,
      executionTime: row.execution_time,
      tokensUsed: row.tokens_used,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
    }));
  }

  async getPipelineStats(
    pipelineName?: string
  ): Promise<PipelineStats | PipelineStats[]> {
    if (pipelineName) {
      const result = await this.pool.query(
        "SELECT * FROM pipeline_stats WHERE pipeline_name = $1",
        [pipelineName]
      );
      return result.rows[0] as PipelineStats;
    } else {
      const result = await this.pool.query(
        "SELECT * FROM pipeline_stats ORDER BY total_executions DESC"
      );
      return result.rows as PipelineStats[];
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
