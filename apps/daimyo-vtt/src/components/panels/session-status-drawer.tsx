"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  HeartPulse,
  LoaderCircle,
  MoonStar,
  RadioTower,
  RotateCcw,
  Swords,
  Trash2,
  UserMinus,
  UserPlus
} from "lucide-react";

import { removeParticipantAction } from "@/app/actions/session-actions";
import { setActiveCharacterAction } from "@/app/actions/character-actions";

import { adjustCharacterResourceAction } from "@/app/actions/character-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { resolveCharacterAsset } from "@/lib/characters/selectors";
import { cn } from "@/lib/utils";
import { useCharacterStore } from "@/stores/character-store";
import type { SessionAssetRecord } from "@/types/asset";
import type { SessionCharacterRecord } from "@/types/character";
import type { OnlinePresence } from "@/types/presence";
import type { SessionParticipantRecord, SessionViewerIdentity } from "@/types/session";

interface SessionStatusDrawerProps {
  sessionCode: string;
  gmName?: string | null;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
  party: OnlinePresence[];
  characters: SessionCharacterRecord[];
  assets: SessionAssetRecord[];
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
  embedded?: boolean;
}

function ResourceChip({
  label,
  value,
  canAdjust,
  pending,
  onAdjust
}: {
  label: "hp" | "fp";
  value: string;
  canAdjust: boolean;
  pending: boolean;
  onAdjust: (delta: number) => void;
}) {
  const Icon = label === "hp" ? HeartPulse : MoonStar;
  const tone =
    label === "hp"
      ? "border-rose-300/16 bg-rose-300/10 text-rose-100"
      : "border-amber-300/16 bg-amber-300/10 text-amber-100";

  return (
    <div className={cn("rounded-2xl border px-3 py-2.5", tone)}>
      <div className="flex items-center gap-2">
        <Icon size={14} />
        <p className="section-label text-current">{label === "hp" ? "PV" : "PF"}</p>
      </div>
      <p className="mt-1.5 text-sm font-semibold text-white">{value}</p>
      {canAdjust ? (
        <div className="mt-2 flex gap-2">
          {[-1, 1].map((delta) => (
            <button
              key={`${label}:${delta}`}
              type="button"
              onClick={() => onAdjust(delta)}
              className="rounded-xl border border-white/10 bg-black/18 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-white/20"
            >
              {pending ? (
                <LoaderCircle size={12} className="animate-spin" />
              ) : delta > 0 ? (
                `+${delta}`
              ) : (
                `${delta}`
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getCombatSummary(character: SessionCharacterRecord) {
  const profile = character.sheetProfile;

  if (!profile) {
    return {
      style: "Ficha resumida",
      weapon: "Sem arma definida",
      loadout: [] as string[]
    };
  }

  const activeWeapon =
    profile.weapons.find((weapon) => weapon.id === profile.combat.activeWeaponId) ??
    profile.weapons[0] ??
    null;
  const techniques = profile.combat.loadoutTechniqueIds
    .map((techniqueId) => profile.techniques.find((technique) => technique.id === techniqueId)?.name)
    .filter(Boolean) as string[];

  return {
    style: profile.style.name,
    weapon: activeWeapon?.name ?? "Sem arma definida",
    loadout: techniques
  };
}

export function SessionStatusDrawer({
  sessionCode,
  gmName,
  viewer,
  participants,
  party,
  characters,
  assets,
  defaultOpen = false,
  open,
  onOpenChange,
  embedded = false
}: SessionStatusDrawerProps) {
  const router = useRouter();
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resolvedOpen = open ?? internalOpen;
  const setResolvedOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (open === undefined) {
      setInternalOpen(next);
    }
  };

  const presenceById = useMemo(
    () => new Map(party.map((member) => [member.id, member])),
    [party]
  );
  const gmParticipant = useMemo(
    () => participants.find((participant) => participant.role === "gm") ?? null,
    [participants]
  );
  const playerParticipants = useMemo(
    () => participants.filter((participant) => participant.role === "player"),
    [participants]
  );

  const charactersByOwnerId = useMemo(() => {
    const map = new Map<string, SessionCharacterRecord[]>();
    characters.forEach((c) => {
      if (c.ownerParticipantId) {
        const list = map.get(c.ownerParticipantId) || [];
        list.push(c);
        map.set(c.ownerParticipantId, list);
      }
    });
    return map;
  }, [characters]);

  const activeCharacterByOwnerId = useMemo(() => {
    const map = new Map<string, SessionCharacterRecord>();
    charactersByOwnerId.forEach((list, ownerId) => {
      const primary = list.find((c) => c.sheetProfile?.raw?.isPrimary) ?? list[0];
      if (primary) map.set(ownerId, primary);
    });
    return map;
  }, [charactersByOwnerId]);

  const linkedPlayers = useMemo(
    () =>
      playerParticipants.map((participant) => {
        const character = activeCharacterByOwnerId.get(participant.id) ?? null;
        return {
          participant,
          character,
          asset: character ? resolveCharacterAsset(character, assets) : null,
          presence: presenceById.get(participant.id)
        };
      }),
    [assets, activeCharacterByOwnerId, playerParticipants, presenceById]
  );

  const gmCharacter = gmParticipant ? activeCharacterByOwnerId.get(gmParticipant.id) : null;
  const gmAsset = gmCharacter ? resolveCharacterAsset(gmCharacter, assets) : null;

  const onlineCount = useMemo(
    () => party.filter((member) => member.status !== "offline").length,
    [party]
  );

  const handleAdjustResource = (
    character: SessionCharacterRecord,
    resource: "hp" | "fp",
    delta: number
  ) => {
    setPendingKey(`${character.id}:${resource}`);
    setFeedback(null);
    startTransition(async () => {
      const result = await adjustCharacterResourceAction({
        sessionCode,
        characterId: character.id,
        resource,
        delta
      });

      if (result.ok && result.character) {
        upsertCharacter(result.character);
      } else if (result.message) {
        setFeedback(result.message);
      }

      setPendingKey(null);
    });
  };

  const handleRemoveParticipant = (participantId: string) => {
    if (!confirm("Tem certeza que deseja remover este jogador da sessão?")) return;
    
    setPendingKey(`remove:${participantId}`);
    setFeedback(null);
    startTransition(async () => {
      const result = await removeParticipantAction({
        sessionCode,
        participantId
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Erro ao remover jogador.");
      } else {
        router.refresh();
      }
      setPendingKey(null);
    });
  };

  const handleSetActiveCharacter = (characterId: string) => {
    setPendingKey(`activate:${characterId}`);
    setFeedback(null);
    startTransition(async () => {
      const result = await setActiveCharacterAction({
        sessionCode,
        characterId
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Erro ao ativar ficha.");
      } else {
        router.refresh();
      }
      setPendingKey(null);
    });
  };

  const content = (
    <>
      <button
        type="button"
        onClick={() => setResolvedOpen(!resolvedOpen)}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left",
          embedded ? "px-0 py-0 pb-3" : "px-4 py-3"
        )}
      >
        <div className="min-w-0">
          <p className="section-label">Status gerais</p>
          <p className="mt-1 text-xs text-[color:var(--ink-2)] sm:text-sm">
            Presenca, ficha resumida e loadout de combate.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">
            <RadioTower size={14} />
            {onlineCount} online
          </span>
          <span className="hud-chip border-amber-300/18 bg-amber-300/8 text-amber-100">
            {linkedPlayers.filter((item) => item.character).length} fichas
          </span>
          {resolvedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {resolvedOpen ? (
        <div
          className={cn(
            "max-h-[min(54vh,36rem)] space-y-3 overflow-y-auto pr-1",
            embedded ? "border-t border-white/8 pt-3" : "border-t border-white/8 px-4 py-3 pr-3"
          )}
        >
          <article className="rounded-[18px] border border-amber-300/16 bg-amber-300/8 p-3">
            <div className="flex items-center gap-3">
              <AssetAvatar
                imageUrl={gmAsset?.secureUrl}
                label={gmCharacter?.name ?? gmParticipant?.displayName ?? gmName ?? "GM"}
                kind={gmAsset?.kind}
                className="h-12 w-12 shrink-0"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="hud-chip border-amber-300/22 bg-black/18 text-amber-100">
                    <Crown size={14} />
                    mestre
                  </span>
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full",
                      gmParticipant && presenceById.get(gmParticipant.id)?.status !== "offline"
                        ? "bg-emerald-400"
                        : "bg-slate-500"
                    )}
                  />
                </div>
                <h3 className="mt-1 text-base font-semibold text-white">
                  {gmParticipant?.displayName ?? gmName ?? "Mestre da sessao"}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--ink-2)]">
                  Painel rapido da mesa e das fichas vinculadas.
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-3 xl:grid-cols-2">
            {linkedPlayers.map(({ participant, character, asset, presence }) => {
              const canAdjust =
                Boolean(character) &&
                (viewer?.role === "gm" || viewer?.participantId === participant.id);
              const combatSummary = character ? getCombatSummary(character) : null;

              return (
                <article
                  key={participant.id}
                  className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3"
                >
                  <div className="flex items-start gap-3">
                    <AssetAvatar
                      imageUrl={asset?.secureUrl}
                      label={character?.name ?? participant.displayName}
                      kind={asset?.kind}
                      className="h-12 w-12 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">
                          {participant.displayName}
                        </p>
                        <span
                          className={cn(
                            "h-2.5 w-2.5 rounded-full",
                            presence?.status && presence.status !== "offline"
                              ? "bg-emerald-400"
                              : "bg-slate-500"
                          )}
                        />
                        {viewer?.role?.toLowerCase() === "gm" && (
                          <button
                            onClick={() => handleRemoveParticipant(participant.id)}
                            className="ml-auto flex items-center gap-1.5 rounded-md bg-rose-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-500 transition hover:bg-rose-500/20"
                            title="Remover jogador"
                          >
                            {pendingKey === `remove:${participant.id}` ? (
                              <LoaderCircle size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            Excluir
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="truncate text-sm text-[color:var(--ink-2)]">
                          {character?.name ?? "sem ficha vinculada"}
                        </p>
                        {charactersByOwnerId.get(participant.id)?.length && charactersByOwnerId.get(participant.id)!.length > 1 && (
                          <div className="flex gap-1">
                            {charactersByOwnerId.get(participant.id)!.map(c => (
                              <button
                                key={c.id}
                                onClick={() => handleSetActiveCharacter(c.id)}
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full transition",
                                  c.id === character?.id ? "bg-amber-400" : "bg-white/10 hover:bg-white/30"
                                )}
                                title={`Ativar ${c.name}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                        {character
                          ? `init ${character.initiative >= 0 ? `+${character.initiative}` : character.initiative}`
                          : "crie ou vincule uma ficha para este jogador"}
                      </p>
                    </div>
                  </div>

                  {character ? (
                    <>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <ResourceChip
                          label="hp"
                          value={`${character.hp}/${character.hpMax}`}
                          canAdjust={canAdjust}
                          pending={pendingKey === `${character.id}:hp`}
                          onAdjust={(delta) => handleAdjustResource(character, "hp", delta)}
                        />
                        <ResourceChip
                          label="fp"
                          value={`${character.fp}/${character.fpMax}`}
                          canAdjust={canAdjust}
                          pending={pendingKey === `${character.id}:fp`}
                          onAdjust={(delta) => handleAdjustResource(character, "fp", delta)}
                        />
                      </div>

                      <div className="mt-3 rounded-[16px] border border-white/10 bg-black/18 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--ink-3)]">
                          <Swords size={12} />
                          combate
                        </div>
                        <p className="mt-2 text-sm font-semibold text-white">
                          {combatSummary?.style ?? "Ficha resumida"}
                        </p>
                        <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                          Arma ativa: {combatSummary?.weapon ?? "Sem arma definida"}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(combatSummary?.loadout.length
                            ? combatSummary.loadout
                            : ["Sem tecnicas equipadas"]
                          ).map((entry) => (
                            <span
                              key={`${participant.id}:${entry}`}
                              className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-[color:var(--ink-2)]"
                            >
                              {entry}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="mt-3 rounded-[16px] border border-dashed border-white/12 bg-black/18 px-3 py-2.5 text-sm text-[color:var(--ink-2)]">
                      Sem ficha vinculada.
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {isPending ? (
            <div className="flex items-center gap-2 text-xs text-[color:var(--ink-3)]">
              <LoaderCircle size={14} className="animate-spin" />
              aplicando ajuste em tempo real...
            </div>
          ) : null}

          {feedback ? (
            <div className="rounded-[16px] border border-amber-300/15 bg-amber-300/8 px-3 py-2 text-sm text-amber-50">
              {feedback}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <section className="flex h-full min-h-0 flex-col">{content}</section>;
  }

  return (
    <section className="rounded-[22px] border border-white/10 bg-[var(--bg-panel-strong)]">
      {content}
    </section>
  );
}
