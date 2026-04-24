"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LoaderCircle, Save, ScrollText, Trash2 } from "lucide-react";

import {
  deleteSessionNoteAction,
  upsertSessionNoteAction
} from "@/app/actions/note-actions";
import { findActiveAtlasMap } from "@/lib/atlas/selectors";
import { findActiveMap } from "@/lib/maps/selectors";
import { findActiveScene } from "@/lib/scenes/selectors";
import { cn } from "@/lib/utils";
import { useAtlasStore } from "@/stores/atlas-store";
import { useMapStore } from "@/stores/map-store";
import { useSceneStore } from "@/stores/scene-store";
import { useSessionNoteStore } from "@/stores/session-note-store";
import type { SessionNoteKind } from "@/types/note";
import type { SessionShellSnapshot, SessionViewerIdentity } from "@/types/session";

interface NotesPanelProps {
  snapshot: SessionShellSnapshot;
  viewer: SessionViewerIdentity | null;
}

interface NoteContext {
  kind: SessionNoteKind;
  scopeKey: string;
  label: string;
  helper: string;
  titlePlaceholder: string;
  bodyPlaceholder: string;
  sceneId: string | null;
  mapId: string | null;
  atlasMapId: string | null;
}

function buildSceneScopeKey(sceneId: string) {
  return `scene:${sceneId}`;
}

function buildMapScopeKey(mapId: string) {
  return `map:${mapId}`;
}

function buildAtlasScopeKey(atlasMapId: string) {
  return `atlas:${atlasMapId}`;
}

function buildJournalScopeKey(participantId: string) {
  return `journal:${participantId}`;
}

function buildContext(
  snapshot: SessionShellSnapshot,
  viewer: SessionViewerIdentity,
  activeSceneName: string | null,
  activeMapName: string | null,
  activeAtlasName: string | null
): NoteContext | null {
  if (viewer.role !== "gm") {
    return {
      kind: "journal",
      scopeKey: buildJournalScopeKey(viewer.participantId),
      label: "Caderno pessoal",
      helper: "Guarde memorias, suspeitas e sinais do que voce viu durante a sessao.",
      titlePlaceholder: "titulo breve do registro",
      bodyPlaceholder: "Escreva aqui o que seu personagem quer lembrar ou investigar depois.",
      sceneId: null,
      mapId: null,
      atlasMapId: null
    };
  }

  if (snapshot.stageMode === "tactical" && snapshot.activeMapId) {
    return {
      kind: "map",
      scopeKey: buildMapScopeKey(snapshot.activeMapId),
      label: activeMapName ? `Campo ativo · ${activeMapName}` : "Campo ativo",
      helper: "Use esta nota para lembrar ritmo de combate, perigo imediato e gatilhos do encontro.",
      titlePlaceholder: "resumo do confronto",
      bodyPlaceholder: "Anote aqui riscos, objetivo do encontro, escalas ou sinais que quer soltar no combate.",
      sceneId: null,
      mapId: snapshot.activeMapId,
      atlasMapId: null
    };
  }

  if (snapshot.stageMode === "atlas" && snapshot.activeAtlasMapId) {
    return {
      kind: "atlas",
      scopeKey: buildAtlasScopeKey(snapshot.activeAtlasMapId),
      label: activeAtlasName ? `Local ativo · ${activeAtlasName}` : "Local ativo",
      helper: "Use esta nota para segredos, pistas futuras ou lembrancas do que ainda nao foi revelado no atlas.",
      titlePlaceholder: "segredo do local",
      bodyPlaceholder: "Anote aqui o que este lugar guarda, o que os jogadores talvez notem depois e o que ainda deve ficar oculto.",
      sceneId: null,
      mapId: null,
      atlasMapId: snapshot.activeAtlasMapId,
    };
  }

  if (snapshot.activeSceneId) {
    return {
      kind: "scene",
      scopeKey: buildSceneScopeKey(snapshot.activeSceneId),
      label: activeSceneName ? `Cena ativa · ${activeSceneName}` : "Cena ativa",
      helper: "Use esta nota para ritmo, revelacoes, tom emocional e o que cada presenca deve sugerir no palco.",
      titlePlaceholder: "batida da cena",
      bodyPlaceholder: "Anote aqui a intencao dramatica, a tensao e o que voce quer destacar no palco narrativo.",
      sceneId: snapshot.activeSceneId,
      mapId: null,
      atlasMapId: null
    };
  }

  return null;
}

export function NotesPanel({ snapshot, viewer }: NotesPanelProps) {
  const notes = useSessionNoteStore((state) => state.notes);
  const upsertLocalNote = useSessionNoteStore((state) => state.upsertNote);
  const removeLocalNote = useSessionNoteStore((state) => state.removeNote);
  const scenes = useSceneStore((state) => state.scenes);
  const maps = useMapStore((state) => state.maps);
  const atlasMaps = useAtlasStore((state) => state.atlasMaps);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"save" | "clear" | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeScene = findActiveScene(scenes, snapshot.activeSceneId);
  const activeMap = findActiveMap(maps, snapshot.activeMapId);
  const activeAtlasMap = findActiveAtlasMap(atlasMaps, snapshot.activeAtlasMapId);

  const context = useMemo(
    () =>
      viewer
        ? buildContext(
            snapshot,
            viewer,
            activeScene?.name ?? null,
            activeMap?.name ?? null,
            activeAtlasMap?.name ?? null
          )
        : null,
    [activeAtlasMap?.name, activeMap?.name, activeScene?.name, snapshot, viewer]
  );

  const currentNote = useMemo(() => {
    if (!viewer || !context) {
      return null;
    }

    return (
      notes.find(
        (note) =>
          note.authorParticipantId === viewer.participantId &&
          note.kind === context.kind &&
          note.scopeKey === context.scopeKey
      ) ?? null
    );
  }, [context, notes, viewer]);

  useEffect(() => {
    if (!context) {
      setTitle("");
      setBody("");
      return;
    }

    setTitle(currentNote?.title ?? "");
    setBody(currentNote?.body ?? "");
  }, [context, currentNote?.body, currentNote?.id, currentNote?.title, currentNote?.updatedAt]);

  const canEdit = Boolean(viewer && context);
  const titleCount = title.trim().length;
  const bodyCount = body.trim().length;

  const runAction = (action: "save" | "clear", task: () => Promise<void>) => {
    setPendingAction(action);
    setFeedback(null);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleSave = () => {
    if (!viewer || !context) {
      return;
    }

    const nextTitle = title.trim();
    const nextBody = body.trim();

    if (!nextTitle && !nextBody) {
      if (currentNote) {
        handleClear();
      } else {
        setFeedback("Escreva um titulo ou um corpo antes de guardar a nota.");
      }

      return;
    }

    runAction("save", async () => {
      const result = await upsertSessionNoteAction({
        sessionCode: snapshot.code,
        kind: context.kind,
        scopeKey: context.scopeKey,
        title: nextTitle,
        body: nextBody,
        sceneId: context.sceneId,
        mapId: context.mapId,
        atlasMapId: context.atlasMapId
      });

      if (!result.ok || !result.note) {
        setFeedback(result.message ?? "Falha ao guardar a nota.");
        return;
      }

      upsertLocalNote(result.note);
      setFeedback(
        viewer.role === "gm"
          ? "Nota do mestre guardada para este momento da mesa."
          : "Seu caderno foi guardado."
      );
    });
  };

  const handleClear = () => {
    if (!viewer || !context) {
      return;
    }

    runAction("clear", async () => {
      const result = await deleteSessionNoteAction({
        sessionCode: snapshot.code,
        kind: context.kind,
        scopeKey: context.scopeKey
      });

      if (!result.ok) {
        setFeedback(result.message ?? "Falha ao limpar a nota.");
        return;
      }

      if (currentNote?.id) {
        removeLocalNote(currentNote.id);
      }

      setTitle("");
      setBody("");
      setFeedback(
        viewer.role === "gm"
          ? "Nota contextual limpa."
          : "Seu caderno foi esvaziado."
      );
    });
  };

  if (!viewer) {
    return (
      <section className="rounded-[22px] border border-white/10 bg-black/18 p-4 text-sm leading-6 text-[color:var(--ink-2)]">
        Entre na sessao para abrir as notas do palco ou o seu caderno.
      </section>
    );
  }

  if (!context) {
    return (
      <section className="rounded-[22px] border border-white/10 bg-black/18 p-4">
        <div className="flex items-center gap-2 text-white">
          <ScrollText size={16} className="text-amber-100" />
          <h3 className="text-sm font-semibold">Notas da mesa</h3>
        </div>
        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-2)]">
          Abra uma cena, um campo tatico ou um local do atlas para anotar o tom deste momento.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-[28px] border border-white/10 bg-black/40 p-6 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/5 pb-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
              <ScrollText size={16} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">
              {viewer.role === "gm" ? "Memória do Mestre" : "Caderno do Jogador"}
            </p>
          </div>
          <h3 className="mt-3 break-words text-2xl font-bold tracking-tight text-white">
            {context.label}
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-white/40">
            {context.helper}
          </p>
        </div>
        <div className={cn(
          "rounded-full border px-4 py-1.5 text-[9px] font-black uppercase tracking-widest backdrop-blur-md transition-colors",
          currentNote 
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400" 
            : "border-amber-400/20 bg-amber-400/5 text-amber-400/60"
        )}>
          {currentNote ? "Sincronizado" : "Rascunho Local"}
        </div>
      </header>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-white/20">Título do Registro</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value.slice(0, 120))}
            placeholder={context.titlePlaceholder}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-bold text-white outline-none transition focus:border-amber-400/40 focus:bg-white/[0.05] placeholder:text-white/10"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-white/20">Corpo da Crônica</label>
            <span className="text-[9px] font-medium text-white/10">{bodyCount} / 12.000</span>
          </div>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value.slice(0, 12000))}
            placeholder={context.bodyPlaceholder}
            className="min-h-[300px] w-full resize-y rounded-[24px] border border-white/10 bg-white/[0.02] px-6 py-6 text-base leading-relaxed text-white/80 outline-none transition focus:border-amber-400/40 focus:bg-white/[0.04] placeholder:text-white/10 custom-scrollbar"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClear}
            disabled={!canEdit || isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
              !canEdit || isPending
                ? "cursor-not-allowed border-white/5 bg-white/2 text-white/10"
                : "border-rose-400/10 bg-rose-400/5 text-rose-400/40 hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-400"
            )}
          >
            {pendingAction === "clear" ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Limpar Registro
          </button>
        </div>
        
        <button
          type="button"
          onClick={handleSave}
          disabled={!canEdit || isPending}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all",
            !canEdit || isPending
              ? "cursor-not-allowed border-amber-400/10 bg-amber-400/5 text-amber-400/20"
              : "border-amber-400/30 bg-amber-400/10 text-amber-400 hover:border-amber-400/50 hover:bg-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.1)]"
          )}
        >
          {pendingAction === "save" ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
          Guardar no Destino
        </button>
      </div>

      {feedback && (
        <div className="animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-4 text-xs font-medium text-amber-200/80">
          {feedback}
        </div>
      )}
    </section>
  );
}
