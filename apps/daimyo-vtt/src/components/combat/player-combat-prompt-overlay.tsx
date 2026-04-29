"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LoaderCircle, Shield, Swords, ShieldAlert, Zap, MoveRight, Sparkles, Binary } from "lucide-react";

import { respondCombatPromptAction } from "@/app/actions/combat-actions";
import { useImmersiveEventStore } from "@/stores/immersive-event-store";
import { cn } from "@/lib/utils";
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
    defenseLevels: (payload.defenseLevels as Record<string, number>) || null,
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
  const [feverish, setFeverish] = useState(false);
  const [manualModifier, setManualModifier] = useState(0);
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

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setDefenseOption(payload?.options[0] ?? "none");
    setRetreat(false);
    setAcrobatic(false);
    setFeverish(false);
    setManualModifier(0);
    setFeedback(null);
  }, [combatEvent?.id, payload?.options]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        acrobatic,
        feverish,
        manualModifier
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Falha ao responder ao prompt de combate.");
        return;
      }

      removeEvent(combatEvent.id);
    });
  };

  const defenseLabels: Record<string, { label: string; sub: string }> = {
    dodge: { label: "ESQUIVA", sub: "Baseado em Velocidade Básica." },
    parry: { label: "APARAR", sub: "Baseado em perícia de combate." },
    block: { label: "BLOQUEIO", sub: "Uso do escudo equipado." },
    none: { label: "SEM DEFESA", sub: "Aceitar o golpe sem reagir." }
  };

  const finalNH = (() => {
    const baseLevel = payload.defenseLevels?.[defenseOption] || 10;
    let level = baseLevel + manualModifier;
    if (retreat) level += (defenseOption === "dodge" ? 3 : 1);
    if (feverish) level += 2;
    return Math.min(16, Math.max(3, level));
  })();

  const finalProb = (() => {
    const nh = finalNH;
    const probMap: Record<number, string> = {
      3: "0.5%", 4: "1.9%", 5: "4.6%", 6: "9.3%", 7: "16.2%", 8: "25.9%", 
      9: "37.5%", 10: "50%", 11: "62.5%", 12: "74.1%", 13: "83.8%", 
      14: "90.7%", 15: "95.4%", 16: "98.1%"
    };
    return probMap[nh] || (nh > 16 ? "98.1%" : "0.5%");
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-[110] flex items-end justify-center p-2 sm:items-center">
      <div className="pointer-events-auto w-full max-w-xl overflow-hidden rounded-[24px] border border-white/5 bg-[rgba(10,10,10,0.95)] shadow-[0_28px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl">
        
        {/* Header - Estilo "Premium" */}
        <div className="relative flex items-center gap-3 border-b border-white/5 px-4 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white">Sob Ataque!</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-rose-500 opacity-80">Escolha sua defesa ativa</p>
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {/* Summary Box */}
          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-3">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[color:var(--ink-2)]">
                <Swords size={20} />
              </div>
              <p className="text-sm italic leading-relaxed text-[color:var(--ink-2)] opacity-90">
                {payload.summary}
              </p>
            </div>
          </div>

          {/* Gold Probability Box - Santuário Design */}
          {payload.options.length > 0 && (
            <div className="overflow-hidden rounded-[18px] bg-gradient-to-br from-amber-200 to-amber-500 p-[1px] shadow-[0_16px_40px_rgba(245,158,11,0.15)]">
              <div className="flex items-center justify-between rounded-[17px] bg-[rgba(20,15,5,0.92)] px-4 py-3 backdrop-blur-md">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/50">Potencial de Defesa</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black tracking-tighter text-amber-200">
                      NH {(() => {
                        const dl = payload.defenseLevels as any;
                        const baseLevel = (dl && typeof dl === "object" ? dl[defenseOption] : null) || 10;
                        let level = baseLevel + manualModifier;
                        if (retreat) level += (defenseOption === "dodge" ? 3 : 1);
                        if (feverish) level += 2;
                        return Math.min(16, Math.max(3, level));
                      })()}
                    </span>
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-200/50">Probabilidade</p>
                  <span className="text-3xl font-black italic tracking-tighter text-amber-200">
                    {(() => {
                      const dl = payload.defenseLevels as any;
                      const baseLevel = (dl && typeof dl === "object" ? dl[defenseOption] : null) || 10;
                      let level = baseLevel + manualModifier;
                      if (retreat) level += (defenseOption === "dodge" ? 3 : 1);
                      if (feverish) level += 2;
                      const nh = Math.min(16, Math.max(3, level));
                      const probMap: Record<number, string> = {
                        3: "0.5%", 4: "1.9%", 5: "4.6%", 6: "9.3%", 7: "16.2%", 8: "25.9%", 
                        9: "37.5%", 10: "50%", 11: "62.5%", 12: "74.1%", 13: "83.8%", 
                        14: "90.7%", 15: "95.4%", 16: "98.1%"
                      };
                      return probMap[nh] || (nh > 16 ? "98.1%" : "0.5%");
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Métodos Disponíveis */}
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--ink-2)]">
              <Shield size={12} /> Métodos Disponíveis
            </p>
            <div className="grid gap-2.5">
              {payload.options.map((option) => {
                const active = defenseOption === option;
                const info = defenseLabels[option] || { label: option.toUpperCase(), sub: "" };
                return (
                  <button
                    key={option}
                    onClick={() => setDefenseOption(option)}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-[18px] border px-3 py-3 transition-all duration-300",
                      active 
                        ? "border-rose-500/40 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.05)]" 
                        : "border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]"
                    )}
                  >
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all",
                      active 
                        ? "border-rose-500/30 bg-rose-500/20 text-rose-500" 
                        : "border-white/10 bg-white/5 text-[color:var(--ink-2)] group-hover:text-white"
                    )}>
                      <Shield size={18} className={cn(active && "fill-rose-500/20")} />
                    </div>
                    <div className="text-left">
                      <p className={cn("text-sm font-black tracking-tight", active ? "text-white" : "text-[color:var(--ink-2)]")}>
                        {info.label}
                      </p>
                      <p className="text-xs text-[color:var(--ink-2)] opacity-50">{info.sub}</p>
                    </div>
                    <MoveRight className={cn(
                      "ml-auto h-5 w-5 transition-all",
                      active ? "text-rose-500 translate-x-0 opacity-100" : "text-white/0 -translate-x-4 opacity-0"
                    )} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opções Extra */}
          <div className="grid grid-cols-4 gap-3">
            {payload.canRetreat && (
              <button
                type="button"
                onClick={() => setRetreat(!retreat)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-[20px] border py-4 transition-all",
                  retreat ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-2)] hover:border-white/10"
                )}
              >
                <Zap size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Recuar (+3)</span>
              </button>
            )}
            {payload.canAcrobatic && (
              <button
                type="button"
                onClick={() => setAcrobatic(!acrobatic)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-[20px] border py-4 transition-all",
                  acrobatic ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-2)] hover:border-white/10"
                )}
              >
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Acrobática (+2)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setFeverish(!feverish)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-[20px] border py-4 transition-all",
                feverish ? "border-amber-400/40 bg-amber-400/10 text-amber-400" : "border-white/5 bg-white/[0.02] text-[color:var(--ink-2)] hover:border-white/10"
              )}
            >
              <Zap size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">Febril (+2)</span>
            </button>
            <div className="flex flex-col items-center justify-center gap-1 rounded-[20px] border border-white/5 bg-white/[0.02] py-3 text-[color:var(--ink-2)]">
              <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Manual</span>
              <div className="flex items-center gap-2">
                <Binary size={12} className="opacity-30" />
                <input 
                  type="number"
                  value={manualModifier}
                  onChange={(e) => setManualModifier(parseInt(e.target.value) || 0)}
                  className="w-10 bg-transparent text-center text-xl font-black text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleRespond}
            disabled={isPending}
            className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-[24px] bg-rose-500 py-6 text-sm font-black uppercase tracking-[0.3em] text-white shadow-[0_15px_40px_rgba(244,63,94,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {isPending ? (
              <LoaderCircle size={20} className="animate-spin" />
            ) : (
              <>
                <Shield size={20} className="transition-transform group-hover:scale-125" />
                Confirmar Defesa
              </>
            )}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          </button>

          {feedback && (
            <p className="text-center text-xs font-bold text-rose-400 uppercase tracking-widest animate-pulse">{feedback}</p>
          )}
        </div>
      </div>
    </div>
  );
}
