"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  BellRing,
  ChevronDown,
  ChevronUp,
  Compass,
  Image as ImageIcon,
  LoaderCircle,
  Map as MapIcon,
  Play,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2
} from "lucide-react";

import {
  activateAtlasMapAction,
  createAtlasMapAction,
  deleteAtlasMapAction,
  updateAtlasMapAction
} from "@/app/actions/atlas-actions";
import { sendPrivateEventAction } from "@/app/actions/private-event-actions";
import { AssetAvatar } from "@/components/media/asset-avatar";
import { AssetVisualPicker } from "@/components/ui/asset-visual-picker";
import { findActiveAtlasMap, listAtlasStagePins } from "@/lib/atlas/selectors";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import {
  filterLibraryItems,
  filterLibraryItemsByStatus,
  sliceLibraryItems,
  sortLibraryItems
} from "@/lib/library/query";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import { useAtlasStore } from "@/stores/atlas-store";
import {
  selectLibraryFlags,
  useLibraryOrganizationStore
} from "@/stores/library-organization-store";
import type { PrivateEventKind } from "@/types/immersive-event";
import type { LibrarySortMode, LibraryStatusFilter } from "@/types/library";
import type {
  SessionParticipantRecord,
  SessionViewerIdentity
} from "@/types/session";

interface AtlasPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
}

export function AtlasPanel({
  sessionCode,
  viewer,
  participants
}: AtlasPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const atlasMaps = useAtlasStore((state) => state.atlasMaps);
  const atlasPins = useAtlasStore((state) => state.atlasPins);
  const setAtlasMaps = useAtlasStore((state) => state.setAtlasMaps);
  const upsertAtlasMap = useAtlasStore((state) => state.upsertAtlasMap);
  const removeAtlasMap = useAtlasStore((state) => state.removeAtlasMap);
  const [atlasName, setAtlasName] = useState("");
  const [atlasAssetId, setAtlasAssetId] = useState("");
  const [targetParticipantId, setTargetParticipantId] = useState("");
  const [eventKind, setEventKind] = useState<PrivateEventKind>("secret");
  const [eventTitle, setEventTitle] = useState("");
  const [eventBody, setEventBody] = useState("");
  const [eventImageAssetId, setEventImageAssetId] = useState("");
  const [eventIntensity, setEventIntensity] = useState("3");
  const [eventDurationMs, setEventDurationMs] = useState("5000");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LibraryStatusFilter>("all");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("name");
  const [visibleCount, setVisibleCount] = useState(8);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [expandedAtlasId, setExpandedAtlasId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [editingAtlasId, setEditingAtlasId] = useState<string | null>(null);
  const [draftAtlasName, setDraftAtlasName] = useState("");
  const [draftAtlasAssetId, setDraftAtlasAssetId] = useState("");
  const [isEditAtlasAssetPickerOpen, setIsEditAtlasAssetPickerOpen] = useState(false);
  const [isAtlasAssetPickerOpen, setIsAtlasAssetPickerOpen] = useState(false);
  const [isEventImagePickerOpen, setIsEventImagePickerOpen] = useState(false);

  const activeAtlasMap = useMemo(() => findActiveAtlasMap(atlasMaps), [atlasMaps]);
  const mapAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "map"),
    [assets]
  );
  const currentAtlasPins = useMemo(
    () =>
      activeAtlasMap ? listAtlasStagePins(activeAtlasMap.id, atlasPins, assets) : [],
    [activeAtlasMap, assets, atlasPins]
  );
  const playerParticipants = useMemo(
    () => participants.filter((participant) => participant.role === "player"),
    [participants]
  );
  const atlasLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "atlas")
  );
  const toggleLibraryFlag = useLibraryOrganizationStore((state) => state.toggleFlag);
  const setLibraryFlag = useLibraryOrganizationStore((state) => state.setFlag);
  const touchLibraryItem = useLibraryOrganizationStore((state) => state.touchItem);
  const filteredAtlasMaps = useMemo(() => {
    const searchedAtlasMaps = filterLibraryItems(
      atlasMaps,
      deferredSearchQuery,
      (atlasMap) => atlasMap.name
    );
    const scopedAtlasMaps = filterLibraryItemsByStatus(
      searchedAtlasMaps,
      statusFilter,
      (atlasMap) => atlasLibraryFlags[atlasMap.id]
    );

    return sortLibraryItems(scopedAtlasMaps, {
      sortMode,
      getLabel: (atlasMap) => atlasMap.name,
      getFlags: (atlasMap) => atlasLibraryFlags[atlasMap.id]
    });
  }, [atlasLibraryFlags, atlasMaps, deferredSearchQuery, sortMode, statusFilter]);
  const displayedAtlasMaps = sliceLibraryItems(filteredAtlasMaps, visibleCount);
  const canManage = viewer?.role === "gm";

  const runAsync = (key: string, task: () => Promise<void>) => {
    setPendingKey(key);
    setFeedback(null);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingKey(null);
      }
    });
  };

  const handleCreateAtlas = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode criar atlas.");
      return;
    }

    if (!atlasName.trim()) {
      setFeedback("Informe o nome do atlas.");
      return;
    }

    runAsync("create-atlas", async () => {
      const result = await createAtlasMapAction({
        sessionCode,
        name: atlasName.trim(),
        assetId: atlasAssetId || null
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao criar o atlas.");
        return;
      }

      if (result.atlasMap.isActive) {
        setAtlasMaps(
          [...atlasMaps, result.atlasMap].map((atlasMap) =>
            atlasMap.id === result.atlasMap?.id
              ? result.atlasMap
              : { ...atlasMap, isActive: false }
          )
        );
      } else {
        upsertAtlasMap(result.atlasMap);
      }

      setAtlasName("");
      setAtlasAssetId("");
      setLibraryFlag(sessionCode, "atlas", result.atlasMap.id, "prepared", true);
      touchLibraryItem(sessionCode, "atlas", result.atlasMap.id);
      setFeedback("Atlas criado. Agora edite os pins diretamente no palco.");
    });
  };

  const handleActivateAtlas = (atlasMapId: string) => {
    runAsync(`activate-atlas:${atlasMapId}`, async () => {
      const result = await activateAtlasMapAction({
        sessionCode,
        atlasMapId
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao ativar o atlas.");
        return;
      }

      setAtlasMaps(
        atlasMaps.map((atlasMap) =>
          atlasMap.id === result.atlasMap?.id
            ? result.atlasMap
            : { ...atlasMap, isActive: false }
        )
      );
      setLibraryFlag(sessionCode, "atlas", atlasMapId, "usedToday", true);
      touchLibraryItem(sessionCode, "atlas", atlasMapId);
    });
  };

  const handleDeleteAtlas = (atlasMapId: string) => {
    runAsync(`delete-atlas:${atlasMapId}`, async () => {
      const result = await deleteAtlasMapAction({
        sessionCode,
        atlasMapId
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao remover o atlas.");
        return;
      }

      removeAtlasMap(result.atlasMap.id);
    });
  };

  const handleUpdateAtlas = (atlasMapId: string) => {
    runAsync(`update-atlas:${atlasMapId}`, async () => {
      const result = await updateAtlasMapAction({
        sessionCode,
        atlasMapId,
        name: draftAtlasName.trim(),
        assetId: draftAtlasAssetId || null
      });

      if (!result.ok || !result.atlasMap) {
        setFeedback(result.message || "Falha ao atualizar o atlas.");
        return;
      }

      upsertAtlasMap(result.atlasMap);
      setEditingAtlasId(null);
      setFeedback("Atlas atualizado.");
    });
  };

  const handleSendEvent = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode enviar alertas privados.");
      return;
    }

    if (!targetParticipantId) {
      setFeedback("Escolha o jogador alvo.");
      return;
    }

    runAsync("send-event", async () => {
      const result = await sendPrivateEventAction({
        sessionCode,
        targetParticipantId,
        kind: eventKind,
        title: eventTitle.trim(),
        body: eventBody.trim(),
        imageAssetId: eventImageAssetId || null,
        intensity: Number(eventIntensity) || 3,
        durationMs: Number(eventDurationMs) || 5000
      });

      if (!result.ok) {
        setFeedback(result.message || "Falha ao enviar o alerta privado.");
        return;
      }

      setEventTitle("");
      setEventBody("");
      setEventImageAssetId("");
      setEventIntensity("3");
      setEventDurationMs("5000");
      setFeedback("Alerta privado enviado.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="section-label">Atlas</p>
          <p className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">{atlasMaps.length}</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">mapas macro</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Atlas ativo</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">
            {activeAtlasMap?.name ?? "nenhum"}
          </p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            {currentAtlasPins.length} pins ativos
          </p>
        </div>
        <div className="stat-card">
          <p className="section-label">Fluxo</p>
          <p className="mt-2 text-lg font-semibold text-[color:var(--text-primary)]">editar no palco</p>
          <p className="mt-1 text-xs text-[color:var(--text-muted)]">
            clique no atlas para criar e arraste para mover
          </p>
        </div>
      </div>

      {canManage && (
        <>
          <section className="rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-[color:var(--gold)]" />
              <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Novo atlas</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              Crie o mapa macro aqui. Depois, toda a edicao de pins acontece direto no palco do atlas.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <input
                value={atlasName}
                onChange={(event) => setAtlasName(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                placeholder="Atlas de Kamamura"
              />
              <button
                type="button"
                onClick={() => setIsAtlasAssetPickerOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer text-[color:var(--text-primary)]"
              >
                <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                <span className={atlasAssetId ? "truncate" : "text-[color:var(--text-muted)]"}
                >
                  {atlasAssetId
                    ? (mapAssets.find((a) => a.id === atlasAssetId)?.label ?? "mapa-base")
                    : "sem mapa-base"}
                </span>
              </button>
              <AssetVisualPicker
                open={isAtlasAssetPickerOpen}
                onClose={() => setIsAtlasAssetPickerOpen(false)}
                onSelect={(id) => setAtlasAssetId(id)}
                assets={assets}
                filterKinds={["map"]}
                title="Selecionar Mapa-Base"
                cardAspect="landscape"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateAtlas}
              disabled={isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[color:var(--gold)]/28 bg-[color:var(--mist)] px-4 py-3 text-sm font-semibold text-[color:var(--gold)] transition hover:border-[color:var(--gold)]/45 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {pendingKey === "create-atlas" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              criar atlas
            </button>
          </section>

          <section className="rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4">
            <div className="flex items-center gap-2">
              <BellRing size={16} className="text-[color:var(--gold)]" />
              <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Alerta privado</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              Segredos, panico, sangue ou kegare enviados para apenas um jogador.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="flex flex-wrap gap-2">
                {playerParticipants.length === 0 ? (
                  <p className="text-xs text-[color:var(--ink-3)]">Nenhum jogador conectado.</p>
                ) : (
                  playerParticipants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => setTargetParticipantId(participant.id)}
                      className={cn(
                        "hud-chip transition cursor-pointer",
                        targetParticipantId === participant.id
                          ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]"
                          : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-secondary)] hover:border-[color:var(--gold)]/20"
                      )}
                    >
                      {participant.displayName}
                    </button>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  ["secret", "segredo"],
                  ["panic", "panico"],
                  ["kegare", "kegare"],
                  ["blood", "sangue"],
                  ["shake", "tremor"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setEventKind(value as PrivateEventKind)}
                    className={cn(
                      "hud-chip transition cursor-pointer",
                      eventKind === value
                        ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]"
                        : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-secondary)] hover:border-[color:var(--gold)]/20"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <input
                value={eventTitle}
                onChange={(event) => setEventTitle(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                placeholder="Voce ouviu algo..."
              />

              <button
                type="button"
                onClick={() => setIsEventImagePickerOpen(true)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer"
              >
                <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                <span className={eventImageAssetId ? "text-[color:var(--text-primary)] truncate" : "text-[color:var(--text-muted)]"}
                >
                  {eventImageAssetId
                    ? (assets.find((a) => a.id === eventImageAssetId)?.label ?? "imagem")
                    : "sem imagem"}
                </span>
              </button>
              <AssetVisualPicker
                open={isEventImagePickerOpen}
                onClose={() => setIsEventImagePickerOpen(false)}
                onSelect={(id) => setEventImageAssetId(id)}
                assets={assets}
                title="Selecionar Imagem do Alerta"
              />

              <input
                value={eventIntensity}
                onChange={(event) => setEventIntensity(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                placeholder="3"
                inputMode="numeric"
              />

              <input
                value={eventDurationMs}
                onChange={(event) => setEventDurationMs(event.target.value)}
                className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                placeholder="5000"
                inputMode="numeric"
              />
            </div>

            <textarea
              value={eventBody}
              onChange={(event) => setEventBody(event.target.value)}
              rows={3}
              className="mt-3 w-full rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 custom-scrollbar"
              placeholder="Descreva o que so esse jogador percebeu."
            />

            <button
              type="button"
              onClick={handleSendEvent}
              disabled={isPending}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[color:var(--gold)]/28 bg-[color:var(--mist)] px-4 py-3 text-sm font-semibold text-[color:var(--gold)] transition hover:border-[color:var(--gold)]/45 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
            >
              {pendingKey === "send-event" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <BellRing size={16} />
              )}
              enviar alerta
            </button>
          </section>
        </>
      )}

      {feedback && (
        <div className="rounded-[18px] border border-[color:var(--gold)]/18 bg-[color:var(--mist)] px-4 py-3 text-sm text-[color:var(--gold)]">
          {feedback}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex flex-col gap-4 rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4 md:flex-row md:items-center">
          <div className="flex-shrink-0">
            <p className="section-label px-1">Biblioteca de atlas</p>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setVisibleCount(8);
              }}
              className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
              placeholder="buscar atlas..."
            />
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <LibraryFilterPills value={statusFilter} onChange={setStatusFilter} />
              <LibrarySortSelect value={sortMode} onChange={setSortMode} />
            </div>
          </div>
        </div>

        {atlasMaps.length > 0 && filteredAtlasMaps.length === 0 && (
          <div className="rounded-[18px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-card)]/50 px-4 py-6 text-sm text-[color:var(--text-secondary)]">
            Nenhum atlas corresponde a essa busca.
          </div>
        )}

        {displayedAtlasMaps.map((atlasMap) => {
          const mapAsset =
            assets.find((asset) => asset.id === atlasMap.assetId) ?? null;
          const pins = listAtlasStagePins(atlasMap.id, atlasPins, assets);
          const isExpanded = expandedAtlasId === atlasMap.id;

          return (
            <article
              key={atlasMap.id}
              className={cn(
                "group relative overflow-hidden rounded-[24px] border transition-all duration-300",
                atlasMap.isActive
                  ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] shadow-[0_0_40px_rgba(var(--gold-rgb),0.1)]"
                  : "border-[var(--border-panel)] bg-[var(--bg-card)]/50 hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]"
              )}
            >
              {/* Background Art Layer */}
              <div className="absolute inset-0 z-0">
                {mapAsset?.secureUrl ? (
                  <>
                    <div 
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105" 
                      style={{ 
                        backgroundImage: `url(${mapAsset.secureUrl})`,
                        opacity: atlasMap.isActive ? 0.35 : 0.2
                      }} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--bg-panel)]/90 via-[color:var(--bg-panel)]/40 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--text-primary)]/5 to-transparent opacity-20" />
                )}
              </div>

              <div 
                className="relative z-10 p-4 cursor-pointer"
                onClick={() => setExpandedAtlasId((current) => current === atlasMap.id ? null : atlasMap.id)}
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-12 w-20 shrink-0 items-center justify-center rounded-2xl border overflow-hidden transition-all",
                        atlasMap.isActive 
                          ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)] shadow-[0_0_15px_rgba(var(--gold-rgb),0.2)]" 
                          : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)]"
                      )}>
                        {mapAsset?.secureUrl ? (
                          <img src={mapAsset.secureUrl} className="h-full w-full object-cover" alt="" />
                        ) : (
                          <MapIcon size={20} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-lg font-bold tracking-tight text-[color:var(--text-primary)]">{atlasMap.name}</p>
                          {atlasMap.isActive && (
                            <span className="flex h-5 items-center rounded-full bg-[color:var(--gold)] px-2 text-[9px] font-black uppercase tracking-widest text-[color:var(--bg-panel)]">
                              No Palco
                            </span>
                          )}
                        </div>
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                          <Compass size={11} className={cn(atlasMap.isActive ? "text-[color:var(--gold)]" : "text-[color:var(--text-muted)]")} />
                          <span className="truncate italic">Exploração de Atlas</span>
                        </p>
                        <p className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--text-muted)]">
                          {mapAsset?.label || "sem pintura base"} • {pins.length} marcações
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 sm:justify-start">
                    <div className="flex -space-x-2 overflow-hidden">
                      {pins.slice(0, 4).map((pin) => (
                        <div 
                          key={pin.pin.id}
                          className="h-8 w-8 rounded-full border-2 border-[var(--bg-panel)] ring-1 border-[var(--border-panel)]"
                        >
                          <img 
                            src={pin.imageAsset?.secureUrl} 
                            className="h-full w-full rounded-full object-cover" 
                            alt={pin.pin.title || "pin"}
                          />
                        </div>
                      ))}
                      {pins.length > 4 && (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--bg-panel)] bg-[var(--bg-input)] text-[9px] font-bold text-[color:var(--text-primary)] ring-1 border-[var(--border-panel)]">
                          +{pins.length - 4}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateAtlas(atlasMap.id);
                        }}
                        disabled={atlasMap.isActive || isPending}
                        className={cn(
                          "inline-flex h-10 items-center gap-2 rounded-xl border px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
                          atlasMap.isActive
                            ? "border-[color:var(--gold)]/20 bg-[color:var(--mist)] text-[color:var(--gold)]/40 cursor-default"
                            : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-primary)] hover:border-[color:var(--gold)]/50 hover:bg-[color:var(--mist)]"
                        )}
                      >
                        {pendingKey === `activate:${atlasMap.id}` ? (
                          <LoaderCircle size={14} className="animate-spin" />
                        ) : atlasMap.isActive ? (
                          "Ativo"
                        ) : (
                          <>
                            <Play size={12} fill="currentColor" />
                            Exibir
                          </>
                        )}
                      </button>

                      {canManage && (
                        <div className="flex gap-2">
                          {!atlasMap.isActive && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAtlas(atlasMap.id);
                              }}
                              disabled={isPending}
                              className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 disabled:opacity-50"
                              title="Arquivar Atlas"
                            >
                              {pendingKey === `delete-atlas:${atlasMap.id}` ? (
                                <LoaderCircle size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (editingAtlasId === atlasMap.id) {
                                setEditingAtlasId(null);
                              } else {
                                setDraftAtlasName(atlasMap.name);
                                setDraftAtlasAssetId(atlasMap.assetId ?? "");
                                setEditingAtlasId(atlasMap.id);
                                setExpandedAtlasId(atlasMap.id);
                              }
                            }}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl border transition-all",
                              editingAtlasId === atlasMap.id
                                ? "border-[color:var(--gold)]/40 bg-[color:var(--mist)] text-[color:var(--gold)]"
                                : "border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                            )}
                          >
                            <Settings2 size={16} />
                          </button>
                        </div>
                      )}

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-muted)] transition-all group-hover:border-[color:var(--gold)]/30 group-hover:text-[color:var(--gold)]">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div 
                    className="mt-5 space-y-5 rounded-[20px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-4 backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {editingAtlasId === atlasMap.id ? (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="block">
                            <span className="section-label text-[10px]">Nome do Atlas</span>
                            <input
                              value={draftAtlasName}
                              onChange={(e) => setDraftAtlasName(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--gold)]/40"
                            />
                          </label>
                          <label className="block">
                            <span className="section-label text-[10px]">Mapa Base</span>
                            <button
                              type="button"
                              onClick={() => setIsEditAtlasAssetPickerOpen(true)}
                              className="mt-1.5 flex w-full items-center gap-3 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-2 text-sm transition hover:border-[color:var(--gold)]/25 cursor-pointer"
                            >
                              <ImageIcon size={16} className="shrink-0 text-[color:var(--text-muted)]" />
                              <span className={draftAtlasAssetId ? "text-[color:var(--text-primary)] truncate" : "text-[color:var(--text-muted)]"}>
                                {draftAtlasAssetId
                                  ? (mapAssets.find((a) => a.id === draftAtlasAssetId)?.label ?? "mapa")
                                  : "sem mapa base"}
                              </span>
                            </button>
                          </label>
                          <AssetVisualPicker
                            open={isEditAtlasAssetPickerOpen}
                            onClose={() => setIsEditAtlasAssetPickerOpen(false)}
                            onSelect={(id) => setDraftAtlasAssetId(id)}
                            assets={assets}
                            filterKinds={["map"]}
                            title="Trocar Mapa Base"
                            cardAspect="landscape"
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[var(--border-panel)] mt-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateAtlas(atlasMap.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-[color:var(--mist)] border border-[color:var(--gold)]/30 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[color:var(--gold)] hover:bg-[color:var(--gold)]/20"
                            >
                              {pendingKey === `update-atlas:${atlasMap.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingAtlasId(null)}
                              className="inline-flex items-center gap-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-panel)] px-4 py-2 text-xs font-bold uppercase tracking-wider text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                            >
                              Cancelar
                            </button>
                          </div>

                          {!atlasMap.isActive && (
                            <button
                              type="button"
                              onClick={() => handleDeleteAtlas(atlasMap.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-xs font-bold uppercase tracking-wider text-rose-400 hover:bg-rose-500/20"
                            >
                              {pendingKey === `delete-atlas:${atlasMap.id}` ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              Apagar
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteAtlas(atlasMap.id)}
                          disabled={isPending}
                          className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Arquivar Atlas
                        </button>
                      </div>
                    )}
                    <div className="mt-3">
                      <LibraryFlagControls
                        flags={atlasLibraryFlags[atlasMap.id]}
                        canManage={canManage}
                        onToggle={(flag) =>
                          toggleLibraryFlag(sessionCode, "atlas", atlasMap.id, flag)
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {filteredAtlasMaps.length > displayedAtlasMaps.length && (
          <button
            type="button"
            onClick={() => setVisibleCount((current) => current + 8)}
            className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)]/50 px-4 py-3 text-sm font-semibold text-[color:var(--text-primary)] transition hover:border-[color:var(--gold)]/20"
          >
            carregar mais atlas
          </button>
        )}
      </section>
    </div>
  );
}

