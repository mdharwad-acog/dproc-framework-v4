import { readdir, readFile, access, constants } from "fs/promises";
import path from "path";
import { parse } from "yaml";
import type { PipelineSpec, LLMConfig } from "@aganitha/dproc-types";

// ✅ NEW: Import errors
import {
  PipelineNotFoundError,
  PipelineSpecMissingError,
  ProcessorMissingError,
  InvalidPipelineError,
} from "../errors/index.js";

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
   * ✅ NOW WITH VALIDATION
   */
  async getPipelinePath(name: string): Promise<string> {
    const pipelinePath = path.join(this.pipelinesDir, name);

    try {
      await access(pipelinePath, constants.F_OK);
      return pipelinePath;
    } catch {
      // ✅ NEW: Throw structured error
      throw new PipelineNotFoundError(name);
    }
  }

  /**
   * Load pipeline spec.yml
   * ✅ NOW WITH STRUCTURED ERRORS
   */
  async loadSpec(pipelineName: string): Promise<PipelineSpec> {
    const pipelinePath = path.join(this.pipelinesDir, pipelineName);
    const specPath = path.join(pipelinePath, "spec.yml");

    try {
      await access(specPath, constants.F_OK);
    } catch {
      throw new PipelineSpecMissingError(pipelineName, specPath);
    }

    try {
      const content = await readFile(specPath, "utf-8");
      const spec = parse(content) as PipelineSpec;

      // Basic validation
      if (!spec.pipeline?.name) {
        throw new InvalidPipelineError(pipelineName, [
          "Missing pipeline.name in spec.yml",
        ]);
      }

      return spec;
    } catch (error: any) {
      if (error.name === "DProcError") {
        throw error;
      }

      throw new InvalidPipelineError(pipelineName, [
        `Failed to parse spec.yml: ${error.message}`,
      ]);
    }
  }

  /**
   * Load pipeline config.yml
   * ✅ NOW WITH STRUCTURED ERRORS
   */
  async loadConfig(pipelineName: string): Promise<LLMConfig> {
    const pipelinePath = path.join(this.pipelinesDir, pipelineName);
    const configPath = path.join(pipelinePath, "config.yml");

    try {
      const content = await readFile(configPath, "utf-8");
      const config = parse(content) as LLMConfig;

      // Basic validation
      if (!config.llm?.provider) {
        throw new InvalidPipelineError(pipelineName, [
          "Missing llm.provider in config.yml",
        ]);
      }

      if (!config.llm?.model) {
        throw new InvalidPipelineError(pipelineName, [
          "Missing llm.model in config.yml",
        ]);
      }

      return config;
    } catch (error: any) {
      if (error.name === "DProcError") {
        throw error;
      }

      throw new InvalidPipelineError(pipelineName, [
        `Failed to load config.yml: ${error.message}`,
      ]);
    }
  }

  /**
   * Validate pipeline structure
   * ✅ NOW RETURNS STRUCTURED VALIDATION RESULT
   */
  async validatePipeline(pipelineName: string): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    const pipelinePath = path.join(this.pipelinesDir, pipelineName);

    // Check if pipeline directory exists
    try {
      await access(pipelinePath, constants.F_OK);
    } catch {
      throw new PipelineNotFoundError(pipelineName);
    }

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
      if (error.name === "DProcError") {
        errors.push(`spec.yml: ${error.userMessage}`);
      } else {
        errors.push(`spec.yml: ${error.message}`);
      }
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
      if (error.name === "DProcError") {
        errors.push(`config.yml: ${error.userMessage}`);
      } else {
        errors.push(`config.yml: ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
