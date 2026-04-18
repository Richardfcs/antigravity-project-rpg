"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dice6, LoaderCircle, MessageSquareText, Send } from "lucide-react";

import { sendChatMessageAction } from "@/app/actions/chat-actions";
import { useChatStore } from "@/stores/chat-store";
import type { SessionViewerIdentity } from "@/types/session";

interface ChatPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

function toneForKind(kind: "chat" | "roll" | "system") {
  if (kind === "roll") {
    return "border-amber-300/18 bg-amber-300/10";
  }

  if (kind === "system") {
    return "border-amber-300/18 bg-amber-300/10";
  }

  return "border-white/10 bg-white/[0.04]";
}

export function ChatPanel({ sessionCode, viewer }: ChatPanelProps) {
  const messages = useChatStore((state) => state.messages);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = listRef.current;

    if (!node) {
      return;
    }

    node.scrollTop = node.scrollHeight;
  }, [messages]);

  const visibleMessages = useMemo(() => messages.slice(-60), [messages]);

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
        body: draft
      });

      if (result.ok && result.message) {
        upsertMessage(result.message);
        setDraft("");
        return;
      }

      setFeedback(result.error ?? "Falha ao enviar a mensagem.");
    });
  };

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)] p-4">
      <header className="border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
            <MessageSquareText size={18} />
          </div>
          <div>
            <p className="section-label">Chat</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Mesa em tempo real</h3>
          </div>
        </div>
      </header>

      <div ref={listRef} className="scrollbar-thin mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {visibleMessages.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm text-[color:var(--ink-2)]">
            Ainda nao ha mensagens nesta sessao.
          </div>
        )}

        {visibleMessages.map((message) => (
          <article
            key={message.id}
            className={`rounded-[18px] border px-4 py-3 ${toneForKind(message.kind)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{message.displayName}</p>
                {message.kind === "roll" && (
                  <span className="hud-chip border-amber-300/20 bg-amber-300/10 text-amber-100">
                    <Dice6 size={14} />
                    rolagem
                  </span>
                )}
              </div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
              {message.body}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-4 space-y-3 border-t border-white/8 pt-4">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder={viewer ? "Descreva a acao, fale com a mesa ou narre um detalhe..." : "Entre na sala para habilitar o chat"}
          disabled={!viewer || isPending}
          className="w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-[color:var(--ink-3)]">
            Chat publico da sessao. Jogadas feitas no painel de dados tambem aparecem aqui.
          </p>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || !viewer}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? <LoaderCircle size={16} className="animate-spin" /> : <Send size={16} />}
            enviar
          </button>
        </div>

        {feedback && <p className="text-sm text-amber-100">{feedback}</p>}
      </div>
    </section>
  );
}

