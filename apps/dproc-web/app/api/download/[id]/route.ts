// apps/dproc-web/app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getReportData } from "@/lib/report-api";
import { chromium } from "playwright";
import { readFile } from "fs/promises";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await getReportData(id);

    if (!data) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    const { execution } = data;
    const requestedFormat = execution.outputFormat || "pdf";

    // If user has a custom output file, serve it
    if (
      execution.userOutputPath &&
      execution.userOutputPath !== execution.outputPath
    ) {
      const content = await readFile(execution.userOutputPath, "utf-8");
      const contentType = getContentType(requestedFormat);

      return new NextResponse(content, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="report-${id}.${requestedFormat}"`,
        },
      });
    }

    // Otherwise, convert MDX to requested format
    switch (requestedFormat) {
      case "pdf":
        return await generatePDF(request, id, execution);

      case "html":
        return await generateHTML(request, id, execution);

      case "md":
      case "markdown":
        return await generateMarkdown(id, execution);

      default:
        // Default to PDF
        return await generatePDF(request, id, execution);
    }
  } catch (error: any) {
    console.error("Download failed:", error);
    return NextResponse.json(
      { error: "Failed to generate download", message: error.message },
      { status: 500 }
    );
  }
}

async function generatePDF(request: NextRequest, id: string, execution: any) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = new URL(request.url).origin;
  const printUrl = `${baseUrl}/reports/${id}/print`;

  await page.goto(printUrl, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  await page.waitForTimeout(2000);

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${execution.pipelineName}-${id}.pdf"`,
    },
  });
}

async function generateHTML(request: NextRequest, id: string, execution: any) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const baseUrl = new URL(request.url).origin;
  const reportUrl = `${baseUrl}/reports/${id}`;

  await page.goto(reportUrl, {
    waitUntil: "networkidle",
    timeout: 30000,
  });

  const html = await page.content();
  await browser.close();

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="report-${id}.html"`,
    },
  });
}

async function generateMarkdown(id: string, execution: any) {
  // Read the MDX file and strip JSX components to get plain markdown
  const mdxContent = await readFile(execution.outputPath!, "utf-8");

  // Simple conversion: remove JSX components, keep markdown
  const markdown = mdxContent
    .replace(/<[^>]+>/g, "") // Remove JSX tags
    .replace(/\{[^}]+\}/g, "") // Remove JSX expressions
    .trim();

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="report-${id}.md"`,
    },
  });
}

function getContentType(format: string): string {
  const types: Record<string, string> = {
    pdf: "application/pdf",
    html: "text/html",
    md: "text/markdown",
    markdown: "text/markdown",
    json: "application/json",
    xml: "application/xml",
  };
  return types[format] || "application/octet-stream";
}
