import dynamic from "next/dynamic";
import {
  BookOpen,
  Compass,
  FileText,
  Image as ImageIcon,
  Map,
  MessageSquare,
  Music,
  Settings,
  Shield,
  Sparkles,
  Users,
  ScrollText
} from "lucide-react";

import { CompactPanelHeader } from "@/components/layout/compact-panel-header";
import { cn } from "@/lib/utils";

const LoadingPlaceholder = () => (
  <div className="flex h-32 w-full animate-pulse flex-col items-center justify-center gap-2 rounded-[28px] border border-[var(--border-panel)] bg-[var(--bg-input)]/50">
    <div className="h-4 w-4 rounded-full border-2 border-[color:var(--gold)]/20 border-t-[color:var(--gold)] animate-spin" />
    <span className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-muted)]">Carregando modulo...</span>
  </div>
);

const AssetsPanel = dynamic(() => import("./assets-panel").then((m) => m.AssetsPanel), { loading: LoadingPlaceholder });
const CharactersPanel = dynamic(() => import("./characters-panel").then((m) => m.CharactersPanel), { loading: LoadingPlaceholder });
const AdminPanel = dynamic(() => import("@/components/panels/admin-panel").then((m) => m.AdminPanel), { loading: LoadingPlaceholder });
const AudioPanel = dynamic(() => import("@/components/panels/audio-panel").then((m) => m.AudioPanel), { loading: LoadingPlaceholder });
const AtlasPanel = dynamic(() => import("@/components/panels/atlas-panel").then((m) => m.AtlasPanel), { loading: LoadingPlaceholder });
const ChatPanel = dynamic(() => import("@/components/panels/chat-panel").then((m) => m.ChatPanel), { loading: LoadingPlaceholder });
const CodexPanel = dynamic(() => import("@/components/panels/codex-panel").then((m) => m.CodexPanel), { loading: LoadingPlaceholder });
const DicePanel = dynamic(() => import("@/components/panels/dice-panel").then((m) => m.DicePanel), { loading: LoadingPlaceholder });
const EffectsPanel = dynamic(() => import("@/components/panels/effects-panel").then((m) => m.EffectsPanel), { loading: LoadingPlaceholder });
const MapsPanel = dynamic(() => import("@/components/panels/maps-panel").then((m) => m.MapsPanel), { loading: LoadingPlaceholder });
const OraclePanel = dynamic(() => import("./oracle-panel").then((m) => m.OraclePanel), { loading: LoadingPlaceholder });
const CampaignPanel = dynamic(() => import("./campaign-panel").then((m) => m.CampaignPanel), { loading: LoadingPlaceholder });
const NotesPanel = dynamic(() => import("@/components/panels/notes-panel").then((m) => m.NotesPanel), { loading: LoadingPlaceholder });
const ScenesPanel = dynamic(() => import("@/components/panels/scenes-panel").then((m) => m.ScenesPanel), { loading: LoadingPlaceholder });
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

const sectionMeta: Record<ExplorerSection, { title: string; icon: any }> = {
  scenes: { title: "Cenas", icon: ImageIcon },
  maps: { title: "Campos", icon: Map },
  actors: { title: "Fichas", icon: Shield },
  assets: { title: "Galeria", icon: ImageIcon },
  codex: { title: "Oficina", icon: BookOpen },
  notes: { title: "Notas", icon: FileText },
  atlas: { title: "Atlas", icon: Compass },
  effects: { title: "Efeitos", icon: Sparkles },
  admin: { title: "Dominio", icon: Settings },
  audio: { title: "Trilhas", icon: Music },
  oracle: { title: "Oráculo", icon: Sparkles },
  campaign: { title: "Campanha", icon: ScrollText },
  chat: { title: "Conversa", icon: MessageSquare }
};

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
            <span className="hud-chip">
              sala {snapshot.code}
            </span>
          }
        />
      ) : null}

      <div className={cn("overflow-x-auto custom-scrollbar pb-1", embedded ? "" : "mt-2")}>
        <div className="flex w-max gap-2 px-1">
          {Object.entries(sectionMeta)
            .filter(([key]) => {
              if (key === "campaign" || key === "admin") return viewer?.role === "gm";
              return true;
            })
            .map(([key, value]) => {
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
                    ? "border-[color:var(--gold)]/30 bg-[color:var(--mist)] text-[color:var(--text-primary)] shadow-[0_0_12px_rgba(var(--gold-rgb),0.1)]"
                    : "border-[var(--border-panel)] bg-[var(--bg-input)] text-[color:var(--text-secondary)] hover:border-[var(--border-panel)]/80 hover:text-[color:var(--text-primary)]"
                )}
              >
                <Icon size={14} className={isActive ? "text-[color:var(--gold)]" : ""} />
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
          <CharactersPanel
            sessionCode={snapshot.code}
            viewer={viewer}
            participants={participants}
            party={party}
          />
        )}
        
        {activeSection === "assets" && (
          <AssetsPanel
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

        {activeSection === "oracle" && (
          <OraclePanel sessionCode={snapshot.code} />
        )}

        {activeSection === "campaign" && (
          <CampaignPanel sessionCode={snapshot.code} />
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
