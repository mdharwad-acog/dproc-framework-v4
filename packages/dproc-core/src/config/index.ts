import { readFile } from "fs/promises";
import { readFileSync, existsSync } from "fs";
import { parse } from "yaml";
import type {
  SystemConfig,
  LLMConfig,
  PipelineSpec,
} from "@aganitha/dproc-types";
import path from "path";
import { SecretsManager } from "./secrets.js";
import "dotenv/config";

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
    const content = await readFile(specPath, "utf-8");
    return parse(content) as PipelineSpec;
  }

  /**
   * Load pipeline config.yml
   */
  async loadPipelineConfig(pipelinePath: string): Promise<LLMConfig> {
    const configPath = path.join(pipelinePath, "config.yml");
    const content = await readFile(configPath, "utf-8");
    return parse(content) as LLMConfig;
  }

  /**
   * Get API key with priority: ENV > secrets.json
   */
  getApiKey(provider: "openai" | "anthropic" | "google"): string {
    const providerUpper = provider.toUpperCase();
    const envVarName = `${providerUpper}_API_KEY`;

    // Priority 1: Environment variable
    const envKey = process.env[envVarName];
    if (envKey) {
      return envKey;
    }

    // Priority 2: Secrets file
    const secretsPath = this.secretsManager.getSecretsPath();

    try {
      if (!existsSync(secretsPath)) {
        throw new Error("Secrets file not found");
      }

      const secretsContent = readFileSync(secretsPath, "utf-8");
      const parsed = JSON.parse(secretsContent);

      if (parsed.apiKeys && parsed.apiKeys[provider]) {
        return parsed.apiKeys[provider];
      }
    } catch (error: any) {
      // Fall through to error message
    }

    throw new Error(
      `No API key found for ${provider}. Set ${envVarName} environment variable or run 'dproc configure'`
    );
  }
}

export { SecretsManager } from "./secrets.js";
export type { Secrets } from "./secrets.js";
export { WorkspaceManager } from "./workspace.js";
