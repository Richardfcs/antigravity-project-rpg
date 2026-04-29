"use client";

import { TacticalTimelinePanel } from "@/components/combat/tactical-timeline-panel";
import type { CombatResolutionRecord } from "@/types/combat";
import type { SessionViewerIdentity } from "@/types/session";

interface CombatLogPanelProps {
  log: CombatResolutionRecord[];
  sessionCode?: string;
  viewer?: SessionViewerIdentity | null;
  canManage?: boolean;
  onClose?: () => void;
  onUndo?: Parameters<typeof TacticalTimelinePanel>[0]["onUndo"];
}

export function CombatLogPanel({
  log,
  sessionCode = "",
  viewer = null,
  canManage,
  onClose,
  onUndo
}: CombatLogPanelProps) {
  return (
    <TacticalTimelinePanel
      sessionCode={sessionCode}
      viewer={viewer}
      combatLog={log}
      canManage={canManage}
      onClose={onClose}
      onUndo={onUndo}
    />
  );
}
