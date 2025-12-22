import { listPipelines } from "@/lib/server-api";
import { NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core";

export async function GET() {
  try {
    const pipelines = await listPipelines();
    return NextResponse.json({ pipelines });
  } catch (error) {
    console.error("Pipelines API error:", error);

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

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list pipelines",
        code: "PIPELINE_LIST_ERROR",
      },
      { status: 500 }
    );
  }
}
