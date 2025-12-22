"use client";

import { useChat } from "ai/react";
import { useState } from "react";
import { showErrorToast } from "@/lib/toast-helper";

export interface StreamingReportOptions {
  pipelineName: string;
  inputs: Record<string, unknown>;
  provider: string;
  model: string;
  userApiKey?: string;
}

export function useStreamingReport() {
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const { messages, append, isLoading, stop } = useChat({
    api: "/api/stream",
    onError: (error) => {
      const errorMessage = error.message || "Streaming failed";
      setError(errorMessage);
      showErrorToast(new Error(errorMessage));
    },
    onFinish: (message) => {
      // Extract metadata if provider returns it
      setMetadata({
        tokensUsed: message.content.length, // Approximate
        model: "streaming",
        executionTime: Date.now(), // Approximate
      });
    },
  });

  const generate = async (options: StreamingReportOptions) => {
    try {
      setError(null);
      setMetadata(null);

      await append({
        role: "user",
        content: JSON.stringify(options),
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate report";
      setError(errorMessage);
      showErrorToast(err instanceof Error ? err : new Error(errorMessage));
    }
  };

  return {
    content: messages[messages.length - 1]?.content || "",
    isGenerating: isLoading,
    metadata,
    error,
    generate,
    stop,
  };
}
