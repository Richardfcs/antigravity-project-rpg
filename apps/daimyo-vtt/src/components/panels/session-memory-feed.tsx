"use client";

import {
  BellRing,
  Eye,
  Ghost,
  Music4,
  RadioTower
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  SessionMemoryCategory,
  SessionMemoryRecord
} from "@/types/session-memory";

interface SessionMemoryFeedProps {
  events: SessionMemoryRecord[];
  emptyLabel: string;
  compact?: boolean;
  limit?: number;
}

const categoryMeta: Record<
  SessionMemoryCategory,
  {
    icon: typeof RadioTower;
    tone: string;
  }
> = {
  stage: {
    icon: RadioTower,
    tone: "border-amber-300/18 bg-amber-300/10 text-amber-50"
  },
  atlas: {
    icon: Eye,
    tone: "border-emerald-300/18 bg-emerald-300/10 text-emerald-50"
  },
  audio: {
    icon: Music4,
    tone: "border-sky-300/18 bg-sky-300/10 text-sky-50"
  },
  "private-event": {
    icon: Ghost,
    tone: "border-rose-300/18 bg-rose-300/10 text-rose-50"
  }
};

function formatRelativeTime(timestamp: string) {
  const createdAt = Date.parse(timestamp);

  if (Number.isNaN(createdAt)) {
    return "agora";
  }

  const diffMs = Date.now() - createdAt;
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes < 1) {
    return "agora";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} d`;
}

export function SessionMemoryFeed({
  events,
  emptyLabel,
  compact = false,
  limit = 4
}: SessionMemoryFeedProps) {
  const visibleEvents = events.slice(0, limit);

  if (visibleEvents.length === 0) {
    return <p className="text-sm text-[color:var(--ink-3)]">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {visibleEvents.map((event) => {
        const meta = categoryMeta[event.category];
        const Icon = meta.icon;

        return (
          <article
            key={event.id}
            className={cn(
              "rounded-[18px] border border-white/10 bg-black/18 p-4",
              compact && "px-3 py-3"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]",
                      meta.tone
                    )}
                  >
                    <Icon size={12} />
                    {event.category === "stage"
                      ? "palco"
                      : event.category === "atlas"
                        ? "revelacao"
                        : event.category === "audio"
                          ? "trilha"
                          : "privado"}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--ink-3)]">
                    {formatRelativeTime(event.createdAt)}
                  </span>
                </div>
                <h4 className={cn("mt-2 font-semibold text-white", compact ? "text-sm" : "text-base")}>
                  {event.title}
                </h4>
                {event.detail ? (
                  <p className={cn("mt-2 leading-6 text-[color:var(--ink-2)]", compact ? "text-xs" : "text-sm")}>
                    {event.detail}
                  </p>
                ) : null}
              </div>
              {event.targetParticipantId ? (
                <BellRing size={14} className="mt-1 shrink-0 text-rose-200/80" />
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
