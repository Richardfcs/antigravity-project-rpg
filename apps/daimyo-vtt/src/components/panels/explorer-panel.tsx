import {
  BookOpen,
  Compass,
  FileText,
  Image as ImageIcon,
  Map,
  MessageSquare,
  Music,
  Settings,
  Sparkles,
  Users
} from "lucide-react";

import { CompactPanelHeader } from "@/components/layout/compact-panel-header";
import { cn } from "@/lib/utils";
import { ActorsPanel } from "@/components/panels/actors-panel";
import { AdminPanel } from "@/components/panels/admin-panel";
import { AudioPanel } from "@/components/panels/audio-panel";
import { AtlasPanel } from "@/components/panels/atlas-panel";
import { ChatPanel } from "@/components/panels/chat-panel";
import { CodexPanel } from "@/components/panels/codex-panel";
import { DicePanel } from "@/components/panels/dice-panel";
import { EffectsPanel } from "@/components/panels/effects-panel";
import { MapsPanel } from "@/components/panels/maps-panel";
import { NotesPanel } from "@/components/panels/notes-panel";
import { ScenesPanel } from "@/components/panels/scenes-panel";
import type { InfraReadiness } from "@/types/infra";
import type { OnlinePresence } from "@/types/presence";
import type {
  ExplorerSection,
  SessionParticipantRecord,
  SessionShellSnapshot,
  SessionViewerIdentity
} from "@/types/session";

interface ExplorerPanelProps {
  snapshot: SessionShellSnapshot;
  party: OnlinePresence[];
  participants: SessionParticipantRecord[];
  activeSection: ExplorerSection;
  onSectionChange?: (section: ExplorerSection) => void;
  viewer: SessionViewerIdentity | null;
  infra: InfraReadiness;
  embedded?: boolean;
}

const sectionMeta = {
  scenes: { title: "Cenas", icon: ImageIcon },
  maps: { title: "Campos", icon: Map },
  codex: { title: "Oficina", icon: BookOpen },
  notes: { title: "Notas", icon: FileText },
  actors: { title: "Fichas", icon: Users },
  atlas: { title: "Atlas", icon: Compass },
  effects: { title: "Efeitos", icon: Sparkles },
  admin: { title: "Dominio", icon: Settings },
  audio: { title: "Trilhas", icon: Music },
  chat: { title: "Conversa", icon: MessageSquare }
} as const;

export function ExplorerPanel({
  snapshot,
  party,
  participants,
  activeSection,
  onSectionChange,
  viewer,
  infra,
  embedded = false
}: ExplorerPanelProps) {
  const meta = sectionMeta[activeSection];

  return (
    <section className="flex h-full min-h-0 flex-col">
      {!embedded ? (
        <CompactPanelHeader
          label="Biblioteca"
          title={meta.title}
          actions={
            <span className="hud-chip border-white/10 bg-white/[0.04] text-[color:var(--ink-2)]">
              sala {snapshot.code}
            </span>
          }
        />
      ) : null}

      <div className={cn("overflow-x-auto custom-scrollbar pb-1", embedded ? "" : "mt-2")}>
        <div className="flex w-max gap-2 px-1">
          {Object.entries(sectionMeta).map(([key, value]) => {
            const Icon = value.icon;
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSectionChange?.(key as ExplorerSection)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition",
                  isActive
                    ? "border-amber-300/30 bg-amber-300/12 text-amber-100 shadow-[0_0_12px_rgba(252,211,77,0.1)]"
                    : "border-white/10 bg-white/[0.04] text-[color:var(--ink-2)] hover:border-white/20 hover:text-white"
                )}
              >
                <Icon size={14} className={isActive ? "text-amber-200" : ""} />
                {value.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scrollbar-thin mt-2.5 flex-1 space-y-2.5 overflow-y-auto pr-1">
        {activeSection === "scenes" && (
          <ScenesPanel sessionCode={snapshot.code} viewer={viewer} />
        )}

        {activeSection === "maps" && (
          <MapsPanel sessionCode={snapshot.code} viewer={viewer} />
        )}

        {activeSection === "codex" && (
          <CodexPanel
            sessionCode={snapshot.code}
            viewer={viewer}
            participants={participants}
          />
        )}

        {activeSection === "notes" && (
          <NotesPanel snapshot={snapshot} viewer={viewer} />
        )}

        {activeSection === "actors" && (
          <ActorsPanel
            sessionCode={snapshot.code}
            viewer={viewer}
            participants={participants}
            party={party}
            cloudinaryReady={infra.cloudinary}
          />
        )}

        {activeSection === "atlas" && (
          <AtlasPanel
            sessionCode={snapshot.code}
            viewer={viewer}
            participants={participants}
          />
        )}

        {activeSection === "effects" && (
          <EffectsPanel
            sessionCode={snapshot.code}
            viewer={viewer}
            participants={participants}
          />
        )}

        {activeSection === "admin" && (
          <AdminPanel sessionCode={snapshot.code} viewer={viewer} infra={infra} />
        )}

        {activeSection === "audio" && (
          <AudioPanel sessionCode={snapshot.code} viewer={viewer} />
        )}

        {activeSection === "chat" && (
          <div className="space-y-3">
            <ChatPanel sessionCode={snapshot.code} viewer={viewer} />
            <DicePanel sessionCode={snapshot.code} viewer={viewer} />
          </div>
        )}
      </div>
    </section>
  );
}
