import type { ExecutionRecord, PipelineStats } from "@aganitha/dproc-types";

export interface ExecutionFilters {
  pipelineName?: string;
  userId?: string;
  status?: string;
  limit?: number;
}

export interface DatabaseAdapter {
  /**
   * Insert a new execution record
   */
  insertExecution(record: ExecutionRecord): Promise<void>;

  /**
   * Update execution status with optional additional fields
   */
  updateStatus(
    id: string,
    status: ExecutionRecord["status"],
    updates?: Partial<ExecutionRecord>
  ): Promise<void>;

  /**
   * Get a single execution by ID
   */
  getExecution(id: string): Promise<ExecutionRecord | null>;

  /**
   * List executions with optional filters
   */
  listExecutions(filters?: ExecutionFilters): Promise<ExecutionRecord[]>;

  /**
   * Get pipeline statistics
   */
  getPipelineStats(
    pipelineName?: string
  ): Promise<PipelineStats | PipelineStats[]>;

  /**
   * Close database connection
   */
  close(): Promise<void>;
}
