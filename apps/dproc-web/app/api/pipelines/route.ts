import { NextResponse } from "next/server";
import { listPipelines } from "@/lib/server-api";

export async function GET() {
  try {
    const pipelines = await listPipelines();
    return NextResponse.json({ pipelines });
  } catch (error) {
    console.error("Error fetching pipelines:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipelines" },
      { status: 500 }
    );
  }
}
