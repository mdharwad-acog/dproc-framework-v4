"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { showErrorToast } from "@/lib/toast-helper";
import { ExecutionRowSkeleton } from "./loading-skeleton";

type Execution = {
  id: string;
  pipelineName: string;
  status: string;
  executionTime?: number;
  createdAt: number;
  outputFormat: string;
};

export function RecentExecutions() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadRecent() {
      try {
        setError(null);
        const res = await fetch("/api/history?limit=5");

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(
            errorData.error || "Failed to load recent executions"
          );
        }

        const data = await res.json();
        setExecutions(data.executions || []);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        showErrorToast(error);
        console.error("Failed to load recent executions:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRecent();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-4 text-green-500" />;
      case "failed":
        return <XCircle className="size-4 text-red-500" />;
      case "processing":
        return <Loader2 className="size-4 text-blue-500 animate-spin" />;
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
      default:
        return "secondary";
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <ExecutionRowSkeleton />
        <ExecutionRowSkeleton />
        <ExecutionRowSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Failed to load recent executions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="p-8 text-center">
          <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No reports yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
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
                      variant={getStatusBadgeVariant(execution.status) as any}
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
                    <span className="uppercase">{execution.outputFormat}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
