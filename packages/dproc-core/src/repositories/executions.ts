import { ExecutionRecord } from "../types/index.js";
import { FileStorage } from "../storage/file-storage.js";

export interface ExecutionFilters {
  pipelineName?: string;
  userId?: string;
  status?: ExecutionRecord["status"];
  limit?: number;
}

export class ExecutionRepository {
  private storage: FileStorage<ExecutionRecord>;

  constructor(dataDir?: string) {
    const dir = dataDir || process.env.DATA_DIR || "./data";
    this.storage = new FileStorage<ExecutionRecord>(
      "executions.json",
      "id", // Primary key field
      dir
    );
  }

  async insertExecution(record: ExecutionRecord): Promise<void> {
    await this.storage.create(record);
  }

  async updateStatus(
    id: string,
    status: ExecutionRecord["status"],
    updates: Partial<ExecutionRecord> = {}
  ): Promise<void> {
    await this.storage.update(id, { status, ...updates });
  }

  async getExecution(id: string): Promise<ExecutionRecord | null> {
    return this.storage.getById(id);
  }

  async listExecutions(filters?: ExecutionFilters): Promise<ExecutionRecord[]> {
    let items = await this.storage.getAll();

    // Apply filters
    if (filters?.pipelineName) {
      items = items.filter(
        (item) => item.pipelineName === filters.pipelineName
      );
    }
    if (filters?.userId) {
      items = items.filter((item) => item.userId === filters.userId);
    }
    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }

    // Sort by createdAt descending
    items.sort((a, b) => b.createdAt - a.createdAt);

    // Apply limit
    const limit = filters?.limit ?? 50;
    return items.slice(0, limit);
  }

  async close(): Promise<void> {
    // No-op for file storage
  }
}
