import { isDProcError, type DProcErrorData } from "./error-types";

/**
 * Format error for display in UI
 */
export function formatError(error: unknown): {
  title: string;
  message: string;
  code?: string;
  fixes?: string[];
  technicalDetails?: string;
} {
  // Check if it's a DProc error structure
  if (isDProcError(error)) {
    return {
      title: error.name,
      message: error.userMessage,
      code: error.code,
      fixes: error.fixes,
      technicalDetails: error.technicalMessage,
    };
  }

  // Standard Error object
  if (error instanceof Error) {
    return {
      title: "Error",
      message: error.message,
      technicalDetails: error.stack,
    };
  }

  // Unknown error type
  return {
    title: "Unknown Error",
    message: String(error),
  };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("Failed to fetch")
    );
  }
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  if (isDProcError(error)) {
    return error.code.startsWith("VALIDATION_");
  }
  return false;
}

/**
 * Get user-friendly error message for common errors
 */
export function getUserFriendlyMessage(error: unknown): string {
  const formatted = formatError(error);

  // Network errors
  if (isNetworkError(error)) {
    return "Unable to connect to the server. Please check your connection and try again.";
  }

  // Validation errors
  if (isValidationError(error)) {
    return formatted.message;
  }

  // Default to formatted message
  return formatted.message;
}
