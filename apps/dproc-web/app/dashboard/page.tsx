"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  TrendingUp,
  CheckCircle,
  Clock,
  FileText,
  Play,
  Settings,
  ArrowRight,
  Loader2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { showErrorToast } from "@/lib/toast-helper";
import {
  StatsCardSkeleton,
  PipelineCardSkeleton,
  ExecutionRowSkeleton,
} from "@/components/loading-skeleton";

interface Pipeline {
  name: string;
  spec?: {
    pipeline: { name: string; description: string; version: string };
    inputs: Array<{
      name: string;
      type: string;
      label: string;
      required: boolean;
    }>;
    outputs: string[];
  };
  valid: boolean;
  errors?: string[];
}

interface Stats {
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  pipelineCount: number;
}

interface Execution {
  id: string;
  pipelineName: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  executionTime?: number;
  createdAt: number;
  outputFormat: string;
}

export default function DashboardPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [retrying, setRetrying] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setError(null);
      setLoading(true);

      const [pipelinesRes, statsRes, historyRes] = await Promise.all([
        fetch("/api/pipelines"),
        fetch("/api/stats"),
        fetch("/api/history?limit=5"),
      ]);

      // Check for errors in responses
      if (!pipelinesRes.ok) {
        const errorData = await pipelinesRes.json();
        throw new Error(errorData.error || "Failed to load pipelines");
      }

      if (!statsRes.ok) {
        const errorData = await statsRes.json();
        throw new Error(errorData.error || "Failed to load stats");
      }

      if (!historyRes.ok) {
        const errorData = await historyRes.json();
        throw new Error(errorData.error || "Failed to load history");
      }

      const pipelinesData = await pipelinesRes.json();
      const statsData = await statsRes.json();
      const historyData = await historyRes.json();

      setPipelines(pipelinesData.pipelines || []);
      setStats(statsData.stats || null);
      setExecutions(historyData.executions || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      showErrorToast(error);
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRetry = () => {
    setRetrying(true);
    loadData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-green-500" />;
      case "failed":
        return <XCircle className="size-4 text-red-500" />;
      case "processing":
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;
      case "cancelled":
        return <XCircle className="size-4 text-yellow-500" />;
      default:
        return <Clock className="size-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "failed":
        return "destructive";
      case "processing":
        return "secondary";
      default:
        return "outline";
    }
  };

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
              <p className="text-muted-foreground">
                Manage and execute your data processing pipelines
              </p>
            </div>
          </div>

          <ErrorAlert error={error} onDismiss={() => setError(null)} />

          <div className="mt-4">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Manage and execute your data processing pipelines
            </p>
          </div>
          <Link href="/dashboard/new">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Plus className="mr-2 size-4" />
              New Pipeline
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Reports Generated
                </CardTitle>
                <TrendingUp className="size-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.totalExecutions}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total executions
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <CheckCircle className="size-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.successRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completion success
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg. Execution Time
                </CardTitle>
                <Clock className="size-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(stats.avgExecutionTime / 1000).toFixed(1)}s
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Average duration
                </p>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Pipelines
                </CardTitle>
                <FileText className="size-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pipelineCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total available
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* Pipelines Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Pipelines</h2>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PipelineCardSkeleton />
              <PipelineCardSkeleton />
              <PipelineCardSkeleton />
            </div>
          ) : pipelines.length === 0 ? (
            <Card className="border-border bg-card">
              <CardContent className="text-center py-12">
                <FileText className="size-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">No pipelines yet</h3>
                <p className="text-muted-foreground mb-6">
                  Create your first pipeline to get started
                </p>
                <Link href="/dashboard/new">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Plus className="mr-2 size-4" />
                    Create Pipeline
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pipelines.map((pipeline) => (
                <Card
                  key={pipeline.name}
                  className="border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <CardTitle className="text-lg">
                        {pipeline.spec?.pipeline.name || pipeline.name}
                      </CardTitle>
                      <Badge
                        variant={pipeline.valid ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {pipeline.valid ? "Valid" : "Invalid"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {pipeline.spec?.pipeline.description || "No description"}
                    </CardDescription>
                    {pipeline.spec && (
                      <p className="text-xs text-muted-foreground mt-2">
                        v{pipeline.spec.pipeline.version}
                      </p>
                    )}
                    {!pipeline.valid && pipeline.errors && (
                      <div className="mt-3 p-2 bg-destructive/10 rounded-md border border-destructive/20">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <div className="text-xs text-destructive space-y-1">
                            {pipeline.errors.map((err, i) => (
                              <p key={i}>{err}</p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/execute/${pipeline.name}`}
                        className="flex-1"
                      >
                        <Button
                          size="sm"
                          className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                          disabled={!pipeline.valid}
                        >
                          <Play className="mr-2 size-4" />
                          Execute
                        </Button>
                      </Link>
                      <Link href={`/dashboard/pipelines/${pipeline.name}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-border bg-transparent"
                        >
                          <Settings className="size-4" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Recent Executions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Recent Executions</h2>
            <Link href="/dashboard/history">
              <Button
                variant="outline"
                className="border-border bg-transparent"
              >
                View All
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              <ExecutionRowSkeleton />
              <ExecutionRowSkeleton />
              <ExecutionRowSkeleton />
            </div>
          ) : executions.length > 0 ? (
            <div className="space-y-3">
              {executions.map((execution) => (
                <Card key={execution.id} className="border-border bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(execution.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-sm">
                              {execution.pipelineName}
                            </h3>
                            <Badge
                              variant={getStatusBadgeVariant(execution.status)}
                              className="text-xs"
                            >
                              {execution.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>
                              {new Date(execution.createdAt).toLocaleString()}
                            </span>
                            {execution.executionTime && (
                              <span>
                                {(execution.executionTime / 1000).toFixed(2)}s
                              </span>
                            )}
                            <span className="uppercase">
                              {execution.outputFormat}
                            </span>
                          </div>
                        </div>
                      </div>
                      {execution.status === "completed" && (
                        <Link href={`/dashboard/history`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border bg-transparent"
                          >
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
                <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No executions yet. Create a pipeline and execute it to see
                  results.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
