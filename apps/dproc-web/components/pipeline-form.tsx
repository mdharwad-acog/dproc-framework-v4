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
import type { PipelineSpec } from "@aganitha/dproc-types";

interface PipelineFormProps {
  pipeline: { name: string; spec: PipelineSpec };
  onSubmit: (data: ExecutionData) => Promise<void>;
}

export interface ExecutionData {
  pipelineName: string;
  inputs: Record<string, any>;
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
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [provider, setProvider] = useState<string>("google");
  const [model, setModel] = useState<string>("gemini-2.5-flash");
  const [useOwnKey, setUseOwnKey] = useState(false);
  const [userApiKey, setUserApiKey] = useState("");
  const [outputFormat, setOutputFormat] = useState<string>(
    pipeline.spec.outputs[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const validateInputs = () => {
    const errors: Record<string, string> = {};

    pipeline.spec.inputs.forEach((input) => {
      const value = inputs[input.name];

      if (input.required && !value) {
        errors[input.name] = `${input.label} is required`;
      }

      if (input.type === "number" && value && isNaN(Number(value))) {
        errors[input.name] = `${input.label} must be a number`;
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
    <Card>
      <CardHeader>
        <CardTitle>{pipeline.spec.pipeline.name}</CardTitle>
        <CardDescription>{pipeline.spec.pipeline.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Inputs */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Inputs</h3>
            {pipeline.spec.inputs.map((input) => (
              <div key={input.name} className="space-y-2">
                <Label htmlFor={input.name}>
                  {input.label}
                  {input.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>

                {input.type === "text" && (
                  <Input
                    id={input.name}
                    required={input.required}
                    value={inputs[input.name] || ""}
                    onChange={(e) =>
                      setInputs({ ...inputs, [input.name]: e.target.value })
                    }
                    placeholder={`Enter ${input.label.toLowerCase()}`}
                  />
                )}

                {input.type === "select" && (
                  <Select
                    value={inputs[input.name] || ""}
                    onValueChange={(value) =>
                      setInputs({ ...inputs, [input.name]: value })
                    }
                  >
                    <SelectTrigger id={input.name}>
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
                  <p className="text-sm text-red-500">
                    {validationErrors[input.name]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* LLM Config */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">LLM Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(val) => {
                    setProvider(val);
                    setModel(
                      PROVIDER_MODELS[val as keyof typeof PROVIDER_MODELS][0]
                    );
                  }}
                >
                  <SelectTrigger id="provider">
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
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="model">
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
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useOwnKey"
                  checked={useOwnKey}
                  onChange={(e) => setUseOwnKey(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="useOwnKey" className="cursor-pointer">
                  Use my own API key
                </Label>
                <Badge variant="secondary">Optional</Badge>
              </div>

              {useOwnKey && (
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder={`Enter your ${provider} API key`}
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    required={useOwnKey}
                  />
                  <p className="text-xs text-slate-500">
                    Your API key is only used for this request and never stored
                    on the server.
                  </p>
                </div>
              )}

              {!useOwnKey && (
                <p className="text-xs text-slate-600">
                  ✓ Using system credentials (configured via environment).
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="format">Output Format</Label>
              <Select
                value={outputFormat}
                onValueChange={(value) => setOutputFormat(value)}
              >
                <SelectTrigger id="format">
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
          </div>

          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Generating..." : "Generate Report"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
