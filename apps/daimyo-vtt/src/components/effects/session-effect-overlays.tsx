"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import type {
  SessionEffectLayerRecord,
  SessionEffectPreset
} from "@/types/immersive-event";

interface SessionEffectOverlaysProps {
  viewerParticipantId?: string | null;
  allowPreview?: boolean;
}

function isActive(effect: SessionEffectLayerRecord) {
  if (!effect.expiresAt) {
    return true;
  }

  return new Date(effect.expiresAt).getTime() > Date.now();
}

function buildTintStyle(effect: SessionEffectLayerRecord) {
  const opacity = 0.08 + effect.intensity * 0.04;

  switch (effect.preset) {
    case "sunny":
      return { background: `rgba(251, 191, 36, ${opacity})` };
    case "night":
      return { background: `rgba(15, 23, 42, ${opacity + 0.12})` };
    case "city-night":
      return {
        background: `radial-gradient(circle at 12% 18%, rgba(250, 204, 21, ${opacity * 0.7}), transparent 10%), radial-gradient(circle at 84% 24%, rgba(96, 165, 250, ${opacity * 0.65}), transparent 8%), rgba(10, 15, 32, ${opacity + 0.14})`
      };
    case "rain":
      return { background: `rgba(56, 189, 248, ${opacity * 0.75})` };
    case "storm":
      return { background: `rgba(30, 41, 59, ${opacity + 0.18})` };
    case "snow":
      return { background: `rgba(226, 232, 240, ${opacity * 0.55})` };
    case "sakura":
      return { background: `rgba(244, 114, 182, ${opacity * 0.55})` };
    case "sand":
      return { background: `rgba(245, 158, 11, ${opacity * 0.72})` };
    case "kegare-medium":
      return { background: `rgba(20, 83, 45, ${opacity + 0.08})` };
    case "kegare-max":
      return { background: `rgba(13, 18, 28, ${opacity + 0.24})` };
    case "injured-light":
      return { boxShadow: `inset 0 0 120px rgba(220, 38, 38, ${opacity + 0.08})` };
    case "injured-heavy":
      return { boxShadow: `inset 0 0 180px rgba(185, 28, 28, ${opacity + 0.18})` };
    case "downed":
      return {
        background: `rgba(24, 24, 27, ${opacity + 0.18})`,
        boxShadow: `inset 0 0 220px rgba(127, 29, 29, ${opacity + 0.24})`
      };
    case "tainted-low":
      return { background: `rgba(16, 185, 129, ${opacity * 0.42})` };
    case "tainted-high":
      return { background: `rgba(5, 150, 105, ${opacity * 0.66})` };
    case "tainted-max":
      return { background: `rgba(2, 44, 34, ${opacity + 0.2})` };
    case "calm":
      return { background: `rgba(34, 197, 94, ${opacity * 0.35})` };
    case "joy":
      return { background: `rgba(250, 204, 21, ${opacity * 0.5})` };
    case "sad":
      return { background: `rgba(37, 99, 235, ${opacity * 0.6})` };
    case "silhouette":
      return { background: `rgba(2, 6, 23, ${opacity * 0.45})` };
    case "whisper-fog":
      return { background: `rgba(196, 181, 253, ${opacity * 0.45})` };
    case "omen-red":
      return {
        background: `radial-gradient(circle at center, rgba(220, 38, 38, ${opacity * 0.32}), transparent 35%), rgba(15, 8, 10, ${opacity + 0.18})`
      };
    case "void-pressure":
      return {
        background: `rgba(3, 7, 18, ${opacity + 0.22})`,
        boxShadow: `inset 0 0 240px rgba(15, 23, 42, ${opacity + 0.14})`
      };
    case "fever-dream":
      return {
        background: `linear-gradient(135deg, rgba(251, 191, 36, ${opacity * 0.3}), rgba(244, 114, 182, ${opacity * 0.28}), rgba(96, 165, 250, ${opacity * 0.26}))`
      };
    case "revelation":
      return {
        background: `radial-gradient(circle at center, rgba(250, 204, 21, ${opacity * 0.42}), transparent 24%), rgba(124, 58, 237, ${opacity * 0.24})`
      };
    case "dread":
      return {
        background: `rgba(10, 10, 14, ${opacity + 0.24})`,
        boxShadow: `inset 0 0 260px rgba(88, 28, 135, ${opacity * 0.42})`
      };
    default:
      return {};
  }
}

function buildPatternClass(preset: SessionEffectPreset) {
  if (preset === "rain") {
    return "daimyo-rain";
  }

  if (preset === "storm") {
    return "daimyo-rain daimyo-lightning";
  }

  if (preset === "snow") {
    return "daimyo-snow";
  }

  if (preset === "sakura") {
    return "daimyo-sakura";
  }

  if (preset === "sand") {
    return "daimyo-sand";
  }

  if (preset === "silhouette") {
    return "daimyo-silhouette";
  }

  if (preset === "kegare-max" || preset === "tainted-max") {
    return "daimyo-kegare";
  }

  if (preset === "whisper-fog") {
    return "daimyo-whisper-fog";
  }

  if (preset === "omen-red") {
    return "daimyo-omen-red";
  }

  if (preset === "void-pressure") {
    return "daimyo-void-pressure";
  }

  if (preset === "fever-dream") {
    return "daimyo-fever-dream";
  }

  if (preset === "revelation") {
    return "daimyo-revelation";
  }

  if (preset === "dread") {
    return "daimyo-dread";
  }

  return "";
}

function buildCaptionTone(preset: SessionEffectPreset) {
  switch (preset) {
    case "whisper-fog":
      return "border-violet-200/20 bg-violet-200/10 text-violet-50";
    case "omen-red":
    case "injured-light":
    case "injured-heavy":
    case "downed":
    case "dread":
      return "border-rose-200/20 bg-rose-200/10 text-rose-50";
    case "revelation":
    case "sunny":
    case "joy":
      return "border-amber-200/20 bg-amber-200/10 text-amber-50";
    default:
      return "border-white/10 bg-black/28 text-white/90";
  }
}

export function SessionEffectOverlays({
  viewerParticipantId,
  allowPreview = false
}: SessionEffectOverlaysProps) {
  const effects = useEffectLayerStore((state) => state.effects);
  const previewEffect = useEffectLayerStore((state) => state.previewEffect);

  const visibleEffects = useMemo(() => {
    const sessionEffects = effects.filter((effect) => {
      if (!isActive(effect)) {
        return false;
      }

      return (
        effect.targetParticipantId === null ||
        effect.targetParticipantId === viewerParticipantId
      );
    });

    if (allowPreview && previewEffect) {
      return [...sessionEffects, previewEffect];
    }

    return sessionEffects;
  }, [allowPreview, effects, previewEffect, viewerParticipantId]);

  const captionEffects = useMemo(
    () => visibleEffects.filter((effect) => effect.note.trim().length > 0).slice(-2),
    [visibleEffects]
  );

  if (visibleEffects.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[78] overflow-hidden">
      {visibleEffects.map((effect) => (
        <div
          key={effect.id}
          className="absolute inset-0"
          style={buildTintStyle(effect)}
        >
          <div
            className={cn("absolute inset-0", buildPatternClass(effect.preset))}
            style={{ opacity: Math.min(0.95, 0.24 + effect.intensity * 0.12) }}
          />
        </div>
      ))}

      {captionEffects.length > 0 ? (
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-4">
          <div className="flex max-w-3xl flex-wrap justify-center gap-3">
            {captionEffects.map((effect) => (
              <div
                key={`caption:${effect.id}`}
                className={cn(
                  "max-w-[min(82vw,460px)] rounded-[18px] border px-4 py-3 text-center text-sm leading-6 shadow-[0_18px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl",
                  buildCaptionTone(effect.preset)
                )}
              >
                {effect.note}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
