"use client";

import { useMemo, useState, useTransition } from "react";
import { Eye, LoaderCircle, Sparkles, Trash2, Waves } from "lucide-react";

import {
  createEffectLayerAction,
  deleteEffectLayerAction
} from "@/app/actions/effect-actions";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import type {
  SessionEffectLayerRecord,
  SessionEffectPreset
} from "@/types/immersive-event";
import type {
  SessionParticipantRecord,
  SessionViewerIdentity
} from "@/types/session";

interface EffectsPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
  participants: SessionParticipantRecord[];
}

const presetGroups: Array<{
  label: string;
  options: Array<{ value: SessionEffectPreset; label: string }>;
}> = [
  {
    label: "ambiente e clima",
    options: [
      { value: "sunny", label: "ensolarado" },
      { value: "night", label: "noite escura" },
      { value: "city-night", label: "noite na cidade" },
      { value: "rain", label: "chuva" },
      { value: "storm", label: "tempestade" },
      { value: "snow", label: "neve" },
      { value: "sakura", label: "cerejeiras" },
      { value: "sand", label: "areia" },
      { value: "kegare-medium", label: "kegare medio da regiao" },
      { value: "kegare-max", label: "kegare maximo da regiao" }
    ]
  },
  {
    label: "estado individual",
    options: [
      { value: "injured-light", label: "ferimento leve" },
      { value: "injured-heavy", label: "ferimento grave" },
      { value: "downed", label: "caido / 0 PV" },
      { value: "tainted-low", label: "kegare baixo" },
      { value: "tainted-high", label: "kegare alto" },
      { value: "tainted-max", label: "kegare maximo" },
      { value: "calm", label: "calmo / tranquilo" },
      { value: "joy", label: "feliz" },
      { value: "sad", label: "triste / melancolico" },
      { value: "silhouette", label: "silhueta misteriosa" }
    ]
  },
  {
    label: "horror e percepcao",
    options: [
      { value: "whisper-fog", label: "nevoa de sussurros" },
      { value: "omen-red", label: "pressagio vermelho" },
      { value: "void-pressure", label: "pressao do vazio" },
      { value: "fever-dream", label: "febre e sonho" },
      { value: "revelation", label: "revelacao ritual" },
      { value: "dread", label: "temor profundo" }
    ]
  }
];

function effectLabel(preset: SessionEffectPreset) {
  for (const group of presetGroups) {
    const option = group.options.find((item) => item.value === preset);

    if (option) {
      return option.label;
    }
  }

  return preset;
}

function isStillVisible(effect: SessionEffectLayerRecord) {
  if (!effect.expiresAt) {
    return true;
  }

  return new Date(effect.expiresAt).getTime() > Date.now();
}

export function EffectsPanel({
  sessionCode,
  viewer,
  participants
}: EffectsPanelProps) {
  const effects = useEffectLayerStore((state) => state.effects);
  const previewEffect = useEffectLayerStore((state) => state.previewEffect);
  const setPreviewEffect = useEffectLayerStore((state) => state.setPreviewEffect);
  const upsertEffect = useEffectLayerStore((state) => state.upsertEffect);
  const removeEffect = useEffectLayerStore((state) => state.removeEffect);
  const [targetParticipantId, setTargetParticipantId] = useState("");
  const [preset, setPreset] = useState<SessionEffectPreset>("sunny");
  const [intensity, setIntensity] = useState("3");
  const [durationMs, setDurationMs] = useState("");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = viewer?.role === "gm";
  const activeEffects = useMemo(
    () => effects.filter(isStillVisible),
    [effects]
  );

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

  const handlePreview = () => {
    const now = new Date().toISOString();
    setPreviewEffect({
      id: "preview-effect",
      sessionId: "preview",
      targetParticipantId: targetParticipantId || null,
      sourceParticipantId: viewer?.participantId ?? null,
      preset,
      note,
      intensity: Number(intensity) || 3,
      durationMs: durationMs ? Number(durationMs) : null,
      expiresAt: null,
      createdAt: now
    });
    setFeedback("Preview aplicado apenas neste navegador.");
  };

  const handleApply = () => {
    if (!canManage) {
      setFeedback("Apenas o mestre pode aplicar efeitos.");
      return;
    }

    runAsync("create-effect", async () => {
      const result = await createEffectLayerAction({
        sessionCode,
        targetParticipantId: targetParticipantId || null,
        preset,
        note,
        intensity: Number(intensity) || 3,
        durationMs: durationMs ? Number(durationMs) : null
      });

      if (!result.ok || !result.effect) {
        setFeedback(result.message || "Falha ao aplicar o efeito.");
        return;
      }

      upsertEffect(result.effect);
      setFeedback("Efeito aplicado e sincronizado.");
    });
  };

  const handleRemove = (effectId: string) => {
    runAsync(`delete-effect:${effectId}`, async () => {
      const result = await deleteEffectLayerAction({
        sessionCode,
        effectId
      });

      if (!result.ok || !result.effect) {
        setFeedback(result.message || "Falha ao remover o efeito.");
        return;
      }

      removeEffect(result.effect.id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="stat-card">
          <p className="section-label">Camadas ativas</p>
          <p className="mt-2 text-2xl font-semibold text-white">{activeEffects.length}</p>
        </div>
        <div className="stat-card">
          <p className="section-label">Escopo</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {targetParticipantId ? "alvo individual" : "todos na mesa"}
          </p>
        </div>
        <div className="stat-card">
          <p className="section-label">Preview local</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {previewEffect ? effectLabel(previewEffect.preset) : "desligado"}
          </p>
        </div>
      </div>

      <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
        <div className="flex items-center gap-2">
          <Waves size={16} className="text-amber-100" />
          <h3 className="text-sm font-semibold text-white">Efeitos imersivos</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-[color:var(--ink-2)]">
          Aplique clima, atmosfera, estados emocionais ou pressagios subjetivos para todos ou para um alvo especifico.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <select
            value={targetParticipantId}
            onChange={(event) => setTargetParticipantId(event.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
          >
            <option value="">todos da mesa</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.role === "gm" ? `mestre · ${participant.displayName}` : participant.displayName}
              </option>
            ))}
          </select>

          <select
            value={preset}
            onChange={(event) => setPreset(event.target.value as SessionEffectPreset)}
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
          >
            {presetGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <label className="block">
            <span className="section-label">Intensidade</span>
            <input
              value={intensity}
              onChange={(event) => setIntensity(event.target.value)}
              inputMode="numeric"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="3"
            />
          </label>

          <label className="block">
            <span className="section-label">Duracao (ms, opcional)</span>
            <input
              value={durationMs}
              onChange={(event) => setDurationMs(event.target.value)}
              inputMode="numeric"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
              placeholder="vazio = permanente"
            />
          </label>
        </div>

        <label className="mt-3 block">
          <span className="section-label">Observacao curta</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="mt-2 w-full rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/35"
            placeholder="chuva fina e luz fria, ferimento leve, presenca estranha..."
          />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            <Eye size={16} />
            ver preview
          </button>

          <button
            type="button"
            onClick={() => setPreviewEffect(null)}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/[0.05] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20"
          >
            <Trash2 size={16} />
            limpar preview
          </button>

          <button
            type="button"
            onClick={handleApply}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:opacity-60"
          >
            {pendingKey === "create-effect" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            aplicar efeito
          </button>
        </div>
      </section>

      <section className="rounded-[20px] border border-white/10 bg-black/18 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Camadas ativas</h3>
            <p className="mt-1 text-xs text-[color:var(--ink-2)]">
              Remova ou revise rapidamente os efeitos que estao vivos na sessao.
            </p>
          </div>
          <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
            {activeEffects.length} ativos
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {activeEffects.length === 0 && (
            <div className="rounded-[18px] border border-dashed border-white/12 bg-white/[0.03] px-4 py-4 text-sm text-[color:var(--ink-2)]">
              Nenhum efeito persistente ativo neste momento.
            </div>
          )}

          {activeEffects.map((effect) => {
            const target = effect.targetParticipantId
              ? participants.find((participant) => participant.id === effect.targetParticipantId)
              : null;

            return (
              <article
                key={effect.id}
                className="rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {effectLabel(effect.preset)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                      {target ? `alvo ${target.displayName}` : "todos da mesa"} · intensidade {effect.intensity}
                      {effect.durationMs ? ` · ${Math.round(effect.durationMs / 1000)}s` : " · persistente"}
                    </p>
                    {effect.note && (
                      <p className="mt-2 text-sm text-[color:var(--ink-2)]">{effect.note}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(effect.id)}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/35 disabled:opacity-60"
                  >
                    {pendingKey === `delete-effect:${effect.id}` ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                    remover
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {feedback && <p className="text-sm text-[color:var(--ink-2)]">{feedback}</p>}
    </div>
  );
}


