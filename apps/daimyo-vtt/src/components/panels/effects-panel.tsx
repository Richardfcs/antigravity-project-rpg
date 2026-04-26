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
import { cn } from "@/lib/utils";
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Camadas Ativas", value: activeEffects.length, icon: Waves, color: "text-[color:var(--gold)]" },
          { label: "Escopo Atual", value: targetParticipantId ? "Alvo Individual" : "Global", icon: Sparkles, color: "text-emerald-400" },
          { label: "Preview Local", value: previewEffect ? effectLabel(previewEffect.preset) : "Desligado", icon: Eye, color: "text-indigo-400" }
        ].map((stat, i) => (
          <div key={i} className="rounded-[22px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/30 p-5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-3">
              <stat.icon size={14} className={cn("opacity-60", stat.color)} />
              <p className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">{stat.label}</p>
            </div>
            <p className="text-xl font-bold text-[color:var(--text-primary)] truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-panel)] p-6 backdrop-blur-xl shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)]">
        <header className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
            <Waves size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-[color:var(--text-primary)]">Invocação Imersiva</h3>
            <p className="text-xs text-[color:var(--text-muted)]">Modele a atmosfera, o clima e a percepção dos jogadores.</p>
          </div>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Destinatário do Fenômeno</label>
            <select
              value={targetParticipantId}
              onChange={(event) => setTargetParticipantId(event.target.value)}
              className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 focus:bg-[var(--bg-card)]"
            >
              <option value="">Todos os presentes (Global)</option>
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.role === "gm" ? `Mestre · ${participant.displayName}` : participant.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Preset de Efeito</label>
            <select
              value={preset}
              onChange={(event) => setPreset(event.target.value as SessionEffectPreset)}
              className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 focus:bg-[var(--bg-card)]"
            >
              {presetGroups.map((group) => (
                <optgroup key={group.label} label={group.label.toUpperCase()} className="bg-[var(--bg-panel)] text-[10px] text-[color:var(--text-muted)]">
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value} className="text-sm text-[color:var(--text-primary)]">
                      {option.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Intensidade do Pulso</label>
            <input
              value={intensity}
              onChange={(event) => setIntensity(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
              placeholder="Ex: 3"
            />
          </div>

          <div className="space-y-1.5">
            <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Duração Vital (ms)</label>
            <input
              value={durationMs}
              onChange={(event) => setDurationMs(event.target.value)}
              inputMode="numeric"
              className="w-full rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-3 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35"
              placeholder="Vazio para Permanente"
            />
          </div>
        </div>

        <div className="mt-5 space-y-1.5">
          <label className="ml-1 text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Notas de Ambientação</label>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="w-full rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-input)] px-5 py-4 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--gold)]/35 focus:bg-[var(--bg-card)] placeholder:text-[color:var(--text-muted)] custom-scrollbar"
            placeholder="Descreva detalhes como ventos, temperatura ou sensações..."
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <div className="flex gap-2 mr-auto">
            <button
              type="button"
              onClick={handlePreview}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-primary)] transition hover:bg-[var(--bg-card)]/80"
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setPreviewEffect(null)}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border-panel)] bg-[var(--bg-card)]/40 h-10 w-10 text-[color:var(--text-muted)] transition hover:text-rose-400"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={handleApply}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--gold)]/30 bg-[color:var(--mist)] px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--gold)] transition hover:bg-[color:var(--gold)]/20 shadow-[0_0_20px_rgba(var(--gold-rgb),0.1)] disabled:opacity-50"
          >
            {pendingKey === "create-effect" ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            Consolidar Fenômeno
          </button>
        </div>

        {feedback && (
          <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 rounded-2xl border border-amber-400/20 bg-amber-400/5 px-5 py-4 text-xs font-medium text-amber-200/80">
            {feedback}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <Waves size={14} className="text-[color:var(--text-muted)]" />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Camadas Ativas na Realidade</h4>
          </div>
          <span className="text-[10px] font-bold text-[color:var(--text-muted)]/20">
            {activeEffects.length} {activeEffects.length === 1 ? "Efeito" : "Efeitos"}
          </span>
        </div>

        <div className="grid gap-3">
          {activeEffects.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-input)]/30 px-6 py-8 text-center">
              <p className="text-sm text-[color:var(--text-muted)] font-medium">A realidade segue sem interferências imersivas.</p>
            </div>
          )}

          {activeEffects.map((effect) => {
            const target = effect.targetParticipantId
              ? participants.find((p) => p.id === effect.targetParticipantId)
              : null;

            return (
              <article
                key={effect.id}
                className="group relative overflow-hidden rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-card)]/30 p-4 transition-all hover:border-[color:var(--gold)]/30 hover:bg-[var(--bg-card)]/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-bold text-[color:var(--text-primary)]">{effectLabel(effect.preset)}</h5>
                      <span className={cn(
                        "hud-chip border-[var(--border-panel)] bg-[var(--bg-panel)]/30 text-[9px]",
                        target ? "text-indigo-300" : "text-emerald-300"
                      )}>
                        {target ? target.displayName : "Global"}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-wider">
                      <span>Intensidade {effect.intensity}</span>
                      <span className="text-[color:var(--text-muted)]/20">•</span>
                      <span>{effect.durationMs ? `${Math.round(effect.durationMs / 1000)}s` : "Persistente"}</span>
                    </div>
                    {effect.note && (
                      <p className="mt-2 text-xs leading-relaxed text-[color:var(--text-secondary)] italic border-l border-[var(--border-panel)] pl-3">{effect.note}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemove(effect.id)}
                    disabled={isPending}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 opacity-40 transition-all hover:opacity-100 hover:bg-rose-500/20"
                  >
                    {pendingKey === `delete-effect:${effect.id}` ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}


