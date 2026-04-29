"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

interface AppTrayProps {
  title: string;
  open: boolean;
  onToggle?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AppTray({
  title,
  open,
  onToggle,
  actions,
  children,
  className
}: AppTrayProps) {
  if (!open) {
    return null;
  }

  return (
    <section
      className={cn(
        "surface-panel flex min-h-0 flex-col overflow-hidden",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2.5 py-1.5">
        <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-1.5">
          {actions}
          {onToggle ? (
            <button
              type="button"
              onClick={onToggle}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
            >
              {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          ) : null}
        </div>
      </div>
      {open ? <div className="min-h-0 flex-1 overflow-hidden p-2">{children}</div> : null}
    </section>
  );
}
