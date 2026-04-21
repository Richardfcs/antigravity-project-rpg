"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import {
  BookOpenText,
  LoaderCircle,
  ScrollText,
  ShieldPlus,
  Swords
} from "lucide-react";

import {
  importBaseArchetypeAction,
  loadBaseCatalogAction
} from "@/app/actions/content-bridge-actions";
import { filterLibraryItems, sliceLibraryItems } from "@/lib/library/query";
import { useAssetStore } from "@/stores/asset-store";
import { useCharacterStore } from "@/stores/character-store";
import type {
  CharacterTemplate,
  CodexEntry,
  EquipmentEntry
} from "@/lib/content-bridge/contract";
import type { CharacterType } from "@/types/character";
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

function renderMarkdownPreview(markdown: string) {
  return markdown.split("\n").filter(Boolean).slice(0, 3).join("\n");
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
  const [importOwnerParticipantId, setImportOwnerParticipantId] = useState("");
  const [importAssetId, setImportAssetId] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
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
      setCodexCategories((result.codexCategories ?? []).map((category) => ({
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
      <header className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="section-label">Oficina da campanha</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              Codex, arquétipos e arsenal do projeto base
            </h3>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
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
                    ? "border-amber-300/25 bg-amber-300/10 text-amber-100"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
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
            className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/30"
          />

          {activeTab === "codex" ? (
            <select
              value={selectedCodexCategory}
              onChange={(event) => setSelectedCodexCategory(event.target.value)}
              className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
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
              className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
            >
              <option value="all">todo o arsenal</option>
              {["Armas", "Armaduras", "Equipamentos"].map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={importType}
              onChange={(event) => setImportType(event.target.value as CharacterType)}
              className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
            >
              <option value="player">protagonista</option>
              <option value="npc">figura</option>
            </select>
          )}

          {activeTab === "archetypes" ? (
            importType === "player" ? (
              <select
                value={importOwnerParticipantId}
                onChange={(event) => setImportOwnerParticipantId(event.target.value)}
                className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
              >
                <option value="">sem vínculo inicial</option>
                {playerParticipants.map((participant) => (
                  <option key={participant.id} value={participant.id}>
                    {participant.displayName}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={importAssetId}
                onChange={(event) => setImportAssetId(event.target.value)}
                className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
              >
                <option value="">sem retrato inicial</option>
                {portraitAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.label}
                  </option>
                ))}
              </select>
            )
          ) : (
            <div className="rounded-[18px] border border-dashed border-white/10 bg-black/12 px-4 py-3 text-sm text-[color:var(--ink-3)]">
              consulta somente leitura
            </div>
          )}
        </div>

        {activeTab === "archetypes" && importType === "player" && (
          <div className="mt-3">
            <select
              value={importAssetId}
              onChange={(event) => setImportAssetId(event.target.value)}
              className="w-full rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/30"
            >
              <option value="">sem retrato inicial</option>
              {portraitAssets.map((asset) => (
                <option key={asset.id} value={asset.id}>
                  {asset.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {feedback && (
        <div className="rounded-[20px] border border-amber-300/18 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          {feedback}
        </div>
      )}

      {catalogLoading && (
        <div className="rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-[color:var(--ink-2)]">
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

            return (
              <article
                key={archetype.id}
                className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="hud-chip border-amber-300/18 bg-amber-300/10 text-amber-100">
                        {String(stats.clan ?? "sem clan")}
                      </span>
                      <span className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]">
                        {String(stats.points ?? "--")} pts
                      </span>
                    </div>
                    <h4 className="mt-3 text-lg font-semibold text-white">{archetype.name}</h4>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
                      {String(stats.concept ?? "Sem conceito registrado.")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[color:var(--ink-3)]">
                      <span>PV {String(attributes.hp ?? 10)}</span>
                      <span>PF {String(attributes.fp ?? 10)}</span>
                      <span>DX {String(attributes.dx ?? 10)}</span>
                      <span>IQ {String(attributes.iq ?? 10)}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => runImport(archetype.id)}
                    disabled={!canManage || isPending}
                    className="inline-flex items-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-300/40 disabled:opacity-60"
                  >
                    {pendingKey === archetype.id ? (
                      <LoaderCircle size={14} className="animate-spin" />
                    ) : (
                      <ShieldPlus size={14} />
                    )}
                    importar ficha
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {catalogReady && activeTab === "codex" && (
        <div className="space-y-3">
          {displayedCodexEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="hud-chip border-amber-300/18 bg-amber-300/10 text-amber-100">
                  {entry.category}
                </span>
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h4 className="mt-3 text-lg font-semibold text-white">{entry.title}</h4>
              <pre className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[color:var(--ink-2)]">
                {renderMarkdownPreview(entry.markdown)}
              </pre>
            </article>
          ))}
        </div>
      )}

      {catalogReady && activeTab === "equipment" && (
        <div className="space-y-3">
          {displayedEquipmentEntries.map((entry) => (
            <article
              key={entry.id}
              className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="hud-chip border-amber-300/18 bg-amber-300/10 text-amber-100">
                  {entry.category}
                </span>
                {entry.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="hud-chip border-white/10 bg-white/[0.03] text-[color:var(--ink-2)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h4 className="mt-3 text-lg font-semibold text-white">{entry.name}</h4>
              <div className="mt-3 grid gap-2 text-sm text-[color:var(--ink-2)] md:grid-cols-2">
                {Object.entries(entry.stats)
                  .filter(([key]) => key !== "id" && key !== "nome")
                  .slice(0, 6)
                  .map(([key, value]) => (
                    <div key={key} className="rounded-[16px] border border-white/8 bg-black/18 px-3 py-2">
                      <p className="section-label">{key}</p>
                      <p className="mt-1 text-sm text-white">{String(value)}</p>
                    </div>
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}

      {catalogReady &&
        ((activeTab === "archetypes" && filteredArchetypes.length === 0) ||
          (activeTab === "codex" && filteredCodexEntries.length === 0) ||
          (activeTab === "equipment" && filteredEquipmentEntries.length === 0)) && (
          <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-[color:var(--ink-2)]">
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
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
          >
            <ScrollText size={14} />
            carregar mais
          </button>
        )}
    </section>
  );
}
