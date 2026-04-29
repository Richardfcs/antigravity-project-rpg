"use client";

import { TacticalTimelinePanel } from "@/components/combat/tactical-timeline-panel";
import type { SessionViewerIdentity } from "@/types/session";

interface ChatPanelProps {
  sessionCode: string;
  viewer: SessionViewerIdentity | null;
}

export function ChatPanel({ sessionCode, viewer }: ChatPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TacticalTimelinePanel sessionCode={sessionCode} viewer={viewer} />
    </div>
  );
}
