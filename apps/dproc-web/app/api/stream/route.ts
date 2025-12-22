import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { PipelineLoader } from "@aganitha/dproc-core/dist/pipeline/loader.js";
import { TemplateRenderer } from "@aganitha/dproc-core/dist/template/renderer.js";
import { WorkspaceManager } from "@aganitha/dproc-core/dist/config/workspace.js";
import { DProcError } from "@aganitha/dproc-core"; // ✅ NEW
import { NextResponse } from "next/server"; // ✅ NEW

const workspace = new WorkspaceManager();
const PIPELINES_DIR = workspace.getPipelinesDir();

export async function POST(req: Request) {
  try {
    const { pipelineName, inputs, provider, model, userApiKey } =
      await req.json();

    // ✅ Enhanced validation
    if (!pipelineName) {
      return NextResponse.json(
        { error: "Pipeline name is required" },
        { status: 400 }
      );
    }

    // HYBRID MODEL
    const apiKey =
      userApiKey || process.env[`${provider.toUpperCase()}_API_KEY`];

    if (!apiKey) {
      // ✅ Better error message
      return NextResponse.json(
        {
          error: `No API key available for ${provider}`,
          fixes: [
            `Set ${provider.toUpperCase()}_API_KEY environment variable`,
            "Or provide your own API key in the form",
          ],
        },
        { status: 400 }
      );
    }

    // Load pipeline
    const loader = new PipelineLoader(PIPELINES_DIR);
    const pipelines = await loader.listPipelines();

    if (!pipelines.includes(pipelineName)) {
      return NextResponse.json(
        {
          error: `Pipeline '${pipelineName}' not found`,
          fixes: [
            "Check pipeline name spelling",
            "Run 'dproc list' to see available pipelines",
          ],
        },
        { status: 404 }
      );
    }

    const spec = await loader.loadSpec(pipelineName);
    const config = await loader.loadConfig(pipelineName);

    // Load prompt template
    const path = await import("path");
    const fs = await import("fs/promises");
    const promptsDir = path.join(PIPELINES_DIR, pipelineName, "prompts");
    const promptFiles = await fs.readdir(promptsDir);
    const mainPromptFile = promptFiles.find(
      (f) => f.includes("main") || f.endsWith(".md")
    );

    if (!mainPromptFile) {
      return NextResponse.json(
        {
          error: "Prompt template not found",
          fixes: [
            "Create a prompt file in the prompts/ directory",
            "Name it 'main.prompt.md' or similar",
          ],
        },
        { status: 404 }
      );
    }

    const promptTemplate = await fs.readFile(
      path.join(promptsDir, mainPromptFile),
      "utf-8"
    );

    // Render prompt
    const templateRenderer = new TemplateRenderer();
    const prompt = templateRenderer.renderPrompt(promptTemplate, {
      inputs,
      vars: spec.variables || {},
      data: {}, // No processor data in web UI
    });

    // Get LLM model
    let llmModel;
    switch (provider) {
      case "openai":
        llmModel = createOpenAI({ apiKey })(model);
        break;
      case "anthropic":
        llmModel = createAnthropic({ apiKey })(model);
        break;
      case "google":
        llmModel = createGoogleGenerativeAI({ apiKey })(model);
        break;
      default:
        return NextResponse.json(
          {
            error: `Unsupported provider: ${provider}`,
            fixes: ["Use one of: openai, anthropic, google"],
          },
          { status: 400 }
        );
    }

    // Stream response
    const result = streamText({
      model: llmModel,
      prompt,
      temperature: 0.7,
      maxTokens: 4096,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Stream error:", error);

    // ✅ Handle DProc errors
    if (error instanceof DProcError) {
      return NextResponse.json(
        {
          error: error.userMessage,
          code: error.code,
          fixes: error.fixes,
        },
        { status: 400 }
      );
    }

    // ✅ Generic error
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Stream failed",
        fixes: [
          "Check your API key is valid",
          "Verify the pipeline configuration",
          "Try again in a moment",
        ],
      },
      { status: 500 }
    );
  }
}
