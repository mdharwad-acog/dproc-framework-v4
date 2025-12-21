import { NextRequest, NextResponse } from "next/server";
import { cancelJob } from "@/lib/server-api";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // Await params for Next.js 15+
    const result = await cancelJob(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Cancel job error:", error);
    return NextResponse.json(
      { error: "Failed to cancel job" },
      { status: 500 }
    );
  }
}
