import "server-only";

import { ExecutionRepository } from "@aganitha/dproc-core";
import { readFile } from "fs/promises";

const executionRepo = new ExecutionRepository();

export async function getReportData(id: string) {
  try {
    // Get execution record from repository
    const execution = await executionRepo.getExecution(id);

    if (!execution) {
      return null;
    }

    // Verify output path exists
    if (!execution.outputPath) {
      throw new Error("No output path found for this execution");
    }

    // Read the MDX content
    const mdxContent = await readFile(execution.outputPath, "utf-8");

    return {
      execution,
      mdxContent,
    };
  } catch (error) {
    console.error("Failed to load report data:", error);
    return null;
  }
}
