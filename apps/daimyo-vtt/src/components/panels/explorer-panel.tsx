import {
  AudioLines,
  BookOpenText,
  Ghost,
  Map,
  MapPinned,
  MessagesSquare,
  ScrollText,
  ShieldAlert,
  Theater,
  UsersRound
} from "lucide-react";

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
  viewer: SessionViewerIdentity | null;
  infra: InfraReadiness;
}

const sectionMeta = {
  scenes: {
    icon: Theater,
    title: "Cenas",
    description: "Palco, fundo e ordem visual do elenco narrativo."
  },
  maps: {
    icon: Map,
    title: "Campos",
    description: "Campos taticos, grade opcional, marcadores vivos e mapa ativo."
  },
  codex: {
    icon: BookOpenText,
    title: "Oficina",
    description:
      "Arquetipos, codex e arsenal reaproveitados do projeto base sem inflar o palco."
  },
  notes: {
    icon: ScrollText,
    title: "Notas",
    description:
      "Memoria contextual do mestre e cadernos privados para acompanhar a sessao."
  },
  actors: {
    icon: UsersRound,
    title: "Fichas",
    description: "Retratos e recursos, elenco vivo, PV/PF e iniciativa em tempo real."
  },
  atlas: {
    icon: MapPinned,
    title: "Atlas",
    description: "Pins, regioes e submapas para o mundo da campanha."
  },
  effects: {
    icon: Ghost,
    title: "Efeitos",
    description: "Clima, atmosfera, kegare e estados individuais aplicados em tempo real."
  },
  admin: {
    icon: ShieldAlert,
    title: "Dominio",
    description: "Limpezas granulares e reset total do conteudo da mesa com confirmacoes."
  },
  audio: {
    icon: AudioLines,
    title: "Trilhas",
    description: "Trilhas, transporte e volume global sincronizados para toda a mesa."
  },
  chat: {
    icon: MessagesSquare,
    title: "Conversa",
    description: "Chat publico vivo e rolagens 3d6/GURPS publicadas em tempo real."
  }
} as const;

export function ExplorerPanel({
  snapshot,
  party,
  participants,
  activeSection,
  viewer,
  infra
}: ExplorerPanelProps) {
  const meta = sectionMeta[activeSection];
  const Icon = meta.icon;

  return (
    <section className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)] p-4">
      <header className="border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-100">
            <Icon size={18} />
          </div>
          <div>
            <p className="section-label">{snapshot.code}</p>
            <h2 className="mt-1 text-xl font-semibold text-white">{meta.title}</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-[color:var(--ink-2)]">
          {meta.description}
        </p>
      </header>

      <div className="scrollbar-thin mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
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
          <div className="space-y-4">
            <ChatPanel sessionCode={snapshot.code} viewer={viewer} />
            <DicePanel sessionCode={snapshot.code} viewer={viewer} />
          </div>
        )}
      </div>
    </section>
  );
}
