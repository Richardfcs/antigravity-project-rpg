import { AudioLines, Dices, ScrollText } from "lucide-react";

import { CompactPanelHeader } from "@/components/layout/compact-panel-header";
import { AudioPanel } from "@/components/panels/audio-panel";
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
  const resolvedActiveTab = !showAudio && activeTab === "audio" 
    ? (tabs.find(t => t.id !== "audio")?.id ?? "dice")
    : (activeTab === "chat" ? "dice" : activeTab);

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
                    "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
                    activeTab === tab.id
                      ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]"
                      : "border-[var(--border-panel)] bg-[var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[var(--border-panel)]/40"
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
        <div className="flex flex-wrap gap-2 p-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition",
                activeTab === tab.id
                  ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--gold)]"
                  : "border-[var(--border-panel)] bg-[var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[var(--border-panel)]/40"
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
            ? "scrollbar-thin mt-2 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
            : "scrollbar-thin mt-2.5 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pr-1"
        }
      >
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
