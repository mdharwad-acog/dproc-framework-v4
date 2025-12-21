import { NextResponse } from "next/server";
import { getExecutionDetails } from "@/lib/server-api";
import { readFile } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const execution = await getExecutionDetails(id);

    if (!execution || !execution.outputPath) {
      return NextResponse.json(
        { error: "Output file not found" },
        { status: 404 }
      );
    }

    // Read the file
    const content = await readFile(execution.outputPath, "utf-8");

    return new NextResponse(content, {
      headers: {
        "Content-Type":
          execution.outputFormat === "html" ? "text/html" : "text/plain",
      },
    });
  } catch (error) {
    console.error("Error previewing file:", error);
    return NextResponse.json(
      { error: "Failed to preview file" },
      { status: 500 }
    );
  }
}
