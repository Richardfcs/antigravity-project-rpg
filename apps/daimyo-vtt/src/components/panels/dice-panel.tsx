"use client";

import { useMemo, useState, useTransition } from "react";
import { Dices, LoaderCircle, ShieldCheck, Sparkles, Eye, EyeOff } from "lucide-react";

import { rollDiceAction } from "@/app/actions/chat-actions";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import type { SessionViewerIdentity } from "@/types/session";

interface DicePanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

export function DicePanel({ sessionCode, viewer }: DicePanelProps) {
  const messages = useChatStore((state) => state.messages);
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const [formula, setFormula] = useState("3d6");
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPrivateRoll, setIsPrivateRoll] = useState(false);
  const [isPending, startTransition] = useTransition();

  const recentRolls = useMemo(
    () => messages.filter((message) => message.kind === "roll").slice(-4).reverse(),
    [messages]
  );

  const runRoll = (key: string, nextFormula: string, nextTarget?: number | null) => {
    if (!viewer) {
      setFeedback("Entre na sessao pelo lobby para rolar dados.");
      return;
    }

    setFeedback(null);
    setPendingKey(key);

    startTransition(async () => {
      const result = await rollDiceAction({
        sessionCode,
        formula: nextFormula,
        target: typeof nextTarget === "number" ? nextTarget : null,
        label: label.trim() || null,
        isPrivate: isPrivateRoll
      });

      if (result.ok && result.message) {
        upsertMessage(result.message);
      } else {
        setFeedback(result.error ?? "Falha ao rolar os dados.");
      }

      setPendingKey(null);
    });
  };

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4">
      <header className="border-b border-[var(--border-panel)] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
            <Dices size={18} />
          </div>
          <div>
            <p className="section-label">Dados</p>
            <h3 className="mt-1 text-lg font-semibold text-[color:var(--text-primary)]">Rolador GURPS</h3>
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_140px]">
        <label className="block">
          <span className="section-label">Formula</span>
          <input
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
            placeholder="3d6"
          />
        </label>

        <label className="block">
          <span className="section-label">Alvo</span>
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
            placeholder="12"
            inputMode="numeric"
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="section-label">Rotulo</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
          placeholder="Ataque de katana, teste de medo..."
        />
      </label>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-card)] px-4 py-2">
        <div className="flex items-center gap-2">
          {isPrivateRoll ? <EyeOff size={14} className="text-[color:var(--gold)]" /> : <Eye size={14} className="text-[color:var(--text-muted)]" />}
          <span className={cn("text-[10px] font-black uppercase tracking-widest", isPrivateRoll ? "text-[color:var(--gold)]" : "text-[color:var(--text-muted)]")}>
            {isPrivateRoll ? "Rolagem Secreta Ativa" : "Rolagem Publica"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsPrivateRoll(!isPrivateRoll)}
          className={cn(
            "rounded-lg border px-3 py-1 text-[9px] font-black uppercase tracking-widest transition",
            isPrivateRoll ? "border-[color:var(--gold)]/30 bg-[color:var(--gold)]/10 text-[color:var(--gold)]" : "border-[var(--border-panel)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
          )}
        >
          {isPrivateRoll ? "Tornar Publico" : "Mudar para Secreta"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {[
          { key: "quick:3d6", label: "3d6 puro", formula: "3d6", needsTarget: false, icon: Sparkles },
          { key: "quick:test", label: "Teste", formula: "3d6", needsTarget: true, icon: ShieldCheck },
          { key: "quick:1d6", label: "1d6", formula: "1d6", needsTarget: false, icon: Dices }
        ].map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() =>
              runRoll(
                preset.key,
                preset.formula,
                preset.needsTarget ? Number(target) || null : null
              )
            }
            disabled={isPending || !viewer}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--gold)]/35 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pendingKey === preset.key ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <preset.icon size={16} />
            )}
            {preset.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => runRoll("custom", formula, target ? Number(target) || null : null)}
        disabled={isPending || !viewer}
        className="mt-3 inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--gold)]/28 bg-[color:var(--mist)] px-4 py-3 text-sm font-semibold text-[color:var(--gold)] transition hover:border-[color:var(--gold)]/45 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
      >
        {pendingKey === "custom" ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <Dices size={16} />
        )}
        rolar formula atual
      </button>

      <div className="mt-4 flex-1 space-y-3 border-t border-[var(--border-panel)] pt-4">
        <p className="section-label">Ultimas rolagens</p>
        {recentRolls.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-4 text-sm text-[color:var(--text-secondary)]">
            Nenhuma rolagem recente.
          </div>
        )}
        {recentRolls.map((message) => (
          <div
            key={message.id}
            className="rounded-[18px] border border-[color:var(--gold)]/18 bg-[color:var(--mist)] px-4 py-3"
          >
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">{message.displayName}</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--text-secondary)]">
              {message.body}
            </p>
          </div>
        ))}
      </div>

      {feedback && <p className="mt-3 text-sm text-[color:var(--gold)]">{feedback}</p>}
    </section>
  );
}

