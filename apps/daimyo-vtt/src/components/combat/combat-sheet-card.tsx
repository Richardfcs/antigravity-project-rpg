"use client";

import {
  HeartPulse,
  MoonStar,
  Shield,
  Sparkles,
  Swords
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TacticalStageToken } from "@/lib/maps/selectors";

interface CombatSheetCardProps {
  title: string;
  entry: TacticalStageToken | null;
  tone?: "amber" | "sky" | "rose";
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
  tone = "amber"
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
            <div className="rounded-2xl border border-rose-300/18 bg-rose-300/8 px-3 py-2">
              <div className="flex items-center gap-2 text-rose-100">
                <HeartPulse size={14} />
                <p className="section-label text-current">PV</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                {profile.combat.currentHp}/{profile.attributes.hpMax}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/18 bg-amber-300/8 px-3 py-2">
              <div className="flex items-center gap-2 text-amber-100">
                <MoonStar size={14} />
                <p className="section-label text-current">PF</p>
              </div>
              <p className="mt-1 text-sm font-semibold text-white">
                {profile.combat.currentFp}/{profile.attributes.fpMax}
              </p>
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profile.conditions.map((condition) => (
                      <span
                        key={condition.id}
                        className="hud-chip border-rose-300/20 bg-rose-300/10 text-rose-100"
                      >
                        {condition.label}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

        </div>
      )}
    </article>
  );
}
