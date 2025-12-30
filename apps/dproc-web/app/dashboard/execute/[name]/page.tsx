"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Eye,
  AlertCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { ErrorAlert } from "@/components/error-alert";
import { showErrorToast, showSuccessToast } from "@/lib/toast-helper";

type PipelineSpec = {
  pipeline: {
    name: string;
    description: string;
    version: string;
  };
  inputs: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    default?: any;
    placeholder?: string;
    options?: string[];
    accept?: string;
    maxSize?: number;
  }>;
  outputs: string[];
};

export default function ExecutePipelinePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = use(params);
  const router = useRouter();
  const [spec, setSpec] = useState<PipelineSpec | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [outputFormat, setOutputFormat] = useState<string>("html");
  const [executing, setExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null); // ✅ NEW
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({}); // ✅ NEW

  // Load pipeline spec
  useEffect(() => {
    async function loadSpec() {
      try {
        const res = await fetch(`/api/pipelines/${name}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load pipeline");
        }

        setSpec(data.spec);
        setOutputFormat(data.spec.outputs[0] || "html");

        // Initialize inputs with defaults
        // Initialize inputs with defaults
        const defaultInputs: Record<string, any> = {};
        data.spec.inputs.forEach((input: any) => {
          if (input.default !== undefined) {
            defaultInputs[input.name] =
              input.type === "number"
                ? Number(input.default) // ✅ Convert number defaults
                : input.default;
          }
        });
        setInputs(defaultInputs);
      } catch (err) {
        setLoadError(err); // ✅ Store full error object
        setError((err as Error).message);
      }
    }

    loadSpec();
  }, [name]);

  // Poll execution status
  useEffect(() => {
    if (!executionId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/executions/${executionId}`);
        const data = await res.json();

        setExecutionStatus(data.status);

        // Stop polling if completed or failed
        if (
          data.status.status === "completed" ||
          data.status.status === "failed"
        ) {
          clearInterval(interval);
          setExecuting(false);

          // ✅ Show completion toast
          if (data.status.status === "completed") {
            showSuccessToast(
              "Pipeline completed",
              "Report generated successfully"
            );
          } else if (data.status.status === "failed") {
            showErrorToast(
              new Error(data.status.error || "Pipeline execution failed")
            );
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [executionId]);

  // ✅ NEW: Validate inputs before submission
  const validateInputs = () => {
    const errors: Record<string, string> = {};

    spec?.inputs.forEach((input) => {
      const value = inputs[input.name];

      if (input.required && !value) {
        errors[input.name] = `${input.label} is required`;
      }

      if (input.type === "number" && value && isNaN(Number(value))) {
        errors[input.name] = `${input.label} must be a valid number`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleExecute = async () => {
    // ✅ Validate before executing
    if (!validateInputs()) {
      toast.error("Validation failed", {
        description: "Please fix the errors in the form",
      });
      return;
    }

    setExecuting(true);
    setError(null);
    setExecutionStatus(null);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineName: name,
          inputs,
          outputFormat,
          priority: "normal",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || "Failed to execute pipeline";
        setError(errorMessage);
        showErrorToast(new Error(errorMessage));
        setExecuting(false);
        return;
      }

      setExecutionId(data.executionId);
      showSuccessToast("Pipeline started", "Job queued successfully");
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      showErrorToast(err);
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setExecutionId(null);
    setExecutionStatus(null);
    setError(null);
    setExecuting(false);
    setValidationErrors({}); // ✅ Clear validation errors
  };

  // ✅ Enhanced error state for loading failures
  if (loadError && !spec) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="mb-4 border-border bg-transparent"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to Dashboard
            </Button>
          </Link>
          <ErrorAlert error={loadError} />
        </div>
      </div>
    );
  }

  // ✅ Loading state
  if (!spec) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="size-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="mb-4 border-border bg-transparent"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Generate Report</h1>
          <p className="text-muted-foreground">{spec.pipeline.description}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Form */}
          <div className="lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Configure Inputs</CardTitle>
                <CardDescription>
                  Provide the required inputs for this pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {spec.inputs.map((input) => (
                  <div key={input.name} className="space-y-2">
                    <Label htmlFor={input.name}>
                      {input.label}
                      {input.required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </Label>

                    {input.type === "text" && (
                      <Input
                        id={input.name}
                        placeholder={input.placeholder}
                        value={inputs[input.name] || ""}
                        onChange={(e) => {
                          setInputs({
                            ...inputs,
                            [input.name]: e.target.value,
                          });
                          // ✅ Clear validation error on change
                          if (validationErrors[input.name]) {
                            const newErrors = { ...validationErrors };
                            delete newErrors[input.name];
                            setValidationErrors(newErrors);
                          }
                        }}
                        disabled={executing}
                        className={`bg-secondary/50 border-border ${
                          validationErrors[input.name]
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                    )}

                    {input.type === "number" && (
                      <Input
                        id={input.name}
                        type="number"
                        placeholder={input.placeholder}
                        value={
                          inputs[input.name] !== undefined &&
                          inputs[input.name] !== ""
                            ? String(inputs[input.name])
                            : ""
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          setInputs({
                            ...inputs,
                            [input.name]:
                              value === "" ? undefined : Number(value), // ✅ Store as NUMBER
                          });
                          // Clear validation error on change
                          if (validationErrors[input.name]) {
                            const newErrors = { ...validationErrors };
                            delete newErrors[input.name];
                            setValidationErrors(newErrors);
                          }
                        }}
                        disabled={executing}
                        className={`bg-secondary/50 border-border ${
                          validationErrors[input.name]
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }`}
                      />
                    )}

                    {input.type === "select" && (
                      <Select
                        value={inputs[input.name] || ""}
                        onValueChange={(value) => {
                          setInputs({ ...inputs, [input.name]: value });
                          // ✅ Clear validation error on change
                          if (validationErrors[input.name]) {
                            const newErrors = { ...validationErrors };
                            delete newErrors[input.name];
                            setValidationErrors(newErrors);
                          }
                        }}
                        disabled={executing}
                      >
                        <SelectTrigger
                          className={`bg-secondary/50 border-border ${
                            validationErrors[input.name]
                              ? "border-destructive"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border">
                          {input.options?.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {input.type === "file" && (
                      <>
                        <Input
                          id={input.name}
                          type="file"
                          accept={input.accept || "*"}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            // Check file size (default 10MB max)
                            const maxSize = (input.maxSize || 10) * 1024 * 1024;
                            if (file.size > maxSize) {
                              setValidationErrors({
                                ...validationErrors,
                                [input.name]: `File size must be less than ${input.maxSize || 10}MB`,
                              });
                              return;
                            }

                            // Read file as base64
                            const reader = new FileReader();
                            reader.onload = () => {
                              const base64Content = (
                                reader.result as string
                              ).split(",")[1]; // Remove data:mime;base64, prefix
                              setInputs({
                                ...inputs,
                                [input.name]: {
                                  filename: file.name,
                                  content: base64Content,
                                  mimeType: file.type,
                                  size: file.size,
                                },
                              });

                              // Clear validation error
                              if (validationErrors[input.name]) {
                                const newErrors = { ...validationErrors };
                                delete newErrors[input.name];
                                setValidationErrors(newErrors);
                              }
                            };

                            reader.onerror = () => {
                              setValidationErrors({
                                ...validationErrors,
                                [input.name]: "Failed to read file",
                              });
                            };

                            reader.readAsDataURL(file);
                          }}
                          disabled={executing}
                          className={`bg-secondary/50 border-border ${
                            validationErrors[input.name]
                              ? "border-destructive focus-visible:ring-destructive"
                              : ""
                          }`}
                        />

                        {/* Show selected file info */}
                        {inputs[input.name]?.filename && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                            <FileText className="h-4 w-4" />
                            <span>
                              {inputs[input.name].filename} (
                              {(inputs[input.name].size / 1024).toFixed(2)} KB)
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {/* ✅ Validation error display */}
                    {validationErrors[input.name] && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span>{validationErrors[input.name]}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Output Format */}
                <div className="space-y-2">
                  <Label htmlFor="outputFormat">Output Format</Label>
                  <Select
                    value={outputFormat}
                    onValueChange={setOutputFormat}
                    disabled={executing}
                  >
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border">
                      {spec.outputs.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ Error Alert */}
                {error && (
                  <ErrorAlert
                    error={new Error(error)}
                    onDismiss={() => setError(null)}
                  />
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleExecute}
                    disabled={executing}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                    size="lg"
                  >
                    {executing ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 size-4" />
                        Execute Pipeline
                      </>
                    )}
                  </Button>

                  {executionStatus?.status === "processing" && (
                    <Button
                      variant="destructive"
                      onClick={async () => {
                        if (
                          !confirm("Are you sure you want to cancel this job?")
                        )
                          return;

                        try {
                          const response = await fetch(
                            `/api/jobs/${executionId}/cancel`,
                            {
                              method: "POST",
                            }
                          );

                          if (response.ok) {
                            setExecutionStatus({
                              ...executionStatus,
                              status: "cancelled",
                            });
                            toast.info("Job cancelled", {
                              description: "Pipeline execution was cancelled",
                            });
                          }
                        } catch (error) {
                          showErrorToast(error);
                        }
                      }}
                    >
                      Cancel Job
                    </Button>
                  )}

                  {executionStatus && (
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      size="lg"
                      className="border-border bg-transparent"
                    >
                      New Execution
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Panel */}
          <div>
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                {!executionStatus && !executing && (
                  <div className="text-center py-8">
                    <Clock className="size-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Ready to execute</p>
                  </div>
                )}

                {executing && !executionStatus && (
                  <div className="text-center py-8">
                    <Loader2 className="size-8 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-foreground">Starting...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Worker will pick it up shortly
                    </p>
                  </div>
                )}

                {executionStatus && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge
                        variant={
                          executionStatus.status === "completed"
                            ? "default"
                            : executionStatus.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {executionStatus.status === "completed" && (
                          <CheckCircle className="mr-1 size-3" />
                        )}
                        {executionStatus.status === "failed" && (
                          <XCircle className="mr-1 size-3" />
                        )}
                        {executionStatus.status === "processing" && (
                          <Clock className="mr-1 size-3 animate-pulse" />
                        )}
                        {executionStatus.status}
                      </Badge>
                    </div>

                    {executionStatus.status === "processing" && (
                      <div className="space-y-2">
                        <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-500 animate-pulse"
                            style={{ width: `${executionStatus.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          {executionStatus.progress}% complete
                        </p>
                      </div>
                    )}

                    {executionStatus.status === "completed" && (
                      <Alert className="bg-green-500/10 border-green-500/30">
                        <CheckCircle className="size-4 text-green-500" />
                        <AlertDescription className="text-green-500">
                          Pipeline executed successfully!
                        </AlertDescription>
                      </Alert>
                    )}

                    {executionStatus.metadata?.executionTime && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Execution Time:
                        </span>{" "}
                        <span className="font-medium">
                          {(
                            executionStatus.metadata.executionTime / 1000
                          ).toFixed(2)}
                          s
                        </span>
                      </div>
                    )}

                    {executionStatus.metadata?.tokensUsed && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Tokens Used:
                        </span>{" "}
                        <span className="font-medium">
                          {executionStatus.metadata.tokensUsed.toLocaleString()}
                        </span>
                      </div>
                    )}

                    {executionStatus.outputPath && (
                      <div className="space-y-2 pt-4 border-t border-border">
                        <p className="text-sm font-medium">Output Ready</p>

                        {/* ✅ MDX/PDF Format - Show Preview and PDF Download */}
                        {(outputFormat === "mdx" || outputFormat === "pdf") && (
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-border bg-transparent"
                              onClick={() =>
                                window.open(`/reports/${executionId}`, "_blank")
                              }
                            >
                              <Eye className="mr-2 size-4" />
                              Preview Report
                            </Button>
                            <Button
                              size="sm"
                              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                              onClick={() =>
                                window.open(
                                  `/api/reports/${executionId}/pdf`,
                                  "_blank"
                                )
                              }
                            >
                              <Download className="mr-2 size-4" />
                              Download PDF
                            </Button>
                          </div>
                        )}

                        {/* ✅ Other Formats - Show default preview/download */}
                        {outputFormat !== "mdx" && outputFormat !== "pdf" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 border-border bg-transparent"
                              onClick={() =>
                                window.open(
                                  `/api/preview/${executionId}`,
                                  "_blank"
                                )
                              }
                            >
                              <Eye className="mr-2 size-4" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                              onClick={() =>
                                window.open(
                                  `/api/download/${executionId}`,
                                  "_blank"
                                )
                              }
                            >
                              <Download className="mr-2 size-4" />
                              Download
                            </Button>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground mt-2 break-all">
                          {executionStatus.outputPath}
                        </p>
                      </div>
                    )}

                    {/* ✅ Enhanced error display */}
                    {executionStatus.error && (
                      <ErrorAlert
                        error={new Error(executionStatus.error)}
                        title="Execution Failed"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {executionStatus?.status === "completed" && (
              <Card className="mt-4 border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-sm">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border bg-transparent"
                    asChild
                  >
                    <Link href="/dashboard/history">View All History</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-border bg-transparent"
                    asChild
                  >
                    <Link href="/dashboard">Back to Dashboard</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
