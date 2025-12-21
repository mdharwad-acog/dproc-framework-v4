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
import { Eye, EyeOff, Save, CheckCircle, ArrowLeft } from "lucide-react";

export default function Settings() {
  const [showKeys, setShowKeys] = useState(false);
  const [saved, setSaved] = useState(false);
  const [keys, setKeys] = useState({
    openai: "",
    anthropic: "",
    google: "",
  });

  useEffect(() => {
    setKeys({
      openai:
        typeof window !== "undefined"
          ? localStorage.getItem("DPROC_OPENAI_API_KEY") || ""
          : "",
      anthropic:
        typeof window !== "undefined"
          ? localStorage.getItem("DPROC_ANTHROPIC_API_KEY") || ""
          : "",
      google:
        typeof window !== "undefined"
          ? localStorage.getItem("DPROC_GOOGLE_API_KEY") || ""
          : "",
    });
  }, []);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("DPROC_OPENAI_API_KEY", keys.openai);
      localStorage.setItem("DPROC_ANTHROPIC_API_KEY", keys.anthropic);
      localStorage.setItem("DPROC_GOOGLE_API_KEY", keys.google);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-3xl">
        <Link href="/dashboard">
          <Button
            variant="outline"
            className="border-border bg-transparent mb-6"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">
            Manage your API keys and configuration
          </p>
        </div>

        {saved && (
          <Alert className="mb-6 border-green-500/30 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-500">
              API keys saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              These keys are stored only in your browser (localStorage) and
              never sent to the server.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* OpenAI */}
            <div className="space-y-2">
              <Label htmlFor="openai">OpenAI API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="openai"
                  type={showKeys ? "text" : "password"}
                  value={keys.openai}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, openai: e.target.value }))
                  }
                  placeholder="sk-proj-..."
                  className="bg-secondary/50 border-border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setShowKeys((s) => !s)}
                  className="border-border bg-transparent"
                >
                  {showKeys ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Anthropic */}
            <div className="space-y-2">
              <Label htmlFor="anthropic">Anthropic API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="anthropic"
                  type={showKeys ? "text" : "password"}
                  value={keys.anthropic}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, anthropic: e.target.value }))
                  }
                  placeholder="sk-ant-..."
                  className="bg-secondary/50 border-border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setShowKeys((s) => !s)}
                  className="border-border bg-transparent"
                >
                  {showKeys ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Google */}
            <div className="space-y-2">
              <Label htmlFor="google">Google API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="google"
                  type={showKeys ? "text" : "password"}
                  value={keys.google}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, google: e.target.value }))
                  }
                  placeholder="AIza..."
                  className="bg-secondary/50 border-border"
                />
                <Button
                  variant="outline"
                  size="icon"
                  type="button"
                  onClick={() => setShowKeys((s) => !s)}
                  className="border-border bg-transparent"
                >
                  {showKeys ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground mt-6"
            >
              <Save className="mr-2 size-4" />
              Save API Keys
            </Button>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-border bg-secondary/30 mt-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Getting API Keys</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <strong>OpenAI:</strong> Get from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  className="text-accent hover:underline"
                >
                  platform.openai.com
                </a>
              </li>
              <li>
                <strong>Anthropic:</strong> Get from{" "}
                <a
                  href="https://console.anthropic.com"
                  className="text-accent hover:underline"
                >
                  console.anthropic.com
                </a>
              </li>
              <li>
                <strong>Google:</strong> Get from{" "}
                <a
                  href="https://makersuite.google.com/app/apikey"
                  className="text-accent hover:underline"
                >
                  Google AI Studio
                </a>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
