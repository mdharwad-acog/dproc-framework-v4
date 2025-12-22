import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LLMConfig } from "@aganitha/dproc-types";
import { ConfigLoader } from "../config/index.js";

// ✅ NEW: Import structured errors
import {
  APIKeyMissingError,
  APIKeyInvalidError,
  RateLimitError,
  APITimeoutError,
  APIResponseError,
  DProcError,
} from "../errors/index.js";

export interface GenerateOptions {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  extractJson?: boolean;
}

export interface GenerateResult {
  text: string;
  json?: Record<string, unknown>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export class LLMProvider {
  private configLoader: ConfigLoader;

  constructor() {
    this.configLoader = new ConfigLoader();
  }

  /**
   * Generate text with LLM, with automatic fallback on failure
   */
  async generate(
    config: LLMConfig["llm"],
    options: GenerateOptions
  ): Promise<GenerateResult> {
    try {
      return await this.generateWithProvider(
        config.provider,
        config.model,
        options,
        config.temperature,
        config.maxTokens
      );
    } catch (error: any) {
      // Try fallback provider if configured
      if (config.fallback) {
        console.warn(
          `Primary provider ${config.provider} failed: ${error.message}. Trying fallback ${config.fallback.provider}...`
        );

        try {
          return await this.generateWithProvider(
            config.fallback.provider,
            config.fallback.model,
            options
          );
        } catch (fallbackError: any) {
          // If fallback also fails, throw the original error
          console.error(
            `Fallback provider also failed: ${fallbackError.message}`
          );
          throw error;
        }
      }

      throw error;
    }
  }

  /**
   * Generate with specific provider
   */
  private async generateWithProvider(
    provider: "openai" | "anthropic" | "google",
    model: string,
    options: GenerateOptions,
    temperature?: number,
    maxTokens?: number
  ): Promise<GenerateResult> {
    // ✅ NEW: Validate API key exists
    const apiKey = this.configLoader.getApiKey(provider);
    if (!apiKey || apiKey.trim() === "") {
      throw new APIKeyMissingError(provider);
    }

    let providerInstance: any;

    // Create provider instance
    try {
      switch (provider) {
        case "openai":
          providerInstance = createOpenAI({ apiKey })(model);
          break;
        case "anthropic":
          providerInstance = createAnthropic({ apiKey })(model);
          break;
        case "google":
          providerInstance = createGoogleGenerativeAI({ apiKey })(model);
          break;
      }
    } catch (error: any) {
      // ✅ NEW: Catch provider initialization errors
      throw new APIKeyInvalidError(provider);
    }

    // ✅ NEW: Add timeout support
    const timeoutMs = 120000; // 2 minutes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Generate with abort signal
      const result = await Promise.race([
        generateText({
          model: providerInstance,
          prompt: options.prompt,
          temperature: temperature ?? options.temperature ?? 0.7,
          maxTokens: maxTokens ?? options.maxTokens ?? 8192,
          abortSignal: controller.signal,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT")), timeoutMs)
        ),
      ]);

      clearTimeout(timeoutId);

      // Extract JSON if requested
      let jsonResult: Record<string, unknown> | undefined;
      if (options.extractJson) {
        jsonResult = this.extractJson((result as any).text);
      }

      return {
        text: (result as any).text,
        json: jsonResult,
        usage: (result as any).usage
          ? {
              promptTokens: (result as any).usage.promptTokens,
              completionTokens: (result as any).usage.completionTokens,
              totalTokens: (result as any).usage.totalTokens,
            }
          : undefined,
        model,
        provider,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      // ✅ NEW: Handle specific error types
      if (error.message === "TIMEOUT" || error.name === "AbortError") {
        throw new APITimeoutError(provider, timeoutMs);
      }

      // Check for API-specific errors
      if (
        error.message?.includes("401") ||
        error.message?.includes("unauthorized")
      ) {
        throw new APIKeyInvalidError(provider, 401);
      }

      if (
        error.message?.includes("429") ||
        error.message?.includes("rate limit")
      ) {
        const retryAfter = error.headers?.["retry-after"];
        throw new RateLimitError(
          provider,
          retryAfter ? parseInt(retryAfter) : undefined
        );
      }

      if (error.message?.includes("403") || error.message?.includes("quota")) {
        throw new APIResponseError(provider, 403, "API quota exceeded");
      }

      // Re-throw DProc errors as-is
      if (error instanceof DProcError) {
        throw error;
      }

      // Wrap unknown errors
      throw new APIResponseError(
        provider,
        0,
        error.message || "Unknown LLM provider error"
      );
    }
  }

  /**
   * Extract JSON from LLM response
   */
  private extractJson(text: string): Record<string, unknown> {
    // Strategy 1: JSON in code blocks
    const codeBlockMatch = text.match(/``````/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]!);
      } catch (e) {
        // Continue to next strategy
      }
    }

    // Strategy 2: Raw JSON object
    const rawJsonMatch = text.match(/\{[\s\S]*\}/);
    if (rawJsonMatch) {
      try {
        return JSON.parse(rawJsonMatch[0]);
      } catch (e) {
        // Continue
      }
    }

    // Strategy 3: Multiple JSON objects - take the largest
    const allMatches = text.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    let largestJson: Record<string, unknown> = {};
    let maxLength = 0;

    for (const match of allMatches) {
      try {
        const parsed = JSON.parse(match[0]);
        if (match[0].length > maxLength) {
          largestJson = parsed;
          maxLength = match[0].length;
        }
      } catch (e) {
        continue;
      }
    }

    if (maxLength > 0) {
      return largestJson;
    }

    // Return empty object if no JSON found
    console.warn("No valid JSON found in LLM response");
    return {};
  }
}
