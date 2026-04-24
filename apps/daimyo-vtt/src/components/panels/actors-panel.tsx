"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  HeartPulse,
  LoaderCircle,
  MoonStar,
  PencilLine,
  Plus,
  RadioTower,
  Save,
  Search,
  Settings2,
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
  deleteCharacterAction,
  updateCharacterProfileAction
} from "@/app/actions/character-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { CharacterSheetModal } from "@/components/panels/character-sheet-modal";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import { findCharacterByViewer, resolveCharacterAsset, sortCharactersByInitiative } from "@/lib/characters/selectors";
import {
  filterLibraryItemsByStatus,
  sortLibraryItems
} from "@/lib/library/query";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import {
  selectLibraryFlags,
  useLibraryOrganizationStore
} from "@/stores/library-organization-store";
import type { AssetKind, SessionAssetRecord } from "@/types/asset";
import type { CharacterType, CharacterTier, SessionCharacterRecord } from "@/types/character";
import type {
  LibraryEntryFlags,
  LibraryPreparedFlags,
  LibrarySortMode,
  LibraryStatusFilter
} from "@/types/library";
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

function characterTierLabel(tier: CharacterTier) {
  switch (tier) {
    case "full":
      return "completa";
    case "medium":
      return "mediana";
    case "summary":
      return "resumida";
    default:
      return "desconhecida";
  }
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
  sessionCode,
  flags,
  onToggleFlag
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
  flags?: LibraryEntryFlags;
  onToggleFlag?: (flag: keyof LibraryPreparedFlags) => void;
}) {
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const removeCharacter = useCharacterStore((state) => state.removeCharacter);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(character.name);
  const [draftType, setDraftType] = useState<CharacterType>(character.type);
  const [draftTier, setDraftTier] = useState<CharacterTier>(character.tier ?? "medium");
  const [draftOwnerParticipantId, setDraftOwnerParticipantId] = useState(
    character.ownerParticipantId ?? ""
  );
  const [draftAssetId, setDraftAssetId] = useState(character.assetId ?? "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);

  const resetProfileDraft = () => {
    setDraftName(character.name);
    setDraftType(character.type);
    setDraftTier(character.tier ?? "medium");
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
        tier: draftTier,
        ownerParticipantId: draftType === "player" ? draftOwnerParticipantId || null : null,
        assetId: draftAssetId || null
      });

      if (result.ok && result.character) {
        upsertCharacter(result.character);
        setDraftName(result.character.name);
        setDraftType(result.character.type);
        setDraftTier(result.character.tier);
        setDraftOwnerParticipantId(result.character.ownerParticipantId ?? "");
        setDraftAssetId(result.character.assetId ?? "");
        setIsEditingProfile(false);
      }

      setPendingKey(null);
    });
  };

  const deleteCharacter = () => {
    if (!window.confirm(`Tem certeza que deseja apagar permanentemente a ficha de ${character.name}?`)) {
      return;
    }

    setPendingKey("profile:delete");
    startTransition(async () => {
      const result = await deleteCharacterAction({
        sessionCode,
        characterId: character.id
      });

      if (result.ok && result.character) {
        removeCharacter(result.character.id);
      }

      setPendingKey(null);
    });
  };

  return (
    <article 
      className={cn(
        "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
        isExpanded
          ? "border-amber-400/40 bg-amber-400/[0.03] shadow-[0_0_40px_rgba(251,191,36,0.1)]"
          : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
      )}
    >
      {/* Cinematic Background */}
      {asset?.secureUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src={asset.secureUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover",
              isExpanded ? "opacity-15 blur-sm" : "opacity-5 blur-[2px]"
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>
      )}

      <div 
        className="relative z-10 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4">
              <div className="relative">
                <AssetAvatar imageUrl={asset?.secureUrl} label={character.name} kind={asset?.kind} className="h-12 w-12 shrink-0 rounded-xl border border-white/10" />
                <div className={cn(
                  "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#0a0a0a] transition-colors",
                  isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-500"
                )} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-base font-bold tracking-tight text-white">{character.name}</h4>
                  <span className={cn(
                    "hud-chip border-amber-300/18 bg-amber-300/10 text-[8px] text-amber-100 uppercase tracking-widest font-black px-1.5",
                    character.type === "player" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-100" : "border-amber-300/18 bg-amber-300/10 text-amber-100"
                  )}>
                    {characterTypeLabel(character.type)}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-white/40">
                  <span className="truncate max-w-[100px]">{ownerName ?? "sem vínculo"}</span>
                  <span className="text-white/10">•</span>
                  <span className="font-medium text-amber-300/40">{characterTierLabel(character.tier ?? "medium")}</span>
                  {flags && (
                    <div className="ml-1 opacity-40 hover:opacity-100 transition-opacity">
                      <LibraryFlagControls
                        flags={flags}
                        canManage={canManageProfile}
                        onToggle={onToggleFlag!}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-start">
            <div className="flex gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">PV</span>
                <span className="text-xs font-bold text-rose-200">{character.hp}/{character.hpMax}</span>
              </div>
              <div className="flex flex-col items-end border-l border-white/5 pl-4">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/20">PF</span>
                <span className="text-xs font-bold text-amber-200">{character.fp}/{character.fpMax}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {canManageProfile && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteCharacter();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 opacity-0 transition-all hover:bg-rose-500/20 group-hover:opacity-100"
                  title="Excluir ficha"
                >
                  <Trash2 size={14} />
                </button>
              )}
              
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/5 bg-white/5 text-white/40 transition-all group-hover:border-amber-400/20 group-hover:text-amber-300">
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div 
            className="mt-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Resource Adjustment Section */}
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { key: "hp" as const, label: "Ajustar PV", icon: HeartPulse, tone: "border-rose-300/15 bg-rose-300/5 text-rose-100", value: character.hp },
                { key: "fp" as const, label: "Ajustar PF", icon: MoonStar, tone: "border-amber-300/15 bg-amber-300/5 text-amber-100", value: character.fp }
              ].map((resource) => (
                <div key={resource.key} className={cn("rounded-2xl border p-4", resource.tone)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <resource.icon size={14} className="opacity-60" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-current">{resource.label}</span>
                    </div>
                    <span className="text-lg font-bold text-white">{resource.value}</span>
                  </div>
                  {canAdjust && (
                    <div className="mt-3 flex gap-2">
                      {[-1, 1].map((delta) => (
                        <button 
                          key={`${resource.key}:${delta}`} 
                          type="button" 
                          onClick={() => updateResource(resource.key, delta)} 
                          disabled={isPending} 
                          className="flex-1 rounded-xl border border-white/10 bg-black/40 py-2 text-xs font-bold text-white transition hover:border-white/30 hover:bg-black/60 disabled:opacity-50"
                        >
                          {pendingKey === `${resource.key}:${delta}` ? <LoaderCircle size={14} className="animate-spin mx-auto" /> : delta > 0 ? `+${delta}` : delta}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Initiative and Profile Toggle */}
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              {canManageInitiative && (
                <div className="flex items-center justify-between rounded-2xl border border-amber-300/16 bg-amber-300/5 p-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-100">Vel. Básica / Iniciativa</p>
                    <p className="mt-1 text-lg font-bold text-white">{character.initiative >= 0 ? `+${character.initiative}` : character.initiative}</p>
                  </div>
                  <div className="flex gap-2">
                    {[-1, 1].map((delta) => (
                      <button 
                        key={`initiative:${delta}`} 
                        type="button" 
                        onClick={() => updateInitiative(delta)} 
                        disabled={isPending} 
                        className="h-10 w-10 rounded-xl border border-white/10 bg-black/40 text-sm font-bold text-white transition hover:border-white/30 hover:bg-black/60"
                      >
                        {pendingKey === `initiative:${delta}` ? <LoaderCircle size={14} className="animate-spin mx-auto" /> : delta > 0 ? `+${delta}` : delta}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSheetModalOpen(true)}
                  className="inline-flex h-full items-center gap-2 rounded-2xl border border-amber-300/30 bg-amber-300/10 px-6 py-4 text-xs font-black uppercase tracking-widest text-amber-300 transition hover:bg-amber-300/20"
                >
                  <Eye size={16} />
                  Ver Detalhes
                </button>
                {canManageProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setDraftName(character.name);
                      setDraftType(character.type);
                      setDraftTier(character.tier ?? "medium");
                      setDraftOwnerParticipantId(character.ownerParticipantId ?? "");
                      setDraftAssetId(character.assetId ?? "");
                      setIsEditingProfile(!isEditingProfile);
                    }}
                    className={cn(
                      "inline-flex h-full items-center gap-2 rounded-2xl border px-4 transition-all",
                      isEditingProfile 
                        ? "border-rose-400/40 bg-rose-400/10 text-rose-300" 
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white"
                    )}
                  >
                    <Settings2 size={18} className={cn("transition-transform duration-300", isEditingProfile && "rotate-90")} />
                  </button>
                )}
              </div>
            </div>

            {/* Profile Editing Section */}
            {isEditingProfile && canManageProfile && (
              <div className="rounded-[24px] border border-white/5 bg-black/60 p-5 backdrop-blur-2xl animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-4">
                  <PencilLine size={14} className="text-amber-400" />
                  <h5 className="text-[10px] font-black uppercase tracking-widest text-white/60">Configurar Alocação</h5>
                </div>
                
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nome do Personagem</label>
                      <input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                        placeholder="Nome da ficha"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Tipo de Papel</label>
                      <select
                        value={draftType}
                        onChange={(event) => setDraftType(event.target.value as CharacterType)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                      >
                        <option value="player">Protagonista</option>
                        <option value="npc">Figura / NPC</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nível de Detalhe</label>
                      <select
                        value={draftTier}
                        onChange={(event) => setDraftTier(event.target.value as CharacterTier)}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                      >
                        <option value="full">Ficha Completa</option>
                        <option value="medium">Ficha Mediana</option>
                        <option value="summary">Ficha Resumida</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Vínculo com Jogador</label>
                      <select
                        value={draftOwnerParticipantId}
                        onChange={(event) => setDraftOwnerParticipantId(event.target.value)}
                        disabled={draftType !== "player"}
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition disabled:opacity-20 focus:border-amber-300/35"
                      >
                        <option value="">Sem vínculo</option>
                        {participantOptions.map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Retrato Visual</label>
                    <select
                      value={draftAssetId}
                      onChange={(event) => setDraftAssetId(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                    >
                      <option value="">Sem retrato</option>
                      {assetOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={isPending}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
                    >
                      {pendingKey === "profile:save" ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                      Salvar Alterações
                    </button>
                    <button
                      type="button"
                      onClick={resetProfileDraft}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-6 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:border-white/20"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={deleteCharacter}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-400 transition hover:bg-rose-500/20 disabled:opacity-50"
                      title="Apagar Ficha Permanentemente"
                    >
                      {pendingKey === "profile:delete" ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isSheetModalOpen && (
        <CharacterSheetModal
          sessionCode={sessionCode}
          character={character}
          onClose={() => setIsSheetModalOpen(false)}
          canManage={canManageProfile}
        />
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
  const [characterTier, setCharacterTier] = useState<CharacterTier>("medium");
  const [ownerParticipantId, setOwnerParticipantId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [hpMax, setHpMax] = useState("12");
  const [fpMax, setFpMax] = useState("12");
  const [initiative, setInitiative] = useState("10");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetKindFilter, setAssetKindFilter] = useState<AssetKind | "all">("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState<LibraryStatusFilter>("all");
  const [assetSortMode, setAssetSortMode] = useState<LibrarySortMode>("name");
  const [characterSearchQuery, setCharacterSearchQuery] = useState("");
  const [characterTypeFilter, setCharacterTypeFilter] = useState<CharacterType | "all">("all");
  const [characterStatusFilter, setCharacterStatusFilter] =
    useState<LibraryStatusFilter>("all");
  const [characterSortMode, setCharacterSortMode] =
    useState<LibrarySortMode>("name");
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
  const assetLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "assets")
  );
  const characterLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "characters")
  );
  const toggleLibraryFlag = useLibraryOrganizationStore((state) => state.toggleFlag);
  const setLibraryFlag = useLibraryOrganizationStore((state) => state.setFlag);
  const touchLibraryItem = useLibraryOrganizationStore((state) => state.touchItem);
  const filteredAssets = useMemo(() => {
    const normalizedQuery = deferredAssetSearchQuery.trim().toLowerCase();
    const searchedAssets = assets.filter((asset) => {
      if (assetKindFilter !== "all" && asset.kind !== assetKindFilter) return false;
      if (!normalizedQuery) return true;
      return `${asset.label} ${asset.kind}`.toLowerCase().includes(normalizedQuery);
    });
    const scopedAssets = filterLibraryItemsByStatus(
      searchedAssets,
      assetStatusFilter,
      (asset) => assetLibraryFlags[asset.id]
    );
    return sortLibraryItems(scopedAssets, {
      sortMode: assetSortMode,
      getLabel: (asset) => asset.label,
      getFlags: (asset) => assetLibraryFlags[asset.id]
    });
  }, [assetKindFilter, assetLibraryFlags, assetSortMode, assetStatusFilter, assets, deferredAssetSearchQuery]);
  const filteredCharacters = useMemo(() => {
    const normalizedQuery = deferredCharacterSearchQuery.trim().toLowerCase();
    const searchedCharacters = orderedCharacters.filter((character) => {
      if (characterTypeFilter !== "all" && character.type !== characterTypeFilter) return false;
      if (!normalizedQuery) return true;
      const ownerName = participants.find((participant) => participant.id === character.ownerParticipantId)?.displayName ?? "";
      return `${character.name} ${character.type} ${ownerName}`.toLowerCase().includes(normalizedQuery);
    });
    const scopedCharacters = filterLibraryItemsByStatus(
      searchedCharacters,
      characterStatusFilter,
      (character) => characterLibraryFlags[character.id]
    );
    return sortLibraryItems(scopedCharacters, {
      sortMode: characterSortMode,
      getLabel: (character) => character.name,
      getFlags: (character) => characterLibraryFlags[character.id]
    });
  }, [characterLibraryFlags, characterSortMode, characterStatusFilter, characterTypeFilter, deferredCharacterSearchQuery, orderedCharacters, participants]);

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
        setLibraryFlag(sessionCode, "assets", result.asset.id, "prepared", true);
        touchLibraryItem(sessionCode, "assets", result.asset.id);
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
        tier: characterTier,
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
      setLibraryFlag(sessionCode, "characters", result.character.id, "prepared", true);
      touchLibraryItem(sessionCode, "characters", result.character.id);
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
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card group relative overflow-hidden p-5">
          <div className="absolute -right-4 -top-4 opacity-10"><Shield size={64} /></div>
          <p className="section-label">Roster da Mesa</p>
          <p className="mt-2 text-3xl font-black text-white">{orderedCharacters.length}</p>
        </div>
        <div className="stat-card group relative overflow-hidden p-5">
          <div className="absolute -right-4 -top-4 opacity-10"><UploadCloud size={64} /></div>
          <p className="section-label">Galeria de Arte</p>
          <p className="mt-2 text-3xl font-black text-white">{assets.length}</p>
        </div>
        <div className="stat-card group relative overflow-hidden p-5 border-amber-400/20 bg-amber-400/[0.03]">
          <div className="absolute -right-4 -top-4 opacity-10 text-amber-400"><HeartPulse size={64} /></div>
          <p className="section-label text-amber-200">Sua Identidade</p>
          <p className="mt-2 text-lg font-bold text-white truncate">{viewerCharacter?.name ?? "Nenhum vínculo"}</p>
        </div>
      </div>

      {canManage && (
        <div className="grid gap-6 xl:grid-cols-2">
          {/* Asset Upload Form */}
          <section className="rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
                <UploadCloud size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Nova Arte ou Recurso</h3>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">Sincronizar com Cloudinary</p>
              </div>
            </div>
            
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Rótulo do Recurso</label>
                <input 
                  value={assetLabel} 
                  onChange={(event) => setAssetLabel(event.target.value)} 
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" 
                  placeholder="Ex: Ronin sob a Chuva" 
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Natureza</label>
                  <select 
                    value={assetKind} 
                    onChange={(event) => setAssetKind(event.target.value as AssetKind)} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  >
                    {assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabel(kind)}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Arquivo Local</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)} 
                      className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white/40 file:mr-3 file:rounded-xl file:border-0 file:bg-amber-400/20 file:px-3 file:py-1.5 file:text-[10px] file:font-black file:uppercase file:text-amber-100" 
                    />
                  </div>
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleAssetSubmit} 
                disabled={isAssetPending || !cloudinaryReady} 
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-400/10 py-4 text-xs font-black uppercase tracking-widest text-amber-50 transition hover:border-amber-300/45 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAssetPending ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />} 
                Guardar Recurso na Nuvem
              </button>
              {assetFeedback && <p className="text-center text-[10px] font-bold uppercase tracking-wider text-amber-400/60">{assetFeedback}</p>}
            </div>
          </section>

          {/* Character Creation Form */}
          <section className="rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Batismo de Nova Ficha</h3>
                <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">Personagens e Figuras</p>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nome Completo</label>
                  <input 
                    value={characterName} 
                    onChange={(event) => setCharacterName(event.target.value)} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" 
                    placeholder="Ex: Miyamoto Musashi" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Tipo</label>
                  <select 
                    value={characterType} 
                    onChange={(event) => setCharacterType(event.target.value as CharacterType)} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  >
                    <option value="player">Protagonista</option>
                    <option value="npc">Figura / NPC</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Nível de Detalhe</label>
                  <select 
                    value={characterTier} 
                    onChange={(event) => setCharacterTier(event.target.value as CharacterTier)} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  >
                    <option value="full">Ficha Completa</option>
                    <option value="medium">Ficha Mediana</option>
                    <option value="summary">Ficha Resumida</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Vínculo com Jogador</label>
                  <select 
                    value={ownerParticipantId} 
                    onChange={(event) => setOwnerParticipantId(event.target.value)} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  >
                    <option value="">Sem vínculo inicial</option>
                    {playerParticipants.map((participant) => <option key={participant.id} value={participant.id}>{participant.displayName}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-[1fr_120px_120px_120px]">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Retrato / Arte</label>
                  <select 
                    value={selectedAssetId} 
                    onChange={(event) => setSelectedAssetId(event.target.value)} 
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
                  >
                    <option value="">Sem retrato visual</option>
                    {assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-rose-300/40 ml-1">PV Max</label>
                  <input type="number" value={hpMax} onChange={(event) => setHpMax(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-rose-400/35" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-amber-300/40 ml-1">PF Max</label>
                  <input type="number" value={fpMax} onChange={(event) => setFpMax(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-400/35" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-white/30 ml-1">Inic.</label>
                  <input type="number" value={initiative} onChange={(event) => setInitiative(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35" />
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleCharacterSubmit} 
                disabled={isCharacterPending} 
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300/28 bg-emerald-400/10 py-4 text-xs font-black uppercase tracking-widest text-emerald-50 transition hover:border-emerald-300/45 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isCharacterPending ? <LoaderCircle size={18} className="animate-spin" /> : <Shield size={18} />} 
                Criar Nova Entidade
              </button>
              {characterFeedback && <p className="text-center text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">{characterFeedback}</p>}
            </div>
          </section>
        </div>
      )}

      <section className="rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white">Arquivo da Mesa</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-white/40">Busque e organize artes, retratos e emblemas</p>
          </div>
          <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] font-bold">{assets.length} recursos</span>
        </div>
        
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input 
                value={assetSearchQuery} 
                onChange={(event) => { setAssetSearchQuery(event.target.value); setVisibleAssetCount(12); }} 
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/35 placeholder:text-white/20" 
                placeholder="Buscar retrato ou recurso..." 
              />
            </div>
            <select 
              value={assetKindFilter} 
              onChange={(event) => { setAssetKindFilter(event.target.value as AssetKind | "all"); setVisibleAssetCount(12); }} 
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/35"
            >
              <option value="all">Todas as Naturezas</option>
              {assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabel(kind)}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <LibrarySortSelect value={assetSortMode} onChange={setAssetSortMode} />
            </div>
          </div>
          <div className="flex items-center justify-start border-t border-white/5 pt-3">
            <LibraryFilterPills value={assetStatusFilter} onChange={setAssetStatusFilter} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {filteredAssets.slice(0, visibleAssetCount).map((asset) => (
            <article 
              key={asset.id} 
              className="group relative flex flex-col overflow-hidden rounded-[18px] border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="relative aspect-square w-full overflow-hidden">
                <img 
                  src={asset.secureUrl} 
                  alt={asset.label}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                
                {/* Kind Badge */}
                <div className="absolute left-2 top-2">
                  <span className="rounded-md border border-white/10 bg-black/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-white/60 backdrop-blur-md">
                    {assetKindLabel(asset.kind).split(" ")[0]}
                  </span>
                </div>

                {/* Flags Controls - Positioned at bottom right of image */}
                <div className="absolute right-2 bottom-2 z-20">
                  <LibraryFlagControls
                    flags={assetLibraryFlags[asset.id]}
                    canManage={canManage}
                    onToggle={(flag) => toggleLibraryFlag(sessionCode, "assets", asset.id, flag)}
                  />
                </div>
              </div>

              <div className="p-2.5">
                <p className="truncate text-[11px] font-bold tracking-tight text-white/80">{asset.label}</p>
                
                {canManage && (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => beginAssetEdit(asset)}
                      className="flex-1 rounded-lg border border-white/5 bg-white/5 py-1.5 text-[9px] font-black uppercase tracking-tight text-white/30 transition hover:bg-white/10 hover:text-white"
                    >
                      Alt
                    </button>
                    <button
                      onClick={() => handleAssetDelete(asset.id)}
                      className="rounded-lg border border-rose-400/10 bg-rose-400/5 px-2 py-1.5 text-rose-400/30 transition hover:bg-rose-400/10 hover:text-rose-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                )}
              </div>

              {/* Editing Overlay */}
              {editingAssetId === asset.id && (
                <div className="absolute inset-0 z-30 bg-black/90 p-3 flex flex-col justify-center gap-2 backdrop-blur-sm">
                  <input
                    value={editingAssetLabel}
                    onChange={(event) => setEditingAssetLabel(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[10px] text-white outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAssetEditSave} className="flex-1 rounded-lg bg-amber-400/10 py-2 text-[9px] font-black uppercase text-amber-300">OK</button>
                    <button onClick={() => setEditingAssetId(null)} className="px-2 rounded-lg bg-white/5 py-2 text-[9px] font-black uppercase text-white/40">X</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
        
        {filteredAssets.length > visibleAssetCount && (
          <button 
            type="button" 
            onClick={() => setVisibleAssetCount((current) => current + 12)} 
            className="mt-8 w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 transition hover:border-white/20 hover:text-white hover:bg-white/[0.06]"
          >
            Explorar Galeria Completa
          </button>
        )}
      </section>

      <section className="space-y-6 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-400">
              <Shield size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Iniciativa e Roster</h3>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">PV/PF Sincronizados em Tempo Real</p>
            </div>
          </div>
          <div className="flex items-center gap-2 hud-chip border-amber-300/20 bg-amber-300/8 text-amber-100 font-bold px-4">
            <RadioTower size={14} className="animate-pulse" />
            <span>SINCRO ATIVA</span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input 
                value={characterSearchQuery} 
                onChange={(event) => { setCharacterSearchQuery(event.target.value); setVisibleCharacterCount(10); }} 
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-4 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/35 placeholder:text-white/20" 
                placeholder="Buscar ficha, tipo ou jogador..." 
              />
            </div>
            <select 
              value={characterTypeFilter} 
              onChange={(event) => { setCharacterTypeFilter(event.target.value as CharacterType | "all"); setVisibleCharacterCount(10); }} 
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs text-white outline-none transition focus:border-amber-300/35"
            >
              <option value="all">Todas as Naturezas</option>
              <option value="player">Protagonista</option>
              <option value="npc">Figura / NPC</option>
            </select>
            <div className="flex items-center gap-2">
              <LibrarySortSelect value={characterSortMode} onChange={setCharacterSortMode} />
            </div>
          </div>
          <div className="flex items-center justify-start border-t border-white/5 pt-3">
            <LibraryFilterPills value={characterStatusFilter} onChange={setCharacterStatusFilter} />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {filteredCharacters.slice(0, visibleCharacterCount).map((character) => (
            <div key={character.id} className="group">
              <CharacterCard
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
                flags={characterLibraryFlags[character.id]}
                onToggleFlag={(flag) => toggleLibraryFlag(sessionCode, "characters", character.id, flag)}
              />
            </div>
          ))}
        </div>
        
        {filteredCharacters.length > visibleCharacterCount && (
          <button 
            type="button" 
            onClick={() => setVisibleCharacterCount((current) => current + 10)} 
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 transition hover:border-white/20 hover:text-white hover:bg-white/[0.06]"
          >
            Carregar Mais Fichas
          </button>
        )}
      </section>
    </div>
  );
}


