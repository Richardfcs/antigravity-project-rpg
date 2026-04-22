import { AudioLines, Dices, MessageSquareText, ScrollText } from "lucide-react";

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
  showAudio = true
}: BottomDockProps) {
  const visibleTabs = showAudio ? tabs : tabs.filter((tab) => tab.id !== "audio");
  const resolvedActiveTab = !showAudio && activeTab === "audio" ? "chat" : activeTab;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)] p-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 pb-4">
        <div className="min-w-0">
          <p className="section-label">Painel de apoio</p>
          <h2 className="mt-2 break-words text-xl font-semibold text-white">
            Conversa, caderno e trilhas da mesa
          </h2>
        </div>
        <div className="flex min-w-0 flex-wrap gap-2">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition",
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
      </header>

      <div className="mt-4 min-h-0 flex-1 overflow-hidden">
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
