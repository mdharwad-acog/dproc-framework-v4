"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  FileText,
  BarChart3,
  Settings as SettingsIcon,
  History,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <FileText className="size-6 text-accent" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-accent to-primary">
              DProc
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isActive("/") && pathname === "/"
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              Home
            </Link>
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isActive("/dashboard") ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <BarChart3 className="inline-block size-4 mr-1.5" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/history"
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isActive("/dashboard/history")
                  ? "text-accent"
                  : "text-muted-foreground"
              }`}
            >
              <History className="inline-block size-4 mr-1.5" />
              History
            </Link>
            <Link
              href="/settings"
              className={`text-sm font-medium transition-colors hover:text-accent ${
                isActive("/settings") ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <SettingsIcon className="inline-block size-4 mr-1.5" />
              Settings
            </Link>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-muted-foreground hover:text-accent"
              >
                {theme === "dark" ? (
                  <Sun className="size-5" />
                ) : (
                  <Moon className="size-5" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            )}

            {/* CTA Button */}
            {pathname === "/" && (
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="bg-linear-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground"
                >
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
