"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Clock, Coins } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const handleDownload = () => {
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
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Generated Report</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={keySource === "user" ? "default" : "secondary"}>
              {keySource === "user" ? "Your API Key" : "System Key"}
            </Badge>
            <Button onClick={handleDownload} size="sm">
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-slate-600 mt-2">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {metadata.executionTime}ms
          </span>
          {metadata.tokensUsed && (
            <span className="flex items-center gap-1">
              <Coins className="h-4 w-4" />
              {metadata.tokensUsed.toLocaleString()} tokens
            </span>
          )}
          <span>Model: {metadata.model}</span>
          <span>Format: {format.toUpperCase()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="prose prose-slate max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
