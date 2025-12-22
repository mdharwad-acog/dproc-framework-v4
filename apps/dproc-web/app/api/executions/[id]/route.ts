import { getJobStatus } from "@/lib/server-api";
import { NextRequest, NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "Execution ID is required" },
        { status: 400 }
      );
    }

    const status = await getJobStatus(id);

    if (!status) {
      return NextResponse.json(
        {
          error: "Execution not found",
          code: "EXECUTION_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Execution status API error:", error);

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
            : "Failed to get execution status",
        code: "EXECUTION_STATUS_ERROR",
      },
      { status: 500 }
    );
  }
}
