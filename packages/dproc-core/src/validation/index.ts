import { PipelineSpec, LLMConfig } from "../types";
import {
  PipelineNotFoundError,
  InvalidPipelineError,
  APIKeyMissingError,
  InputRequiredError,
  MultipleValidationErrors,
  OutputDirectoryError,
  ValidationError,
} from "../errors/index.js";
import { SecretsManager } from "../config/secrets.js";
import { access, constants } from "fs/promises";
import path from "path";

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    issue: string;
    severity: "error" | "warning";
  }>;
  normalizedInputs?: Record<string, any>;
}

/**
 * Validates pipeline configuration and execution requirements
 * Checks everything before execution to prevent failures
 */
export class PipelineValidator {
  private secretsManager: SecretsManager;

  constructor() {
    this.secretsManager = new SecretsManager();
  }

  /**
   * Validate everything before execution AND normalize inputs
   * Returns structured validation result with all errors
   */
  async validateBeforeExecution(
    pipelineName: string,
    spec: PipelineSpec,
    config: LLMConfig | null,
    inputs: Record<string, any>,
    outputDir: string
  ): Promise<ValidationResult> {
    const errors: ValidationResult["errors"] = [];

    // 1. Validate inputs (with auto-conversion)
    const inputErrors = this.validateInputs(spec, inputs);
    errors.push(...inputErrors);

    // 2. Normalize inputs (convert types)
    const normalizedInputs = this.normalizeInputs(spec, inputs);

    // 3. Validate API keys
    const apiKeyErrors = await this.validateAPIKeys(config);
    errors.push(...apiKeyErrors);

    // 4. Validate output directory
    const outputErrors = await this.validateOutputDirectory(outputDir);
    errors.push(...outputErrors);

    // 5. Validate spec configuration
    const specErrors = this.validateSpec(spec);
    errors.push(...specErrors);

    return {
      valid: errors.filter((e) => e.severity === "error").length === 0,
      errors,
      normalizedInputs,
    };
  }

  /**
   * Validate that all required inputs are provided
   */
  private validateInputs(
    spec: PipelineSpec,
    inputs: Record<string, any>
  ): ValidationResult["errors"] {
    const errors: ValidationResult["errors"] = [];

    console.log("🔍 VALIDATING INPUTS:", JSON.stringify(inputs, null, 2));

    for (const input of spec.inputs) {
      const value = inputs[input.name];

      console.log(`📋 Checking input: ${input.name}`);
      console.log(`   Type expected: ${input.type}`);
      console.log(`   Value received: ${value} (${typeof value})`);
      console.log(`   Required: ${input.required}`);

      // Check required fields
      if (
        input.required &&
        (value === undefined || value === null || value === "")
      ) {
        console.log(`❌ Missing required field: ${input.name}`);
        errors.push({
          field: input.name,
          issue: `${input.label || input.name} is required`,
          severity: "error",
        });
        continue;
      }

      // Skip further validation if value is not provided and not required
      if (value === undefined || value === null) {
        console.log(`⏭️  Skipping optional field: ${input.name}`);
        continue;
      }

      // Validate type (with auto-conversion)
      const typeError = this.validateInputType(input, value);
      if (typeError) {
        console.log(`❌ Type error for ${input.name}:`, typeError);
        errors.push(typeError);
      } else {
        console.log(`✅ ${input.name} validated successfully`);
      }
    }

    console.log("📊 Total errors:", errors.length);
    return errors;
  }

  /**
   * Validate input type matches spec
   * ✅ FIXED: Auto-convert strings to numbers/booleans before validation
   */
  private validateInputType(
    input: PipelineSpec["inputs"][0],
    value: any
  ): ValidationResult["errors"][0] | null {
    const actualType = typeof value;

    switch (input.type) {
      case "text":
        if (actualType !== "string") {
          return {
            field: input.name,
            issue: `"${input.label || input.name}" must be text (got ${actualType})`,
            severity: "error",
          };
        }
        break;

      case "number":
        // ✅ AUTO-CONVERT: Try to convert string to number
        const numValue = typeof value === "string" ? Number(value) : value;

        if (typeof numValue !== "number" || isNaN(numValue)) {
          return {
            field: input.name,
            issue: `"${input.label || input.name}" must be a valid number (got "${value}")`,
            severity: "error",
          };
        }
        break;

      case "boolean":
        // ✅ AUTO-CONVERT: Accept "true"/"false" strings
        if (actualType !== "boolean") {
          if (
            actualType === "string" &&
            (value.toLowerCase() === "true" ||
              value.toLowerCase() === "false" ||
              value === "1" ||
              value === "0")
          ) {
            // Valid string representation of boolean
            break;
          }
          return {
            field: input.name,
            issue: `"${input.label || input.name}" must be true/false (got ${actualType})`,
            severity: "error",
          };
        }
        break;

      case "select":
        if (input.options && !input.options.includes(String(value))) {
          return {
            field: input.name,
            issue: `"${input.label || input.name}" must be one of: ${input.options.join(", ")}`,
            severity: "error",
          };
        }
        break;
    }

    return null;
  }

  /**
   * Normalize inputs based on their types
   * Converts strings to numbers/booleans as needed
   */
  private normalizeInputs(
    spec: PipelineSpec,
    inputs: Record<string, any>
  ): Record<string, any> {
    const normalized: Record<string, any> = {};

    for (const input of spec.inputs) {
      let value = inputs[input.name];

      // Skip if not provided
      if (value === undefined || value === null || value === "") {
        if (input.default !== undefined) {
          normalized[input.name] = input.default;
        }
        continue;
      }

      // Type conversion
      switch (input.type) {
        case "number":
          normalized[input.name] =
            typeof value === "string" ? Number(value) : value;
          break;

        case "boolean":
          if (typeof value === "string") {
            const lower = value.toLowerCase();
            normalized[input.name] =
              lower === "true" || lower === "1" || lower === "yes";
          } else {
            normalized[input.name] = Boolean(value);
          }
          break;

        case "text":
        case "select":
          normalized[input.name] = String(value);
          break;

        default:
          normalized[input.name] = value;
      }
    }

    return normalized;
  }

  /**
   * Validate that required API keys are configured
   */
  private async validateAPIKeys(
    config: LLMConfig | null
  ): Promise<ValidationResult["errors"]> {
    const errors: ValidationResult["errors"] = [];

    // If no config provided, skip API key validation
    if (!config || !config.llm) {
      return errors;
    }

    // Load secrets
    const secrets = await this.secretsManager.load();

    // Determine which provider is needed
    const provider = config.llm.provider.toLowerCase();

    // Check if API key exists
    const apiKey = secrets.apiKeys[provider as keyof typeof secrets.apiKeys];

    if (!apiKey || apiKey.trim() === "") {
      const providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
      errors.push({
        field: "api_key",
        issue: `${providerName} API key is missing`,
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Validate that output directory exists and is writable
   */
  private async validateOutputDirectory(
    outputDir: string
  ): Promise<ValidationResult["errors"]> {
    const errors: ValidationResult["errors"] = [];

    try {
      // Check if directory exists and is writable
      await access(outputDir, constants.W_OK);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        errors.push({
          field: "output_directory",
          issue: `Directory doesn't exist: ${outputDir}`,
          severity: "error",
        });
      } else if (error.code === "EACCES") {
        errors.push({
          field: "output_directory",
          issue: `No write permission for: ${outputDir}`,
          severity: "error",
        });
      } else {
        errors.push({
          field: "output_directory",
          issue: `Cannot access directory: ${error.message}`,
          severity: "error",
        });
      }
    }

    return errors;
  }

  /**
   * Validate pipeline spec configuration
   */
  private validateSpec(spec: PipelineSpec): ValidationResult["errors"] {
    const errors: ValidationResult["errors"] = [];

    // Check basic required fields
    if (!spec.pipeline?.name) {
      errors.push({
        field: "pipeline.name",
        issue: "Pipeline name is required in spec.yml",
        severity: "error",
      });
    }

    if (!spec.outputs || spec.outputs.length === 0) {
      errors.push({
        field: "outputs",
        issue: "At least one output format is required",
        severity: "error",
      });
    }

    return errors;
  }

  /**
   * Throw appropriate error if validation fails
   * ✅ FIXED: All null safety issues resolved
   */
  throwIfInvalid(result: ValidationResult, pipelineName: string): void {
    if (result.valid) return;

    const errorList = result.errors.filter((e) => e.severity === "error");
    if (errorList.length === 0) return;

    // Get first error (guaranteed to exist due to length check above)
    const firstError = errorList[0];
    if (!firstError) return; // Extra safety check

    // Throw specific errors for common cases
    if (firstError.field === "api_key") {
      const provider = firstError.issue.split(" ")[0]?.toLowerCase();
      throw new APIKeyMissingError(provider as any);
    }

    if (firstError.field === "output_directory") {
      throw new OutputDirectoryError(firstError.field, firstError.issue);
    }

    // For input errors
    const inputErrors = errorList.filter(
      (e) =>
        !e.field.startsWith("api_key") &&
        e.field !== "output_directory" &&
        !e.field.startsWith("pipeline.")
    );

    if (inputErrors.length === 1) {
      const inputError = inputErrors[0];
      if (inputError) {
        // ✅ FIXED: Use ValidationError instead of InputRequiredError
        throw new ValidationError(inputError.field, inputError.issue);
      }
    }

    if (inputErrors.length > 1) {
      throw new MultipleValidationErrors(
        inputErrors.map((e) => ({ field: e.field, issue: e.issue }))
      );
    }

    // Generic invalid pipeline error (fallback)
    throw new InvalidPipelineError(
      pipelineName,
      errorList.map((e) => e.issue)
    );
  }
}
