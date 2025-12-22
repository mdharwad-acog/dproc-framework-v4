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
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function Navigation() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const navLinks = [
    { href: "/", label: "Home", icon: null },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/dashboard/history", label: "History", icon: History },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

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

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors hover:text-accent ${
                    active ? "text-accent" : "text-muted-foreground"
                  }`}
                >
                  {Icon && <Icon className="inline-block size-4 mr-1.5" />}
                  {link.label}
                </Link>
              );
            })}
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
                aria-label="Toggle theme"
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
              <Link href="/dashboard" className="hidden sm:block">
                <Button
                  size="sm"
                  className="bg-linear-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground transition-all duration-200"
                >
                  Get Started
                </Button>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground hover:text-accent"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                    active
                      ? "bg-accent/10 text-accent"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-accent"
                  }`}
                >
                  {Icon && <Icon className="size-4" />}
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              );
            })}

            {/* Mobile CTA */}
            {pathname === "/" && (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  size="sm"
                  className="w-full bg-linear-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground"
                >
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
