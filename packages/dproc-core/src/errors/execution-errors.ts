import { DProcError } from "./base.js";

/**
 * Error thrown when pipeline execution times out
 */
export class ExecutionTimeoutError extends DProcError {
  constructor(pipelineName: string, timeoutMinutes: number) {
    super({
      code: "EXECUTION_TIMEOUT",
      message: `Pipeline '${pipelineName}' timed out after ${timeoutMinutes} minutes`,
      userMessage: `Pipeline execution timed out\n\nThe pipeline took longer than ${timeoutMinutes} minutes.`,
      fixes: [
        "Try reducing the amount of data to process",
        "Increase timeout in pipeline config.yml",
        "Check if the processor is hanging on an API call",
        "Review execution logs for stuck steps",
      ],
      severity: "error",
      context: {
        pipelineName,
        timeoutMinutes,
      },
    });
  }
}

/**
 * Error thrown when processing step fails
 */
export class ProcessingError extends DProcError {
  constructor(
    pipelineName: string,
    stepName: string,
    errorMessage: string,
    cause?: Error
  ) {
    super({
      code: "PROCESSING_ERROR",
      message: `Pipeline '${pipelineName}' failed at step '${stepName}': ${errorMessage}`,
      userMessage: `Pipeline execution failed\n\nThe pipeline stopped at step: ${stepName}`,
      fixes: [
        "Check the error message above for details",
        "Review your processor.ts implementation",
        "Check that all required data is available",
        "View execution logs for more details",
      ],
      severity: "error",
      context: {
        pipelineName,
        stepName,
        errorMessage,
      },
      cause,
    });
  }
}

/**
 * Error thrown when output directory is not writable
 */
export class OutputDirectoryError extends DProcError {
  constructor(outputPath: string, reason: string) {
    super({
      code: "OUTPUT_DIRECTORY_ERROR",
      message: `Cannot write to output directory: ${outputPath}`,
      userMessage: `Cannot save output files\n\n${reason}`,
      fixes: [
        `Check that directory exists: ${outputPath}`,
        "Verify you have write permissions",
        "Create the directory if it doesn't exist",
        "Check available disk space",
      ],
      severity: "error",
      context: {
        outputPath,
        reason,
      },
    });
  }
}

/**
 * Error thrown when template rendering fails
 */
export class TemplateRenderError extends DProcError {
  constructor(templateName: string, errorMessage: string, cause?: Error) {
    super({
      code: "TEMPLATE_RENDER_ERROR",
      message: `Failed to render template '${templateName}': ${errorMessage}`,
      userMessage: `Template rendering failed\n\nCouldn't generate output from template: ${templateName}`,
      fixes: [
        "Check template syntax for errors",
        "Verify all required variables are available",
        "Review template at: templates/" + templateName,
        "Check error details above",
      ],
      severity: "error",
      context: {
        templateName,
        errorMessage,
      },
      cause,
    });
  }
}

/**
 * Error thrown when worker is unavailable
 */
export class WorkerUnavailableError extends DProcError {
  constructor(retryAfter?: number) {
    const waitTime = retryAfter || 30;

    super({
      code: "WORKER_UNAVAILABLE",
      message: "No workers available to process job",
      userMessage: `Worker unavailable\n\nNo background workers are running to process your request.`,
      fixes: [
        "Start a worker: dproc-worker",
        "Or wait for a worker to become available",
        `Try again in ${waitTime} seconds`,
        "Check that Redis is running",
      ],
      severity: "warning",
      context: {
        retryAfter: waitTime,
      },
    });
  }
}
