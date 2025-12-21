import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Play,
  FileText,
  Zap,
  Brain,
  BarChart3,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";

export default function Home() {
  const stats = [
    { value: "1,247", label: "Pipelines Created" },
    { value: "94.2%", label: "Success Rate" },
    { value: "23.4s", label: "Avg. Processing Time" },
  ];

  const features = [
    {
      icon: Zap,
      title: "Flexible Data Ingestion",
      description:
        "Connect to APIs, databases, or upload files. Complete control over your data sources.",
      linear: "from-blue-500 to-cyan-400",
    },
    {
      icon: Brain,
      title: "AI-Powered Intelligence",
      description:
        "Leverage Claude, GPT-4, and Gemini to enrich and analyze your data automatically.",
      linear: "from-purple-500 to-pink-400",
    },
    {
      icon: FileText,
      title: "Multi-Format Export",
      description:
        "Generate beautiful reports in Markdown, HTML, PDF, or PowerPoint instantly.",
      linear: "from-green-500 to-emerald-400",
    },
    {
      icon: BarChart3,
      title: "Real-Time Monitoring",
      description:
        "Track pipeline execution with live status updates and performance metrics.",
      linear: "from-orange-500 to-amber-400",
    },
    {
      icon: Sparkles,
      title: "Advanced Queuing",
      description:
        "Built-in job queue ensures reliable processing of large-scale operations.",
      linear: "from-indigo-500 to-blue-400",
    },
    {
      icon: Check,
      title: "Automated Workflows",
      description:
        "Create repeating schedules and trigger pipelines based on events.",
      linear: "from-rose-500 to-pink-400",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Define Your Pipeline",
      desc: "Configure inputs, outputs, and processing rules",
    },
    {
      num: "02",
      title: "Set Data Sources",
      desc: "Connect APIs, databases, or upload files",
    },
    {
      num: "03",
      title: "Add AI Enrichment",
      desc: "Enable LLM analysis and transformation",
    },
    {
      num: "04",
      title: "Generate Output",
      desc: "Export results in your preferred format",
    },
  ];

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-br from-accent/5 via-background to-primary/5 border-b border-border">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 size-80 rounded-full bg-accent/10 blur-3xl animate-pulse" />
          <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-primary/10 blur-3xl animate-pulse [animation-delay:1s]" />
          <div className="absolute top-1/2 left-1/4 size-60 rounded-full bg-secondary/20 blur-2xl animate-pulse [animation-delay:0.5s]" />
        </div>

        <div className="relative container mx-auto px-6 py-24 md:py-32 flex flex-col items-center text-center">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8 border border-accent/20">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex rounded-full size-2 bg-green-500" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Launch Week 2025 • v1.0 Now Available
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight text-balance">
            Intelligent Data <br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-accent via-primary to-accent">
              Processing Engine
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto text-pretty leading-relaxed">
            Build powerful data processing pipelines powered by AI. Transform
            raw data into actionable insights in minutes, not weeks.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link href="/dashboard">
              <Button
                size="lg"
                className="bg-linear-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground transition-all duration-200"
              >
                <Play className="mr-2 size-5" />
                Get Started
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:bg-secondary/50 bg-transparent transition-all duration-200"
              >
                <FileText className="mr-2 size-5" />
                View Docs
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </Link>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto w-full pt-8 border-t border-border/50">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold mb-2 bg-clip-text text-transparent bg-linear-to-r from-accent to-primary">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 md:py-32 bg-background border-b border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Everything you need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Complete toolkit for building, deploying, and managing data
              processing pipelines at scale
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <Card
                key={idx}
                className="border-border bg-card hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 hover:border-accent/30 group"
              >
                <CardHeader>
                  <div
                    className={`size-12 rounded-xl bg-linear-to-br ${feature.linear} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="size-6 text-white" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Timeline */}
      <section className="py-24 md:py-32 bg-secondary/30 border-b border-border">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Quick Start in 4 Steps
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From concept to execution, our intuitive interface makes it simple
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute top-8 left-1/2 w-[calc(100%+2rem)] h-1 bg-linear-to-r from-accent/50 to-transparent hidden md:block -translate-y-1/2" />
                )}

                <div className="relative z-10">
                  <div className="size-16 rounded-full bg-linear-to-br from-accent/20 to-primary/20 text-accent font-bold text-2xl flex items-center justify-center mx-auto mb-6 border-2 border-accent/30 shadow-lg shadow-accent/10">
                    {step.num}
                  </div>
                  <h3 className="font-semibold text-lg mb-2 text-center">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground text-center">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-20 md:py-28 bg-linear-to-br from-accent/5 to-primary/5 border-t border-border">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to get started?
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join hundreds of teams building smarter data pipelines with DProc
            Framework.
          </p>
          <Link href="/dashboard">
            <Button
              size="lg"
              className="bg-linear-to-r from-accent to-primary hover:shadow-lg hover:shadow-accent/20 text-accent-foreground transition-all duration-200"
            >
              Create Your First Pipeline
              <ArrowRight className="ml-2 size-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
