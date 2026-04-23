"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AppTopBarProps {
  title: string;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function AppTopBar({
  title,
  eyebrow,
  actions,
  children,
  className
}: AppTopBarProps) {
  return (
    <section
      className={cn(
        "surface-panel overflow-hidden px-2.5 py-2 lg:px-3 lg:py-2",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2.5">
        <div className="min-w-0">
          {eyebrow ? <div className="flex flex-wrap items-center gap-1.5">{eyebrow}</div> : null}
          <h1 className="mt-0.5 truncate text-sm font-semibold tracking-tight text-white sm:text-base">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </div>
      {children ? <div className="mt-1.5">{children}</div> : null}
    </section>
  );
}
