import { Worker } from "bullmq";
import { ReportExecutor } from "../executor/index.js";
import type { JobData } from "@aganitha/dproc-types";

export class DProcWorker {
  private worker: Worker;
  private executor: ReportExecutor;

  constructor(pipelinesDir: string, redisConfig: any) {
    this.executor = new ReportExecutor(pipelinesDir, redisConfig);

    this.worker = new Worker(
      "dproc-jobs",
      async (job) => {
        console.log(`Processing job ${job.id}: ${job.data.pipelineName}`);
        await this.executor.execute(job.data as JobData);
        console.log(`Completed job ${job.id}`);
      },
      {
        connection: redisConfig,
        concurrency: 5, // Process 5 jobs concurrently
      }
    );

    this.worker.on("completed", (job) => {
      console.log(`✓ Job ${job.id} completed`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`✗ Job ${job?.id} failed:`, err.message);
    });

    this.worker.on("progress", (job, progress) => {
      console.log(`Job ${job.id} progress: ${progress}%`);
    });
  }

  async close() {
    await this.worker.close();
  }
}
