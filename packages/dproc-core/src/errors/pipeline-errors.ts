import { DProcError } from "./base.js";

/**
 * Error thrown when a pipeline is not found
 */
export class PipelineNotFoundError extends DProcError {
  constructor(pipelineName: string) {
    super({
      code: "PIPELINE_NOT_FOUND",
      message: `Pipeline '${pipelineName}' not found`,
      userMessage: `Pipeline '${pipelineName}' not found\n\nThe pipeline you're looking for doesn't exist or may have been deleted.`,
      fixes: [
        "Check the pipeline name for typos",
        "List available pipelines: dproc list",
        "Create this pipeline if needed: dproc init " + pipelineName,
      ],
      severity: "error",
      context: { pipelineName },
    });
  }
}

/**
 * Error thrown when a pipeline configuration is invalid
 */
export class InvalidPipelineError extends DProcError {
  constructor(pipelineName: string, validationErrors: string[]) {
    super({
      code: "INVALID_PIPELINE",
      message: `Pipeline '${pipelineName}' has invalid configuration`,
      userMessage: `Pipeline '${pipelineName}' has invalid configuration\n\nThe pipeline configuration contains errors that prevent execution.`,
      fixes: [
        "Check spec.yml for syntax errors",
        "Validate the pipeline: dproc validate " + pipelineName,
        "Review the error details below",
        ...validationErrors.map((err) => `  • ${err}`),
      ],
      severity: "error",
      context: {
        pipelineName,
        validationErrors,
      },
    });
  }
}

/**
 * Error thrown when pipeline spec.yml is missing
 */
export class PipelineSpecMissingError extends DProcError {
  constructor(pipelineName: string, specPath: string) {
    super({
      code: "PIPELINE_SPEC_MISSING",
      message: `spec.yml not found for pipeline '${pipelineName}'`,
      userMessage: `Pipeline '${pipelineName}' is missing spec.yml\n\nEvery pipeline requires a spec.yml configuration file.`,
      fixes: [
        `Create spec.yml at: ${specPath}`,
        "Or reinitialize the pipeline: dproc init " + pipelineName,
        "Copy from an example pipeline in pipelines/ directory",
      ],
      severity: "error",
      context: {
        pipelineName,
        specPath,
      },
    });
  }
}

/**
 * Error thrown when processor.ts is missing or invalid
 */
export class ProcessorMissingError extends DProcError {
  constructor(pipelineName: string, processorPath: string) {
    super({
      code: "PROCESSOR_MISSING",
      message: `processor.ts not found for pipeline '${pipelineName}'`,
      userMessage: `Pipeline '${pipelineName}' is missing processor.ts\n\nThe data processor file is required to fetch and process data.`,
      fixes: [
        `Create processor.ts at: ${processorPath}`,
        "Implement the processor function that returns ProcessorResult",
        "See documentation: https://docs.dproc.dev/processors",
      ],
      severity: "error",
      context: {
        pipelineName,
        processorPath,
      },
    });
  }
}

/**
 * Error thrown when template file is missing
 */
export class TemplateMissingError extends DProcError {
  constructor(
    pipelineName: string,
    templateName: string,
    templatePath: string
  ) {
    super({
      code: "TEMPLATE_MISSING",
      message: `Template '${templateName}' not found for pipeline '${pipelineName}'`,
      userMessage: `Template file not found\n\nThe pipeline requires a template file that doesn't exist.`,
      fixes: [
        `Create template at: ${templatePath}`,
        "Check the output format matches available templates",
        "Available formats are defined in spec.yml outputs",
      ],
      severity: "error",
      context: {
        pipelineName,
        templateName,
        templatePath,
      },
    });
  }
}
