"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { 
  Dice6, 
  EyeOff, 
  History, 
  LayoutGrid, 
  LoaderCircle, 
  MessageSquareText, 
  ScrollText, 
  Send, 
  ShieldAlert, 
  Sparkles, 
  Trash2 
} from "lucide-react";

import { cn } from "@/lib/utils";
import { sendChatMessageAction, clearChatAction } from "@/app/actions/chat-actions";
import { useChatStore } from "@/stores/chat-store";
import type { SessionMessageRecord } from "@/types/message";
import type { SessionViewerIdentity } from "@/types/session";

interface ChatPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

type ChatFilter = "all" | "narrative" | "tactical" | "master";

function toneForKind(kind: string, isPrivate: boolean) {
  if (isPrivate) {
    return "border-rose-500/30 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.05)]";
  }
  
  switch (kind) {
    case "roll":
      return "border-[color:var(--gold)]/20 bg-[color:var(--mist)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.05)]";
    case "system":
      return "border-blue-500/20 bg-blue-500/5";
    case "oracle":
      return "border-purple-500/20 bg-purple-500/5 shadow-[0_0_15px_rgba(168,85,247,0.05)]";
    case "master-log":
      return "border-rose-500/20 bg-rose-500/5";
    default:
      return "border-[var(--border-panel)] bg-[var(--bg-card)]/30";
  }
}

export function ChatPanel({ sessionCode, viewer }: ChatPanelProps) {
  const messages = useChatStore((state) => state.messages);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const setMessages = useChatStore((state) => state.setMessages);
  
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<ChatFilter>("all");
  const [isSecret, setIsSecret] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
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

      // Se o filtro for master, s mostra logs/privados (apenas GM)
      if (filter === "master") {
        return isGM && (msg.isPrivate || msg.kind === "master-log");
      }

      // Se for filtro especfico, aplica a regra
      if (filter === "narrative") return msg.kind === "chat" && !msg.isPrivate;
      if (filter === "tactical") return msg.kind === "roll" && !msg.isPrivate;

      // "all" - mostra tudo que no for privado (a menos que seja o GM vendo tudo)
      if (msg.isPrivate) return isGM; 
      
      return true;
    });
  }, [messages, filter, isGM]);

  const visibleMessages = useMemo(() => filteredMessages.slice(-60), [filteredMessages]);

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
    if (!window.confirm("Deseja realmente limpar todo o histrico de mensagens?")) return;

    startTransition(async () => {
      const result = await clearChatAction({ sessionCode });
      if (result.ok) {
        setMessages([]);
        setFeedback("Chat limpo com sucesso.");
      } else {
        setFeedback(result.error ?? "Erro ao limpar chat.");
      }
    });
  };

  return (
    <div className="flex h-full flex-col space-y-4">
      <section className="flex flex-1 flex-col overflow-hidden rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
        <header className="shrink-0 border-b border-[var(--border-panel)] bg-[var(--bg-panel)]/10">
          <div className="flex items-center justify-between p-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--mist)] text-[color:var(--gold)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.1)]">
                <MessageSquareText size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight text-[color:var(--text-primary)] uppercase">Sussurros do Destino</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Apoio Narrativo e Ttico</p>
              </div>
            </div>

            {isGM && (
              <button
                onClick={handleClearChat}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-400 transition-all hover:bg-rose-500/20"
                title="Limpar Chat"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Sub-Selees (Filtros) */}
          <div className="flex px-6 pb-4 gap-2">
            {[
              { id: "all", label: "Geral", icon: LayoutGrid },
              { id: "narrative", label: "Texto", icon: ScrollText },
              { id: "tactical", label: "Dados", icon: Dice6 },
              ...(isGM ? [{ id: "master", label: "Log Mestre", icon: ShieldAlert }] : [])
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id as ChatFilter)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all",
                  filter === btn.id
                    ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] text-[color:var(--gold)]"
                    : "border-[var(--border-panel)] bg-[var(--bg-input)] text-[color:var(--text-muted)] hover:border-[color:var(--gold)]/30 hover:text-[color:var(--text-secondary)]"
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
          className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4"
        >
          {visibleMessages.length === 0 && (
            <div className="flex h-full items-center justify-center rounded-[24px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/20 p-12 text-center">
              <p className="text-sm font-medium italic text-[color:var(--text-muted)]">
                {filter === "master" ? "Nenhum log importante registrado." : "O silncio ecoa nestas paredes virtuais..."}
              </p>
            </div>
          )}

          {visibleMessages.map((message: SessionMessageRecord) => (
            <article
              key={message.id}
              className={cn(
                "group relative rounded-[20px] border p-4 transition-all hover:bg-white/[0.04]",
                toneForKind(message.kind, message.isPrivate)
              )}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold tracking-tight",
                    message.isPrivate ? "text-rose-500" : "text-[color:var(--text-primary)]"
                  )}>
                    {message.displayName}
                  </span>
                  
                  {message.isPrivate && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-rose-400">
                      <EyeOff size={10} />
                      Privado
                    </span>
                  )}
                  
                  {message.kind === "roll" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--gold)]/30 bg-[color:var(--mist)] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[color:var(--gold)]">
                      <Dice6 size={10} />
                      Rolagem
                    </span>
                  )}
                  
                  {message.kind === "master-log" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-rose-400">
                      <History size={10} />
                      Ao do Mestre
                    </span>
                  )}
                  
                  {message.kind === "oracle" && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-400/30 bg-purple-400/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-purple-400">
                      <Sparkles size={10} />
                      Orculo
                    </span>
                  )}
                </div>
                <time className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">
                  {new Date(message.createdAt).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
              </div>
              <p className={cn(
                "text-sm leading-relaxed whitespace-pre-wrap font-medium",
                message.isPrivate ? "text-rose-500/90" : "text-[color:var(--text-secondary)]"
              )}>
                {message.body}
              </p>
            </article>
          ))}
        </div>

        <footer className="shrink-0 p-6 border-t border-[var(--border-panel)] bg-[var(--bg-panel)]/30">
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
              className={cn(
                "w-full resize-none rounded-2xl border px-5 py-4 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] disabled:opacity-50",
                isSecret 
                  ? "border-rose-500/30 bg-rose-500/5 focus:border-rose-500/50" 
                  : "border-[var(--border-panel)] bg-[var(--bg-input)] focus:border-[color:var(--gold)]/30 focus:bg-[var(--bg-card)]"
              )}
            />
            
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              {isGM && (
                <button
                  type="button"
                  onClick={() => setIsSecret(!isSecret)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition-all",
                    isSecret
                      ? "border-rose-500/50 bg-rose-500/20 text-rose-500"
                      : "border-[var(--border-panel)] bg-[var(--bg-input)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                  )}
                  title={isSecret ? "Segredo Ativado" : "Mensagem Pblica"}
                >
                  <EyeOff size={18} />
                </button>
              )}
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !viewer || !draft.trim()}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl border transition-all disabled:opacity-20 shadow-[0_0_20px_rgba(var(--gold-rgb),0.1)]",
                  isSecret
                    ? "border-rose-500/40 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
                    : "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)] hover:bg-[color:var(--gold)]/20"
                )}
              >
                {isPending ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-[9px] font-medium text-[color:var(--text-muted)]">
              {isSecret ? "Sussurrando em segredo..." : "Pressione Enter para enviar pblico."}
            </p>
            {feedback && (
              <p className="animate-in fade-in slide-in-from-right-1 text-[10px] font-bold text-amber-400/80">{feedback}</p>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

