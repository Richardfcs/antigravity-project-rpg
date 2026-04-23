"use client";

import { useMemo, useState, useTransition } from "react";
import { Dices, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";

import { rollDiceAction } from "@/app/actions/chat-actions";
import { useChatStore } from "@/stores/chat-store";
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
        label: label.trim() || null
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
    <section className="flex h-full flex-col rounded-[20px] border border-white/10 bg-[var(--bg-panel-strong)] p-3">
      <header className="border-b border-white/8 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-300/10 text-rose-100">
            <Dices size={16} />
          </div>
          <div>
            <p className="section-label">Dados</p>
            <h3 className="text-sm font-semibold text-white">Rolador GURPS</h3>
          </div>
        </div>
      </header>

      <div className="mt-3 grid gap-2.5 md:grid-cols-[minmax(0,1fr)_120px]">
        <label className="block">
          <span className="section-label">Formula</span>
          <input
            value={formula}
            onChange={(event) => setFormula(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-300/35"
            placeholder="3d6"
          />
        </label>

        <label className="block">
          <span className="section-label">Alvo</span>
          <input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-300/35"
            placeholder="12"
            inputMode="numeric"
          />
        </label>
      </div>

      <label className="mt-2.5 block">
        <span className="section-label">Rotulo</span>
        <input
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-rose-300/35"
          placeholder="Ataque de katana, teste de medo..."
        />
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-rose-300/35 disabled:cursor-not-allowed disabled:opacity-60"
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
        className="mt-2.5 inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300/28 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:border-rose-300/45 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pendingKey === "custom" ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <Dices size={16} />
        )}
        rolar formula atual
      </button>

      <div className="mt-3 flex-1 space-y-2.5 border-t border-white/8 pt-3">
        <p className="section-label">Ultimas rolagens</p>
        {recentRolls.length === 0 && (
          <div className="rounded-[16px] border border-dashed border-white/12 bg-white/[0.03] px-3 py-3 text-sm text-[color:var(--ink-2)]">
            Nenhuma rolagem recente.
          </div>
        )}
        {recentRolls.map((message) => (
          <div
            key={message.id}
            className="rounded-[16px] border border-rose-300/18 bg-rose-300/10 px-3 py-2.5"
          >
            <p className="text-sm font-semibold text-white">{message.displayName}</p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--ink-2)]">
              {message.body}
            </p>
          </div>
        ))}
      </div>

      {feedback && <p className="mt-3 text-sm text-amber-100">{feedback}</p>}
    </section>
  );
}

