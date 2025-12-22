import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";
import { formatError } from "@/lib/error-utils";

interface ErrorAlertProps {
  error: unknown;
  title?: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, title, onDismiss }: ErrorAlertProps) {
  const formatted = formatError(error);

  return (
    <Alert variant="destructive" className="border-destructive/50">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>{title || formatted.title}</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-destructive/20"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p>{formatted.message}</p>

        {formatted.code && (
          <p className="text-xs font-mono opacity-80">
            Error Code: {formatted.code}
          </p>
        )}

        {formatted.fixes && formatted.fixes.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-medium mb-1">Possible fixes:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {formatted.fixes.map((fix, i) => (
                <li key={i}>{fix}</li>
              ))}
            </ul>
          </div>
        )}

        {process.env.NODE_ENV === "development" &&
          formatted.technicalDetails && (
            <details className="mt-3">
              <summary className="text-xs cursor-pointer hover:underline">
                Technical details
              </summary>
              <pre className="mt-2 text-xs bg-destructive/10 p-2 rounded overflow-auto max-h-40">
                {formatted.technicalDetails}
              </pre>
            </details>
          )}
      </AlertDescription>
    </Alert>
  );
}
