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
} from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/history?limit=100");
        const data = await res.json();
        setExecutions(data.history || []);
      } catch (error) {
        console.error("[v0] Failed to load history:", error);
      } finally {
        setLoading(false);
      }
    }

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
        return <Clock className="size-4 text-blue-500 animate-spin" />;
      case "queued":
        return <Loader2 className="size-4 text-yellow-500" />;
      default:
        return <Clock className="size-4 text-gray-500" />;
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

        {/* Stats Cards */}
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
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
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
                  onValueChange={setPipelineFilter}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-secondary border-border">
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
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center">
              <Loader2 className="size-8 text-accent mx-auto mb-4 animate-spin" />
              <p>Loading execution history...</p>
            </CardContent>
          </Card>
        ) : filteredExecutions.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center">
              <TrendingDown className="size-8 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No executions found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or create a new execution.
              </p>
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
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">
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
                          <Badge
                            variant="outline"
                            className="text-xs border-border bg-transparent"
                          >
                            {execution.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>ID: {execution.id.substring(0, 8)}...</span>
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

                    {/* Action Buttons */}
                    {execution.status === "completed" &&
                      execution.outputPath && (
                        <div className="flex gap-2">
                          <Button
                            asChild
                            size="sm"
                            className="bg-accent hover:bg-accent/90 text-accent-foreground"
                          >
                            <a href={`/api/download/${execution.id}`} download>
                              <Download className="size-4" />
                            </a>
                          </Button>
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
                        </div>
                      )}
                  </div>

                  {/* Error Message */}
                  {execution.error && (
                    <div className="mt-3 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-500">
                      {execution.error}
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
