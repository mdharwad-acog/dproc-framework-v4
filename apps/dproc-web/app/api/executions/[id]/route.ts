import { NextResponse } from "next/server";
import { getJobStatus } from "@/lib/server-api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ← Added await here
    const status = await getJobStatus(id);

    if (!status) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Error fetching execution status:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution status" },
      { status: 500 }
    );
  }
}
