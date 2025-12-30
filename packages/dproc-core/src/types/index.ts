import { z } from "zod";

// ============================================================================
// PIPELINE SPECIFICATION TYPES
// ============================================================================

// Input definition schema (what's in spec.yml)
export const InputDefinitionSchema = z.object({
  name: z.string(),
  type: z.enum(["text", "number", "select", "boolean", "array"]),
  label: z.string(),
  required: z.boolean().default(false),
  default: z.union([z.string(), z.number(), z.boolean()]).optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
  options: z.array(z.string()).optional(),
});

// ✅ Input VALUES schema (what users send) - with auto-coercion
export const InputValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);

// ✅ Schema for the entire inputs object - coerce on the fly
export const ExecutionInputsSchema = z
  .record(z.string(), InputValueSchema)
  .transform((inputs) => {
    // Auto-convert string numbers to actual numbers
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (typeof value === "string") {
        // Try to convert to number if it looks like a number
        const asNumber = Number(value);
        if (!isNaN(asNumber) && value.trim() !== "") {
          normalized[key] = asNumber;
        } else {
          normalized[key] = value;
        }
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  });

export type InputDefinition = z.infer<typeof InputDefinitionSchema>;
export type ExecutionInputs = z.infer<typeof ExecutionInputsSchema>;

// Pipeline Specification (spec.yml)
export const PipelineSpecSchema = z.object({
  pipeline: z.object({
    name: z.string(),
    version: z.string(),
    description: z.string(),
  }),
  inputs: z.array(InputDefinitionSchema),
  outputs: z.array(z.string()),
  variables: z.record(z.any()).optional(),
});

export type PipelineSpec = z.infer<typeof PipelineSpecSchema>;

// LLM Configuration (config.yml)
export const LLMConfigSchema = z.object({
  llm: z.object({
    provider: z.enum(["openai", "anthropic", "google"]),
    model: z.string(),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().default(8192),
    fallback: z
      .object({
        provider: z.enum(["openai", "anthropic", "google"]),
        model: z.string(),
      })
      .optional(),
  }),
  execution: z
    .object({
      queuePriority: z.enum(["low", "normal", "high"]).default("normal"),
      timeoutMinutes: z.number().default(30),
      retryAttempts: z.number().default(3),
    })
    .optional(),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

// ============================================================================
// PROCESSOR TYPES
// ============================================================================

// Context provided to processor.ts
export interface ProcessorContext {
  // External libraries available to processor
  libs: {
    fetch: typeof fetch;
    fs: typeof import("fs/promises");
    path: typeof import("path");
    csvParse: any;
    xml2js: any;
    cheerio: any;
    papaparse: any;
    axios: any;
  };

  // Utility functions
  readDataFile: (filename: string) => Promise<any>;
  saveBundle: (data: any, filename: string) => Promise<string>;

  // Caching
  cache: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any, ttl?: number) => Promise<void>;
  };

  // Logging
  logger: {
    info: (msg: string) => void;
    error: (msg: string) => void;
    debug: (msg: string) => void;
    warn: (msg: string) => void;
  };
}

// What processor.ts must return
export interface ProcessorResult {
  attributes: Record<string, unknown>;
  metadata?: {
    source?: string;
    recordCount?: number;
    processingTime?: number;
    [key: string]: unknown;
  };
}

// Processor function signature
export type ProcessorFunction = (
  inputs: Record<string, any>,
  context: ProcessorContext
) => Promise<ProcessorResult>;

// ============================================================================
// LLM ENRICHMENT TYPES
// ============================================================================

// Result from LLM enrichment
export interface LLMEnrichmentResult {
  attributes: Record<string, unknown>;
  rawOutput?: string;
  metadata?: {
    tokensUsed?: number;
    model?: string;
    provider?: string;
    executionTime?: number;
    [key: string]: unknown;
  };
}

// ============================================================================
// TEMPLATE CONTEXT TYPES
// ============================================================================

// Complete context available to Nunjucks templates
export interface TemplateContext {
  inputs: Record<string, unknown>;
  vars: Record<string, unknown>;
  data: Record<string, unknown>;
  llm: Record<string, unknown>;
  metadata: {
    executionTime: number;
    model: string;
    timestamp: string;
    pipelineName: string;
    version: string;
    [key: string]: unknown;
  };
}

// ============================================================================
// JOB QUEUE TYPES
// ============================================================================

// Job data for BullMQ
export interface JobData {
  jobId: string;
  pipelineName: string;
  inputs: Record<string, unknown>;
  outputFormat: string;
  userId?: string;
  priority: "low" | "normal" | "high";
  createdAt: number;
}

// Job status
export interface JobStatus {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  result?: {
    outputPath: string;
    metadata: any;
  };
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

// ============================================================================
// DATABASE SCHEMA TYPES (now used for JSON storage)
// ============================================================================

// Execution Record Schema
export const ExecutionRecordSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  pipelineName: z.string(),
  userId: z.string().optional(),
  inputs: z.record(z.unknown()),
  outputFormat: z.string(),
  userOutputPath: z.string().optional(),
  status: z.enum(["queued", "processing", "completed", "failed", "cancelled"]),
  priority: z.enum(["low", "normal", "high"]),
  outputPath: z.string().optional(),
  bundlePath: z.string().optional(),
  processorMetadata: z.record(z.unknown()).optional(),
  llmMetadata: z.record(z.unknown()).optional(),
  executionTime: z.number().optional(),
  tokensUsed: z.number().optional(),
  error: z.string().optional(),
  createdAt: z.number(),
  startedAt: z.number().optional(),
  completedAt: z.number().optional(),
});

export type ExecutionRecord = z.infer<typeof ExecutionRecordSchema>;

// Pipeline Statistics
export interface PipelineStats {
  pipelineName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  totalTokensUsed: number;
  lastExecutedAt?: number;
  updatedAt: number;
}

// ============================================================================
// PROVIDER CONFIGURATION TYPES
// ============================================================================

export const ProviderConfigSchema = z.object({
  type: z.enum(["openai", "anthropic", "google"]),
  apiKey: z.string(),
  model: z.string(),
  temperature: z.number().optional(),
  maxTokens: z.number().optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// System-wide Configuration
export const SystemConfigSchema = z.object({
  providers: z.record(z.string(), ProviderConfigSchema),
  activeProvider: z.string(),
  pipelinesDir: z.string(),
  redis: z
    .object({
      host: z.string().default("localhost"),
      port: z.number().default(6379),
      password: z.string().optional(),
    })
    .optional(),
});

export type SystemConfig = z.infer<typeof SystemConfigSchema>;
