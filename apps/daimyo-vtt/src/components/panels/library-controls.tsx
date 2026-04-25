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
    { id: "active", label: "Ativos" },
    { id: "prepared", label: "Pronto" },
    { id: "favorite", label: "Favoritos" },
    { id: "trash", label: "Lixeira" },
    { id: "dead", label: "Mortos" },
    { id: "all", label: "Tudo" }
  ];

  return (
    <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 custom-scrollbar">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={cn(
            "shrink-0 rounded-[12px] border px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition-all",
            value === option.id
              ? "border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
              : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/20 hover:text-white/80"
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
      className="rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-xs font-medium text-white outline-none transition focus:border-amber-400/35 focus:bg-black/60"
    >
      <option value="name">Ordem Alfabética</option>
      <option value="prepared">Prontos Primeiro</option>
      <option value="favorite">Favoritos Primeiro</option>
      <option value="recent">Acessados por Último</option>
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
      label: "Favorito",
      icon: Star,
      active: Boolean(flags?.favorite)
    },
    {
      id: "prepared" as const,
      label: "Pronto",
      icon: BookmarkCheck,
      active: Boolean(flags?.prepared)
    },
    {
      id: "usedToday" as const,
      label: "Hoje",
      icon: CalendarClock,
      active: Boolean(flags?.usedToday)
    }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {buttons.map((button) => (
        <button
          key={button.id}
          type="button"
          disabled={!canManage}
          onClick={() => onToggle(button.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] transition-all disabled:cursor-not-allowed",
            button.active
              ? "border-amber-400/40 bg-amber-400/15 text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.1)]"
              : "border-white/10 bg-white/[0.03] text-white/30 hover:border-white/20 hover:text-white/70"
          )}
          title={button.label}
        >
          <button.icon size={12} className={button.active ? "fill-amber-400/20" : ""} />
          {button.label}
        </button>
      ))}
    </div>
  );
}
