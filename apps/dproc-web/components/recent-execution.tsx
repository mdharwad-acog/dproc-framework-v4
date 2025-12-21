"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const res = await fetch("/api/history?limit=5");
        const data = await res.json();
        setExecutions(data.history || []);
      } catch (error) {
        console.error("Failed to load recent executions:", error);
      } finally {
        setLoading(false);
      }
    }

    loadRecent();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (executions.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Clock className="size-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600">No reports yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {executions.map((execution) => (
        <Card key={execution.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{execution.pipelineName}</h3>
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
                    {execution.status === "completed" && (
                      <CheckCircle className="mr-1 size-3" />
                    )}
                    {execution.status === "failed" && (
                      <XCircle className="mr-1 size-3" />
                    )}
                    {execution.status === "processing" && (
                      <Clock className="mr-1 size-3" />
                    )}
                    {execution.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{new Date(execution.createdAt).toLocaleString()}</span>
                  {execution.executionTime && (
                    <span>{(execution.executionTime / 1000).toFixed(2)}s</span>
                  )}
                  <span className="uppercase">{execution.outputFormat}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
