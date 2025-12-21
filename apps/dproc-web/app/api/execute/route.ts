import { NextResponse } from "next/server";
import { executeJob } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pipelineName, inputs, outputFormat, priority, userId } = body;

    // Validation
    if (!pipelineName) {
      return NextResponse.json(
        { error: "Pipeline name is required" },
        { status: 400 }
      );
    }

    if (!inputs || typeof inputs !== "object") {
      return NextResponse.json(
        { error: "Inputs must be a valid object" },
        { status: 400 }
      );
    }

    if (!outputFormat) {
      return NextResponse.json(
        { error: "Output format is required" },
        { status: 400 }
      );
    }

    // Execute job
    const result = await executeJob({
      pipelineName,
      inputs,
      outputFormat,
      priority: priority || "normal",
      userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error executing job:", error);
    return NextResponse.json(
      {
        error: "Failed to execute job",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
