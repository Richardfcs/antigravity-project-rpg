"use client";

import { BookmarkCheck, CalendarClock, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  LibraryEntryFlags,
  LibraryPreparedFlags,
  LibrarySortMode,
  LibraryStatusFilter
} from "@/types/library";

export function LibraryFilterPills({
  value,
  onChange
}: {
  value: LibraryStatusFilter;
  onChange: (value: LibraryStatusFilter) => void;
}) {
  const options: Array<{
    id: LibraryStatusFilter;
    label: string;
  }> = [
    { id: "all", label: "tudo" },
    { id: "prepared", label: "pronto" },
    { id: "favorite", label: "favoritos" },
    { id: "usedToday", label: "hoje" }
  ];

  return (
    <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
            value === option.id
              ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
              : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function LibrarySortSelect({
  value,
  onChange
}: {
  value: LibrarySortMode;
  onChange: (value: LibrarySortMode) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as LibrarySortMode)}
      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white outline-none transition focus:border-amber-300/35"
    >
      <option value="name">ordem alfabetica</option>
      <option value="prepared">pronto primeiro</option>
      <option value="favorite">favoritos primeiro</option>
      <option value="recent">tocados por ultimo</option>
    </select>
  );
}

export function LibraryFlagControls({
  flags,
  canManage,
  onToggle
}: {
  flags: LibraryEntryFlags | undefined;
  canManage: boolean;
  onToggle: (flag: keyof LibraryPreparedFlags) => void;
}) {
  const buttons = [
    {
      id: "favorite" as const,
      label: "favorito",
      icon: Star,
      active: Boolean(flags?.favorite)
    },
    {
      id: "prepared" as const,
      label: "pronto",
      icon: BookmarkCheck,
      active: Boolean(flags?.prepared)
    },
    {
      id: "usedToday" as const,
      label: "hoje",
      icon: CalendarClock,
      active: Boolean(flags?.usedToday)
    }
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {buttons.map((button) => (
        <button
          key={button.id}
          type="button"
          disabled={!canManage}
          onClick={() => onToggle(button.id)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] transition disabled:cursor-default disabled:opacity-70",
            button.active
              ? "border-amber-300/24 bg-amber-300/10 text-amber-100"
              : "border-white/10 bg-white/[0.03] text-[color:var(--ink-3)] hover:border-white/20 hover:text-white"
          )}
          title={button.label}
        >
          <button.icon size={12} />
          {button.label}
        </button>
      ))}
    </div>
  );
}
