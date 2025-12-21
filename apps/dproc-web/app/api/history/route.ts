import { NextResponse } from "next/server";
import { getExecutionHistory } from "@/lib/server-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pipelineName = searchParams.get("pipeline") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50");

    const history = await getExecutionHistory({ pipelineName, limit });
    return NextResponse.json({ history });
  } catch (error) {
    console.error("Error fetching history:", error);
    return NextResponse.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
