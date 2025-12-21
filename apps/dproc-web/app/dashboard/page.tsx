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
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [pipelinesRes, statsRes, historyRes] = await Promise.all([
          fetch("/api/pipelines"),
          fetch("/api/stats"),
          fetch("/api/history?limit=5"),
        ]);

        const pipelinesData = await pipelinesRes.json();
        const statsData = await statsRes.json();
        const historyData = await historyRes.json();

        setPipelines(pipelinesData.pipelines || []);
        setStats(statsData.stats || null);
        setExecutions(historyData.history || []);
      } catch (error) {
        console.error("[v0] Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-green-500" />;
      case "failed":
        return <CheckCircle className="size-4 text-red-500" />;
      case "processing":
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="size-4 text-yellow-500" />;
    }
  };

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
        {stats && !loading && (
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
        )}

        {/* Pipelines Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Your Pipelines</h2>

          {pipelines.length === 0 && !loading ? (
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

          {executions.length > 0 ? (
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
                              variant={
                                execution.status === "completed"
                                  ? "default"
                                  : execution.status === "failed"
                                    ? "destructive"
                                    : "secondary"
                              }
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border bg-card">
              <CardContent className="p-8 text-center">
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
