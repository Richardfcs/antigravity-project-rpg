"use client";

import {
  HeartPulse,
  MoonStar,
  Shield,
  Sparkles,
  Swords,
  Plus,
  Minus,
  Skull,
  Zap,
  Waves,
  Flame,
  Moon,
  EyeOff,
  AlertTriangle
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TacticalStageToken } from "@/lib/maps/selectors";

interface CombatSheetCardProps {
  title: string;
  entry: TacticalStageToken | null;
  tone?: "amber" | "sky" | "rose";
  onAdjustResource?: (resource: "hp" | "fp", delta: number) => void;
  onUpdateResource?: (resource: "hp" | "fp", value: number) => void;
}

const toneClassByTone = {
  amber: "border-amber-300/18 bg-amber-300/8",
  sky: "border-sky-300/18 bg-sky-300/8",
  rose: "border-rose-300/18 bg-rose-300/8"
} as const;

function StatChip({
  label,
  value
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/18 px-3 py-2">
      <p className="section-label">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export function CombatSheetCard({
  title,
  entry,
  tone = "amber",
  onAdjustResource,
  onUpdateResource
}: CombatSheetCardProps) {
  const profile = entry?.character?.sheetProfile ?? null;

  return (
    <article className={cn("rounded-[20px] border p-3", toneClassByTone[tone])}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-label">{title}</p>
          <h3 className="mt-1 text-sm font-semibold text-white">
            {entry?.label ?? "Nenhum combatente selecionado"}
          </h3>
        </div>
        {entry?.token.faction ? (
          <div className="flex flex-col items-end gap-1">
            <span className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)]">
              {entry.token.faction}
            </span>
            {entry.character?.tier && (
              <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-3)] text-[10px]">
                {entry.character.tier === 'full' ? 'Ficha Completa' : entry.character.tier === 'medium' ? 'Ficha Mediana' : 'Ficha Resumida'}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {!entry ? (
        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-2)]">
          Selecione um token na ordem ou no mapa para abrir a ficha de combate.
        </p>
      ) : !profile ? (
        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-2)]">
          Este token ainda usa apenas a ficha resumida. Vincule ou importe uma
          ficha completa para ativar os calculos do piloto.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="group relative rounded-2xl border border-rose-400/20 bg-rose-400/5 px-3 py-2 transition-all hover:bg-rose-400/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-rose-400">
                  <HeartPulse size={14} className="animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-widest">PV</p>
                </div>
                {onAdjustResource && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onAdjustResource("hp", -1)}
                      className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={() => onAdjustResource("hp", 1)}
                      className="p-1 rounded-md hover:bg-rose-500/20 text-rose-400/60 hover:text-rose-400 transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={profile.combat.currentHp}
                  onChange={(e) => onUpdateResource?.("hp", parseInt(e.target.value) || 0)}
                  className={cn(
                    "w-20 bg-transparent text-xl font-black outline-none transition-colors focus:text-white",
                    profile.combat.currentHp < 0 ? "text-rose-500" : "text-white"
                  )}
                />
                <p className="text-[10px] font-bold text-rose-400/40">
                  / {profile.attributes.hpMax}
                </p>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-rose-950/40">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    profile.combat.currentHp < 0 
                      ? "bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.5)]" 
                      : "bg-gradient-to-r from-rose-600 to-rose-400"
                  )}
                  style={{ width: `${Math.max(0, Math.min(100, (profile.combat.currentHp / profile.attributes.hpMax) * 100))}%` }}
                />
              </div>
            </div>
            
            <div className="group relative rounded-2xl border border-amber-400/20 bg-amber-400/5 px-3 py-2 transition-all hover:bg-amber-400/10">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <MoonStar size={14} />
                  <p className="text-[10px] font-black uppercase tracking-widest">PF</p>
                </div>
                {onAdjustResource && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onAdjustResource("fp", -1)}
                      className="p-1 rounded-md hover:bg-amber-500/20 text-amber-400/60 hover:text-amber-400 transition"
                    >
                      <Minus size={12} />
                    </button>
                    <button
                      onClick={() => onAdjustResource("fp", 1)}
                      className="p-1 rounded-md hover:bg-amber-500/20 text-amber-400/60 hover:text-amber-400 transition"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={profile.combat.currentFp}
                  onChange={(e) => onUpdateResource?.("fp", parseInt(e.target.value) || 0)}
                  className={cn(
                    "w-20 bg-transparent text-xl font-black outline-none transition-colors focus:text-white",
                    profile.combat.currentFp < 0 ? "text-amber-500" : "text-white"
                  )}
                />
                <p className="text-[10px] font-bold text-amber-400/40">
                  / {profile.attributes.fpMax}
                </p>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-amber-950/40">
                <div
                  className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, (profile.combat.currentFp / profile.attributes.fpMax) * 100))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <StatChip label="ST" value={profile.attributes.st} />
            <StatChip label="DX" value={profile.attributes.dx} />
            <StatChip label="IQ" value={profile.attributes.iq} />
            <StatChip label="HT" value={profile.attributes.ht} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatChip label="Esquiva" value={profile.defenses.dodge} />
            <StatChip label="Aparar" value={profile.defenses.parry} />
            <StatChip label="Bloqueio" value={profile.defenses.block} />
          </div>


              <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
                <div className="flex items-center gap-2">
                  <Swords size={14} className="text-white" />
                  <p className="section-label">Combate</p>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[color:var(--ink-2)]">
                  <span>estilo: {profile.style.name || "sem estilo"}</span>
                  <span>postura: {profile.combat.posture}</span>
                  <span>velocidade: {profile.derived.basicSpeed.toFixed(2)}</span>
                  <span>desloc.: {profile.derived.move}</span>
                  <span>choque: {profile.combat.shock}</span>
                  <span>sangramento: {profile.combat.bleeding}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-white" />
                  <p className="section-label">Armas e RD</p>
                </div>
                <div className="mt-2 space-y-2 text-xs text-[color:var(--ink-2)]">
                  {profile.weapons.length > 0 ? (
                    profile.weapons.map((weapon) => {
                      const isActive = weapon.id === profile.combat.activeWeaponId;
                      const mode = weapon.modes.find(
                        (entry) => entry.id === profile.combat.activeWeaponModeId
                      );

                      return (
                        <div
                          key={weapon.id}
                          className={cn(
                            "rounded-2xl border px-3 py-2",
                            isActive
                              ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                              : "border-white/8 bg-white/[0.03]"
                          )}
                        >
                          <p className="font-semibold text-white">
                            {weapon.name} {weapon.quality ? <span className="text-[10px] text-amber-500/70 ml-1 uppercase">{weapon.quality}</span> : ""} {isActive ? "★" : ""}
                          </p>
                          <p className="mt-1">
                            est. {weapon.state}
                            {mode ? ` · ${mode.label} · ${mode.damage.raw}` : (weapon.rawDamage ? ` · ${weapon.rawDamage}` : "")}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p>Sem armas cadastradas.</p>
                  )}

                  {profile.armor.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {profile.armor.map((armor) => (
                        <span
                          key={armor.id}
                          className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]"
                        >
                          {armor.name} · RD {armor.dr} · {armor.zone}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-white" />
                  <p className="section-label">Tecnicas</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.combat.loadoutTechniqueIds.length > 0 ? (
                    profile.combat.loadoutTechniqueIds.map((techniqueId) => {
                      const technique = profile.techniques.find(
                        (entry) => entry.id === techniqueId
                      );

                      return (
                        <span
                          key={techniqueId}
                          className="hud-chip border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                        >
                          {technique?.name ?? techniqueId}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-xs text-[color:var(--ink-2)]">
                      Sem loadout carregado.
                    </span>
                  )}
                </div>
                {profile.conditions.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 px-1">Condições</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.conditions.map((condition) => {
                        const label = condition.label.toLowerCase();
                        const isStunned = label.includes("atordoado");
                        const isDead = label.includes("morto");
                        const isBleeding = label.includes("sangrando");
                        const isProne = label.includes("caido") || label.includes("prone");
                        
                        return (
                          <span
                            key={condition.id}
                            className={cn(
                              "hud-chip transition-all hover:scale-105",
                              isDead ? "border-rose-500/40 bg-rose-500/20 text-rose-200" :
                              isStunned ? "border-amber-400/40 bg-amber-400/20 text-amber-100" :
                              isBleeding ? "border-red-600/40 bg-red-600/20 text-red-100" :
                              "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]"
                            )}
                          >
                            {isDead && <Skull size={10} />}
                            {isStunned && <Zap size={10} />}
                            {isBleeding && <Waves size={10} />}
                            {condition.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>

        </div>
      )}
    </article>
  );
}
