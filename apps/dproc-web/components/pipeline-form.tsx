"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { PipelineSpec } from "@aganitha/dproc-core";

interface PipelineFormProps {
  pipeline: { name: string; spec: PipelineSpec };
  onSubmit: (data: ExecutionData) => Promise<void>;
}

export interface ExecutionData {
  pipelineName: string;
  inputs: Record<string, unknown>;
  provider: string;
  model: string;
  userApiKey?: string;
  outputFormat: string;
}

const PROVIDER_MODELS = {
  openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  anthropic: [
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ],
  google: ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
};

export function PipelineForm({ pipeline, onSubmit }: PipelineFormProps) {
  const [inputs, setInputs] = useState<Record<string, unknown>>({});
  const [provider, setProvider] = useState("google");
  const [model, setModel] = useState("gemini-2.5-flash");
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [outputFormat, setOutputFormat] = useState<string>(
    pipeline.spec.outputs[0] || "html"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateInputs = () => {
    const errors: Record<string, string> = {};

    pipeline.spec.inputs.forEach((input) => {
      const value = inputs[input.name];

      // Check required fields
      if (input.required && !value) {
        errors[input.name] = `${input.label} is required`;
      }

      // Validate number type
      if (input.type === "number" && value !== "" && value !== undefined) {
        if (isNaN(Number(value))) {
          errors[input.name] = `${input.label} must be a valid number`;
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      await onSubmit({
        pipelineName: pipeline.name,
        inputs,
        provider,
        model,
        userApiKey: useOwnKey ? userApiKey : undefined,
        outputFormat,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle>{pipeline.spec.pipeline.name}</CardTitle>
          <CardDescription>
            {pipeline.spec.pipeline.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Inputs */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Inputs</h3>
            {pipeline.spec.inputs.map((input) => (
              <div key={input.name} className="space-y-2">
                <Label htmlFor={input.name}>
                  {input.label}
                  {input.required && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Required
                    </Badge>
                  )}
                </Label>

                {/* TEXT INPUT */}
                {input.type === "text" && (
                  <Input
                    id={input.name}
                    value={(inputs[input.name] as string) || ""}
                    onChange={(e) =>
                      setInputs({ ...inputs, [input.name]: e.target.value })
                    }
                    placeholder={
                      input.placeholder || `Enter ${input.label.toLowerCase()}`
                    }
                    className="bg-secondary/50 border-border"
                  />
                )}

                {/* NUMBER INPUT */}
                {input.type === "number" && (
                  <Input
                    id={input.name}
                    type="number"
                    value={
                      inputs[input.name] !== undefined &&
                      inputs[input.name] !== ""
                        ? Number(inputs[input.name])
                        : ""
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      // ✅ Store as NUMBER, not string
                      setInputs({
                        ...inputs,
                        [input.name]: value === "" ? undefined : Number(value),
                      });
                    }}
                    placeholder={
                      input.placeholder || `Enter ${input.label.toLowerCase()}`
                    }
                    className="bg-secondary/50 border-border"
                    min={0}
                    step={1}
                  />
                )}

                {/* SELECT INPUT */}
                {input.type === "select" && (
                  <Select
                    value={(inputs[input.name] as string) || ""}
                    onValueChange={(value) =>
                      setInputs({ ...inputs, [input.name]: value })
                    }
                  >
                    <SelectTrigger className="bg-secondary/50 border-border">
                      <SelectValue
                        placeholder={`Select ${input.label.toLowerCase()}`}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {input.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {validationErrors[input.name] && (
                  <p className="text-sm text-destructive">
                    {validationErrors[input.name]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* LLM Config */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">LLM Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(val) => {
                    setProvider(val);
                    setModel(
                      PROVIDER_MODELS[val as keyof typeof PROVIDER_MODELS][0]
                    );
                  }}
                >
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="google">Google</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="bg-secondary/50 border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_MODELS[
                      provider as keyof typeof PROVIDER_MODELS
                    ].map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Hybrid API key */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useOwnKey}
                onChange={(e) => setUseOwnKey(e.target.checked)}
                className="w-4 h-4"
              />
              <Label>Use my own API key</Label>
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            </div>

            {useOwnKey && (
              <>
                <Input
                  type="password"
                  placeholder="Enter your API key"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                  required={useOwnKey}
                  className="bg-secondary/50 border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Your API key is only used for this request and never stored on
                  the server.
                </p>
              </>
            )}

            {!useOwnKey && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Using system credentials (configured via environment).
              </p>
            )}
          </div>

          {/* Output Format */}
          <div className="space-y-2">
            <Label>Output Format</Label>
            <Select value={outputFormat} onValueChange={setOutputFormat}>
              <SelectTrigger className="bg-secondary/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pipeline.spec.outputs.map((fmt) => (
                  <SelectItem key={fmt} value={fmt}>
                    {fmt.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-linear-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground"
          >
            {isLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
