import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle2, XCircle } from "lucide-react";

interface WarningCalloutProps {
  title?: string;
  children: ReactNode;
  variant?: "warning" | "info" | "success" | "error";
}

export function WarningCallout({
  title,
  children,
  variant = "info",
}: WarningCalloutProps) {
  const getIcon = () => {
    switch (variant) {
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4" />;
      case "error":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariantClass = () => {
    switch (variant) {
      case "warning":
        return "border-yellow-500 text-yellow-900 dark:text-yellow-100";
      case "success":
        return "border-green-500 text-green-900 dark:text-green-100";
      case "error":
        return "border-red-500 text-red-900 dark:text-red-100";
      default:
        return "border-blue-500 text-blue-900 dark:text-blue-100";
    }
  };

  return (
    <Alert className={getVariantClass()}>
      {getIcon()}
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
