"use client";

import { BookmarkCheck, CalendarClock, Star, Settings2, X } from "lucide-react";
import { useState } from "react";

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
              ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] text-[color:var(--gold)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.1)]"
              : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] hover:border-[color:var(--gold)]/20 hover:text-[color:var(--text-primary)]"
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
      className="rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-xs font-medium text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 focus:bg-[var(--bg-card)]"
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
  const [isOpen, setIsOpen] = useState(false);

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

  if (!canManage) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl border transition-all",
          isOpen 
            ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] text-[color:var(--gold)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.2)]" 
            : "border-[var(--border-panel)] bg-[var(--bg-panel)]/60 text-[color:var(--text-muted)] hover:border-[color:var(--gold)]/20 hover:text-[color:var(--text-primary)] backdrop-blur-md"
        )}
      >
        {isOpen ? <X size={14} /> : <Settings2 size={14} />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div 
            className="absolute bottom-full right-0 z-50 mb-2 flex min-w-[140px] flex-col gap-1 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-panel)] p-2 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Classificar</p>
            {buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                onClick={() => { onToggle(button.id); }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all",
                  button.active
                    ? "bg-[color:var(--gold)]/10 text-[color:var(--gold)] shadow-[inset_0_0_10px_rgba(var(--gold-rgb),0.05)]"
                    : "text-[color:var(--text-muted)] hover:bg-[color:var(--mist)] hover:text-[color:var(--text-primary)]"
                )}
              >
                <button.icon size={12} className={button.active ? "fill-[color:var(--gold)]/20" : ""} />
                {button.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
