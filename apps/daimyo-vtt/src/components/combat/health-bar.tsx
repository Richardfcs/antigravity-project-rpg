"use client";

import { useMemo } from "react";
import "@/styles/combat-animations.css";

interface HealthBarProps {
  current: number;
  max: number;
  label?: string;
  variant?: "hp" | "fp";
  compact?: boolean;
  showThresholds?: boolean;
}

function getHpClass(ratio: number) {
  if (ratio > 0.7) return "combat-hp-full";
  if (ratio > 0.5) return "combat-hp-high";
  if (ratio > 0.3) return "combat-hp-medium";
  if (ratio > 0.15) return "combat-hp-low";
  return "combat-hp-critical";
}

export function HealthBar({
  current,
  max,
  label,
  variant = "hp",
  compact = false,
  showThresholds = false
}: HealthBarProps) {
  const ratio = useMemo(() => Math.max(0, Math.min(1, current / Math.max(1, max))), [current, max]);
  const barClass = variant === "fp" ? "combat-fp-bar" : getHpClass(ratio);
  const height = compact ? "4px" : "8px";

  const thresholds = useMemo(() => {
    if (!showThresholds || variant !== "hp" || max <= 0) return [];
    return [
      { pos: 0, label: "0" },
      ...[1, 2, 3, 4, 5].map((m) => ({
        pos: (m * max) / (6 * max),
        label: `-${m}×`
      }))
    ];
  }, [showThresholds, variant, max]);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: compact ? "1px" : "2px" }}>
      {label && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: compact ? "9px" : "10px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.04em",
          textTransform: "uppercase"
        }}>
          <span>{label}</span>
          <span style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {current}/{max}
          </span>
        </div>
      )}
      <div style={{
        width: "100%",
        height,
        backgroundColor: "var(--mist)",
        borderRadius: "4px",
        overflow: "hidden",
        position: "relative"
      }}>
        <div
          className={barClass}
          style={{
            width: `${ratio * 100}%`,
            height: "100%",
            borderRadius: "4px",
            transition: "width 0.5s ease-out"
          }}
        />
        {showThresholds && thresholds.map((t, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${(1 - t.pos) * 100}%`,
              top: 0,
              bottom: 0,
              width: "1px",
              backgroundColor: "var(--border-panel)"
            }}
            title={t.label}
          />
        ))}
      </div>
    </div>
  );
}
