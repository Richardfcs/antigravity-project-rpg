"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import {
  LoaderCircle,
  Save,
  Search,
  Trash2,
  UploadCloud,
  Image as ImageIcon,
  UserPlus,
  Tv
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/stores/session-store";

import {
  deleteAssetAction,
  registerUploadedAssetAction,
  updateAssetMetadataAction
} from "@/app/actions/asset-actions";
import { addAssetNpcToSceneAction } from "@/app/actions/scene-actions";
import { addAssetNpcToMapAction } from "@/app/actions/map-actions";
import {
  LibraryFilterPills,
  LibraryFlagControls,
  LibrarySortSelect
} from "@/components/panels/library-controls";
import {
  filterLibraryItemsByStatus,
  sortLibraryItems
} from "@/lib/library/query";
import { cn } from "@/lib/utils";
import { useAssetStore } from "@/stores/asset-store";
import {
  selectLibraryFlags,
  useLibraryOrganizationStore
} from "@/stores/library-organization-store";
import type { AssetKind, SessionAssetRecord } from "@/types/asset";
import type {
  LibrarySortMode,
  LibraryStatusFilter
} from "@/types/library";
import type { OnlinePresence } from "@/types/presence";
import type { SessionParticipantRecord, SessionViewerIdentity } from "@/types/session";

interface AssetsPanelProps {
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

function buildSessionTag(sessionCode: string) {
  return sessionCode.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function cloudinaryThumb(url: string | null | undefined, size = 256): string | undefined {
  if (!url) return undefined;
  if (!url.includes("res.cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${size},h_${size},q_auto,f_auto/`);
}

export function AssetsPanel({ sessionCode, viewer, participants, party, cloudinaryReady }: AssetsPanelProps) {
  const assets = useAssetStore((state) => state.assets);
  const upsertAsset = useAssetStore((state) => state.upsertAsset);
  const removeAsset = useAssetStore((state) => state.removeAsset);

  const [assetLabel, setAssetLabel] = useState("");
  const [assetKind, setAssetKind] = useState<AssetKind>("token");
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetFeedback, setAssetFeedback] = useState<string | null>(null);
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingAssetLabel, setEditingAssetLabel] = useState("");
  const [editingAssetKind, setEditingAssetKind] = useState<AssetKind>("token");
  const [assetSearchQuery, setAssetSearchQuery] = useState("");
  const [assetKindFilter, setAssetKindFilter] = useState<AssetKind | "all">("all");
  const [assetStatusFilter, setAssetStatusFilter] = useState<LibraryStatusFilter>("active");
  const [assetSortMode, setAssetSortMode] = useState<LibrarySortMode>("name");
  const [visibleAssetCount, setVisibleAssetCount] = useState(12);
  const [isAssetPending, startAssetTransition] = useTransition();
  const deferredAssetSearchQuery = useDeferredValue(assetSearchQuery);

  const router = useRouter();
  const snapshot = useSessionStore((state) => state.snapshot);

  const assetLibraryFlags = useLibraryOrganizationStore((state) =>
    selectLibraryFlags(state, sessionCode, "assets")
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
            sessionCode,
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

  const handleQuickAdd = (assetId: string, kind: AssetKind) => {
    if (!snapshot || !canManage) return;
    const isCharacterAsset = ["npc", "portrait", "token"].includes(kind);
    if (!isCharacterAsset) return;

    if (snapshot.stageMode === "theater") {
      if (!snapshot.activeSceneId) return;
      startAssetTransition(async () => {
        await addAssetNpcToSceneAction({
          sessionCode,
          sceneId: snapshot.activeSceneId!,
          assetId
        });
        router.refresh();
      });
    } else if (snapshot.stageMode === "tactical") {
      if (!snapshot.activeMapId) return;
      startAssetTransition(async () => {
        await addAssetNpcToMapAction({
          sessionCode,
          mapId: snapshot.activeMapId!,
          assetId,
          x: 0,
          y: 0
        });
        router.refresh();
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="stat-card group relative overflow-hidden p-5">
        <div className="absolute -right-4 -top-4 opacity-10 text-[color:var(--gold)]"><ImageIcon size={64} /></div>
        <p className="section-label">Galeria de Arte</p>
        <p className="mt-2 text-3xl font-black text-[color:var(--text-primary)]">{assets.length}</p>
      </div>

      {canManage && (
        <section className="rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
              <UploadCloud size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[color:var(--text-primary)]">Nova Arte ou Recurso</h3>
              <p className="text-[10px] font-medium uppercase tracking-widest text-[color:var(--text-muted)]">Sincronizar com Cloudinary</p>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)] ml-1">Rótulo do Recurso</label>
              <input 
                value={assetLabel} 
                onChange={(event) => setAssetLabel(event.target.value)} 
                className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35" 
                placeholder="Ex: Ronin sob a Chuva" 
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)] ml-1">Natureza</label>
                <select 
                  value={assetKind} 
                  onChange={(event) => setAssetKind(event.target.value as AssetKind)} 
                  className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
                >
                  {assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabel(kind)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)] ml-1">Arquivo Local</label>
                <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(event) => setAssetFile(event.target.files?.[0] ?? null)} 
                      className="block w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-xs text-[color:var(--text-muted)] file:mr-3 file:rounded-xl file:border-0 file:bg-[color:var(--mist)] file:px-3 file:py-1.5 file:text-[10px] file:font-black file:uppercase file:text-[color:var(--gold)]" 
                    />
                </div>
              </div>
            </div>
          </div>

            <button 
              type="button" 
              onClick={handleAssetSubmit} 
              disabled={isAssetPending || !cloudinaryReady} 
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[color:var(--gold)]/28 bg-[color:var(--mist)] py-4 text-xs font-black uppercase tracking-widest text-[color:var(--text-primary)] transition hover:border-[color:var(--gold)]/45 hover:bg-[color:var(--gold)]/20 disabled:cursor-not-allowed disabled:opacity-40 shadow-[0_0_20px_rgba(var(--gold-rgb),0.1)]"
            >
              {isAssetPending ? <LoaderCircle size={18} className="animate-spin" /> : <Save size={18} />} 
              Guardar Recurso na Nuvem
            </button>
            {assetFeedback && <p className="text-center text-[10px] font-bold uppercase tracking-wider text-[color:var(--gold)]">{assetFeedback}</p>}
        </section>
      )}

      <section className="rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">Arquivo da Mesa</h3>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-[color:var(--text-muted)]">Busque e organize artes, retratos e emblemas</p>
          </div>
          <span className="hud-chip border-[var(--border-panel)] bg-[var(--bg-card)] text-[color:var(--text-secondary)] font-bold">{assets.length} recursos</span>
        </div>
        
        <div className="mt-6 flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" />
              <input 
                value={assetSearchQuery} 
                onChange={(event) => { setAssetSearchQuery(event.target.value); setVisibleAssetCount(10); }} 
                className="w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] pl-10 pr-4 py-2.5 text-xs text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 placeholder:text-[color:var(--text-muted)]" 
                placeholder="Buscar retrato ou recurso..." 
              />
            </div>
            <select 
              value={assetKindFilter} 
              onChange={(event) => { setAssetKindFilter(event.target.value as AssetKind | "all"); setVisibleAssetCount(10); }} 
              className="w-full rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-2.5 text-xs text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
            >
              <option value="all">Todas as Naturezas</option>
              {assetKinds.map((kind) => <option key={kind} value={kind}>{assetKindLabel(kind)}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <LibrarySortSelect value={assetSortMode} onChange={setAssetSortMode} />
            </div>
          </div>
          <div className="flex items-center justify-start border-t border-[var(--border-panel)] pt-3">
            <LibraryFilterPills value={assetStatusFilter} onChange={setAssetStatusFilter} />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3">
          {filteredAssets.slice(0, visibleAssetCount).map((asset) => (
            <article 
              key={asset.id} 
              className="group relative flex flex-col overflow-hidden rounded-[18px] border border-[var(--border-panel)] bg-[var(--bg-card)] transition-all duration-300 hover:border-[color:var(--gold)]/20 hover:bg-[var(--bg-card)]/80"
            >
              <div className="relative aspect-square w-full overflow-hidden">
                <img 
                  src={cloudinaryThumb(asset.secureUrl)} 
                  alt={asset.label}
                  width={256}
                  height={256}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-panel)] via-transparent to-transparent opacity-80" />
                
                {/* Kind Badge */}
                <div className="absolute left-2 top-2">
                  <span className="rounded-md border border-[var(--border-panel)] bg-[var(--bg-panel)]/60 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-[color:var(--text-muted)] backdrop-blur-md">
                    {assetKindLabel(asset.kind).split(" ")[0]}
                  </span>
                </div>

                {/* Quick Add Controls */}
                {canManage && ["npc", "portrait", "token"].includes(asset.kind) && snapshot?.stageMode !== "atlas" && (
                  <div className="absolute left-2 bottom-2 z-20 flex gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(asset.id, asset.kind); }}
                      disabled={isAssetPending}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-widest backdrop-blur-md transition-all",
                        snapshot?.stageMode === "theater" 
                          ? "bg-rose-500/20 text-rose-100 hover:bg-rose-500/40" 
                          : "bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/40"
                      )}
                    >
                      {isAssetPending ? (
                        <LoaderCircle size={10} className="animate-spin" />
                      ) : (
                        <>
                          {snapshot?.stageMode === "theater" ? <Tv size={10} /> : <UserPlus size={10} />}
                          {snapshot?.stageMode === "theater" ? "Cena" : "Mapa"}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Flags Controls */}
                <div className="absolute right-2 top-2 z-20">
                  <LibraryFlagControls
                    flags={assetLibraryFlags[asset.id]}
                    canManage={canManage}
                    onToggle={(flag) => toggleLibraryFlag(sessionCode, "assets", asset.id, flag)}
                  />
                </div>
              </div>

              <div className="p-2.5">
                <p className="truncate text-[11px] font-bold tracking-tight text-[color:var(--text-primary)]/80">{asset.label}</p>
                
                {canManage && (
                  <div className="mt-2 flex gap-1.5">
                    <button
                      onClick={() => beginAssetEdit(asset)}
                      className="flex-1 rounded-lg border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 py-1.5 text-[9px] font-black uppercase tracking-tight text-[color:var(--text-muted)] transition hover:bg-[var(--bg-panel)]/60 hover:text-[color:var(--text-primary)]"
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
                <div className="absolute inset-0 z-30 bg-[var(--bg-panel)]/95 p-3 flex flex-col justify-center gap-2 backdrop-blur-sm">
                  <input
                    value={editingAssetLabel}
                    onChange={(event) => setEditingAssetLabel(event.target.value)}
                    className="w-full rounded-lg border border-[var(--border-panel)] bg-[var(--bg-input)] px-3 py-2 text-[10px] text-[color:var(--text-primary)] outline-none"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleAssetEditSave} className="flex-1 rounded-lg bg-[color:var(--mist)] py-2 text-[9px] font-black uppercase text-[color:var(--gold)]">OK</button>
                    <button onClick={() => setEditingAssetId(null)} className="px-2 rounded-lg bg-[var(--bg-card)] py-2 text-[9px] font-black uppercase text-[color:var(--text-muted)]">X</button>
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
            className="mt-8 w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-card)] py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)] transition hover:border-[color:var(--gold)]/20 hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-card)]/80 shadow-sm"
          >
            Explorar Galeria Completa
          </button>
        )}
      </section>
    </div>
  );
}
