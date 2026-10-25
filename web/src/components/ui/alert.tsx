import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const styles = {
  success: "border-seva-700/30 bg-seva-50 text-seva-700",
  error: "border-red-300 bg-red-50 text-red-800",
  info: "border-navy-700/20 bg-navy-50 text-navy-900",
} as const;

export function Alert({ tone = "info", title, children, className }: {
  tone?: keyof typeof styles; title?: string; children: ReactNode; className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      aria-live={tone === "error" ? "assertive" : "polite"}
      className={cn("rounded-xl border p-4 text-sm", styles[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      <div className={title ? "mt-1" : ""}>{children}</div>
    </div>
  );
}
