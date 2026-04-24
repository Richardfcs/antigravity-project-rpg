"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

const MAX_VISIBLE_ITEMS = 30;

export interface VisualPickerTab {
  id: string;
  label: string;
}

export interface VisualPickerItem {
  id: string;
  label: string;
  subtitle?: string;
  imageUrl?: string | null;
  tabId?: string;
}

interface VisualPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: VisualPickerItem) => void;
  items: VisualPickerItem[];
  tabs?: VisualPickerTab[];
  title: string;
  placeholder?: string;
  emptyMessage?: string;
  cardAspect?: "square" | "portrait" | "landscape";
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function VisualPickerModal({
  open,
  onClose,
  onSelect,
  items,
  tabs = [],
  title,
  placeholder = "buscar...",
  emptyMessage = "Nenhum resultado encontrado.",
  cardAspect = "portrait"
}: VisualPickerModalProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveTab(null);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (event.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  const filtered = useMemo(() => {
    let result = items;

    if (activeTab) {
      result = result.filter((item) => item.tabId === activeTab);
    }

    if (deferredQuery.trim()) {
      const needle = normalize(deferredQuery.trim());
      result = result.filter(
        (item) =>
          normalize(item.label).includes(needle) ||
          (item.subtitle && normalize(item.subtitle).includes(needle))
      );
    }

    return result.slice(0, MAX_VISIBLE_ITEMS);
  }, [activeTab, deferredQuery, items]);

  const aspectClass =
    cardAspect === "landscape"
      ? "aspect-video"
      : cardAspect === "square"
        ? "aspect-square"
        : "aspect-[4/5]";

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ animation: "vp-fade-in 0.18s ease-out" }}
    >
      <div
        className="relative flex max-h-[min(88vh,860px)] w-[min(96vw,780px)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[rgba(7,14,26,0.97)] shadow-[0_48px_120px_rgba(0,0,0,0.6)]"
        style={{ animation: "vp-scale-in 0.22s cubic-bezier(0.22,1,0.36,1)" }}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-white/8 px-5 pb-4 pt-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition focus-within:border-amber-300/35">
            <Search size={16} className="shrink-0 text-[color:var(--ink-3)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="w-full bg-transparent text-sm text-white placeholder-[color:var(--ink-3)] outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="shrink-0 text-[color:var(--ink-3)] transition hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Tabs */}
          {tabs.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab(null)}
                className={cn(
                  "hud-chip transition cursor-pointer",
                  activeTab === null
                    ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                )}
              >
                todos
              </button>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() =>
                    setActiveTab((current) =>
                      current === tab.id ? null : tab.id
                    )
                  }
                  className={cn(
                    "hud-chip transition cursor-pointer",
                    activeTab === tab.id
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Grid / Results */}
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <div className="flex h-32 items-center justify-center rounded-[22px] border border-dashed border-white/12 bg-black/20 text-sm text-[color:var(--ink-2)]">
              {emptyMessage}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="group relative flex flex-col overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.03] text-left transition hover:border-amber-300/28 hover:bg-amber-300/[0.04] hover:shadow-[0_12px_40px_rgba(245,158,11,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/40 cursor-pointer"
                >
                  <div
                    className={cn(
                      "relative w-full overflow-hidden bg-black/30",
                      aspectClass
                    )}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.label}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-white/20">
                        {item.label.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  </div>

                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.label}
                    </p>
                    {item.subtitle && (
                      <p className="mt-0.5 truncate text-xs text-[color:var(--ink-3)]">
                        {item.subtitle}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/8 px-5 py-3">
          <div className="flex items-center justify-between text-xs text-[color:var(--ink-3)]">
            <span>
              {filtered.length} resultado{filtered.length !== 1 && "s"}
              {items.length > MAX_VISIBLE_ITEMS &&
                ` (de ${items.length} total)`}
            </span>
            <span className="hidden sm:inline">
              <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium">
                Esc
              </kbd>{" "}
              para fechar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
