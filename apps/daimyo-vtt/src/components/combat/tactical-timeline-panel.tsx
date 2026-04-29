"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Dice6,
  EyeOff,
  History,
  LayoutGrid,
  LoaderCircle,
  MessageSquareText,
  RotateCcw,
  Send,
  ShieldAlert,
  Swords,
  X
} from "lucide-react";

import { clearChatAction, sendChatMessageAction } from "@/app/actions/chat-actions";
import { undoLastTacticalActionAction } from "@/app/actions/combat-actions";
import { CombatResolutionCard } from "@/components/combat/combat-resolution-card";
import {
  buildTacticalLogEntries,
  filterTacticalLogEntries,
  type TacticalLogFilter
} from "@/lib/tactical-log/adapter";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import type { CombatResolutionRecord } from "@/types/combat";
import type { SessionViewerIdentity } from "@/types/session";

interface TacticalTimelinePanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  combatLog?: CombatResolutionRecord[] | null;
  canManage?: boolean;
  onClose?: () => void;
  onUndo?: (result: Awaited<ReturnType<typeof undoLastTacticalActionAction>>) => void;
}

const filters: Array<{ id: TacticalLogFilter; label: string }> = [
  { id: "all", label: "Tudo" },
  { id: "combat", label: "Combate" },
  { id: "rolls", label: "Rolagens" },
  { id: "chat", label: "Chat" },
  { id: "system", label: "Sistema" },
  { id: "reverted", label: "Desfeitos" }
];

function toneForType(type: string, isPrivate: boolean, reverted: boolean) {
  if (reverted) return "border-zinc-500/25 bg-zinc-500/5 opacity-70";
  if (isPrivate) return "border-rose-500/30 bg-rose-500/5";
  if (type === "skill-roll") return "border-amber-300/25 bg-amber-300/8";
  if (type === "roll") return "border-sky-300/20 bg-sky-300/8";
  if (type === "system") return "border-violet-300/20 bg-violet-300/8";
  return "border-white/10 bg-white/[0.03]";
}

export function TacticalTimelinePanel({
  sessionCode,
  viewer,
  combatLog = [],
  canManage,
  onClose,
  onUndo
}: TacticalTimelinePanelProps) {
  const messages = useChatStore((state) => state.messages);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const setMessages = useChatStore((state) => state.setMessages);
  const [filter, setFilter] = useState<TacticalLogFilter>("all");
  const [draft, setDraft] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement | null>(null);
  const isGM = canManage ?? viewer?.role === "gm";

  const entries = useMemo(
    () =>
      filterTacticalLogEntries(
        buildTacticalLogEntries({
          combatLog,
          messages,
          includePrivate: isGM
        }),
        filter
      ).slice(-120),
    [combatLog, filter, isGM, messages]
  );

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [entries.length]);

  const handleSubmit = () => {
    if (!viewer) {
      setFeedback("Entre na sala pelo lobby para enviar mensagens.");
      return;
    }

    if (!draft.trim()) {
      setFeedback("Escreva algo antes de enviar.");
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const result = await sendChatMessageAction({
        sessionCode,
        body: draft,
        isPrivate: isSecret
      });

      if (result.ok && result.message) {
        upsertMessage(result.message);
        setDraft("");
        return;
      }

      setFeedback(result.error ?? "Falha ao enviar a mensagem.");
    });
  };

  const handleClearChat = () => {
    if (!isGM || !window.confirm("Deseja limpar as mensagens da timeline?")) return;

    startTransition(async () => {
      const result = await clearChatAction({ sessionCode });
      if (result.ok) {
        setMessages([]);
        setFeedback("Mensagens limpas.");
        return;
      }
      setFeedback(result.error ?? "Erro ao limpar mensagens.");
    });
  };

  const handleUndo = () => {
    if (!isGM || !window.confirm("Retroceder a ultima acao tatica?")) return;

    startTransition(async () => {
      const result = await undoLastTacticalActionAction({ sessionCode });
      onUndo?.(result);
      setFeedback(result.ok ? "Acao retrocedida." : result.message ?? "Falha ao retroceder.");
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[22px] border border-white/10 bg-[rgba(5,10,18,0.96)] shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur">
      <header className="shrink-0 border-b border-white/10 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                <History size={14} />
                timeline tatica
              </span>
              <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
                {entries.length} eventos
              </span>
            </div>
            <p className="mt-2 text-[11px] text-[color:var(--ink-2)]">
              Combate, testes, chat e correcoes em uma trilha auditavel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isGM ? (
              <button
                type="button"
                onClick={handleUndo}
                disabled={isPending}
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/10 px-2.5 text-[10px] font-black uppercase tracking-wider text-amber-100 transition hover:border-amber-300/35 disabled:opacity-40"
              >
                <RotateCcw size={13} />
                retroceder
              </button>
            ) : null}
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition",
                filter === item.id
                  ? "border-amber-300/35 bg-amber-300/12 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
              )}
            >
              {item.label}
            </button>
          ))}
          {isGM ? (
            <button
              type="button"
              onClick={handleClearChat}
              className="ml-auto rounded-full border border-rose-300/18 bg-rose-300/8 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-rose-100"
            >
              limpar chat
            </button>
          ) : null}
        </div>
      </header>

      <div ref={listRef} className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-xs text-[color:var(--ink-2)]">
            Nenhum evento para este filtro ainda.
          </div>
        ) : (
          entries.map((entry) =>
            entry.type === "combat" ? (
              <CombatResolutionCard key={entry.id} resolution={entry.resolution} compact />
            ) : (
              <article
                key={entry.id}
                className={cn("rounded-[18px] border p-3", toneForType(entry.type, entry.isPrivate, entry.reverted))}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    {entry.type === "skill-roll" ? <Dice6 size={14} className="text-amber-200" /> : null}
                    {entry.type === "chat" ? <MessageSquareText size={14} className="text-sky-200" /> : null}
                    {entry.type === "system" ? <ShieldAlert size={14} className="text-violet-200" /> : null}
                    {entry.type === "roll" ? <Swords size={14} className="text-sky-200" /> : null}
                    <span className="truncate text-xs font-black uppercase tracking-wider text-white">
                      {entry.title}
                    </span>
                    {entry.isPrivate ? (
                      <span className="hud-chip border-rose-300/20 bg-rose-300/10 text-rose-100">
                        <EyeOff size={10} />
                        privado
                      </span>
                    ) : null}
                    {entry.reverted ? (
                      <span className="hud-chip border-zinc-300/20 bg-zinc-300/10 text-zinc-100">
                        desfeito
                      </span>
                    ) : null}
                  </div>
                  <time className="shrink-0 text-[9px] font-black uppercase tracking-widest text-white/25">
                    {new Date(entry.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </time>
                </div>

                <p className="whitespace-pre-wrap text-xs leading-5 text-[color:var(--ink-1)]">
                  {entry.body}
                </p>

                {entry.skillRoll ? (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/8 bg-black/18 p-2 text-[10px] text-[color:var(--ink-2)]">
                    <span>alvo: {entry.skillRoll.targetNumber}</span>
                    <span>margem: {entry.skillRoll.margin >= 0 ? "+" : ""}{entry.skillRoll.margin}</span>
                    <span>modo: {entry.skillRoll.rollMode}</span>
                    <span>mantido: {entry.skillRoll.total}</span>
                    {entry.skillRoll.inspirationSpent ? (
                      <span className="col-span-2 text-amber-200">Inspiração gasta para rerrolar.</span>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )
          )
        )}
      </div>

      <footer className="shrink-0 border-t border-white/10 p-3">
        <div className="relative">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
            }}
            rows={2}
            placeholder={viewer ? "Escreva no log tatico..." : "Entre na sala para participar..."}
            disabled={!viewer || isPending}
            className={cn(
              "w-full resize-none rounded-2xl border px-4 py-3 pr-24 text-sm text-white outline-none transition placeholder:text-white/25 disabled:opacity-50",
              isSecret
                ? "border-rose-300/25 bg-rose-300/8 focus:border-rose-300/40"
                : "border-white/10 bg-white/[0.04] focus:border-amber-300/30"
            )}
          />
          <div className="absolute bottom-2 right-2 flex gap-1.5">
            {isGM ? (
              <button
                type="button"
                onClick={() => setIsSecret((current) => !current)}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                  isSecret
                    ? "border-rose-300/40 bg-rose-300/15 text-rose-100"
                    : "border-white/10 bg-black/20 text-white/45 hover:text-white"
                )}
              >
                <EyeOff size={16} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !viewer || !draft.trim()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-amber-300/25 bg-amber-300/12 text-amber-100 transition hover:border-amber-300/40 disabled:opacity-30"
            >
              {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
        {feedback ? (
          <p className="mt-2 text-[10px] font-semibold text-amber-100/80">{feedback}</p>
        ) : null}
      </footer>
    </div>
  );
}
