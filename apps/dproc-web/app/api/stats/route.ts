import { getGlobalStats } from "@/lib/server-api";
import { NextResponse } from "next/server";
import { DProcError } from "@aganitha/dproc-core";

export async function GET() {
  try {
    const stats = await getGlobalStats();
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Stats API error:", error);

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
          error instanceof Error ? error.message : "Failed to get statistics",
        code: "STATS_ERROR",
      },
      { status: 500 }
    );
  }
}
