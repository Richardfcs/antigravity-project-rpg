"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface CompactPanelHeaderProps {
  label?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function CompactPanelHeader({
  label,
  title,
  description,
  actions,
  className
}: CompactPanelHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-2 border-b border-white/8 pb-1",
        className
      )}
    >
      <div className="min-w-0">
        {label ? <p className="section-label">{label}</p> : null}
        <h2 className="truncate text-[12px] font-semibold text-white sm:text-[13px]">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-[10px] leading-4 text-[color:var(--ink-2)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
