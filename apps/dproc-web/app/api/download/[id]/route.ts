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
    const content = await readFile(execution.outputPath);
    const format = execution.outputFormat;

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      html: "text/html",
      md: "text/markdown",
      pdf: "application/pdf",
      pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };

    const contentType = contentTypes[format] || "application/octet-stream";
    const filename = `${execution.pipelineName}-${id}.${format}`;

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
