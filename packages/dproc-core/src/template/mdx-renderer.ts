import { compile } from "@mdx-js/mdx";
import type { TemplateContext } from "../types/index.js";
import { TemplateRenderError } from "../errors/index.js";

/**
 * MDX Renderer for compiling MDX templates with React components
 *
 * This renderer:
 * 1. Pre-processes MDX with Nunjucks to inject context
 * 2. Compiles MDX to JavaScript
 * 3. Returns compiled code ready for next-mdx-remote
 */
export class MDXRenderer {
  /**
   * Render MDX template string with context
   *
   * @param mdxTemplate - MDX template string (can contain Nunjucks syntax)
   * @param context - Template context with inputs, vars, data, llm, metadata
   * @returns Compiled MDX string ready for next-mdx-remote
   */
  async render(mdxTemplate: string, context: TemplateContext): Promise<string> {
    try {
      // Step 1: Inject context as frontmatter for MDX access
      const mdxWithContext = this.injectContext(mdxTemplate, context);

      // Step 2: Compile MDX to JavaScript
      const compiled = await compile(mdxWithContext, {
        outputFormat: "function-body",
        development: process.env.NODE_ENV === "development",
      });

      return String(compiled);
    } catch (error: any) {
      throw new TemplateRenderError(
        "mdx-template",
        `MDX compilation failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Inject template context into MDX as exportable data
   * This allows MDX to access context.inputs, context.llm, etc.
   */
  private injectContext(mdxTemplate: string, context: TemplateContext): string {
    // Create a data injection block at the top of MDX
    const contextExport = `
export const pageData = ${JSON.stringify(context, null, 2)};
export const inputs = ${JSON.stringify(context.inputs, null, 2)};
export const vars = ${JSON.stringify(context.vars, null, 2)};
export const data = ${JSON.stringify(context.data, null, 2)};
export const llm = ${JSON.stringify(context.llm, null, 2)};
export const metadata = ${JSON.stringify(context.metadata, null, 2)};
`;

    return contextExport + "\n" + mdxTemplate;
  }

  /**
   * Pre-process MDX template with Nunjucks for variable interpolation
   *
   * Use this when your MDX template contains Nunjucks syntax like {{ variable }}
   */
  renderWithNunjucks(
    mdxTemplate: string,
    context: TemplateContext,
    nunjucksRenderer: any
  ): string {
    try {
      // First pass: Nunjucks rendering
      const processedTemplate = nunjucksRenderer.render(mdxTemplate, context);
      return processedTemplate;
    } catch (error: any) {
      throw new TemplateRenderError(
        "mdx-nunjucks-preprocessing",
        `Nunjucks preprocessing failed: ${error.message}`,
        error
      );
    }
  }

  /**
   * Helper to serialize complex objects for MDX
   */
  private serializeForMDX(obj: any): string {
    return JSON.stringify(
      obj,
      (key, value) => {
        // Handle special types that don't serialize well
        if (typeof value === "function") return "[Function]";
        if (value instanceof Date) return value.toISOString();
        if (value instanceof RegExp) return value.toString();
        return value;
      },
      2
    );
  }
}
