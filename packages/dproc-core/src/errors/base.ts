/**
 * Base error class for all DProc errors
 * Provides structured error handling with user-friendly messages and fix suggestions
 */

export interface DProcErrorOptions {
  /** Machine-readable error code (e.g., 'API_KEY_MISSING') */
  code: string;

  /** Technical error message for logs */
  message: string;

  /** User-friendly message from Microcopy Guide */
  userMessage: string;

  /** Step-by-step instructions to fix the error */
  fixes?: string[];

  /** Error severity level */
  severity: "error" | "warning" | "info";

  /** Additional context data */
  context?: Record<string, any>;

  /** Original error if wrapping another error */
  cause?: Error;
}

export class DProcError extends Error {
  public readonly code: string;
  public readonly userMessage: string;
  public readonly fixes: string[];
  public readonly severity: "error" | "warning" | "info";
  public readonly context: Record<string, any>;
  public readonly cause?: Error;
  public readonly timestamp: number;

  constructor(options: DProcErrorOptions) {
    super(options.message);

    this.name = "DProcError";
    this.code = options.code;
    this.userMessage = options.userMessage;
    this.fixes = options.fixes || [];
    this.severity = options.severity;
    this.context = options.context || {};
    this.cause = options.cause;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      fixes: this.fixes,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
      ...(this.cause && { cause: this.cause.message }),
    };
  }

  /**
   * Get formatted error for CLI display
   */
  toCLIString(): string {
    let output = `\n${this.userMessage}\n`;

    if (this.fixes.length > 0) {
      output += "\nHow to fix:\n";
      this.fixes.forEach((fix, i) => {
        output += `  ${i + 1}. ${fix}\n`;
      });
    }

    if (Object.keys(this.context).length > 0) {
      output += "\nDetails:\n";
      Object.entries(this.context).forEach(([key, value]) => {
        output += `  ${key}: ${value}\n`;
      });
    }

    return output;
  }
}
