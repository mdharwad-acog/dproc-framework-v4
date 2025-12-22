import { executeJob } from "@/lib/server-api";
import { NextRequest, NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core"; // ✅ NEW

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("📦 Execute API received:", body);
    console.log(
      "📊 Input types:",
      Object.entries(body.inputs || {}).map(
        ([key, val]) => `${key}: ${typeof val} = ${val}`
      )
    );

    // ✅ Basic validation
    if (!body.pipelineName) {
      return NextResponse.json(
        {
          error: "Pipeline name is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    if (!body.inputs || typeof body.inputs !== "object") {
      return NextResponse.json(
        {
          error: "Invalid inputs format",
          code: "VALIDATION_ERROR",
        },
        { status: 400 }
      );
    }

    const result = await executeJob({
      pipelineName: body.pipelineName,
      inputs: body.inputs,
      outputFormat: body.outputFormat || "html",
      priority: body.priority || "normal",
      userId: body.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Execute API error:", error);

    // ✅ Handle DProc errors specially
    if (error instanceof DProcError) {
      return NextResponse.json(
        {
          error: error.userMessage,
          code: error.code,
          fixes: error.fixes,
          context: error.context,
        },
        { status: 400 }
      );
    }

    // ✅ Generic error handling
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute pipeline",
        code: "EXECUTION_ERROR",
      },
      { status: 500 }
    );
  }
}
