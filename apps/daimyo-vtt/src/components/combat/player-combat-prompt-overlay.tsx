"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LoaderCircle, Shield, Swords } from "lucide-react";

import { respondCombatPromptAction } from "@/app/actions/combat-actions";
import { useImmersiveEventStore } from "@/stores/immersive-event-store";
import type { SessionPrivateEventRecord } from "@/types/immersive-event";
import type {
  CombatDefenseOption,
  CombatPromptPayload
} from "@/types/combat";

interface PlayerCombatPromptOverlayProps {
  sessionCode: string;
  events: SessionPrivateEventRecord[];
  heroName?: string | null;
}

function normalizeCombatPayload(
  payload: Record<string, unknown> | null
): CombatPromptPayload | null {
  if (!payload) {
    return null;
  }

  if (
    typeof payload.sessionId !== "string" ||
    typeof payload.actorTokenId !== "string" ||
    typeof payload.targetTokenId !== "string" ||
    typeof payload.summary !== "string" ||
    !Array.isArray(payload.options)
  ) {
    return null;
  }

  const options = payload.options.filter(
    (entry): entry is CombatDefenseOption =>
      entry === "none" || entry === "dodge" || entry === "parry" || entry === "block"
  );

  return {
    promptKind:
      payload.promptKind === "quick-contest" || payload.promptKind === "regular-contest"
        ? payload.promptKind
        : "defense",
    sessionId: payload.sessionId,
    actorTokenId: payload.actorTokenId,
    targetTokenId: payload.targetTokenId,
    actionType:
      typeof payload.actionType === "string"
        ? (payload.actionType as CombatPromptPayload["actionType"])
        : "attack",
    options,
    summary: payload.summary,
    attackRoll:
      typeof payload.attackRoll === "object" && payload.attackRoll !== null
        ? (payload.attackRoll as CombatPromptPayload["attackRoll"])
        : null,
    canRetreat: Boolean(payload.canRetreat),
    canAcrobatic: Boolean(payload.canAcrobatic),
    requestedAt:
      typeof payload.requestedAt === "string"
        ? payload.requestedAt
        : new Date().toISOString(),
    expiresAt: typeof payload.expiresAt === "string" ? payload.expiresAt : null
  };
}

export function PlayerCombatPromptOverlay({
  sessionCode,
  events,
  heroName
}: PlayerCombatPromptOverlayProps) {
  const removeEvent = useImmersiveEventStore((state) => state.removeEvent);
  const [defenseOption, setDefenseOption] = useState<CombatDefenseOption>("none");
  const [retreat, setRetreat] = useState(false);
  const [acrobatic, setAcrobatic] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const combatEvent = useMemo(
    () => events.find((event) => event.kind === "combat") ?? null,
    [events]
  );
  const payload = useMemo(
    () => normalizeCombatPayload(combatEvent?.payload ?? null),
    [combatEvent?.payload]
  );

  useEffect(() => {
    setDefenseOption(payload?.options[0] ?? "none");
    setRetreat(false);
    setAcrobatic(false);
    setFeedback(null);
  }, [combatEvent?.id, payload?.options]);

  if (!combatEvent || !payload) {
    return null;
  }

  const handleRespond = () => {
    setFeedback(null);
    startTransition(async () => {
      const result = await respondCombatPromptAction({
        sessionCode,
        eventId: combatEvent.id,
        defenseOption,
        retreat,
        acrobatic
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Falha ao responder ao prompt de combate.");
        return;
      }

      removeEvent(combatEvent.id);
    });
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center">
      <div className="pointer-events-auto w-full max-w-2xl rounded-[28px] border border-sky-300/18 bg-[rgba(4,10,18,0.95)] p-5 shadow-[0_28px_90px_rgba(2,6,23,0.58)] backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sky-300/18 bg-sky-300/10 text-sky-100">
            <Shield size={20} />
          </div>
          <div className="min-w-0">
            <p className="section-label text-sky-100">Defesa ativa</p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              {heroName ? `${heroName}, reaja ao golpe` : "Escolha sua resposta"}
            </h3>
            <p className="mt-2 text-sm leading-7 text-[color:var(--ink-2)]">
              {payload.summary}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {payload.attackRoll ? (
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              <Swords size={14} />
              ataque {payload.attackRoll.total} / {payload.attackRoll.target}
            </span>
          ) : null}
          {payload.expiresAt ? (
            <span className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)]">
              expira em breve
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <label className="space-y-1.5 text-sm">
              <span className="section-label">opcao de defesa</span>
              <select
                value={defenseOption}
                onChange={(event) => setDefenseOption(event.target.value as CombatDefenseOption)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition focus:border-white/20"
              >
                {payload.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              {payload.canRetreat ? (
                <button
                  type="button"
                  onClick={() => setRetreat((current) => !current)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                    retreat
                      ? "border-amber-300/24 bg-amber-300/12 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
                  }`}
                >
                  recuo
                </button>
              ) : null}
              {payload.canAcrobatic ? (
                <button
                  type="button"
                  onClick={() => setAcrobatic((current) => !current)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition ${
                    acrobatic
                      ? "border-amber-300/24 bg-amber-300/12 text-amber-100"
                      : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
                  }`}
                >
                  acrobatica
                </button>
              ) : null}
            </div>
          </div>

          <div className="rounded-[22px] border border-white/10 bg-black/18 p-4">
            <p className="section-label">Resumo</p>
            <p className="mt-2 text-sm leading-7 text-[color:var(--ink-2)]">
              Se voce nao conseguir se defender, o dano sera calculado em seguida
              com RD, local atingido e efeitos automaticos.
            </p>

            <button
              type="button"
              onClick={handleRespond}
              disabled={isPending}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-300/22 bg-sky-300/10 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-sky-100 transition hover:border-sky-300/34 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? <LoaderCircle size={14} className="animate-spin" /> : <Shield size={14} />}
              confirmar defesa
            </button>

            {feedback ? (
              <p className="mt-3 text-xs leading-6 text-rose-100">{feedback}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
