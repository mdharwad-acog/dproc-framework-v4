import { NextResponse } from "next/server";
import { getGlobalStats, getPipelineStats } from "@/lib/server-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pipeline = searchParams.get("pipeline");

    if (pipeline) {
      const stats = await getPipelineStats(pipeline);
      return NextResponse.json({ stats });
    } else {
      const globalStats = await getGlobalStats();
      return NextResponse.json({ stats: globalStats });
    }
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
