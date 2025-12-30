import { cn } from "@/lib/utils";

interface KpiGridProps {
  children: React.ReactNode;
  columns?: string | number; // ✅ Accept both string and number
  className?: string;
}

export function KpiGrid({ children, columns = "3", className }: KpiGridProps) {
  // Convert string to number if needed
  const cols = typeof columns === "string" ? parseInt(columns) : columns;

  const gridCols =
    {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    }[cols] || "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={cn("grid gap-4 my-6", gridCols, className)}>{children}</div>
  );
}
