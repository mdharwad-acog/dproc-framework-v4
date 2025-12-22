/**
 * DProc Error System
 *
 * Provides structured, user-friendly error handling with:
 * - Clear error messages aligned with Microcopy Guide
 * - Actionable fix suggestions
 * - Context data for debugging
 * - Proper error codes for programmatic handling
 */

export { DProcError, type DProcErrorOptions } from "./base.js";

// Pipeline Errors
export {
  PipelineNotFoundError,
  InvalidPipelineError,
  PipelineSpecMissingError,
  ProcessorMissingError,
  TemplateMissingError,
} from "./pipeline-errors.js";

// API Errors
export {
  APIKeyMissingError,
  APIKeyInvalidError,
  RateLimitError,
  QuotaExceededError,
  APITimeoutError,
  APIResponseError,
} from "./api-errors.js";

// Validation Errors
export {
  ValidationError,
  InputRequiredError,
  InvalidInputTypeError,
  MultipleValidationErrors,
} from "./validation-errors.js";

// Execution Errors
export {
  ExecutionTimeoutError,
  ProcessingError,
  OutputDirectoryError,
  TemplateRenderError,
  WorkerUnavailableError,
} from "./execution-errors.js";
