import { toast } from "sonner";
import { formatError } from "./error-utils";

export function showErrorToast(error: unknown, context?: string) {
  const formatted = formatError(error);

  toast.error(context || formatted.title, {
    description: formatted.message,
    duration: 5000,
  });
}

export function showSuccessToast(title: string, description?: string) {
  toast.success(title, {
    description,
    duration: 3000,
  });
}

export function showInfoToast(title: string, description?: string) {
  toast.info(title, {
    description,
    duration: 4000,
  });
}

export function showWarningToast(title: string, description?: string) {
  toast.warning(title, {
    description,
    duration: 4000,
  });
}
