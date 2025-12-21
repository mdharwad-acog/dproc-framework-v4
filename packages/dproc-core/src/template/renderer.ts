import nunjucks from "nunjucks";
import type { TemplateContext } from "@aganitha/dproc-types";

export class TemplateRenderer {
  private env: nunjucks.Environment;

  constructor(templatePaths: string[] = []) {
    // Configure Nunjucks environment
    this.env = nunjucks.configure(templatePaths, {
      autoescape: false, // We trust our templates
      trimBlocks: true,
      lstripBlocks: true,
      noCache: process.env.NODE_ENV === "development",
    });

    // Add custom filters
    this.addCustomFilters();
  }

  /**
   * Render template string with context
   */
  render(template: string, context: TemplateContext): string {
    try {
      return this.env.renderString(template, context);
    } catch (error: any) {
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Render template file with context
   */
  renderFile(templatePath: string, context: TemplateContext): string {
    try {
      return this.env.render(templatePath, context);
    } catch (error: any) {
      throw new Error(`Template file rendering failed: ${error.message}`);
    }
  }

  /**
   * Render prompt template (for LLM)
   */
  renderPrompt(
    promptTemplate: string,
    context: {
      inputs: Record<string, unknown>;
      vars: Record<string, unknown>;
      data: Record<string, unknown>;
    }
  ): string {
    try {
      return this.env.renderString(promptTemplate, context);
    } catch (error: any) {
      throw new Error(`Prompt rendering failed: ${error.message}`);
    }
  }

  /**
   * Add custom Nunjucks filters
   */
  private addCustomFilters() {
    // JSON stringify filter
    this.env.addFilter("json", (obj: any, indent: number = 2) => {
      return JSON.stringify(obj, null, indent);
    });

    // Truncate filter
    this.env.addFilter("truncate", (str: string, length: number = 100) => {
      if (str.length <= length) return str;
      return str.substring(0, length) + "...";
    });

    // Date formatting
    this.env.addFilter("date", (dateStr: string, format: string = "iso") => {
      const date = new Date(dateStr);
      if (format === "iso") return date.toISOString();
      if (format === "short") return date.toLocaleDateString();
      if (format === "long") return date.toLocaleString();
      return dateStr;
    });

    // Markdown to HTML (simple version)
    this.env.addFilter("markdown", (text: string) => {
      return text
        .replace(/^### (.*$)/gim, "<h3>$1</h3>")
        .replace(/^## (.*$)/gim, "<h2>$1</h2>")
        .replace(/^# (.*$)/gim, "<h1>$1</h1>")
        .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
        .replace(/\*(.*)\*/gim, "<em>$1</em>")
        .replace(/\n/gim, "<br>");
    });

    // Array join with custom separator
    this.env.addFilter("join", (arr: any[], separator: string = ", ") => {
      return arr.join(separator);
    });

    // Number formatting
    this.env.addFilter("number", (num: number, decimals: number = 2) => {
      return num.toFixed(decimals);
    });
  }
}
