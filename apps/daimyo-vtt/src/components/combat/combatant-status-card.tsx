"use client";

import { useState, useEffect } from "react";
import { 
  HeartPulse, 
  MoonStar, 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  Swords, 
  Sparkles,
  Zap,
  Skull,
  User,
  Plus,
  Minus,
  ShieldAlert,
  HeartCrack
} from "lucide-react";
import type { TokenStatusPreset } from "@/types/map";
import { cn } from "@/lib/utils";
import type { TacticalStageToken } from "@/lib/maps/selectors";

interface CombatantStatusCardProps {
  entry: TacticalStageToken;
  isActive: boolean;
  onSelect?: (tokenId: string) => void;
  onAdjustResource?: (tokenId: string, resource: "hp" | "fp", delta: number) => void;
  onToggleStatus?: (tokenId: string, status: TokenStatusPreset) => void;
}

export function CombatantStatusCard({
  entry,
  isActive,
  onSelect,
  onAdjustResource,
  onToggleStatus
}: CombatantStatusCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const profile = entry.character?.sheetProfile;
  const hp = profile?.combat?.currentHp ?? 10;
  const hpMax = profile?.attributes?.hpMax ?? 10;
  const fp = profile?.combat?.currentFp ?? 10;
  const fpMax = profile?.attributes?.fpMax ?? 10;

  const [localHp, setLocalHp] = useState(hp);
  const [localFp, setLocalFp] = useState(fp);
  const [localStatus, setLocalStatus] = useState(entry.token.statusEffects ?? []);
  
  const [pendingHpDelta, setPendingHpDelta] = useState(0);
  const [pendingFpDelta, setPendingFpDelta] = useState(0);

  // Sincroniza props -> local apenas se não houver ajuste pendente
  useEffect(() => {
    if (pendingHpDelta === 0) setLocalHp(hp);
  }, [hp, pendingHpDelta]);

  useEffect(() => {
    if (pendingFpDelta === 0) setLocalFp(fp);
  }, [fp, pendingFpDelta]);

  useEffect(() => {
    setLocalStatus(entry.token.statusEffects ?? []);
  }, [entry.token.statusEffects]);

  // Debounce para HP
  useEffect(() => {
    if (pendingHpDelta === 0) return;
    const timer = setTimeout(() => {
      onAdjustResource?.(entry.token.id, "hp", pendingHpDelta);
      setPendingHpDelta(0);
    }, 1200); // Aguarda 1.2s após o último clique
    return () => clearTimeout(timer);
  }, [pendingHpDelta, entry.token.id, onAdjustResource]);

  // Debounce para FP
  useEffect(() => {
    if (pendingFpDelta === 0) return;
    const timer = setTimeout(() => {
      onAdjustResource?.(entry.token.id, "fp", pendingFpDelta);
      setPendingFpDelta(0);
    }, 1200);
    return () => clearTimeout(timer);
  }, [pendingFpDelta, entry.token.id, onAdjustResource]);

  const handleAdjust = (resource: "hp" | "fp", delta: number) => {
    if (resource === "hp") {
      setLocalHp(prev => prev + delta);
      setPendingHpDelta(prev => prev + delta);
    } else {
      setLocalFp(prev => prev + delta);
      setPendingFpDelta(prev => prev + delta);
    }
  };

  const handleToggle = (status: TokenStatusPreset) => {
    const updated = localStatus.includes(status)
      ? localStatus.filter(s => s !== status)
      : [...localStatus, status];
    setLocalStatus(updated);
    onToggleStatus?.(entry.token.id, status);
  };

  const hpPercent = Math.max(0, Math.min(100, (localHp / hpMax) * 100));
  const fpPercent = Math.max(0, Math.min(100, (localFp / fpMax) * 100));

  return (
    <div 
      className={cn(
        "group rounded-2xl border transition-all duration-300 overflow-hidden",
        isActive 
          ? "border-[color:var(--accent)]/40 bg-[color:var(--accent)]/5 shadow-[0_0_20px_rgba(212,168,70,0.05)]" 
          : "border-[color:var(--border-panel)] bg-[color:var(--bg-input)] hover:border-[color:var(--ink-3)]"
      )}
    >
      {/* Header Compacto */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => onSelect?.(entry.token.id)}
      >
        {/* Foto / Avatar */}
        <div className={cn(
          "h-10 w-10 shrink-0 rounded-full border bg-[color:var(--bg-deep)]/40 flex items-center justify-center text-xs font-black transition-all",
          isActive ? "border-[color:var(--accent)]/50 text-[color:var(--accent)] scale-110 shadow-[0_0_12px_rgba(212,168,70,0.2)]" : "border-[color:var(--border-panel)] text-[color:var(--ink-3)]"
        )}>
          {entry.asset?.secureUrl ? (
            <img src={entry.asset.secureUrl} alt={entry.label} className="h-full w-full rounded-full object-cover" />
          ) : (
            <User size={16} />
          )}
        </div>

        {/* Info Principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(
              "text-[11px] font-black uppercase tracking-widest truncate",
              isActive ? "text-[color:var(--accent)]" : "text-[color:var(--ink-2)]"
            )}>
              {entry.label}
            </h4>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-[color:var(--ink-3)] hover:text-[color:var(--ink-1)] transition-colors"
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-tighter">
                <span className="text-[color:var(--red-accent)] flex items-center gap-1">
                  <HeartPulse size={8} /> PV {localHp}/{hpMax}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleAdjust("hp", -1); }} className="hover:text-rose-300 transition-colors"><Minus size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleAdjust("hp", 1); }} className="hover:text-rose-300 transition-colors"><Plus size={10} /></button>
                </div>
              </div>
              <div className="h-1 w-full rounded-full bg-rose-950/40 overflow-hidden">
                <div 
                  className={cn("h-full transition-all duration-300", localHp < 0 ? "bg-[color:var(--red-blood)] shadow-[0_0_8px_rgba(225,29,72,0.4)]" : "bg-[color:var(--red-accent)]")} 
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-tighter">
                <span className="text-[color:var(--accent)] flex items-center gap-1">
                  <MoonStar size={8} /> PF {localFp}/{fpMax}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); handleAdjust("fp", -1); }} className="hover:text-amber-300 transition-colors"><Minus size={10} /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleAdjust("fp", 1); }} className="hover:text-amber-300 transition-colors"><Plus size={10} /></button>
                </div>
              </div>
              <div className="h-1 w-full rounded-full bg-amber-950/40 overflow-hidden">
                <div 
                  className="h-full bg-[color:var(--accent)] transition-all duration-300" 
                  style={{ width: `${fpPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Expandido (Gaveta) */}
      {isExpanded && profile && (
        <div className="border-t border-white/5 bg-black/20 p-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
          {/* Atributos e Defesas */}
          <div className="grid grid-cols-4 gap-1">
            {[
              { label: "DX", val: profile.attributes.dx },
              { label: "IQ", val: profile.attributes.iq },
              { label: "Esq", val: profile.defenses.dodge },
              { label: "Ap", val: profile.defenses.parry }
            ].map(stat => (
              <div key={stat.label} className="rounded-lg bg-[color:var(--ink-1)]/[0.03] p-1 text-center">
                <p className="text-[7px] font-black text-[color:var(--ink-3)] uppercase">{stat.label}</p>
                <p className="text-[10px] font-bold text-[color:var(--ink-1)]">{stat.val}</p>
              </div>
            ))}
          </div>

          {/* Armas e Estilo */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[8px] font-black text-[color:var(--ink-3)] uppercase tracking-widest">
              <Swords size={10} /> Armas & Estilo
            </div>
            <div className="space-y-1">
              {profile.weapons.slice(0, 2).map(weapon => (
                <div key={weapon.id} className="flex items-center justify-between rounded-lg bg-[color:var(--ink-1)]/[0.03] px-2 py-1">
                  <span className="text-[9px] font-bold text-[color:var(--ink-2)] truncate">{weapon.name}</span>
                  <span className="text-[9px] font-mono text-[color:var(--accent)]/60">{weapon.rawDamage || "Dano"}</span>
                </div>
              ))}
              <div className="text-[8px] text-white/40 italic truncate">
                Estilo: {profile.style.name || "Nenhum"}
              </div>
            </div>
          </div>

          {/* Condições GURPS Rápidas */}
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-[8px] font-black text-[color:var(--ink-3)] uppercase tracking-widest">
              <ShieldAlert size={10} /> Gerenciar Status (GM)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "collapsed", label: "Colapso" },
                { id: "below_zero", label: "Sub 0 PV" },
                { id: "stunned", label: "Atord." },
                { id: "dead", label: "Morto" }
              ].map(status => {
                const isSet = localStatus.includes(status.id as TokenStatusPreset);
                return (
                  <button
                    key={status.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(status.id as TokenStatusPreset);
                    }}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[8px] font-black uppercase transition-all border",
                      isSet 
                        ? "bg-[color:var(--red-accent)]/20 border-[color:var(--red-accent)]/40 text-[color:var(--red-accent)]" 
                        : "bg-[color:var(--bg-input)] border-[color:var(--border-panel)] text-[color:var(--ink-3)] hover:border-[color:var(--ink-2)] hover:text-[color:var(--ink-1)]"
                    )}
                  >
                    {status.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condições da Ficha */}
          {profile.conditions && profile.conditions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-[8px] font-black text-[color:var(--ink-3)] uppercase tracking-widest">
                <Sparkles size={10} /> Da Ficha
              </div>
              <div className="flex flex-wrap gap-1">
                {profile.conditions.map(cond => (
                  <span key={cond.id} className="px-1.5 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-[8px] font-black text-sky-400 uppercase">
                    {cond.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
