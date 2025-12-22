import { cancelJob } from "@/lib/server-api";
import { NextRequest, NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required" },
        { status: 400 }
      );
    }

    const result = await cancelJob(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cancel job API error:", error);

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
        error: error instanceof Error ? error.message : "Failed to cancel job",
        code: "CANCEL_ERROR",
      },
      { status: 500 }
    );
  }
}
