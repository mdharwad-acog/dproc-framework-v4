import { DProcError } from "./base.js";

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends DProcError {
  constructor(field: string, issue: string, expected?: string) {
    super({
      code: "VALIDATION_ERROR",
      message: `Validation failed for '${field}': ${issue}`,
      userMessage: `Invalid input: ${issue}`,
      fixes: [
        `Please provide a valid ${field}`,
        ...(expected ? [`Expected: ${expected}`] : []),
      ],
      severity: "error",
      context: {
        field,
        issue,
        expected,
      },
    });
  }
}

/**
 * Error thrown when required input is missing
 */
export class InputRequiredError extends DProcError {
  constructor(field: string, label?: string, placeholder?: string) {
    const fieldLabel = label || field;

    super({
      code: "INPUT_REQUIRED",
      message: `Required input '${field}' is missing`,
      userMessage: `${fieldLabel} is required`,
      fixes: [
        `Please provide ${fieldLabel}`,
        ...(placeholder ? [`Example: ${placeholder}`] : []),
      ],
      severity: "error",
      context: {
        field,
        label,
        placeholder,
      },
    });
  }
}

/**
 * Error thrown when input type is incorrect
 */
export class InvalidInputTypeError extends DProcError {
  constructor(field: string, expected: string, received: string) {
    super({
      code: "INVALID_INPUT_TYPE",
      message: `Input '${field}' has wrong type: expected ${expected}, got ${received}`,
      userMessage: `${field} must be a ${expected}`,
      fixes: [
        `Provide a ${expected} value for ${field}`,
        `You provided: ${received}`,
      ],
      severity: "error",
      context: {
        field,
        expected,
        received,
      },
    });
  }
}

/**
 * Error thrown when multiple validation errors occur
 */
export class MultipleValidationErrors extends DProcError {
  constructor(errors: Array<{ field: string; issue: string }>) {
    const errorCount = errors.length;
    const errorList = errors.map((e) => `${e.field}: ${e.issue}`);

    super({
      code: "MULTIPLE_VALIDATION_ERRORS",
      message: `${errorCount} validation error${errorCount > 1 ? "s" : ""} found`,
      userMessage: `Validation failed\n\nPlease fix the following ${errorCount} error${errorCount > 1 ? "s" : ""}:`,
      fixes: errorList.map((err, i) => `${i + 1}. ${err}`),
      severity: "error",
      context: {
        errorCount,
        errors,
      },
    });
  }
}
