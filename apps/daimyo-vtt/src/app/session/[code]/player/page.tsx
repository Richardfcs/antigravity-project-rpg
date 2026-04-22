import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { PlayerShell } from "@/components/shell/player-shell";
import { listSessionAssets } from "@/lib/assets/repository";
import {
  listSessionAtlasMaps,
  listSessionAtlasPinCharacters,
  listSessionAtlasPins
} from "@/lib/atlas/repository";
import { getSessionAudioState, listSessionAudioTracks } from "@/lib/audio/repository";
import { listSessionCharacters } from "@/lib/characters/repository";
import { listSessionMessages } from "@/lib/chat/repository";
import { listSessionEffectLayers } from "@/lib/effects/repository";
import { listMapTokens, listSessionMaps } from "@/lib/maps/repository";
import { listSessionNotesForViewer } from "@/lib/notes/repository";
import { listPendingPrivateEvents } from "@/lib/private-events/repository";
import { listSceneCast, listSessionScenes } from "@/lib/scenes/repository";
import { readSessionViewerCookie } from "@/lib/session/cookies";
import { listSessionMemoryEventsForViewer } from "@/lib/session/memory-repository";
import {
  getSessionBootstrap,
  mapParticipantsToOnlinePresence
} from "@/lib/session/repository";

interface PlayerPageProps {
  params: Promise<{ code: string }>;
}

export default async function PlayerSessionPage({ params }: PlayerPageProps) {
  const { code } = await params;
  const cookieStore = await cookies();
  const viewerCookie = readSessionViewerCookie(cookieStore, code);
  const bootstrap = await getSessionBootstrap({
    sessionCode: code,
    role: "player",
    viewerId: viewerCookie?.participantId
  });

  if (!bootstrap) {
    notFound();
  }

  const [
    assets,
    characters,
    scenes,
    sceneCast,
    maps,
    mapTokens,
    atlasMaps,
    atlasPins,
    atlasPinCharacters,
    messages,
    audioTracks,
    audioState,
    privateEvents,
    effectLayers,
    notes,
    memoryEvents
  ] = await Promise.all([
    listSessionAssets(bootstrap.session.id),
    listSessionCharacters(bootstrap.session.id),
    listSessionScenes(bootstrap.session.id),
    listSceneCast(bootstrap.session.id),
    listSessionMaps(bootstrap.session.id),
    listMapTokens(bootstrap.session.id),
    listSessionAtlasMaps(bootstrap.session.id),
    listSessionAtlasPins(bootstrap.session.id),
    listSessionAtlasPinCharacters(bootstrap.session.id),
    listSessionMessages(bootstrap.session.id),
    listSessionAudioTracks(bootstrap.session.id),
    getSessionAudioState(bootstrap.session.id),
    bootstrap.viewer
      ? listPendingPrivateEvents(bootstrap.session.id, bootstrap.viewer.participantId)
      : Promise.resolve([]),
    listSessionEffectLayers(bootstrap.session.id),
    bootstrap.viewer
      ? listSessionNotesForViewer({
          sessionId: bootstrap.session.id,
          authorParticipantId: bootstrap.viewer.participantId,
          role: bootstrap.viewer.role
        })
      : Promise.resolve([]),
    bootstrap.viewer
      ? listSessionMemoryEventsForViewer({
          sessionId: bootstrap.session.id,
          role: bootstrap.viewer.role,
          viewerParticipantId: bootstrap.viewer.participantId
        })
      : Promise.resolve([])
  ]);

  return (
    <PlayerShell
      snapshot={bootstrap.snapshot}
      participants={bootstrap.participants}
      party={mapParticipantsToOnlinePresence(
        bootstrap.participants,
        bootstrap.viewer?.participantId
      )}
      assets={assets}
      characters={characters}
      scenes={scenes}
      sceneCast={sceneCast}
      maps={maps}
      mapTokens={mapTokens}
      atlasMaps={atlasMaps}
      atlasPins={atlasPins}
      atlasPinCharacters={atlasPinCharacters}
      messages={messages}
      audioTracks={audioTracks}
      audioState={audioState}
      privateEvents={privateEvents}
      effectLayers={effectLayers}
      notes={notes}
      memoryEvents={memoryEvents}
      viewer={bootstrap.viewer}
    />
  );
}
