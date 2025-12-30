import { NextRequest, NextResponse } from "next/server";
import { getReportData } from "@/lib/report-api";
import { chromium } from "playwright";

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

    const browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage({
      viewport: {
        width: 794, // A4 width in pixels at 96 DPI
        height: 1123, // A4 height in pixels at 96 DPI
      },
    });

    const baseUrl = new URL(request.url).origin;
    const printUrl = `${baseUrl}/reports/${id}/print`;

    console.log(`[PDF] Loading page: ${printUrl}`);

    await page.goto(printUrl, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    // Wait for article element
    await page.waitForSelector("article", { timeout: 30000 });

    // Wait for charts to render
    await page
      .waitForSelector(".recharts-wrapper", { timeout: 10000 })
      .catch(() => {
        console.log("[PDF] No charts found, continuing...");
      });

    // Wait for images
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter((img: any) => !img.complete)
          .map(
            (img: any) =>
              new Promise((resolve) => {
                img.onload = img.onerror = resolve;
              })
          )
      );
    });

    // Shorter wait - 1 second is enough
    await page.waitForTimeout(1000);

    console.log(`[PDF] Page loaded, generating PDF...`);

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      margin: {
        top: "18mm",
        bottom: "18mm",
        left: "15mm",
        right: "15mm",
      },
      preferCSSPageSize: true, // ✅ Use CSS @page settings
      scale: 1,
    });

    await browser.close();

    console.log(`[PDF] PDF generated successfully`);

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="report-${execution.pipelineName}-${id}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("PDF generation failed:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF", message: error.message },
      { status: 500 }
    );
  }
}
