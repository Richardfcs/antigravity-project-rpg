"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Crown,
  HeartPulse,
  LoaderCircle,
  MoonStar,
  RadioTower
} from "lucide-react";

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
}

function ResourceChip({
  label,
  value,
  canAdjust,
  pendingKey,
  onAdjust
}: {
  label: "hp" | "fp";
  value: string;
  canAdjust: boolean;
  pendingKey: string | null;
  onAdjust: (delta: number) => void;
}) {
  const Icon = label === "hp" ? HeartPulse : MoonStar;
  const tone =
    label === "hp"
      ? "border-rose-300/16 bg-rose-300/10 text-rose-100"
      : "border-amber-300/16 bg-amber-300/10 text-amber-100";

  return (
    <div className={cn("rounded-2xl border px-3 py-3", tone)}>
      <div className="flex items-center gap-2">
        <Icon size={14} />
        <p className="section-label text-current">{label === "hp" ? "PV" : "PF"}</p>
      </div>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      {canAdjust && (
        <div className="mt-3 flex gap-2">
          {[-1, 1].map((delta) => (
            <button
              key={`${label}:${delta}`}
              type="button"
              onClick={() => onAdjust(delta)}
              className="rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
            >
              {pendingKey === `${label}:${delta}` ? (
                <LoaderCircle size={12} className="animate-spin" />
              ) : delta > 0 ? (
                `+${delta}`
              ) : (
                `${delta}`
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  onOpenChange
}: SessionStatusDrawerProps) {
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
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
  const characterByOwnerId = useMemo(
    () =>
      new Map(
        characters
          .filter((character) => character.ownerParticipantId)
          .map((character) => [character.ownerParticipantId as string, character])
      ),
    [characters]
  );
  const linkedPlayers = useMemo(
    () =>
      playerParticipants.map((participant) => {
        const character = characterByOwnerId.get(participant.id) ?? null;
        return {
          participant,
          character,
          asset: character ? resolveCharacterAsset(character, assets) : null,
          presence: presenceById.get(participant.id)
        };
      }),
    [assets, characterByOwnerId, playerParticipants, presenceById]
  );
  const onlineCount = useMemo(
    () => party.filter((member) => member.status !== "offline").length,
    [party]
  );

  const handleAdjustResource = (
    character: SessionCharacterRecord,
    resource: "hp" | "fp",
    delta: number
  ) => {
    setPendingKey(`${character.id}:${resource}:${delta}`);
    startTransition(async () => {
      const result = await adjustCharacterResourceAction({
        sessionCode,
        characterId: character.id,
        resource,
        delta
      });

      if (result.ok && result.character) {
        upsertCharacter(result.character);
      }

      setPendingKey(null);
    });
  };

  return (
    <section className="rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)]">
      <button
        type="button"
        onClick={() => setResolvedOpen(!resolvedOpen)}
        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
      >
        <div className="min-w-0">
          <p className="section-label">Status gerais</p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
            Mestre, jogadores, ficha resumida e barras sincronizadas em um unico lugar.
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

      {resolvedOpen && (
        <div className="space-y-4 border-t border-white/8 px-4 py-4 sm:px-5">
          <article className="rounded-[22px] border border-amber-300/16 bg-amber-300/8 p-4">
            <div className="flex items-center gap-4">
              <AssetAvatar
                label={gmParticipant?.displayName ?? gmName ?? "GM"}
                className="h-16 w-16 shrink-0"
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
                <h3 className="mt-2 text-lg font-semibold text-white">
                  {gmParticipant?.displayName ?? gmName ?? "Mestre da sessao"}
                </h3>
                <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                  Conduz a mesa ativa e sincroniza palco, mapa tatico e imersao para todo o grupo.
                </p>
              </div>
            </div>
          </article>

          <div className="grid gap-3 xl:grid-cols-2">
            {linkedPlayers.map(({ participant, character, asset, presence }) => {
              const canAdjust =
                Boolean(character) &&
                (viewer?.role === "gm" || viewer?.participantId === participant.id);

              return (
                <article
                  key={participant.id}
                  className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <AssetAvatar
                      imageUrl={asset?.secureUrl}
                      label={character?.name ?? participant.displayName}
                      kind={asset?.kind}
                      className="h-16 w-16 shrink-0"
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
                      </div>
                      <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                        {character?.name ?? "sem ficha vinculada"}
                      </p>
                      <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                        {character
                          ? `init ${character.initiative >= 0 ? `+${character.initiative}` : character.initiative}`
                          : "crie ou vincule uma ficha para este jogador"}
                      </p>
                    </div>
                  </div>

                  {character ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <ResourceChip
                        label="hp"
                        value={`${character.hp}/${character.hpMax}`}
                        canAdjust={canAdjust}
                        pendingKey={
                          pendingKey?.startsWith(`${character.id}:hp:`) ? pendingKey.split(":").slice(1).join(":") : null
                        }
                        onAdjust={(delta) => handleAdjustResource(character, "hp", delta)}
                      />
                      <ResourceChip
                        label="fp"
                        value={`${character.fp}/${character.fpMax}`}
                        canAdjust={canAdjust}
                        pendingKey={
                          pendingKey?.startsWith(`${character.id}:fp:`) ? pendingKey.split(":").slice(1).join(":") : null
                        }
                        onAdjust={(delta) => handleAdjustResource(character, "fp", delta)}
                      />
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[18px] border border-dashed border-white/12 bg-black/18 px-4 py-3 text-sm text-[color:var(--ink-2)]">
                      Este jogador ainda nao tem personagem ativo vinculado na sessao.
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {isPending && (
            <div className="flex items-center gap-2 text-xs text-[color:var(--ink-3)]">
              <LoaderCircle size={14} className="animate-spin" />
              aplicando ajuste em tempo real...
            </div>
          )}
        </div>
      )}
    </section>
  );
}

