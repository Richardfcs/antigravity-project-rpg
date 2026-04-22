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
    <section className="space-y-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(243,236,223,0.035),transparent),rgba(8,6,5,0.78)] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
        <div className="min-w-0">
          <p className="section-label">{viewer.role === "gm" ? "memoria do mestre" : "caderno do jogador"}</p>
          <h3 className="mt-2 break-words text-xl font-semibold text-white">
            {context.label}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[color:var(--ink-2)]">
            {context.helper}
          </p>
        </div>
        <div className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-100">
          {currentNote ? "guardado" : "rascunho"}
        </div>
      </header>

      <div className="rounded-[22px] border border-white/8 bg-black/16 p-4">
        <div className="space-y-4">
          <label className="block">
            <span className="section-label">titulo</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, 120))}
              placeholder={context.titlePlaceholder}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
            />
          </label>

          <label className="block">
            <span className="section-label">registro</span>
            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value.slice(0, 12000))}
              placeholder={context.bodyPlaceholder}
              className="mt-2 min-h-[220px] w-full rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] px-4 py-4 text-sm leading-7 text-white outline-none transition focus:border-amber-300/35"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[color:var(--ink-3)]">
          <span>{titleCount} / 120 no titulo</span>
          <span className="mx-2 opacity-40">|</span>
          <span>{bodyCount} / 12000 no corpo</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={!canEdit || isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
              !canEdit || isPending
                ? "cursor-not-allowed border-white/8 bg-white/[0.03] text-[color:var(--ink-3)]"
                : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
            )}
          >
            {pendingAction === "clear" ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />}
            limpar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canEdit || isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition",
              !canEdit || isPending
                ? "cursor-not-allowed border-amber-300/14 bg-amber-300/8 text-amber-100/60"
                : "border-amber-300/30 bg-amber-300/12 text-amber-100 hover:border-amber-300/45 hover:bg-amber-300/18"
            )}
          >
            {pendingAction === "save" ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />}
            guardar
          </button>
        </div>
      </div>

      {feedback ? (
        <div className="rounded-[18px] border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm text-amber-50">
          {feedback}
        </div>
      ) : null}
    </section>
  );
}
