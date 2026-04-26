"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  BookOpenText,
  ChevronDown,
  ChevronUp,
  Eye,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  ScrollText,
  Settings2,
  ShieldPlus,
  Swords
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

import { AssetVisualPicker } from "@/components/ui/asset-visual-picker";

import {
  importBaseArchetypeAction,
  loadBaseCatalogAction
} from "@/app/actions/content-bridge-actions";
import { filterLibraryItems, sliceLibraryItems } from "@/lib/library/query";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import type {
  CharacterTemplate,
  CodexEntry,
  EquipmentEntry
} from "@/lib/content-bridge/contract";
import type { CharacterType, CharacterTier } from "@/types/character";
import type {
  SessionParticipantRecord,
  SessionViewerIdentity
} from "@/types/session";

type CodexTab = "archetypes" | "codex" | "equipment";

interface CodexPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
}



export function CodexPanel({
  sessionCode,
  viewer,
  participants
}: CodexPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const [activeTab, setActiveTab] = useState<CodexTab>("archetypes");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogReady, setCatalogReady] = useState(false);
  const [archetypes, setArchetypes] = useState<CharacterTemplate[]>([]);
  const [codexEntries, setCodexEntries] = useState<CodexEntry[]>([]);
  const [equipmentEntries, setEquipmentEntries] = useState<EquipmentEntry[]>([]);
  const [codexCategories, setCodexCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedCodexCategory, setSelectedCodexCategory] = useState("all");
  const [selectedEquipmentCategory, setSelectedEquipmentCategory] = useState("all");
  const [importType, setImportType] = useState<CharacterType>("player");
  const [importTier, setImportTier] = useState<CharacterTier>("full");
  const [importOwnerParticipantId, setImportOwnerParticipantId] = useState("");
  const [importAssetId, setImportAssetId] = useState("");
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [expandedArchetypeId, setExpandedArchetypeId] = useState<string | null>(null);
  const [expandedCodexId, setExpandedCodexId] = useState<string | null>(null);
  const [expandedEquipmentId, setExpandedEquipmentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const canManage = viewer?.role === "gm";
  const playerParticipants = useMemo(
    () => participants.filter((participant) => participant.role === "player"),
    [participants]
  );
  const portraitAssets = useMemo(
    () => assets.filter((asset) => ["portrait", "npc", "token"].includes(asset.kind)),
    [assets]
  );

  useEffect(() => {
    let isMounted = true;

    startTransition(async () => {
      const result = await loadBaseCatalogAction();

      if (!isMounted) {
        return;
      }

      if (!result.ok) {
        setFeedback(result.message ?? "Falha ao abrir a oficina base.");
        setCatalogLoading(false);
        return;
      }

      setArchetypes(result.archetypes ?? []);
      setCodexEntries(result.codexEntries ?? []);
      setEquipmentEntries(result.equipmentEntries ?? []);
      const entries = result.codexEntries ?? [];
      const validCategories = (result.codexCategories ?? []).filter((category) =>
        entries.some((entry) => entry.category === category.name)
      );

      setCodexCategories(validCategories.map((category) => ({
        id: category.id,
        name: category.name
      })));
      setCatalogReady(true);
      setCatalogLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredArchetypes = useMemo(
    () =>
      filterLibraryItems(archetypes, deferredSearchQuery, (archetype) => {
        const stats = archetype.stats as Record<string, unknown>;
        return `${archetype.name} ${String(stats.clan ?? "")} ${String(
          stats.concept ?? ""
        )}`;
      }),
    [archetypes, deferredSearchQuery]
  );
  const filteredCodexEntries = useMemo(() => {
    const categoryFiltered =
      selectedCodexCategory === "all"
        ? codexEntries
        : codexEntries.filter((entry) => entry.category === selectedCodexCategory);

    return filterLibraryItems(categoryFiltered, deferredSearchQuery, (entry) => {
      return `${entry.title} ${entry.category} ${entry.markdown} ${entry.tags.join(" ")}`;
    });
  }, [codexEntries, deferredSearchQuery, selectedCodexCategory]);
  const filteredEquipmentEntries = useMemo(() => {
    const categoryFiltered =
      selectedEquipmentCategory === "all"
        ? equipmentEntries
        : equipmentEntries.filter((entry) => entry.category === selectedEquipmentCategory);

    return filterLibraryItems(categoryFiltered, deferredSearchQuery, (entry) => {
      return `${entry.name} ${entry.category} ${entry.tags.join(" ")} ${JSON.stringify(
        entry.stats
      )}`;
    });
  }, [deferredSearchQuery, equipmentEntries, selectedEquipmentCategory]);

  const displayedArchetypes = sliceLibraryItems(filteredArchetypes, visibleCount);
  const displayedCodexEntries = sliceLibraryItems(filteredCodexEntries, visibleCount);
  const displayedEquipmentEntries = sliceLibraryItems(filteredEquipmentEntries, visibleCount);

  const runImport = (archetypeId: string) => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode importar arquétipos para a sessão.");
      return;
    }

    setPendingKey(archetypeId);
    setFeedback(null);

    startTransition(async () => {
      const result = await importBaseArchetypeAction({
        sessionCode,
        archetypeId,
        type: importType,
        tier: importTier,
        ownerParticipantId:
          importType === "player" ? importOwnerParticipantId || null : null,
        assetId: importAssetId || null
      });

      if (!result.ok || !result.character) {
        setFeedback(result.message ?? "Falha ao importar o arquétipo.");
        setPendingKey(null);
        return;
      }

      upsertCharacter(result.character);
      setFeedback(`Arquétipo importado como ficha: ${result.character.name}.`);
      setPendingKey(null);
    });
  };

  return (
    <section className="space-y-4">
      <header className="rounded-[22px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="section-label">Oficina da campanha</p>
            <h3 className="mt-2 text-xl font-semibold text-[color:var(--text-primary)]">
              Codex, arquétipos e arsenal do projeto base
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              Esta área consulta o projeto base sem transplantar o hub inteiro
              para dentro do VTT. Aqui o mestre reaproveita arquétipos e consulta
              referências da oficina.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["archetypes", "Arquétipos", ShieldPlus],
                ["codex", "Codex", BookOpenText],
                ["equipment", "Arsenal", Swords]
              ] as const
            ).map(([tabId, label, Icon]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  activeTab === tabId
                    ? "border-[color:var(--gold)]/25 bg-[color:var(--mist)] text-[color:var(--gold)]"
                    : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-secondary)] hover:border-[color:var(--gold)]/20"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="rounded-[22px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_repeat(2,minmax(180px,220px))]">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={
              activeTab === "archetypes"
                ? "buscar arquétipo, clã ou conceito"
                : activeTab === "codex"
                  ? "buscar termo, categoria ou descrição"
                  : "buscar arma, armadura ou equipamento"
            }
            className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--gold)]/30"
          />

          {activeTab === "codex" ? (
            <select
              value={selectedCodexCategory}
              onChange={(event) => setSelectedCodexCategory(event.target.value)}
              className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/30"
            >
              <option value="all">todas as categorias</option>
              {codexCategories.map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          ) : activeTab === "equipment" ? (
            <select
              value={selectedEquipmentCategory}
              onChange={(event) => setSelectedEquipmentCategory(event.target.value)}
              className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/30"
            >
              <option value="all">todo o arsenal</option>
              {["Armas", "Armaduras", "Equipamentos"]
                .filter((category) =>
                  equipmentEntries.some((entry) => entry.category === category)
                )
                .map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <select
                value={importType}
                onChange={(event) => setImportType(event.target.value as CharacterType)}
                className="w-full rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/30"
              >
                <option value="player">protagonista</option>
                <option value="npc">figura</option>
              </select>
              <select
                value={importTier}
                onChange={(event) => setImportTier(event.target.value as CharacterTier)}
                className="w-full rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/30"
              >
                <option value="full">ficha completa</option>
                <option value="medium">ficha mediana</option>
                <option value="summary">ficha resumida</option>
              </select>
            </div>
          )}

          {activeTab === "archetypes" ? (
            importType === "player" ? (
              <select
                value={importOwnerParticipantId}
                onChange={(event) => setImportOwnerParticipantId(event.target.value)}
                className="rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/30"
              >
                <option value="">sem vínculo inicial</option>
                {playerParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => setIsAssetPickerOpen(true)}
                className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition hover:bg-[var(--bg-card)] focus:border-[color:var(--gold)]/30"
              >
                <ImageIcon size={16} className="text-[color:var(--text-muted)]" />
                {importAssetId
                  ? (portraitAssets.find((a) => a.id === importAssetId)?.label ?? "retrato selecionado")
                  : "sem retrato inicial"}
              </button>
            )
          ) : (
            <div className="rounded-[18px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-3 text-sm text-[color:var(--text-muted)]">
              consulta somente leitura
            </div>
          )}
        </div>

        {activeTab === "archetypes" && importType === "player" && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setIsAssetPickerOpen(true)}
              className="inline-flex w-full items-center gap-2 rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition hover:bg-[var(--bg-card)] focus:border-[color:var(--gold)]/30"
            >
              <ImageIcon size={16} className="text-[color:var(--text-muted)]" />
              {importAssetId
                ? (portraitAssets.find((a) => a.id === importAssetId)?.label ?? "retrato selecionado")
                : "sem retrato inicial"}
            </button>
          </div>
        )}
      </section>

      {feedback && (
        <div className="rounded-[20px] border border-[color:var(--gold)]/18 bg-[color:var(--mist)] px-4 py-3 text-sm text-[color:var(--text-primary)]">
          {feedback}
        </div>
      )}

      {catalogLoading && (
        <div className="rounded-[22px] border border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-6 text-sm text-[color:var(--text-muted)]">
          <span className="inline-flex items-center gap-2">
            <LoaderCircle size={16} className="animate-spin" />
            abrindo a oficina base...
          </span>
        </div>
      )}

      {catalogReady && activeTab === "archetypes" && (
        <div className="space-y-3">
          {displayedArchetypes.map((archetype) => {
            const stats = archetype.stats as Record<string, unknown>;
            const attributes = (stats.attributes ?? {}) as Record<string, unknown>;
            const isExpanded = expandedArchetypeId === archetype.id;

            return (
              <article
                key={archetype.id}
                className={cn(
                  "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
                  isExpanded
                    ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] shadow-[0_0_40px_rgba(var(--gold-rgb),0.1)]"
                    : "border-[var(--border-panel)] bg-[var(--bg-card)]/50 hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]"
                )}
              >
                <div 
                  className="relative z-10 p-4 cursor-pointer"
                  onClick={() => setExpandedArchetypeId(prev => prev === archetype.id ? null : archetype.id)}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all",
                          isExpanded 
                            ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]" 
                            : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)]"
                        )}>
                          <ShieldPlus size={20} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-lg font-bold tracking-tight text-[color:var(--text-primary)]">{archetype.name}</h4>
                            <span className="hud-chip border-[color:var(--gold)]/18 bg-[color:var(--mist)] text-[9px] text-[color:var(--gold)] uppercase tracking-widest font-black">
                              {String(stats.clan ?? "sem clan")}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                            <Info size={11} className="text-[color:var(--text-muted)]" />
                            <span className="truncate italic">{String(stats.concept ?? "Sem conceito registrado.")}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:justify-start">
                      <span className="hud-chip border-[var(--border-panel)] bg-[var(--bg-card)]/50 text-[10px] text-[color:var(--text-primary)]">
                        {String(stats.points ?? "--")} pts
                      </span>
                      
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] transition-all group-hover:border-[color:var(--gold)]/30 group-hover:text-[color:var(--gold)]">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div 
                      className="mt-5 space-y-5 rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-4 backdrop-blur-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-2 text-xs text-[color:var(--text-muted)] font-medium">
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">PV {String(attributes.hp ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">PF {String(attributes.fp ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">ST {String(attributes.st ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">DX {String(attributes.dx ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">IQ {String(attributes.iq ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">HT {String(attributes.ht ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">VON {String(attributes.will ?? 10)}</span>
                        <span className="bg-[var(--bg-input)]/50 px-2 py-0.5 rounded-full border border-[var(--border-panel)]">PER {String(attributes.per ?? 10)}</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          {Array.isArray(stats.advantages) && stats.advantages.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-3)] mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Vantagens
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {stats.advantages.map((adv: string, i: number) => (
                                  <span key={i} className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-200">
                                    {adv}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {Array.isArray(stats.disadvantages) && stats.disadvantages.length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-3)] mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Desvantagens
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {stats.disadvantages.map((dis: string, i: number) => (
                                  <span key={i} className="rounded-sm bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-200">
                                    {dis}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div>
                          {Array.isArray(stats.skills) && stats.skills.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--ink-3)] mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Perícias
                              </h5>
                              <ul className="list-disc pl-4 text-xs text-[color:var(--ink-2)] space-y-0.5">
                                {stats.skills.map((skill: string, i: number) => (
                                  <li key={i}>{skill}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {typeof stats.equipment === "string" && stats.equipment.trim().length > 0 && (
                            <div>
                              <h5 className="text-[10px] font-bold uppercase tracking-wider text-[color:var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--text-muted)]"></span> Equipamento
                              </h5>
                              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed whitespace-pre-wrap pl-2 border-l border-[var(--border-panel)]">
                                {String(stats.equipment).replace(/\s{3,}/g, '\n').trim()}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => runImport(archetype.id)}
                        disabled={!canManage || isPending}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--gold)]/24 bg-[color:var(--mist)] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--gold)] transition hover:border-[color:var(--gold)]/40 disabled:opacity-60"
                      >
                        {pendingKey === archetype.id ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : (
                          <ShieldPlus size={14} />
                        )}
                        importar para o tabuleiro
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {catalogReady && activeTab === "codex" && (
        <div className="space-y-3">
          {displayedCodexEntries.map((entry) => {
            const isExpanded = expandedCodexId === entry.id;
            return (
              <article
                key={entry.id}
                className={cn(
                  "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
                  isExpanded
                    ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] shadow-[0_0_40px_rgba(var(--gold-rgb),0.1)]"
                    : "border-[var(--border-panel)] bg-[var(--bg-card)]/50 hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]"
                )}
              >
                <div 
                  className="relative z-10 p-4 cursor-pointer"
                  onClick={() => setExpandedCodexId(prev => prev === entry.id ? null : entry.id)}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all",
                          isExpanded 
                            ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]" 
                            : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)]"
                        )}>
                          <BookOpenText size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-base font-bold tracking-tight text-[color:var(--text-primary)]">{entry.title}</h4>
                            <span className="hud-chip border-[color:var(--gold)]/18 bg-[color:var(--mist)] text-[9px] text-[color:var(--gold)] uppercase tracking-widest font-black">
                              {entry.category}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest font-bold">
                            {entry.tags.slice(0, 3).join(" • ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] transition-all group-hover:border-[color:var(--gold)]/30 group-hover:text-[color:var(--gold)]">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div 
                      className="mt-5 rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-5 backdrop-blur-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-sm leading-6 text-[color:var(--ink-2)] prose-invert max-w-none">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm, remarkBreaks]}
                          components={{
                            h3: ({node, ...props}) => <h3 className="text-sm font-bold text-[color:var(--gold)] mt-4 mb-2 uppercase tracking-wide" {...props} />,
                            p: ({node, ...props}) => <p className="mb-2" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 text-[color:var(--text-secondary)]" {...props} />,
                            li: ({node, ...props}) => <li className="mb-1" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[color:var(--gold)]/50 pl-3 italic text-[color:var(--text-muted)] mb-3" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-[color:var(--text-primary)]" {...props} />,
                            table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full text-left border-collapse" {...props} /></div>,
                            thead: ({node, ...props}) => <thead className="border-b border-[var(--border-panel)] bg-[var(--bg-input)]" {...props} />,
                            th: ({node, ...props}) => <th className="p-2 font-semibold text-[color:var(--text-primary)] text-xs uppercase tracking-wider" {...props} />,
                            td: ({node, ...props}) => <td className="p-2 border-b border-[var(--border-panel)]/50 text-[color:var(--text-secondary)]" {...props} />,
                          }}
                        >
                          {entry.markdown}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {catalogReady && activeTab === "equipment" && (
        <div className="space-y-3">
          {displayedEquipmentEntries.map((entry) => {
            const isExpanded = expandedEquipmentId === entry.id;
            return (
              <article
                key={entry.id}
                className={cn(
                  "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
                  isExpanded
                    ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] shadow-[0_0_40px_rgba(var(--gold-rgb),0.1)]"
                    : "border-[var(--border-panel)] bg-[var(--bg-card)]/50 hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]"
                )}
              >
                <div 
                  className="relative z-10 p-4 cursor-pointer"
                  onClick={() => setExpandedEquipmentId(prev => prev === entry.id ? null : entry.id)}
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all",
                          isExpanded 
                            ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]" 
                            : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)]"
                        )}>
                          <Swords size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="truncate text-base font-bold tracking-tight text-[color:var(--text-primary)]">{entry.name}</h4>
                            <span className="hud-chip border-[color:var(--gold)]/18 bg-[color:var(--mist)] text-[9px] text-[color:var(--gold)] uppercase tracking-widest font-black">
                              {entry.category}
                            </span>
                          </div>
                          <p className="mt-1 flex items-center gap-1.5 text-[10px] text-[color:var(--text-muted)] uppercase tracking-widest font-bold">
                            {entry.tags.slice(0, 2).join(" • ")}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] transition-all group-hover:border-[color:var(--gold)]/30 group-hover:text-[color:var(--gold)]">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div 
                      className="mt-5 rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-4 backdrop-blur-xl"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="grid gap-2 text-sm text-[color:var(--ink-2)] md:grid-cols-2">
                        {Object.entries(entry.stats)
                          .filter(([key]) => key !== "id" && key !== "nome")
                          .slice(0, 8)
                          .map(([key, value]) => (
                            <div key={key} className="rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)]/50 px-3 py-2">
                              <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">{key}</p>
                              <p className="mt-1 text-sm font-semibold text-[color:var(--text-primary)]">{String(value)}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {catalogReady &&
        ((activeTab === "archetypes" && filteredArchetypes.length === 0) ||
          (activeTab === "codex" && filteredCodexEntries.length === 0) ||
          (activeTab === "equipment" && filteredEquipmentEntries.length === 0)) && (
          <div className="rounded-[22px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-6 text-sm text-[color:var(--text-muted)]">
            Nada corresponde aos filtros atuais nesta parte da oficina.
          </div>
        )}

      {catalogReady &&
        ((activeTab === "archetypes" && filteredArchetypes.length > visibleCount) ||
          (activeTab === "codex" && filteredCodexEntries.length > visibleCount) ||
          (activeTab === "equipment" && filteredEquipmentEntries.length > visibleCount)) && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 10)}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-panel)] bg-[var(--bg-card)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-muted)] transition hover:border-[color:var(--gold)]/20 hover:text-[color:var(--text-primary)]"
          >
            <ScrollText size={14} />
            carregar mais
          </button>
        )}

      <AssetVisualPicker
        open={isAssetPickerOpen}
        onClose={() => setIsAssetPickerOpen(false)}
        onSelect={(assetId) => setImportAssetId(assetId)}
        assets={assets}
        filterKinds={["portrait", "npc", "token"]}
        title="Selecionar Retrato Inicial"
        placeholder="buscar retratos ou imagens..."
        cardAspect="portrait"
      />
    </section>
  );
}
