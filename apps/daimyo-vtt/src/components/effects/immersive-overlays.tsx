"use client";

import { useEffect, useRef, useTransition } from "react";
import { BellRing, Eye, Ghost, TriangleAlert } from "lucide-react";

import { consumePrivateEventAction } from "@/app/actions/private-event-actions";
import { useAssetStore } from "@/stores/asset-store";
import { useImmersiveEventStore } from "@/stores/immersive-event-store";

interface ImmersiveOverlaysProps {
  sessionCode: string;
}

const iconByKind = {
  panic: TriangleAlert,
  kegare: Ghost,
  secret: Eye,
  blood: BellRing,
  shake: TriangleAlert,
  combat: BellRing
} as const;

export function ImmersiveOverlays({ sessionCode }: ImmersiveOverlaysProps) {
  const assets = useAssetStore((state) => state.assets);
  const events = useImmersiveEventStore((state) => state.events);
  const removeEvent = useImmersiveEventStore((state) => state.removeEvent);
  const consumingRef = useRef<string | null>(null);
  const [, startTransition] = useTransition();

  const activeEvent = events.find((event) => event.kind !== "combat") ?? null;
  const imageAsset = activeEvent?.imageAssetId
    ? assets.find((asset) => asset.id === activeEvent.imageAssetId) ?? null
    : null;

  useEffect(() => {
    if (!activeEvent) {
      consumingRef.current = null;
      return;
    }

    if (consumingRef.current === activeEvent.id) {
      return;
    }

    const timeout = window.setTimeout(() => {
      consumingRef.current = activeEvent.id;
      startTransition(async () => {
        const result = await consumePrivateEventAction({
          sessionCode,
          eventId: activeEvent.id
        });

        if (result.ok) {
          removeEvent(activeEvent.id);
        }

        consumingRef.current = null;
      });
    }, activeEvent.durationMs);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeEvent, removeEvent, sessionCode, startTransition]);

  if (!activeEvent) {
    return null;
  }

  const Icon = iconByKind[activeEvent.kind];
  const intensityOpacity = 0.12 + activeEvent.intensity * 0.08;
  const isShake = activeEvent.kind === "shake" || activeEvent.kind === "panic";
  const isBlood = activeEvent.kind === "blood";
  const isKegare = activeEvent.kind === "kegare";
  const isSecret = activeEvent.kind === "secret";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: isKegare
          ? `radial-gradient(circle at center, rgba(10,12,20,0.05), rgba(3,5,10,${Math.min(0.85, intensityOpacity + 0.32)}))`
          : `rgba(4, 6, 12, ${Math.min(0.78, intensityOpacity)})`
      }}
    >
      {isBlood && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: `inset 0 0 140px rgba(190, 24, 93, ${Math.min(0.8, intensityOpacity + 0.2)})`
          }}
        />
      )}

      <div
        className="pointer-events-none absolute inset-0"
        style={isShake ? { animation: "daimyo-shake 420ms ease-in-out infinite" } : undefined}
      />

      <div
        className="pointer-events-auto relative mx-4 w-full max-w-xl rounded-[28px] border border-white/12 bg-[rgba(6,10,18,0.82)] p-5 shadow-[0_24px_80px_rgba(2,6,23,0.55)] backdrop-blur"
        style={isKegare ? { boxShadow: "0 0 100px rgba(52, 211, 153, 0.08)" } : undefined}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white">
            <Icon size={20} />
          </div>
          <div>
            <p className="section-label">evento privado</p>
            <h3 className="mt-1 text-2xl font-semibold text-white">{activeEvent.title}</h3>
          </div>
        </div>

        <p className="mt-4 text-sm leading-7 text-[color:var(--ink-2)]">
          {activeEvent.body}
        </p>

        {imageAsset?.secureUrl && (
          <div
            className="mt-4 h-56 rounded-[22px] border border-white/10 bg-center bg-cover"
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.15), rgba(2,6,23,0.5)), url(${imageAsset.secureUrl})`
            }}
          />
        )}

        {isSecret && (
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-[color:var(--ink-3)]">
            Apenas voce viu isso.
          </p>
        )}
      </div>
    </div>
  );
}
