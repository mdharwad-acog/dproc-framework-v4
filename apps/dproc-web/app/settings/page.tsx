"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Save, CheckCircle, ArrowLeft, Info } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [showKeys, setShowKeys] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [keys, setKeys] = useState({
    openai: "",
    anthropic: "",
    google: "",
  });

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        setKeys({
          openai: localStorage.getItem("DPROC_OPENAI_API_KEY") || "",
          anthropic: localStorage.getItem("DPROC_ANTHROPIC_API_KEY") || "",
          google: localStorage.getItem("DPROC_GOOGLE_API_KEY") || "",
        });
      }
    } catch (error) {
      console.error("Failed to load API keys from storage:", error);
      toast.error("Failed to load saved API keys");
    }
  }, []);

  const handleSave = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("DPROC_OPENAI_API_KEY", keys.openai);
        localStorage.setItem("DPROC_ANTHROPIC_API_KEY", keys.anthropic);
        localStorage.setItem("DPROC_GOOGLE_API_KEY", keys.google);

        setSaved(true);
        toast.success("API keys saved successfully");

        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save API keys:", error);
      toast.error("Failed to save API keys");
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
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">
              Manage your API keys and configuration
            </p>
          </div>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Configure your LLM provider API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Info Alert */}
              <Alert className="bg-blue-500/10 border-blue-500/30">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-500 text-sm">
                  These keys are stored locally in your browser and never sent
                  to our servers. They are only used when you explicitly choose
                  to use your own API key.
                </AlertDescription>
              </Alert>

              {/* OpenAI */}
              <div className="space-y-2">
                <Label htmlFor="openai">OpenAI API Key</Label>
                <Input
                  id="openai"
                  type={showKeys ? "text" : "password"}
                  placeholder="sk-..."
                  value={keys.openai}
                  onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
                  className="font-mono bg-secondary/50 border-border"
                />
              </div>

              {/* Anthropic */}
              <div className="space-y-2">
                <Label htmlFor="anthropic">Anthropic API Key</Label>
                <Input
                  id="anthropic"
                  type={showKeys ? "text" : "password"}
                  placeholder="sk-ant-..."
                  value={keys.anthropic}
                  onChange={(e) =>
                    setKeys({ ...keys, anthropic: e.target.value })
                  }
                  className="font-mono bg-secondary/50 border-border"
                />
              </div>

              {/* Google */}
              <div className="space-y-2">
                <Label htmlFor="google">Google AI API Key</Label>
                <Input
                  id="google"
                  type={showKeys ? "text" : "password"}
                  placeholder="AI..."
                  value={keys.google}
                  onChange={(e) => setKeys({ ...keys, google: e.target.value })}
                  className="font-mono bg-secondary/50 border-border"
                />
              </div>

              {/* Toggle Visibility */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowKeys(!showKeys)}
                className="border-border bg-transparent"
              >
                {showKeys ? (
                  <>
                    <EyeOff className="mr-2 size-4" />
                    Hide Keys
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 size-4" />
                    Show Keys
                  </>
                )}
              </Button>

              {/* Success Alert */}
              {saved && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-500">
                    API keys saved successfully!
                  </AlertDescription>
                </Alert>
              )}

              {/* Save Button */}
              <Button
                onClick={handleSave}
                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Save className="mr-2 size-4" />
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
