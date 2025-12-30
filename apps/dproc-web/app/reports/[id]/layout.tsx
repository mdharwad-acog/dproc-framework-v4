import "@/app/reports/_styles/document.css";
import "@/app/reports/_styles/print.css";
import { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
