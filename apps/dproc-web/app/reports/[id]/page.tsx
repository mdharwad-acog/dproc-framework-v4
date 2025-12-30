import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import remarkGfm from "remark-gfm";
import {
  KpiCard,
  KpiGrid,
  ChartBar,
  WarningCallout,
} from "@/components/report";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getReportData } from "@/lib/report-api";
import "@/app/reports/_styles/document.css";

const components = {
  KpiCard,
  KpiGrid,
  ChartBar,
  WarningCallout,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
};

const mdxOptions = {
  mdxOptions: {
    remarkPlugins: [remarkGfm],
  },
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getReportData(id);

  if (!data) {
    notFound();
  }

  const { execution, mdxContent } = data;

  return (
    <div className="min-h-screen bg-background">
      {/* ✅ Navigation respects theme */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-medium">{execution.pipelineName}</h1>
              <p className="text-xs text-muted-foreground">ID: {id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/reports/${id}/print`} target="_blank">
              <Button variant="ghost" size="sm">
                <Printer className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </Link>
            <Link href={`/api/reports/${id}/pdf`} target="_blank">
              <Button size="sm" className="mr-5">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ✅ Background respects theme */}
      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          {/* ✅ Document is ALWAYS light - like a PDF */}
          <article className="report-document">
            <MDXRemote
              source={mdxContent}
              components={components}
              options={mdxOptions}
            />
          </article>
        </div>
      </main>
    </div>
  );
}
