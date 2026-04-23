import { AudioLines, Dices, MessageSquareText, ScrollText } from "lucide-react";

import { CompactPanelHeader } from "@/components/layout/compact-panel-header";
import { AudioPanel } from "@/components/panels/audio-panel";
import { ChatPanel } from "@/components/panels/chat-panel";
import { DicePanel } from "@/components/panels/dice-panel";
import { NotesPanel } from "@/components/panels/notes-panel";
import { cn } from "@/lib/utils";
import type {
  DockTab,
  SessionShellSnapshot,
  SessionViewerIdentity
} from "@/types/session";

interface BottomDockProps {
  snapshot: SessionShellSnapshot;
  viewer: SessionViewerIdentity | null;
  activeTab: DockTab;
  onTabChange: (tab: DockTab) => void;
  showAudio?: boolean;
  embedded?: boolean;
}

const tabs = [
  { id: "chat" as const, label: "Conversa", icon: MessageSquareText },
  { id: "dice" as const, label: "Dados", icon: Dices },
  { id: "notes" as const, label: "Caderno", icon: ScrollText },
  { id: "audio" as const, label: "Trilhas", icon: AudioLines }
];

export function BottomDock({
  snapshot,
  viewer,
  activeTab,
  onTabChange,
  showAudio = true,
  embedded = false
}: BottomDockProps) {
  const visibleTabs = showAudio ? tabs : tabs.filter((tab) => tab.id !== "audio");
  const resolvedActiveTab = !showAudio && activeTab === "audio" ? "chat" : activeTab;

  return (
    <section className="flex h-full min-h-0 flex-col">
      {!embedded ? (
        <CompactPanelHeader
          label="Apoio"
          title="Conversa, dados e caderno"
          actions={
            <div className="flex min-w-0 flex-wrap gap-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] transition",
                    activeTab === tab.id
                      ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                      : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
                  )}
                >
                  <tab.icon size={14} />
                  {tab.label}
                </button>
              ))}
            </div>
          }
        />
      ) : (
        <div className="flex min-w-0 flex-wrap gap-2 border-b border-white/8 pb-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] transition",
                activeTab === tab.id
                  ? "border-amber-300/30 bg-amber-300/10 text-amber-100"
                  : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/20"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div
        className={
          embedded
            ? "scrollbar-thin mt-1.5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
            : "scrollbar-thin mt-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
        }
      >
        {resolvedActiveTab === "chat" && (
          <ChatPanel sessionCode={snapshot.code} viewer={viewer} />
        )}

        {resolvedActiveTab === "dice" && (
          <DicePanel sessionCode={snapshot.code} viewer={viewer} />
        )}

        {resolvedActiveTab === "notes" && (
          <NotesPanel snapshot={snapshot} viewer={viewer} />
        )}

        {showAudio && resolvedActiveTab === "audio" && (
          <AudioPanel sessionCode={snapshot.code} viewer={viewer} />
        )}
      </div>
    </section>
  );
}
