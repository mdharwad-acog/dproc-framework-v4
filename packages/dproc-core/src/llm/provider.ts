import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LLMConfig } from "@aganitha/dproc-types";
import { ConfigLoader } from "../config/index.js";

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
        return await this.generateWithProvider(
          config.fallback.provider,
          config.fallback.model,
          options
        );
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
    const apiKey = this.configLoader.getApiKey(provider);
    let providerInstance: any;

    // Create provider instance
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

    // Generate
    const result = await generateText({
      model: providerInstance,
      prompt: options.prompt,
      temperature: temperature ?? options.temperature ?? 0.7,
      maxTokens: maxTokens ?? options.maxTokens ?? 8192,
    });

    // Extract JSON if requested
    let jsonResult: Record<string, unknown> | undefined;
    if (options.extractJson) {
      jsonResult = this.extractJson(result.text);
    }

    return {
      text: result.text,
      json: jsonResult,
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
      model,
      provider,
    };
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
