"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Download,
  Eye,
  Search,
  Filter,
  TrendingDown,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { ErrorAlert } from "@/components/error-alert";
import { showErrorToast } from "@/lib/toast-helper";
import {
  StatsCardSkeleton,
  ExecutionRowSkeleton,
} from "@/components/loading-skeleton";

interface ExecutionRecord {
  id: string;
  jobId: string;
  pipelineName: string;
  inputs: Record<string, any>;
  outputFormat: string;
  status: "queued" | "processing" | "completed" | "failed" | "cancelled";
  priority: "low" | "normal" | "high";
  outputPath?: string;
  bundlePath?: string;
  executionTime?: number;
  tokensUsed?: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export default function HistoryPage() {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [filteredExecutions, setFilteredExecutions] = useState<
    ExecutionRecord[]
  >([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");
  const [retrying, setRetrying] = useState<boolean>(false);

  const loadHistory = async () => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch("/api/history?limit=100");

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load execution history");
      }

      const data = await res.json();
      setExecutions(data.executions || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      showErrorToast(error);
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  // Apply filters
  useEffect(() => {
    let results = executions;

    // Search filter
    if (searchTerm) {
      results = results.filter(
        (exec) =>
          exec.pipelineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exec.jobId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      results = results.filter((exec) => exec.status === statusFilter);
    }

    // Pipeline filter
    if (pipelineFilter !== "all") {
      results = results.filter((exec) => exec.pipelineName === pipelineFilter);
    }

    setFilteredExecutions(results);
  }, [executions, searchTerm, statusFilter, pipelineFilter]);

  const uniquePipelines = Array.from(
    new Set(executions.map((e) => e.pipelineName))
  ).sort();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-green-500" />;
      case "failed":
        return <XCircle className="size-4 text-red-500" />;
      case "processing":
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;
      case "queued":
        return <Clock className="size-4 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="size-4 text-orange-500" />;
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

  const stats = {
    total: executions.length,
    completed: executions.filter((e) => e.status === "completed").length,
    failed: executions.filter((e) => e.status === "failed").length,
    successRate:
      executions.length > 0
        ? (
            (executions.filter((e) => e.status === "completed").length /
              executions.length) *
            100
          ).toFixed(1)
        : "0",
  };

  const handleRetry = () => {
    setRetrying(true);
    loadHistory();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="border-border bg-transparent mb-6"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Execution History</h1>
          <p className="text-muted-foreground">
            Monitor and analyze pipeline executions
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6">
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {retrying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          </div>
        )}

        {/* Stats Cards */}
        {loading ? (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </div>
        ) : (
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Executions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {stats.completed}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {stats.failed}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">
                  {stats.successRate}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="border-border bg-card mb-8">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="size-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by pipeline, ID, or job..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 bg-secondary/50 border-border"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={statusFilter}
                  onValueChange={(value: string) => setStatusFilter(value)}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pipeline Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Pipeline</label>
                <Select
                  value={pipelineFilter}
                  onValueChange={(value: string) => setPipelineFilter(value)}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All Pipelines</SelectItem>
                    {uniquePipelines.map((pipeline) => (
                      <SelectItem key={pipeline} value={pipeline}>
                        {pipeline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">
            <ExecutionRowSkeleton />
            <ExecutionRowSkeleton />
            <ExecutionRowSkeleton />
            <ExecutionRowSkeleton />
            <ExecutionRowSkeleton />
          </div>
        ) : filteredExecutions.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center">
              <TrendingDown className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No executions found</h3>
              <p className="text-muted-foreground mb-4">
                {executions.length === 0
                  ? "No execution history available yet."
                  : "Try adjusting your filters."}
              </p>
              {searchTerm ||
              statusFilter !== "all" ||
              pipelineFilter !== "all" ? (
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setPipelineFilter("all");
                  }}
                  variant="outline"
                  className="border-border bg-transparent"
                >
                  Clear Filters
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredExecutions.map((execution) => (
              <Card
                key={execution.id}
                className="border-border bg-card hover:bg-secondary/30 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(execution.status)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm">
                            {execution.pipelineName}
                          </h3>
                          <Badge
                            variant={getStatusBadgeVariant(execution.status)}
                            className="text-xs"
                          >
                            {execution.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs border-border bg-transparent"
                          >
                            {execution.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                          <span>ID: {execution.id.substring(0, 8)}...</span>
                          <span>
                            {new Date(execution.createdAt).toLocaleString()}
                          </span>
                          {execution.executionTime && (
                            <span>
                              {(execution.executionTime / 1000).toFixed(2)}s
                            </span>
                          )}
                          {execution.tokensUsed && (
                            <span>
                              {execution.tokensUsed.toLocaleString()} tokens
                            </span>
                          )}
                          <span className="uppercase">
                            {execution.outputFormat}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {execution.status === "completed" &&
                      execution.outputPath && (
                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-border bg-transparent"
                          >
                            <a
                              href={`/api/preview/${execution.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Eye className="size-4" />
                            </a>
                          </Button>
                          <Button
                            asChild
                            size="sm"
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            <a href={`/api/download/${execution.id}`} download>
                              <Download className="size-4" />
                            </a>
                          </Button>
                        </div>
                      )}
                  </div>

                  {/* Error Message */}
                  {execution.error && (
                    <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                        <p className="text-xs text-destructive">
                          {execution.error}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
