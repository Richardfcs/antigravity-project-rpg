"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { 
  Dice6, 
  EyeOff, 
  History, 
  LayoutGrid, 
  MessageSquareText, 
  ScrollText, 
  ShieldAlert, 
  Sparkles,
  X,
  Swords
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import type { SessionMessageRecord } from "@/types/message";
import type { SessionViewerIdentity } from "@/types/session";

interface TacticalLogPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  onClose?: () => void;
}

type ChatFilter = "all" | "chat" | "roll" | "combat" | "master";

function toneForKind(kind: string, isPrivate: boolean) {
  if (isPrivate) {
    return "border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.05)]";
  }
  
  switch (kind) {
    case "roll":
      return "border-amber-500/20 bg-amber-500/5";
    case "combat":
      return "border-sky-500/20 bg-sky-500/5";
    case "oracle":
      return "border-purple-500/20 bg-purple-500/5";
    case "master-log":
      return "border-rose-500/20 bg-rose-500/5";
    default:
      return "border-white/5 bg-white/[0.02]";
  }
}

export function TacticalLogPanel({ sessionCode, viewer, onClose }: TacticalLogPanelProps) {
  const messages = useChatStore((state) => state.messages);
  const [filter, setFilter] = useState<ChatFilter>("all");
  const listRef = useRef<HTMLDivElement | null>(null);

  const isGM = viewer?.role === "gm";

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, filter]);

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      // Regra de Ouro: Privados s aparecem para o GM
      if (msg.isPrivate && !isGM) return false;

      if (filter === "master") return isGM && (msg.isPrivate || msg.kind === "master-log");
      if (filter === "chat") return msg.kind === "chat" && !msg.isPrivate;
      if (filter === "roll") return msg.kind === "roll" && !msg.isPrivate;
      if (filter === "combat") return msg.kind === "combat" && !msg.isPrivate;

      // "all" - mostra tudo que no for privado (a menos que seja o GM vendo tudo)
      if (msg.isPrivate) return isGM; 
      return true;
    });
  }, [messages, filter, isGM]);

  const visibleMessages = useMemo(() => filteredMessages.slice(-50), [filteredMessages]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(5,10,18,0.96)] backdrop-blur-xl shadow-[0_24px_80px_rgba(2,6,23,0.55)]">
      <header className="shrink-0 border-b border-white/5 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-[color:var(--ink-2)]">
              <ScrollText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-white">Log de Sessão</h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-3)]">Universal & Tático</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-3)] transition hover:border-white/20 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: "all", label: "Tudo", icon: LayoutGrid },
            { id: "combat", label: "Combate", icon: Swords },
            { id: "roll", label: "Testes", icon: Dice6 },
            { id: "chat", label: "Chat", icon: MessageSquareText },
            ...(isGM ? [{ id: "master", label: "Mestre", icon: ShieldAlert }] : [])
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilter(btn.id as ChatFilter)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                filter === btn.id
                  ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
                  : "border-white/5 bg-white/[0.02] text-[color:var(--ink-3)] hover:border-white/20 hover:text-white"
              )}
            >
              <btn.icon size={12} />
              {btn.label}
            </button>
          ))}
        </div>
      </header>

      <div 
        ref={listRef} 
        className="flex-1 overflow-y-auto scrollbar-none p-4 space-y-3"
      >
        {visibleMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center opacity-20 text-center py-10">
            <History size={32} className="mb-2" />
            <p className="text-[10px] font-black uppercase tracking-widest">Vazio</p>
          </div>
        )}

        {visibleMessages.map((message) => (
          <article
            key={message.id}
            className={cn(
              "group relative rounded-2xl border p-3 transition-all",
              toneForKind(message.kind, message.isPrivate)
            )}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-tight",
                  message.isPrivate ? "text-rose-400" : "text-white/90"
                )}>
                  {message.displayName}
                </span>
                {message.isPrivate && (
                  <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-widest text-rose-400">
                    Mestre
                  </span>
                )}
              </div>
              <time className="text-[8px] font-black uppercase tracking-widest text-[color:var(--ink-3)]">
                {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </time>
            </div>
            <p className={cn(
              "text-xs leading-relaxed font-medium",
              message.isPrivate ? "text-rose-200/80" : "text-white/70"
            )}>
              {message.body}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
