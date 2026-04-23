"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface AppDrawerProps {
  title: string;
  open: boolean;
  onClose?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  mobileMode?: "fullscreen" | "sheet";
}

export function AppDrawer({
  title,
  open,
  onClose,
  actions,
  children,
  className,
  mobileMode = "fullscreen"
}: AppDrawerProps) {
  if (!open) {
    return null;
  }

  return (
    <aside
      className={cn(
        "surface-panel flex min-h-0 flex-col overflow-hidden",
        mobileMode === "sheet"
          ? "fixed inset-x-3 bottom-3 z-[70] max-h-[min(74vh,42rem)] lg:static lg:inset-auto lg:z-auto lg:max-h-none"
          : "fixed inset-x-3 top-3 bottom-3 z-[70] lg:static lg:inset-auto lg:z-auto",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/8 px-2.5 py-1.5">
        <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
        <div className="flex items-center gap-1.5">
          {actions}
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">{children}</div>
    </aside>
  );
}
