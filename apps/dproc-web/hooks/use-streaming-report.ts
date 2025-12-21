"use client";

import { useChat } from "ai/react";
import { useState } from "react";

export interface StreamingReportOptions {
  pipelineName: string;
  inputs: Record<string, any>;
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
      setError(error.message);
    },
    onFinish: (message) => {
      // Extract metadata if provider returns it
      setMetadata({
        tokensUsed: message.content.length, // Approximate
        model: "streaming",
      });
    },
  });

  const generate = async (options: StreamingReportOptions) => {
    setError(null);
    setMetadata(null);

    await append({
      role: "user",
      content: JSON.stringify(options),
    });
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
