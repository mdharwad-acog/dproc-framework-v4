/**
 * Client-safe error type definition
 * This mirrors DProcError from core but without importing it
 */
export interface DProcErrorData {
  name: string;
  code: string;
  userMessage: string;
  technicalMessage: string;
  fixes?: string[];
  context?: Record<string, unknown>;
}

/**
 * Check if an error has DProc error structure
 */
export function isDProcError(error: unknown): error is DProcErrorData {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "userMessage" in error &&
    typeof (error as any).code === "string" &&
    typeof (error as any).userMessage === "string"
  );
}
