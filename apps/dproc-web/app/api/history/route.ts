import { getExecutionHistory } from "@/lib/server-api";
import { NextRequest, NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pipelineName = searchParams.get("pipeline") || undefined;
    const limit = searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined;

    const status = searchParams.get("status") as
      | "queued"
      | "processing"
      | "completed"
      | "failed"
      | "cancelled"
      | undefined;

    const executions = await getExecutionHistory({
      pipelineName,
      limit,
      status,
    });

    return NextResponse.json({ executions });
  } catch (error) {
    console.error("History API error:", error);

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
            : "Failed to get execution history",
        code: "HISTORY_ERROR",
      },
      { status: 500 }
    );
  }
}
