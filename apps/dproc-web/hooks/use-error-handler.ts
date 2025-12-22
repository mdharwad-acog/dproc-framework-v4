"use client";

import { useCallback } from "react";
import { showErrorToast } from "@/lib/toast-helper";
import { formatError } from "@/lib/error-utils";

export function useErrorHandler() {
  const handleError = useCallback((error: unknown, context?: string) => {
    console.error(context ? `${context}:` : "Error:", error);

    const formatted = formatError(error);

    showErrorToast(error, context);

    return formatted;
  }, []);

  return { handleError };
}
