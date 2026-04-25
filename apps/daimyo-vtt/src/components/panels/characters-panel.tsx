"use client";

import { useDeferredValue, useMemo, useState, useTransition, useEffect } from "react";
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
  Skull,
  BookOpen
} from "lucide-react";

import {
  adjustCharacterInitiativeAction,
  adjustCharacterResourceAction,
  createCharacterAction,
  deleteCharacterAction,
  updateCharacterProfileAction,
  applyBaseArchetypeAction
} from "@/app/actions/character-actions";
import { loadBaseCatalogAction } from "@/app/actions/content-bridge-actions";
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
import type { CharacterType, CharacterTier, SessionCharacterRecord } from "@/types/character";
import type {
  LibraryEntryFlags,
  LibraryPreparedFlags,
  LibrarySortMode,
  LibraryStatusFilter
} from "@/types/library";
import type { OnlinePresence } from "@/types/presence";
import type { SessionParticipantRecord, SessionViewerIdentity } from "@/types/session";
import type { CharacterTemplate } from "@/lib/content-bridge/contract";

interface CharactersPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
  party: OnlinePresence[];
}

function characterTypeLabel(type: CharacterType) {
  return type === "player" ? "protagonista" : "figura";
}

function characterTierLabel(tier: CharacterTier) {
  switch (tier) {
    case "full": return "completa";
    case "medium": return "mediana";
    case "summary": return "resumida";
    default: return "desconhecida";
  }
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
  archetypeOptions,
  sessionCode,
  flags,
  onToggleFlag
}: {
  character: SessionCharacterRecord;
  asset: any;
  ownerName: string | null;
  isOnline: boolean;
  canAdjust: boolean;
  canManageInitiative: boolean;
  canManageProfile: boolean;
  participantOptions: SessionParticipantRecord[];
  assetOptions: any[];
  archetypeOptions: CharacterTemplate[];
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
  const [draftOwnerParticipantId, setDraftOwnerParticipantId] = useState(character.ownerParticipantId ?? "");
  const [draftAssetId, setDraftAssetId] = useState(character.assetId ?? "");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [selectedArchetypeId, setSelectedArchetypeId] = useState("");

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
        setIsEditingProfile(false);
      }
      setPendingKey(null);
    });
  };

  const applyArchetype = () => {
    if (!selectedArchetypeId) return;
    setPendingKey("archetype:apply");
    startTransition(async () => {
      const result = await applyBaseArchetypeAction({
        sessionCode,
        characterId: character.id,
        archetypeId: selectedArchetypeId
      });
      if (result.ok && result.character) {
        upsertCharacter(result.character);
        setSelectedArchetypeId("");
      }
      setPendingKey(null);
    });
  };

  const markAsDead = () => {
    if (onToggleFlag) onToggleFlag("dead");
  };

  const deleteCharacter = () => {
    if (!window.confirm(`Tem certeza que deseja apagar permanentemente a ficha de ${character.name}?`)) return;
    setPendingKey("profile:delete");
    startTransition(async () => {
      const result = await deleteCharacterAction({ sessionCode, characterId: character.id });
      if (result.ok && result.character) removeCharacter(result.character.id);
      setPendingKey(null);
    });
  };

  return (
    <article className={cn(
      "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
      isExpanded ? "border-amber-400/40 bg-amber-400/[0.03] shadow-[0_0_40px_rgba(251,191,36,0.1)]" : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
    )}>
      <div className="relative z-10 p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <AssetAvatar imageUrl={asset?.secureUrl} label={character.name} kind={asset?.kind} className="h-12 w-12 rounded-xl border border-white/10" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn("truncate text-base font-bold tracking-tight", flags?.dead ? "text-white/40 line-through decoration-rose-500/50" : "text-white")}>
                  {character.name}
                </h4>
                {flags?.dead && <Skull size={12} className="text-rose-500/60" />}
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">{ownerName ?? "sem vínculo"} • {characterTypeLabel(character.type)}</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[8px] font-black text-white/20 uppercase">PV</p>
                <p className="text-xs font-bold text-rose-200">{character.hp}/{character.hpMax}</p>
              </div>
              <div className="text-right border-l border-white/5 pl-4">
                <p className="text-[8px] font-black text-white/20 uppercase">PF</p>
                <p className="text-xs font-bold text-amber-200">{character.fp}/{character.fpMax}</p>
              </div>
            </div>
            {isExpanded ? <ChevronUp size={16} className="text-amber-400" /> : <ChevronDown size={16} className="text-white/20" />}
          </div>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-6" onClick={(e) => e.stopPropagation()}>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Profile Edit */}
              <div className="space-y-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <PencilLine size={14} className="text-amber-400/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Perfil da Ficha</span>
                </div>
                <input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-amber-400/30"
                  placeholder="Nome do personagem"
                />
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={isPending} className="flex-1 rounded-xl bg-amber-400/10 py-2 text-[10px] font-black uppercase text-amber-400 transition hover:bg-amber-400/20">
                    {pendingKey === "profile:save" ? <LoaderCircle size={14} className="animate-spin mx-auto" /> : "Salvar Nome"}
                  </button>
                  <button onClick={() => setIsSheetModalOpen(true)} className="rounded-xl border border-white/10 px-4 py-2 text-[10px] font-black uppercase text-white/60 hover:text-white">
                    Abrir Ficha
                  </button>
                </div>
              </div>

              {/* Archetype Apply */}
              <div className="space-y-4 rounded-2xl border border-white/5 bg-black/20 p-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={14} className="text-sky-400/60" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Aplicar Arquétipo</span>
                </div>
                <select
                  value={selectedArchetypeId}
                  onChange={(e) => setSelectedArchetypeId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/30"
                >
                  <option value="">Escolha um arquétipo...</option>
                  {archetypeOptions.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <button onClick={applyArchetype} disabled={!selectedArchetypeId || isPending} className="w-full rounded-xl bg-sky-400/10 py-2 text-[10px] font-black uppercase text-sky-400 transition hover:bg-sky-400/20 disabled:opacity-20">
                  {pendingKey === "archetype:apply" ? <LoaderCircle size={14} className="animate-spin mx-auto" /> : "Preencher Campos"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/5 pt-4">
              <div className="flex gap-2">
                <button onClick={markAsDead} className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase transition",
                  flags?.dead ? "border-rose-500/40 bg-rose-500/10 text-rose-400" : "border-white/10 text-white/40 hover:text-white"
                )}>
                  <Skull size={14} />
                  {flags?.dead ? "Ressuscitar" : "Marcar como Morto"}
                </button>
                <button onClick={() => onToggleFlag?.("trash")} className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase transition",
                  flags?.trash ? "border-rose-500 bg-rose-500/20 text-white" : "border-white/10 text-white/40 hover:text-rose-400"
                )}>
                  <Trash2 size={14} />
                  Lixeira
                </button>
              </div>
              <button onClick={deleteCharacter} className="text-[10px] font-black uppercase text-rose-500/40 hover:text-rose-500">Excluir Permanente</button>
            </div>
          </div>
        )}
      </div>

      {isSheetModalOpen && (
        <CharacterSheetModal sessionCode={sessionCode} character={character} onClose={() => setIsSheetModalOpen(false)} canManage={canManageProfile} />
      )}
    </article>
  );
}

export function CharactersPanel({ sessionCode, viewer, participants, party }: CharactersPanelProps) {
  const characters = useCharacterStore((state) => state.characters);
  const assets = useAssetStore((state) => state.assets);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);

  const [characterName, setCharacterName] = useState("");
  const [characterType, setCharacterType] = useState<CharacterType>("player");
  const [characterTier, setCharacterTier] = useState<CharacterTier>("medium");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedArchetypeId, setSelectedArchetypeId] = useState("");
  const [archetypes, setArchetypes] = useState<CharacterTemplate[]>([]);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("active");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("name");
  const [visibleCount, setVisibleCount] = useState(10);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const characterLibraryFlags = useLibraryOrganizationStore((state) => selectLibraryFlags(state, sessionCode, "characters"));
  const toggleLibraryFlag = useLibraryOrganizationStore((state) => state.toggleFlag);

  useEffect(() => {
    loadBaseCatalogAction().then(res => {
      if (res.ok) setArchetypes(res.archetypes ?? []);
    });
  }, []);

  const filteredCharacters = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase().trim();
    const items = sortCharactersByInitiative(characters).filter(c => {
      if (!query) return true;
      return c.name.toLowerCase().includes(query);
    });
    const scoped = filterLibraryItemsByStatus(items, statusFilter, (c) => characterLibraryFlags[c.id]);
    return sortLibraryItems(scoped, { sortMode, getLabel: (c) => c.name, getFlags: (c) => characterLibraryFlags[c.id] });
  }, [characters, deferredSearchQuery, statusFilter, sortMode, characterLibraryFlags]);

  const handleCreate = () => {
    if (!characterName.trim()) return;
    startTransition(async () => {
      const result = await createCharacterAction({
        sessionCode,
        name: characterName.trim(),
        type: characterType,
        tier: characterTier,
        assetId: selectedAssetId || null,
        hpMax: 10, fpMax: 10, initiative: 10 // Defaults, will be filled by archetype if selected
      });
      if (result.ok && result.character) {
        if (selectedArchetypeId) {
          await applyBaseArchetypeAction({ sessionCode, characterId: result.character.id, archetypeId: selectedArchetypeId });
        }
        upsertCharacter(result.character);
        setCharacterName("");
        setSelectedArchetypeId("");
      }
    });
  };

  const canManage = viewer?.role === "gm";

  return (
    <div className="space-y-6">
      {/* Create Character */}
      {canManage && (
        <section className="rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-400">
              <Plus size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Criar Nova Ficha</h3>
              <p className="text-[10px] font-medium uppercase tracking-widest text-white/40">Defina o nome e use um arquétipo para agilizar</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-white/30 ml-1">Nome do Personagem</label>
                <input value={characterName} onChange={e => setCharacterName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-amber-400/30" placeholder="Ex: Musashi" />
              </div>
              <div className="grid gap-4 grid-cols-2">
                <select value={characterType} onChange={e => setCharacterType(e.target.value as any)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
                  <option value="player">Protagonista</option>
                  <option value="npc">Figura / NPC</option>
                </select>
                <select value={characterTier} onChange={e => setCharacterTier(e.target.value as any)} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">
                  <option value="full">Ficha Completa</option>
                  <option value="medium">Ficha Mediana</option>
                  <option value="summary">Ficha Resumida</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-white/30 ml-1">Usar Base de Arquétipo (Opcional)</label>
                <select value={selectedArchetypeId} onChange={e => setSelectedArchetypeId(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-sky-400/30">
                  <option value="">Nenhum (Ficha em Branco)</option>
                  {archetypes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreate} disabled={isPending || !characterName} className="w-full h-[46px] rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 text-xs font-black uppercase tracking-widest transition hover:bg-emerald-500/20">
                {isPending ? <LoaderCircle size={18} className="animate-spin mx-auto" /> : "Gerar Personagem"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Character List */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-2.5 text-xs text-white" placeholder="Buscar fichas..." />
            </div>
            <LibrarySortSelect value={sortMode} onChange={setSortMode} />
            <LibraryFilterPills value={statusFilter} onChange={setStatusFilter} />
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {filteredCharacters.slice(0, visibleCount).map(c => (
            <CharacterCard
              key={c.id}
              character={c}
              asset={resolveCharacterAsset(c, assets)}
              ownerName={participants.find(p => p.id === c.ownerParticipantId)?.displayName ?? null}
              isOnline={c.ownerParticipantId ? party.some(p => p.id === c.ownerParticipantId && p.status !== "offline") : false}
              canAdjust={canManage || viewer?.participantId === c.ownerParticipantId}
              canManageInitiative={canManage}
              canManageProfile={canManage}
              participantOptions={participants}
              assetOptions={assets}
              archetypeOptions={archetypes}
              sessionCode={sessionCode}
              flags={characterLibraryFlags[c.id]}
              onToggleFlag={flag => toggleLibraryFlag(sessionCode, "characters", c.id, flag)}
            />
          ))}
        </div>
        
        {filteredCharacters.length > visibleCount && (
          <button onClick={() => setVisibleCount(v => v + 10)} className="w-full py-4 text-[10px] font-black uppercase text-white/20 hover:text-white transition">Carregar Mais</button>
        )}
      </section>
    </div>
  );
}
