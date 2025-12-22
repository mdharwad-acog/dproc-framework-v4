"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  Loader2,
  Terminal,
  Copy,
  CheckCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NewPipelinePage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [copied, setCopied] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Pipeline name is required";
    } else if (!/^[a-z0-9-]+$/.test(name)) {
      errors.name = "Use only lowercase letters, numbers, and hyphens";
    } else if (name.length < 3) {
      errors.name = "Name must be at least 3 characters";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    setName(sanitized);

    // Clear validation error on change
    if (validationErrors.name) {
      const newErrors = { ...validationErrors };
      delete newErrors.name;
      setValidationErrors(newErrors);
    }
  };

  const generateCommand = () => {
    const baseCommand = `pnpm dproc init ${name || "pipeline-name"}`;
    const descFlag = description ? ` --description "${description}"` : "";
    return baseCommand + descFlag;
  };

  const handleCopyCommand = async () => {
    try {
      await navigator.clipboard.writeText(generateCommand());
      setCopied(true);
      toast.success("Command copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy command");
    }
  };

  const handleCreate = async () => {
    if (!validateForm()) {
      toast.error("Validation failed", {
        description: "Please fix the errors in the form",
      });
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Show command instructions
      await handleCopyCommand();

      toast.info("Run the copied command", {
        description:
          "Execute the command in your terminal to create the pipeline",
      });
    } catch (err) {
      setError((err as Error).message);
      toast.error("Failed to generate command");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="mb-6 border-border bg-transparent"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Create New Pipeline</h1>
            <p className="text-muted-foreground">
              Define a new data processing pipeline using the CLI
            </p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>Pipeline Configuration</CardTitle>
              <CardDescription>
                Provide basic information for your new pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name">
                  Pipeline Name
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="my-awesome-pipeline"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className={cn(
                    "bg-secondary/50 border-border",
                    validationErrors.name &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {validationErrors.name ? (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{validationErrors.name}</span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Use lowercase letters, numbers, and hyphens only
                  </p>
                )}
              </div>

              {/* Description Input */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="What does this pipeline do?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="bg-secondary/50 border-border"
                />
                <p className="text-sm text-muted-foreground">
                  Provide a brief description of the pipeline's purpose
                </p>
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive" className="border-destructive/50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Command Preview */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-accent" />
                  <Label className="text-sm font-medium">Command to Run</Label>
                </div>

                <div className="relative">
                  <Alert className="bg-muted border-border font-mono text-sm">
                    <AlertDescription className="pr-12">
                      {generateCommand()}
                    </AlertDescription>
                  </Alert>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={handleCopyCommand}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Info Alert */}
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-500 text-sm">
                  <strong>Note:</strong> Pipeline creation requires the dproc
                  CLI. Copy the command above and run it in your terminal to
                  create the pipeline structure.
                </AlertDescription>
              </Alert>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                  className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 size-4" />
                      Copy Command
                    </>
                  )}
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="border-border bg-transparent"
                >
                  <Link href="/dashboard">Cancel</Link>
                </Button>
              </div>

              {/* Additional Help */}
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  After creating the pipeline:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Configure your pipeline in the generated directory</li>
                  <li>Add input/output specifications</li>
                  <li>Define prompts and processing logic</li>
                  <li>Return here to execute your pipeline</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
