import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { PipelineLoader } from "@aganitha/dproc-core/dist/pipeline/loader.js";
import { TemplateRenderer } from "@aganitha/dproc-core/dist/template/renderer.js";
import { WorkspaceManager } from "@aganitha/dproc-core/dist/config/workspace.js";

const workspace = new WorkspaceManager();
const PIPELINES_DIR = workspace.getPipelinesDir();

export async function POST(req: Request) {
  try {
    const { pipelineName, inputs, provider, model, userApiKey } =
      await req.json();

    // HYBRID MODEL
    const apiKey =
      userApiKey || process.env[`${provider.toUpperCase()}_API_KEY`];

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "No API key available" }), {
        status: 400,
      });
    }

    // Load pipeline
    const loader = new PipelineLoader(PIPELINES_DIR);
    const pipelines = await loader.listPipelines();

    if (!pipelines.includes(pipelineName)) {
      return new Response(JSON.stringify({ error: "Pipeline not found" }), {
        status: 404,
      });
    }

    const spec = await loader.loadSpec(pipelineName);
    const config = await loader.loadConfig(pipelineName);

    // Load prompt template (simple version for web UI)
    const path = await import("path");
    const fs = await import("fs/promises");
    const promptsDir = path.join(PIPELINES_DIR, pipelineName, "prompts");
    const promptFiles = await fs.readdir(promptsDir);
    const mainPromptFile = promptFiles.find(
      (f) => f.includes("main") || f.endsWith(".md")
    );

    if (!mainPromptFile) {
      return new Response(
        JSON.stringify({ error: "Prompt template not found" }),
        {
          status: 404,
        }
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
        throw new Error(`Unsupported provider: ${provider}`);
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
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
    });
  }
}
