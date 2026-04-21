"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  HeartPulse,
  LoaderCircle,
  MoonStar,
  PencilLine,
  Plus,
  RadioTower,
  Save,
  Shield,
  Trash2,
  UploadCloud
} from "lucide-react";

import {
  deleteAssetAction,
  registerUploadedAssetAction,
  updateAssetMetadataAction
} from "@/app/actions/asset-actions";
import {
  adjustCharacterInitiativeAction,
  adjustCharacterResourceAction,
  createCharacterAction,
  updateCharacterProfileAction
} from "@/app/actions/character-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { findCharacterByViewer, resolveCharacterAsset, sortCharactersByInitiative } from "@/lib/characters/selectors";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import type { AssetKind, SessionAssetRecord } from "@/types/asset";
import type { CharacterType, SessionCharacterRecord } from "@/types/character";
import type { OnlinePresence } from "@/types/presence";
import type { SessionParticipantRecord, SessionViewerIdentity } from "@/types/session";

interface ActorsPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
  party: OnlinePresence[];
  cloudinaryReady: boolean;
}

const assetKinds: AssetKind[] = [
  "portrait",
  "token",
  "npc",
  "background",
  "map",
  "grid"
];

function assetKindLabel(kind: AssetKind) {
  switch (kind) {
    case "portrait":
      return "retrato";
    case "token":
      return "emblema";
    case "npc":
      return "figura";
    case "background":
      return "pintura";
    case "map":
      return "mapa";
    case "grid":
      return "grade tatica";
    default:
      return kind;
  }
}

function characterTypeLabel(type: CharacterType) {
  return type === "player" ? "protagonista" : "figura";
}

function buildSessionTag(sessionCode: string) {
  return sessionCode.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function CharacterCard({
  character,
  asset,
  ownerName,
  isOnline,
  canAdjust,
  canManageInitiative,
  canManageProfile,
  participantOptions,
  assetOptions,
  sessionCode
}: {
  character: SessionCharacterRecord;
  asset: SessionAssetRecord | null;
  ownerName: string | null;
  isOnline: boolean;
  canAdjust: boolean;
  canManageInitiative: boolean;
  canManageProfile: boolean;
  participantOptions: SessionParticipantRecord[];
  assetOptions: SessionAssetRecord[];
  sessionCode: string;
}) {
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(character.name);
  const [draftType, setDraftType] = useState<CharacterType>(character.type);
  const [draftOwnerParticipantId, setDraftOwnerParticipantId] = useState(
    character.ownerParticipantId ?? ""
  );
  const [draftAssetId, setDraftAssetId] = useState(character.assetId ?? "");

  const resetProfileDraft = () => {
    setDraftName(character.name);
    setDraftType(character.type);
    setDraftOwnerParticipantId(character.ownerParticipantId ?? "");
    setDraftAssetId(character.assetId ?? "");
    setIsEditingProfile(false);
  };

  const updateResource = (resource: "hp" | "fp", delta: number) => {
    setPendingKey(`${resource}:${delta}`);
    startTransition(async () => {
      const result = await adjustCharacterResourceAction({ sessionCode, characterId: character.id, resource, delta });
      if (result.ok && result.character) {
        upsertCharacter(result.character);
      }
      setPendingKey(null);
    });
  };

  const updateInitiative = (delta: number) => {
    setPendingKey(`initiative:${delta}`);
    startTransition(async () => {
      const result = await adjustCharacterInitiativeAction({ sessionCode, characterId: character.id, delta });
      if (result.ok && result.character) {
        upsertCharacter(result.character);
      }
      setPendingKey(null);
    });
  };

  const saveProfile = () => {
    setPendingKey("profile:save");
    startTransition(async () => {
      const result = await updateCharacterProfileAction({
        sessionCode,
        characterId: character.id,
        name: draftName,
        type: draftType,
        ownerParticipantId: draftType === "player" ? draftOwnerParticipantId || null : null,
        assetId: draftAssetId || null
      });

      if (result.ok && result.character) {
        upsertCharacter(result.character);
        setDraftName(result.character.name);
        setDraftType(result.character.type);
        setDraftOwnerParticipantId(result.character.ownerParticipantId ?? "");
        setDraftAssetId(result.character.assetId ?? "");
        setIsEditingProfile(false);
      }

      setPendingKey(null);
    });
  };

  return (
    <article className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <AssetAvatar imageUrl={asset?.secureUrl} label={character.name} kind={asset?.kind} className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white">{character.name}</p>
            <span className={cn("h-2.5 w-2.5 rounded-full", isOnline ? "bg-emerald-400" : "bg-slate-500")} />
          </div>
          <p className="mt-2 text-xs text-[color:var(--ink-3)]">
            {characterTypeLabel(character.type)} · {ownerName ?? "sem vinculo"} · iniciativa {character.initiative >= 0 ? `+${character.initiative}` : character.initiative}
          </p>
        </div>
      </div>

      {canManageProfile && (
        <div className="mt-4 rounded-[18px] border border-white/10 bg-black/18 px-3 py-3">
          {isEditingProfile ? (
            <div className="space-y-3">
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                placeholder="Nome da ficha"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={draftType}
                  onChange={(event) =>
                    setDraftType(event.target.value as CharacterType)
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                >
                  <option value="player">protagonista</option>
                  <option value="npc">figura</option>
                </select>
                <select
                  value={draftOwnerParticipantId}
                  onChange={(event) => setDraftOwnerParticipantId(event.target.value)}
                  disabled={draftType !== "player"}
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition disabled:opacity-50 focus:border-amber-300/35"
                >
                  <option value="">sem vinculo</option>
                  {participantOptions.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <select
                value={draftAssetId}
                onChange={(event) => setDraftAssetId(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              >
                <option value="">sem retrato</option>
                {assetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl border border-amber-300/28 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
                >
                  {pendingKey === "profile:save" ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  salvar ficha
                </button>
                <button
                  type="button"
                  onClick={resetProfileDraft}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                >
                  cancelar
                </button>
              </div>
              <p className="text-xs text-[color:var(--ink-3)]">
                Você pode criar sem vínculo e decidir depois se a ficha vira figura ou protagonista.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-label">Alocação da ficha</p>
                <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                  {character.type === "player"
                    ? ownerName ?? "protagonista sem jogador vinculado"
                    : "figura livre para a mesa"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftName(character.name);
                  setDraftType(character.type);
                  setDraftOwnerParticipantId(character.ownerParticipantId ?? "");
                  setDraftAssetId(character.assetId ?? "");
                  setIsEditingProfile(true);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
              >
                <PencilLine size={14} />
                editar ficha
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { key: "hp" as const, label: "PV", icon: HeartPulse, tone: "border-rose-300/15 bg-rose-300/8 text-rose-100", value: `${character.hp}/${character.hpMax}` },
          { key: "fp" as const, label: "PF", icon: MoonStar, tone: "border-amber-300/15 bg-amber-300/8 text-amber-100", value: `${character.fp}/${character.fpMax}` }
        ].map((resource) => (
          <div key={resource.key} className={cn("rounded-[18px] border px-3 py-3", resource.tone)}>
            <div className="flex items-center gap-2">
              <resource.icon size={15} />
              <p className="section-label text-current">{resource.label}</p>
            </div>
            <p className="mt-2 text-xl font-semibold text-white">{resource.value}</p>
            {canAdjust && (
              <div className="mt-3 flex gap-2">
                {[-1, 1].map((delta) => (
                  <button key={`${resource.key}:${delta}`} type="button" onClick={() => updateResource(resource.key, delta)} disabled={isPending} className="rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60">
                    {pendingKey === `${resource.key}:${delta}` ? <LoaderCircle size={14} className="animate-spin" /> : delta > 0 ? `+${delta}` : `${delta}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {canManageInitiative && (
        <div className="mt-4 flex items-center justify-between rounded-[18px] border border-amber-300/16 bg-amber-300/8 px-3 py-3">
          <div>
            <p className="section-label text-amber-100">Iniciativa</p>
            <p className="mt-1 text-lg font-semibold text-white">{character.initiative >= 0 ? `+${character.initiative}` : character.initiative}</p>
          </div>
          <div className="flex gap-2">
            {[-1, 1].map((delta) => (
              <button key={`initiative:${delta}`} type="button" onClick={() => updateInitiative(delta)} disabled={isPending} className="rounded-xl border border-white/10 bg-black/18 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20 disabled:opacity-60">
                {pendingKey === `initiative:${delta}` ? <LoaderCircle size={14} className="animate-spin" /> : delta > 0 ? `+${delta}` : `${delta}`}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export function ActorsPanel({ sessionCode, viewer, participants, party, cloudinaryReady }: ActorsPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const characters = useCharacterStore((state) => state.characters);
  const upsertAsset = useAssetStore((state) => state.upsertAsset);
  const removeAsset = useAssetStore((state) => state.removeAsset);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);

  const [assetLabel, setAssetLabel] = useState("");
  const [assetKind, setAssetKind] = useState<AssetKind>("token");
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetFeedback, setAssetFeedback] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetLabel, setEditingAssetLabel] = useState("");
  const [editingAssetKind, setEditingAssetKind] = useState<AssetKind>("token");
  const [characterName, setCharacterName] = useState("");
  const [characterType, setCharacterType] = useState<CharacterType>("player");
  const [ownerParticipantId, setOwnerParticipantId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [hpMax, setHpMax] = useState("12");
  const [fpMax, setFpMax] = useState("12");
  const [initiative, setInitiative] = useState("10");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetKindFilter, setAssetKindFilter] = useState<AssetKind | "all">("all");
  const [characterSearchQuery, setCharacterSearchQuery] = useState("");
  const [characterTypeFilter, setCharacterTypeFilter] = useState<CharacterType | "all">("all");
  const [visibleAssetCount, setVisibleAssetCount] = useState(12);
  const [visibleCharacterCount, setVisibleCharacterCount] = useState(10);
  const [characterFeedback, setCharacterFeedback] = useState<string | null>(null);
  const [isAssetPending, startAssetTransition] = useTransition();
  const [isCharacterPending, startCharacterTransition] = useTransition();
  const deferredAssetSearchQuery = useDeferredValue(assetSearchQuery);
  const deferredCharacterSearchQuery = useDeferredValue(characterSearchQuery);

  const orderedCharacters = useMemo(() => sortCharactersByInitiative(characters), [characters]);
  const playerParticipants = useMemo(() => participants.filter((participant) => participant.role === "player"), [participants]);
  const onlineParticipantIds = useMemo(() => new Set(party.filter((member) => member.status !== "offline").map((member) => member.id)), [party]);
  const viewerCharacter = useMemo(() => findCharacterByViewer(orderedCharacters, viewer?.participantId), [orderedCharacters, viewer?.participantId]);
  const filteredAssets = useMemo(() => {
    const normalizedQuery = deferredAssetSearchQuery.trim().toLowerCase();
    return assets.filter((asset) => {
      if (assetKindFilter !== "all" && asset.kind !== assetKindFilter) return false;
      if (!normalizedQuery) return true;
      return `${asset.label} ${asset.kind}`.toLowerCase().includes(normalizedQuery);
    });
  }, [assetKindFilter, assets, deferredAssetSearchQuery]);
  const filteredCharacters = useMemo(() => {
    const normalizedQuery = deferredCharacterSearchQuery.trim().toLowerCase();
    return orderedCharacters.filter((character) => {
      if (characterTypeFilter !== "all" && character.type !== characterTypeFilter) return false;
      if (!normalizedQuery) return true;
      const ownerName = participants.find((participant) => participant.id === character.ownerParticipantId)?.displayName ?? "";
      return `${character.name} ${character.type} ${ownerName}`.toLowerCase().includes(normalizedQuery);
    });
  }, [characterTypeFilter, deferredCharacterSearchQuery, orderedCharacters, participants]);

  const canManage = viewer?.role === "gm";

  const handleAssetSubmit = () => {
    if (!canManage) {
      setAssetFeedback("Apenas o mestre pode guardar novos recursos.");
      return;
    }
    if (!cloudinaryReady) {
      setAssetFeedback("O Cloudinary ainda nao esta configurado neste ambiente.");
      return;
    }
    if (!assetLabel.trim() || !assetFile) {
      setAssetFeedback("Escolha uma imagem e de um nome para o recurso.");
      return;
    }

    startAssetTransition(async () => {
      try {
        const signResponse = await fetch("/api/cloudinary/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            folder: `daimyo-vtt/${buildSessionTag(sessionCode)}/actors`,
            tags: [`session:${buildSessionTag(sessionCode)}`, `kind:${assetKind}`],
            context: { label: assetLabel.trim(), session: sessionCode }
          })
        });
        const signPayload = await signResponse.json();
        if (!signResponse.ok || !signPayload.ok) {
          throw new Error(signPayload.message || "Falha ao assinar o upload.");
        }

        const cloudinaryFormData = new FormData();
        cloudinaryFormData.append("file", assetFile);
        cloudinaryFormData.append("api_key", signPayload.apiKey);
        cloudinaryFormData.append("timestamp", String(signPayload.timestamp));
        cloudinaryFormData.append("folder", signPayload.folder);
        cloudinaryFormData.append("signature", signPayload.signature);
        if (signPayload.tags?.length) cloudinaryFormData.append("tags", signPayload.tags.join(","));
        if (signPayload.context) cloudinaryFormData.append("context", signPayload.context);
        if (signPayload.publicId) cloudinaryFormData.append("public_id", signPayload.publicId);

        const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${signPayload.cloudName}/image/upload`, {
          method: "POST",
          body: cloudinaryFormData
        });
        const uploadPayload = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadPayload.secure_url || !uploadPayload.public_id) {
          throw new Error(uploadPayload.error?.message || "Falha ao enviar a imagem para o Cloudinary.");
        }

        const result = await registerUploadedAssetAction({
          sessionCode,
          kind: assetKind,
          label: assetLabel.trim(),
          publicId: uploadPayload.public_id,
          secureUrl: uploadPayload.secure_url,
          width: uploadPayload.width ?? null,
          height: uploadPayload.height ?? null,
          tags: [`session:${buildSessionTag(sessionCode)}`, `kind:${assetKind}`]
        });

        if (!result.ok || !result.asset) {
          throw new Error(result.message || "Falha ao registrar o recurso.");
        }

        upsertAsset(result.asset);
        setAssetLabel("");
        setAssetFile(null);
        setAssetFeedback("Recurso guardado e pronto para reutilizacao.");
      } catch (error) {
        setAssetFeedback(error instanceof Error ? error.message : "Falha ao guardar o recurso.");
      }
    });
  };

  const handleCharacterSubmit = () => {
    if (!canManage) {
      setCharacterFeedback("Apenas o mestre pode criar personagens.");
      return;
    }
    if (!characterName.trim()) {
      setCharacterFeedback("Informe o nome do personagem.");
      return;
    }
    startCharacterTransition(async () => {
      const result = await createCharacterAction({
        sessionCode,
        name: characterName.trim(),
        type: characterType,
        ownerParticipantId: ownerParticipantId || null,
        assetId: selectedAssetId || null,
        hpMax: Number(hpMax),
        fpMax: Number(fpMax),
        initiative: Number(initiative)
      });

      if (!result.ok || !result.character) {
        setCharacterFeedback(result.message || "Falha ao criar o personagem.");
        return;
      }

      upsertCharacter(result.character);
      setCharacterName("");
      setOwnerParticipantId("");
      setSelectedAssetId("");
      setCharacterFeedback("Ficha criada e sincronizada.");
    });
  };

  const beginAssetEdit = (asset: SessionAssetRecord) => {
    setEditingAssetId(asset.id);
    setEditingAssetLabel(asset.label);
    setEditingAssetKind(asset.kind);
    setAssetFeedback(null);
  };

  const handleAssetEditSave = () => {
    if (!canManage || !editingAssetId) {
      return;
    }

    if (!editingAssetLabel.trim()) {
      setAssetFeedback("Informe um nome valido para o recurso.");
      return;
    }

    startAssetTransition(async () => {
      const result = await updateAssetMetadataAction({
        sessionCode,
        assetId: editingAssetId,
        label: editingAssetLabel.trim(),
        kind: editingAssetKind
      });

      if (!result.ok || !result.asset) {
        setAssetFeedback(result.message || "Falha ao atualizar o recurso.");
        return;
      }

      upsertAsset(result.asset);
      setEditingAssetId(null);
      setAssetFeedback("Recurso atualizado.");
    });
  };

  const handleAssetDelete = (assetId: string) => {
    if (!canManage) {
      return;
    }

    startAssetTransition(async () => {
      const result = await deleteAssetAction({
        sessionCode,
        assetId
      });

      if (!result.ok || !result.asset) {
        setAssetFeedback(result.message || "Falha ao excluir o recurso.");
        return;
      }

      removeAsset(result.asset.id);

      if (editingAssetId === result.asset.id) {
        setEditingAssetId(null);
      }

      setAssetFeedback("Recurso removido.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card"><p className="section-label">Corte</p><p className="mt-2 text-2xl font-semibold text-white">{orderedCharacters.length}</p></div>
        <div className="stat-card"><p className="section-label">Retratos e recursos</p><p className="mt-2 text-2xl font-semibold text-white">{assets.length}</p></div>
        <div className="stat-card"><p className="section-label">Minha ficha</p><p className="mt-2 text-lg font-semibold text-white">{viewerCharacter?.name ?? "nao vinculada"}</p></div>
      </div>

      {canManage && (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
            <div className="flex items-center gap-2"><UploadCloud size={16} className="text-amber-100" /><h3 className="text-sm font-semibold text-white">Retratos e recursos</h3></div>
            <div className="mt-4 space-y-3">
              <input value={assetLabel} onChange={(event) => setAssetLabel(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" placeholder="Ronin ferido" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={assetKind} onChange={(event) => setAssetKind(event.target.value as AssetKind)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35">
                  {assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabel(kind)}</option>)}
                </select>
                <input type="file" accept="image/*" onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)} className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[color:var(--ink-2)] file:mr-3 file:rounded-xl file:border-0 file:bg-amber-300/14 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-amber-100" />
              </div>
              <button type="button" onClick={handleAssetSubmit} disabled={isAssetPending || !cloudinaryReady} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60">
                {isAssetPending ? <LoaderCircle size={16} className="animate-spin" /> : <UploadCloud size={16} />} guardar recurso
              </button>
              {assetFeedback && <p className="text-xs text-[color:var(--ink-2)]">{assetFeedback}</p>}
            </div>
          </section>

          <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
            <div className="flex items-center gap-2"><Plus size={16} className="text-amber-100" /><h3 className="text-sm font-semibold text-white">Nova ficha</h3></div>
            <div className="mt-4 space-y-3">
              <input value={characterName} onChange={(event) => setCharacterName(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" placeholder="Akemi" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={characterType} onChange={(event) => setCharacterType(event.target.value as CharacterType)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35">
                  <option value="player">protagonista</option><option value="npc">figura</option>
                </select>
                <select value={ownerParticipantId} onChange={(event) => setOwnerParticipantId(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35">
                  <option value="">sem vinculo por enquanto</option>
                  {playerParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
                </select>
              </div>
              <p className="text-xs text-[color:var(--ink-3)]">
                Você pode criar a ficha agora e decidir depois se ela fica com um jogador ou vira uma figura da mesa.
              </p>
              <div className="space-y-3">
                <label className="block">
                  <span className="section-label">Retrato ou emblema</span>
                  <select value={selectedAssetId} onChange={(event) => setSelectedAssetId(event.target.value)} className="mt-2 min-w-0 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35">
                    <option value="">sem retrato</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}
                  </select>
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="block min-w-0">
                    <span className="section-label">PV máximo</span>
                    <input type="number" value={hpMax} onChange={(event) => setHpMax(event.target.value)} className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" />
                  </label>
                  <label className="block min-w-0">
                    <span className="section-label">PF máximo</span>
                    <input type="number" value={fpMax} onChange={(event) => setFpMax(event.target.value)} className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" />
                  </label>
                  <label className="block min-w-0">
                    <span className="section-label">Iniciativa</span>
                    <input type="number" value={initiative} onChange={(event) => setInitiative(event.target.value)} className="mt-2 w-full min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" />
                  </label>
                </div>
              </div>
              <button type="button" onClick={handleCharacterSubmit} disabled={isCharacterPending} className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60">
                {isCharacterPending ? <LoaderCircle size={16} className="animate-spin" /> : <Shield size={16} />} criar ficha
              </button>
              {characterFeedback && <p className="text-xs text-[color:var(--ink-2)]">{characterFeedback}</p>}
            </div>
          </section>
        </div>
      )}

      <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-white">Arquivo da mesa</h3><p className="mt-1 text-xs text-[color:var(--ink-3)]">Busque e filtre retratos, emblemas e pinturas sem percorrer tudo.</p></div>
          <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">{assets.length} recursos</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input value={assetSearchQuery} onChange={(event) => { setAssetSearchQuery(event.target.value); setVisibleAssetCount(12); }} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" placeholder="buscar retrato ou recurso..." />
          <select value={assetKindFilter} onChange={(event) => { setAssetKindFilter(event.target.value as AssetKind | "all"); setVisibleAssetCount(12); }} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35">
            <option value="all">todas as naturezas</option>{assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabel(kind)}</option>)}
          </select>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAssets.slice(0, visibleAssetCount).map((asset) => (
            <article key={asset.id} className="rounded-[18px] border border-white/10 bg-white/[0.04] p-3">
              <AssetAvatar imageUrl={asset.secureUrl} label={asset.label} kind={asset.kind} className={asset.kind === "background" || asset.kind === "map" || asset.kind === "grid" ? "h-28 w-full" : "aspect-[3/4] w-full"} />
              <div className="mt-3 space-y-3">
                {editingAssetId === asset.id ? (
                  <>
                    <input
                      value={editingAssetLabel}
                      onChange={(event) => setEditingAssetLabel(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                      placeholder="Nome do recurso"
                    />
                    <select
                      value={editingAssetKind}
                      onChange={(event) => setEditingAssetKind(event.target.value as AssetKind)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                    >
                      {assetKinds.map((kind) => (
                        <option key={kind} value={kind}>
                          {assetKindLabel(kind)}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleAssetEditSave}
                        disabled={isAssetPending}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300/28 bg-amber-300/10 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
                      >
                        {isAssetPending ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                        salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingAssetId(null)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                      >
                        cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-sm font-semibold text-white">{asset.label}</p>
                      <p className="mt-1 text-xs text-[color:var(--ink-3)]">{assetKindLabel(asset.kind)}</p>
                    </div>
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginAssetEdit(asset)}
                          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white transition hover:border-white/20"
                        >
                          <PencilLine size={14} />
                          editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssetDelete(asset.id)}
                          disabled={isAssetPending}
                          className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                        >
                          {isAssetPending && editingAssetId === asset.id ? (
                            <LoaderCircle size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                          excluir
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
        {filteredAssets.length > visibleAssetCount && <button type="button" onClick={() => setVisibleAssetCount((current) => current + 12)} className="mt-4 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20">carregar mais recursos</button>}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-white">Iniciativa e roster</h3><p className="mt-1 text-xs text-[color:var(--ink-3)]">PV/PF sincronizados e busca por ficha pronta para campanhas maiores.</p></div>
          <span className="hud-chip border-amber-300/20 bg-amber-300/8 text-amber-100"><RadioTower size={14} /> sincronia viva</span>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
          <input value={characterSearchQuery} onChange={(event) => { setCharacterSearchQuery(event.target.value); setVisibleCharacterCount(10); }} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" placeholder="buscar ficha, tipo ou jogador..." />
          <select value={characterTypeFilter} onChange={(event) => { setCharacterTypeFilter(event.target.value as CharacterType | "all"); setVisibleCharacterCount(10); }} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35">
            <option value="all">todas as naturezas</option><option value="player">protagonista</option><option value="npc">figura</option>
          </select>
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {filteredCharacters.slice(0, visibleCharacterCount).map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              asset={resolveCharacterAsset(character, assets)}
              ownerName={participants.find((participant) => participant.id === character.ownerParticipantId)?.displayName ?? null}
              isOnline={character.ownerParticipantId ? onlineParticipantIds.has(character.ownerParticipantId) : false}
              canAdjust={viewer?.role === "gm" || viewer?.participantId === character.ownerParticipantId}
              canManageInitiative={viewer?.role === "gm"}
              canManageProfile={viewer?.role === "gm"}
              participantOptions={playerParticipants}
              assetOptions={assets}
              sessionCode={sessionCode}
            />
          ))}
        </div>
        {filteredCharacters.length > visibleCharacterCount && <button type="button" onClick={() => setVisibleCharacterCount((current) => current + 10)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20">carregar mais fichas</button>}
      </section>
    </div>
  );
}


