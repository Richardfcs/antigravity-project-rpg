"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dice6, LoaderCircle, MessageSquareText, Send } from "lucide-react";

import { cn } from "@/lib/utils";
import { sendChatMessageAction } from "@/app/actions/chat-actions";
import { useChatStore } from "@/stores/chat-store";
import type { SessionMessageRecord } from "@/types/message";
import type { SessionViewerIdentity } from "@/types/session";

interface ChatPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

function toneForKind(kind: "chat" | "roll" | "system") {
  if (kind === "roll") {
    return "border-amber-400/20 bg-amber-400/5 shadow-[0_0_15px_rgba(251,191,36,0.05)]";
  }

  if (kind === "system") {
    return "border-blue-400/20 bg-blue-400/5";
  }

  return "border-white/5 bg-white/[0.02]";
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
    <div className="flex h-full flex-col space-y-4">
      <section className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-white/10 bg-black/40 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
        <header className="shrink-0 p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]">
              <MessageSquareText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight text-white uppercase">Sussurros do Destino</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Comunicação em Tempo Real</p>
            </div>
          </div>
        </header>

        <div 
          ref={listRef} 
          className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4"
        >
          {visibleMessages.length === 0 && (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-white/5 bg-white/[0.02] p-12 text-center">
              <p className="text-sm font-medium italic text-white/20">O silêncio ecoa nestas paredes virtuais...</p>
            </div>
          )}

          {visibleMessages.map((message: SessionMessageRecord) => (
            <article
              key={message.id}
              className={cn(
                "group relative rounded-[20px] border p-4 transition-all hover:bg-white/[0.04]",
                toneForKind(message.kind)
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold tracking-tight text-white">{message.displayName}</span>
                  {message.kind === "roll" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-400">
                      <Dice6 size={10} />
                      Rolagem
                    </span>
                  )}
                  {message.kind === "system" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-400">
                      Santuário
                    </span>
                  )}
                </div>
                <time className="text-[9px] font-black uppercase tracking-widest text-white/20">
                  {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
              </div>
              <p className="text-sm leading-relaxed text-white/70 whitespace-pre-wrap">
                {message.body}
              </p>
            </article>
          ))}
        </div>

        <footer className="shrink-0 p-6 border-t border-white/5 bg-black/20">
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
              placeholder={viewer ? "Digite sua mensagem..." : "Entre na sala para participar..."}
              disabled={!viewer || isPending}
              className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-sm text-white outline-none transition focus:border-amber-400/30 focus:bg-black/60 placeholder:text-white/10 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !viewer || !draft.trim()}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400 transition-all hover:bg-amber-400/20 disabled:opacity-20 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
            >
              {isPending ? (
                <LoaderCircle size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[9px] font-medium text-white/20">Pressione Enter para enviar, Shift+Enter para quebrar linha.</p>
            {feedback && (
              <p className="animate-in fade-in slide-in-from-right-1 text-[10px] font-bold text-amber-400/80">{feedback}</p>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

