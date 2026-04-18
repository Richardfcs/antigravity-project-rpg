import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { MasterShell } from "@/components/shell/master-shell";
import { listSessionAssets } from "@/lib/assets/repository";
import {
  listSessionAtlasMaps,
  listSessionAtlasPinCharacters,
  listSessionAtlasPins
} from "@/lib/atlas/repository";
import { getSessionAudioState, listSessionAudioTracks } from "@/lib/audio/repository";
import { listSessionCharacters } from "@/lib/characters/repository";
import { listSessionMessages } from "@/lib/chat/repository";
import { getInfraReadiness } from "@/lib/env";
import { listSessionEffectLayers } from "@/lib/effects/repository";
import { listMapTokens, listSessionMaps } from "@/lib/maps/repository";
import { listSceneCast, listSessionScenes } from "@/lib/scenes/repository";
import { readSessionViewerCookie } from "@/lib/session/cookies";
import {
  getSessionBootstrap,
  mapParticipantsToOnlinePresence
} from "@/lib/session/repository";

interface GmPageProps {
  params: Promise<{ code: string }>;
}

export default async function GmSessionPage({ params }: GmPageProps) {
  const { code } = await params;
  const cookieStore = await cookies();
  const viewerCookie = readSessionViewerCookie(cookieStore, code);
  const bootstrap = await getSessionBootstrap({
    sessionCode: code,
    role: "gm",
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
    effectLayers
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
    listSessionEffectLayers(bootstrap.session.id)
  ]);

  return (
    <MasterShell
      snapshot={bootstrap.snapshot}
      infra={getInfraReadiness()}
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
      effectLayers={effectLayers}
      viewer={bootstrap.viewer}
    />
  );
}
