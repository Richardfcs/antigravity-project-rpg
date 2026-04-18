"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";
import { useEffectLayerStore } from "@/stores/effect-layer-store";
import type { SessionEffectLayerRecord } from "@/types/immersive-event";

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
    default:
      return {};
  }
}

function buildPatternClass(preset: SessionEffectLayerRecord["preset"]) {
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
  return "";
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

      return effect.targetParticipantId === null || effect.targetParticipantId === viewerParticipantId;
    });

    if (allowPreview && previewEffect) {
      return [...sessionEffects, previewEffect];
    }

    return sessionEffects;
  }, [allowPreview, effects, previewEffect, viewerParticipantId]);

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
    </div>
  );
}
