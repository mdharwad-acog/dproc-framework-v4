import { readFile, writeFile, mkdir, chmod } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

export interface Secrets {
  apiKeys: {
    openai?: string;
    anthropic?: string;
    google?: string;
  };
  lastUpdated: number;
}

export class SecretsManager {
  private secretsPath = join(homedir(), ".dproc", "secrets.json");
  private secretsDir = join(homedir(), ".dproc");

  async ensureSecretsDir(): Promise<void> {
    if (!existsSync(this.secretsDir)) {
      await mkdir(this.secretsDir, { recursive: true, mode: 0o700 });
    }
  }

  async load(): Promise<Secrets> {
    try {
      const content = await readFile(this.secretsPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return { apiKeys: {}, lastUpdated: 0 };
    }
  }

  async save(secrets: Secrets): Promise<void> {
    await this.ensureSecretsDir();
    secrets.lastUpdated = Date.now();
    await writeFile(
      this.secretsPath,
      JSON.stringify(secrets, null, 2),
      "utf-8"
    );
    // await chmod(this.secretsPath, 0o600); // User-only readable
  }

  async getApiKey(
    provider: "openai" | "anthropic" | "google"
  ): Promise<string | undefined> {
    const secrets = await this.load();
    return secrets.apiKeys[provider];
  }

  async setApiKey(
    provider: "openai" | "anthropic" | "google",
    apiKey: string
  ): Promise<void> {
    const secrets = await this.load();
    secrets.apiKeys[provider] = apiKey;
    await this.save(secrets);
  }

  async hasAnyKeys(): Promise<boolean> {
    const secrets = await this.load();
    return Object.keys(secrets.apiKeys).length > 0;
  }

  getSecretsPath(): string {
    return this.secretsPath;
  }
}
