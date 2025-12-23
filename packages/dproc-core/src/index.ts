// ============================================================================
// TYPES - Integrated from dproc-types
// ============================================================================
export * from "./types/index.js";

// ============================================================================
// ERROR SYSTEM
// ============================================================================
export * from "./errors/index.js";

// ============================================================================
// VALIDATION
// ============================================================================
export * from "./validation/index.js";

// ============================================================================
// STORAGE LAYER (replaces database)
// ============================================================================
export { FileStorage } from "./storage/file-storage.js";
export type { Storage, StorageOptions } from "./storage/interface.js";

// ============================================================================
// REPOSITORIES (replaces database adapters)
// ============================================================================
export { ExecutionRepository } from "./repositories/executions.js";
export type { ExecutionFilters } from "./repositories/executions.js";
export { PipelineStatsRepository } from "./repositories/pipeline-stats.js";

// ============================================================================
// CORE FUNCTIONALITY
// ============================================================================
export { ReportExecutor } from "./executor/index.js";
export { LLMProvider } from "./llm/provider.js";
export { TemplateRenderer } from "./template/renderer.js";
export {
  ConfigLoader,
  SecretsManager,
  WorkspaceManager,
} from "./config/index.js";
export { CacheManager } from "./cache/index.js";
export { PipelineLoader } from "./pipeline/index.js";

// ============================================================================
// CLI (optional - users can import from @dproc/core/cli if needed)
// ============================================================================
// CLI is available via bin scripts, not typically imported
