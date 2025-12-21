import nunjucks from "nunjucks";
import createDebug from "debug";

const debug = createDebug("dproc:template");

export class TemplateEngine {
  private env: nunjucks.Environment;

  constructor() {
    this.env = new nunjucks.Environment(null, {
      autoescape: false,
      trimBlocks: true,
      lstripBlocks: true,
    });
  }

  render(template: string, context: Record<string, any>): string {
    try {
      debug("Rendering template with context keys:", Object.keys(context));
      return this.env.renderString(template, context);
    } catch (error) {
      debug("Template rendering error:", error);
      throw new Error(`Template rendering failed: ${error}`);
    }
  }

  renderPrompt(
    promptTemplate: string,
    inputs: Record<string, any>,
    bundleData?: any
  ): string {
    return this.render(promptTemplate, {
      inputs,
      bundle: bundleData,
    });
  }

  renderReport(
    reportTemplate: string,
    reportContent: string,
    inputs: Record<string, any>
  ): string {
    return this.render(reportTemplate, {
      report: reportContent,
      inputs,
    });
  }
}
