import { readdir, readFile, access, constants } from "fs/promises";
import path from "path";
import { parse } from "yaml";
import type { PipelineSpec, LLMConfig } from "@aganitha/dproc-types";

export class PipelineLoader {
  constructor(private pipelinesDir: string) {}

  /**
   * List all available pipelines
   */
  async listPipelines(): Promise<string[]> {
    try {
      const entries = await readdir(this.pipelinesDir, { withFileTypes: true });
      return entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
    } catch (error) {
      return [];
    }
  }

  /**
   * Check if pipeline exists
   */
  async pipelineExists(name: string): Promise<boolean> {
    const pipelinePath = path.join(this.pipelinesDir, name);
    try {
      await access(pipelinePath, constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get pipeline path
   */
  getPipelinePath(name: string): string {
    return path.join(this.pipelinesDir, name);
  }

  /**
   * Load pipeline spec.yml
   */
  async loadSpec(pipelineName: string): Promise<PipelineSpec> {
    const specPath = path.join(this.pipelinesDir, pipelineName, "spec.yml");
    const content = await readFile(specPath, "utf-8");
    return parse(content) as PipelineSpec;
  }

  /**
   * Load pipeline config.yml
   */
  async loadConfig(pipelineName: string): Promise<LLMConfig> {
    const configPath = path.join(this.pipelinesDir, pipelineName, "config.yml");
    const content = await readFile(configPath, "utf-8");
    return parse(content) as LLMConfig;
  }

  /**
   * Validate pipeline structure
   */
  async validatePipeline(pipelineName: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const pipelinePath = this.getPipelinePath(pipelineName);

    // Check required files
    const requiredFiles = ["spec.yml", "config.yml", "processor.ts"];

    const requiredDirs = ["prompts", "templates"];

    for (const file of requiredFiles) {
      const filePath = path.join(pipelinePath, file);
      try {
        await access(filePath, constants.F_OK);
      } catch {
        errors.push(`Missing required file: ${file}`);
      }
    }

    for (const dir of requiredDirs) {
      const dirPath = path.join(pipelinePath, dir);
      try {
        await access(dirPath, constants.F_OK);
      } catch {
        errors.push(`Missing required directory: ${dir}`);
      }
    }

    // Validate spec.yml structure
    try {
      const spec = await this.loadSpec(pipelineName);
      if (!spec.pipeline?.name) {
        errors.push("spec.yml: missing pipeline.name");
      }
      if (!spec.pipeline?.version) {
        errors.push("spec.yml: missing pipeline.version");
      }
      if (!spec.inputs || spec.inputs.length === 0) {
        errors.push("spec.yml: missing or empty inputs array");
      }
      if (!spec.outputs || spec.outputs.length === 0) {
        errors.push("spec.yml: missing or empty outputs array");
      }
    } catch (error: any) {
      errors.push(`spec.yml: ${error.message}`);
    }

    // Validate config.yml structure
    try {
      const config = await this.loadConfig(pipelineName);
      if (!config.llm?.provider) {
        errors.push("config.yml: missing llm.provider");
      }
      if (!config.llm?.model) {
        errors.push("config.yml: missing llm.model");
      }
    } catch (error: any) {
      errors.push(`config.yml: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
