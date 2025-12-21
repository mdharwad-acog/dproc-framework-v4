import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export class WorkspaceManager {
  private root: string;

  constructor() {
    // Priority: ENV var > /shared/dproc-workspace (production) > ./workspace (dev)
    this.root =
      process.env.DPROC_WORKSPACE ||
      (process.env.NODE_ENV === "production"
        ? "/shared/dproc-workspace"
        : join(process.cwd(), "workspace"));
  }

  async ensureWorkspace(): Promise<void> {
    const dirs = [
      this.root,
      this.getPipelinesDir(),
      this.getOutputsDir(),
      this.getTempDir(),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true, mode: 0o755 });
      }
    }
  }

  getRoot(): string {
    return this.root;
  }

  getPipelinesDir(): string {
    return join(this.root, "pipelines");
  }

  getDatabasePath(): string {
    return join(this.root, "dproc.db");
  }

  getOutputsDir(): string {
    return join(this.root, "outputs");
  }

  getTempDir(): string {
    return join(this.root, "temp");
  }

  getOutputPath(executionId: string, filename: string): string {
    return join(this.getOutputsDir(), executionId, filename);
  }
}
