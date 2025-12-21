import { NextResponse } from "next/server";
import { getPipelineDetails } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params; // ← Added await here
    const details = await getPipelineDetails(name);
    return NextResponse.json(details);
  } catch (error) {
    console.error("Error fetching pipeline details:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch pipeline details",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
