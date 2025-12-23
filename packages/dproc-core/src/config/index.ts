import { readFile } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import type { SystemConfig, LLMConfig, PipelineSpec } from "../types/index.js";
import path from "path";
import { SecretsManager } from "./secrets.js";
import "dotenv/config";

// Import errors
import {
  PipelineSpecMissingError,
  InvalidPipelineError,
  APIKeyMissingError,
} from "../errors/index.js";

export class ConfigLoader {
  private secretsManager = new SecretsManager();

  constructor(private baseDir: string = process.cwd()) {}

  /**
   * Load system-wide configuration (dproc.config.yml)
   */
  async loadSystemConfig(): Promise<SystemConfig> {
    const configPath = path.join(this.baseDir, "dproc.config.yml");
    try {
      const content = await readFile(configPath, "utf-8");
      return parse(content) as SystemConfig;
    } catch (error) {
      // Return default config if file doesn't exist
      return {
        providers: {},
        activeProvider: "gemini",
        pipelinesDir: "./pipelines",
        redis: {
          host: "localhost",
          port: 6379,
        },
      };
    }
  }

  /**
   * Load pipeline spec.yml
   */
  async loadPipelineSpec(pipelinePath: string): Promise<PipelineSpec> {
    const specPath = path.join(pipelinePath, "spec.yml");
    try {
      const content = await readFile(specPath, "utf-8");
      const spec = parse(content) as PipelineSpec;

      // Basic validation
      if (!spec.pipeline?.name) {
        throw new InvalidPipelineError(path.basename(pipelinePath), [
          "Missing pipeline.name in spec.yml",
        ]);
      }

      return spec;
    } catch (error: any) {
      // Better error for missing file
      if (error.code === "ENOENT") {
        throw new PipelineSpecMissingError(
          path.basename(pipelinePath),
          specPath
        );
      }

      // Re-throw DProc errors
      if (error.name === "DProcError") {
        throw error;
      }

      // Wrap YAML parsing errors
      throw new InvalidPipelineError(path.basename(pipelinePath), [
        `Failed to parse spec.yml: ${error.message}`,
      ]);
    }
  }

  /**
   * Load pipeline config.yml
   */
  async loadPipelineConfig(pipelinePath: string): Promise<LLMConfig> {
    const configPath = path.join(pipelinePath, "config.yml");
    try {
      const content = await readFile(configPath, "utf-8");
      const config = parse(content) as LLMConfig;

      // Basic validation
      if (!config.llm?.provider) {
        throw new InvalidPipelineError(path.basename(pipelinePath), [
          "Missing llm.provider in config.yml",
        ]);
      }

      if (!config.llm?.model) {
        throw new InvalidPipelineError(path.basename(pipelinePath), [
          "Missing llm.model in config.yml",
        ]);
      }

      return config;
    } catch (error: any) {
      // Re-throw DProc errors
      if (error.name === "DProcError") {
        throw error;
      }

      // Wrap other errors
      throw new InvalidPipelineError(path.basename(pipelinePath), [
        `Failed to load config.yml: ${error.message}`,
      ]);
    }
  }

  /**
   * Get API key with priority: ENV > secrets.json
   */
  getApiKey(provider: "openai" | "anthropic" | "google"): string {
    const providerUpper = provider.toUpperCase();
    const envVarName = `${providerUpper}_API_KEY`;

    // Priority 1: Environment variable
    const envKey = process.env[envVarName];
    if (envKey && envKey.trim() !== "") {
      return envKey;
    }

    // Priority 2: Secrets file
    const secretsPath = this.secretsManager.getSecretsPath();
    try {
      if (!existsSync(secretsPath)) {
        throw new APIKeyMissingError(provider);
      }

      const secretsContent = readFileSync(secretsPath, "utf-8");
      const parsed = JSON.parse(secretsContent);
      if (parsed.apiKeys && parsed.apiKeys[provider]) {
        const key = parsed.apiKeys[provider];
        if (key && key.trim() !== "") {
          return key;
        }
      }
    } catch (error: any) {
      // If it's already a DProc error, re-throw
      if (error.name === "DProcError") {
        throw error;
      }
      // Otherwise fall through to missing key error
    }

    // Throw structured error instead of generic Error
    throw new APIKeyMissingError(provider);
  }
}

export { SecretsManager } from "./secrets.js";
export type { Secrets } from "./secrets.js";
export { WorkspaceManager } from "./workspace.js";
