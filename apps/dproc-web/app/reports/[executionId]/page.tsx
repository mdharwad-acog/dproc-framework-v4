import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/lib/mdx-components";
import { db } from "@aganitha/dproc-core";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Download, Printer, ArrowLeft } from "lucide-react";

export default async function ReportPage({
  params,
}: {
  params: { executionId: string };
}) {
  const execution = await db.getExecution(params.executionId);

  if (!execution) {
    notFound();
  }

  if (execution.status !== "completed") {
    return (
      <div className="container mx-auto py-12 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            Report Status: {execution.status}
          </h1>
          {execution.error && (
            <p className="text-red-500 mb-4">{execution.error}</p>
          )}
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!execution.mdxContent) {
    return (
      <div className="container mx-auto py-12 max-w-4xl">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Report Content</h1>
          <p className="text-muted-foreground mb-8">
            MDX content not available for this execution.
          </p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with actions */}
      <div className="border-b bg-card print:hidden">
        <div className="container mx-auto py-4 max-w-4xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{execution.pipelineName}</h2>
            <p className="text-sm text-muted-foreground">
              {new Date(execution.createdAt).toLocaleString()} •
              {execution.executionTime}ms •{execution.tokensUsed} tokens
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Link href={`/reports/${params.executionId}/print`} target="_blank">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print View
              </Button>
            </Link>
            <Link href={`/api/reports/${params.executionId}/pdf`}>
              <Button size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* MDX Content - React renders to HTML */}
      <div className="container mx-auto py-8 max-w-4xl">
        <article className="prose prose-slate dark:prose-invert max-w-none">
          <MDXRemote source={execution.mdxContent} components={mdxComponents} />
        </article>
      </div>
    </div>
  );
}
