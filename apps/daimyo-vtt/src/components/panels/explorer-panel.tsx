import { CompactPanelHeader } from "@/components/layout/compact-panel-header";
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
  scenes: {
    title: "Cenas"
  },
  maps: {
    title: "Campos"
  },
  codex: {
    title: "Oficina"
  },
  notes: {
    title: "Notas"
  },
  actors: {
    title: "Fichas"
  },
  atlas: {
    title: "Atlas"
  },
  effects: {
    title: "Efeitos"
  },
  admin: {
    title: "Dominio"
  },
  audio: {
    title: "Trilhas"
  },
  chat: {
    title: "Conversa"
  }
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

      <div className={embedded ? "" : "mt-1.5"}>
        <label className="block">
          <span className="sr-only">Seção da biblioteca</span>
          <select
            value={activeSection}
            onChange={(event) => onSectionChange?.(event.target.value as ExplorerSection)}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-amber-300/35"
          >
            {Object.entries(sectionMeta).map(([key, value]) => (
              <option key={key} value={key}>
                {value.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="scrollbar-thin mt-2 flex-1 space-y-2 overflow-y-auto pr-1">
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
          <div className="space-y-2">
            <ChatPanel sessionCode={snapshot.code} viewer={viewer} />
            <DicePanel sessionCode={snapshot.code} viewer={viewer} />
          </div>
        )}
      </div>
    </section>
  );
}
