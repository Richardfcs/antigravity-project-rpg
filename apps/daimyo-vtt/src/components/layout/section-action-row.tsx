"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionActionRowProps {
  children: ReactNode;
  className?: string;
}

export function SectionActionRow({
  children,
  className
}: SectionActionRowProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 lg:gap-2", className)}>
      {children}
    </div>
  );
}
