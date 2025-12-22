"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Clock, Coins, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { useState } from "react";

interface ReportPreviewProps {
  report: string;
  metadata: {
    executionTime: number;
    tokensUsed?: number;
    model: string;
  };
  keySource: "user" | "system";
  format: string;
}

export function ReportPreview({
  report,
  metadata,
  keySource,
  format,
}: ReportPreviewProps) {
  const [downloading, setDownloading] = useState<boolean>(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const ext = format || "md";
      const mime =
        ext === "html"
          ? "text/html"
          : ext === "pdf"
            ? "application/pdf"
            : ext === "docx"
              ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              : "text/markdown";

      const blob = new Blob([report], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download report");
    } finally {
      setDownloading(false);
    }
  };

  if (!report) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No report content available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Report</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs border-border bg-transparent"
            >
              {keySource === "user" ? "Your API Key" : "System Key"}
            </Badge>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {downloading ? (
                <>
                  <Clock className="mr-2 size-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 size-4" />
                  Download
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metadata */}
        <div className="flex flex-wrap gap-3 text-sm">
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="size-3" />
            {metadata.executionTime}ms
          </Badge>
          {metadata.tokensUsed && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Coins className="size-3" />
              {metadata.tokensUsed.toLocaleString()} tokens
            </Badge>
          )}
          <Badge variant="outline" className="border-border bg-transparent">
            Model: {metadata.model}
          </Badge>
          <Badge variant="outline" className="border-border bg-transparent">
            Format: {format.toUpperCase()}
          </Badge>
        </div>

        {/* Report Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert border border-border rounded-lg p-6 bg-secondary/20">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
