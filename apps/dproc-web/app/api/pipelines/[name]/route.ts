import { getPipelineDetails } from "@/lib/server-api";
import { NextRequest, NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    if (!name) {
      return NextResponse.json(
        { error: "Pipeline name is required" },
        { status: 400 }
      );
    }

    const details = await getPipelineDetails(name);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Pipeline details API error:", error);

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
          error instanceof Error
            ? error.message
            : "Failed to get pipeline details",
        code: "PIPELINE_DETAILS_ERROR",
      },
      { status: 500 }
    );
  }
}
