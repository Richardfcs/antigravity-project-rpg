import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listSessionParticipants } from "@/lib/session/repository";
import { daimyoSessionSnapshot } from "@/lib/content-bridge/snapshot";
import type { SessionSnapshotExportPayload } from "@/lib/content-bridge/snapshot";

function getAdmin() {
  return createSupabaseAdminClient();
}

function isMissingFunctionError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "PGRST202" ||
    message.includes("function public.reset_session_content_tx")
  );
}

function buildRestoreMigrationError() {
  return new Error(
    "A migration de reset transacional ainda nao foi aplicada no Supabase."
  );
}

async function clearSessionContentRecords(sessionId: string) {
  const { error } = await getAdmin().rpc("reset_session_content_tx", {
    p_session_id: sessionId
  });

  if (error) {
    if (isMissingFunctionError(error)) {
      throw buildRestoreMigrationError();
    }

    throw error;
  }
}

async function upsertRows<T extends Record<string, unknown>>(table: string, rows: T[]) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await getAdmin().from(table).upsert(rows);

  if (error) {
    throw error;
  }
}

function filterParticipantId(
  participantId: string | null | undefined,
  participantIds: Set<string>
) {
  return participantId && participantIds.has(participantId) ? participantId : null;
}

function normalizeSnapshotPayload(rawSnapshot: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawSnapshot);
  } catch {
    throw new Error("O arquivo enviado nao e um JSON valido.");
  }

  return daimyoSessionSnapshot.normalizeSessionSnapshotPayload(parsed);
}

export async function restoreSessionSnapshot(input: {
  sessionId: string;
  rawSnapshot: string;
}) {
  const payload = normalizeSnapshotPayload(input.rawSnapshot);
  const participants = await listSessionParticipants(input.sessionId);
  const participantIds = new Set(participants.map((participant) => participant.id));

  await clearSessionContentRecords(input.sessionId);

  await upsertRows(
    "assets",
    payload.assets.map((asset) => ({
      id: asset.id,
      session_id: input.sessionId,
      owner_participant_id: filterParticipantId(asset.ownerParticipantId, participantIds),
      kind: asset.kind,
      label: asset.label,
      public_id: asset.publicId,
      secure_url: asset.secureUrl,
      width: asset.width,
      height: asset.height,
      tags: asset.tags,
      created_at: asset.createdAt
    }))
  );

  await upsertRows(
    "session_characters",
    payload.characters.map((character) => ({
      id: character.id,
      session_id: input.sessionId,
      name: character.name,
      type: character.type,
      owner_participant_id: filterParticipantId(character.ownerParticipantId, participantIds),
      asset_id: character.assetId,
      hp: character.hp,
      hp_max: character.hpMax,
      fp: character.fp,
      fp_max: character.fpMax,
      initiative: character.initiative,
      created_at: character.createdAt,
      updated_at: character.updatedAt
    }))
  );

  await upsertRows(
    "session_scenes",
    payload.scenes.map((scene) => ({
      id: scene.id,
      session_id: input.sessionId,
      name: scene.name,
      background_asset_id: scene.backgroundAssetId,
      mood_label: scene.moodLabel,
      layout_mode: scene.layoutMode,
      is_active: scene.isActive,
      sort_order: scene.sortOrder,
      created_at: scene.createdAt,
      updated_at: scene.updatedAt
    }))
  );

  await upsertRows(
    "scene_cast",
    payload.sceneCast.map((entry) => ({
      id: entry.id,
      session_id: input.sessionId,
      scene_id: entry.sceneId,
      character_id: entry.characterId,
      slot_order: entry.slotOrder,
      is_spotlighted: entry.isSpotlighted,
      created_at: entry.createdAt
    }))
  );

  await upsertRows(
    "session_maps",
    payload.maps.map((map) => ({
      id: map.id,
      session_id: input.sessionId,
      name: map.name,
      background_asset_id: map.backgroundAssetId,
      default_ally_asset_id: map.defaultAllyAssetId,
      default_enemy_asset_id: map.defaultEnemyAssetId,
      default_neutral_asset_id: map.defaultNeutralAssetId,
      grid_enabled: map.gridEnabled,
      grid_size: map.gridSize,
      width: map.width,
      height: map.height,
      is_active: map.isActive,
      created_at: map.createdAt,
      updated_at: map.updatedAt
    }))
  );

  await upsertRows(
    "map_tokens",
    payload.mapTokens.map((token) => ({
      id: token.id,
      session_id: input.sessionId,
      map_id: token.mapId,
      character_id: token.characterId,
      label: token.label,
      asset_id: token.assetId,
      faction: token.faction,
      status_effects: token.statusEffects,
      x: token.x,
      y: token.y,
      scale: token.scale,
      is_visible_to_players: token.isVisibleToPlayers,
      created_at: token.createdAt,
      updated_at: token.updatedAt
    }))
  );

  await upsertRows(
    "session_atlas_maps",
    payload.atlasMaps.map((atlasMap) => ({
      id: atlasMap.id,
      session_id: input.sessionId,
      name: atlasMap.name,
      asset_id: atlasMap.assetId,
      is_active: atlasMap.isActive,
      created_at: atlasMap.createdAt,
      updated_at: atlasMap.updatedAt
    }))
  );

  await upsertRows(
    "session_atlas_pins",
    payload.atlasPins.map((pin) => ({
      id: pin.id,
      session_id: input.sessionId,
      atlas_map_id: pin.atlasMapId,
      title: pin.title,
      description: pin.description,
      is_visible_to_players: pin.isVisibleToPlayers,
      is_name_visible_to_players: pin.isNameVisibleToPlayers,
      is_quest_marked: pin.isQuestMarked,
      x: pin.x,
      y: pin.y,
      image_asset_id: pin.imageAssetId,
      submap_asset_id: pin.submapAssetId,
      created_at: pin.createdAt,
      updated_at: pin.updatedAt
    }))
  );

  await upsertRows(
    "session_atlas_pin_characters",
    payload.atlasPinCharacters.map((link) => ({
      id: link.id,
      session_id: input.sessionId,
      pin_id: link.pinId,
      character_id: link.characterId,
      sort_order: link.sortOrder,
      created_at: link.createdAt
    }))
  );

  await upsertRows(
    "session_audio_tracks",
    payload.tracks.map((track) => ({
      id: track.id,
      session_id: input.sessionId,
      title: track.title,
      source_type: track.sourceType,
      source_url: track.sourceUrl,
      source_public_id: track.sourcePublicId,
      cloudinary_resource_type: track.cloudinaryResourceType,
      mime_type: track.mimeType,
      original_filename: track.originalFilename,
      duration_seconds: track.durationSeconds,
      playlist_name: track.playlistName,
      sort_order: track.sortOrder,
      created_at: track.createdAt
    }))
  );

  if (payload.playback) {
    await upsertRows("session_audio_state", [
      {
        session_id: input.sessionId,
        track_id: payload.playback.trackId,
        status: payload.playback.status,
        volume: payload.playback.volume,
        loop_enabled: payload.playback.loopEnabled,
        started_at: payload.playback.startedAt,
        position_seconds: payload.playback.positionSeconds,
        updated_at: payload.playback.updatedAt
      }
    ]);
  }

  await upsertRows(
    "session_messages",
    payload.messages.map((message) => ({
      id: message.id,
      session_id: input.sessionId,
      participant_id: filterParticipantId(message.participantId, participantIds),
      display_name: message.displayName,
      kind: message.kind,
      body: message.body,
      payload: message.payload,
      created_at: message.createdAt
    }))
  );

  await upsertRows(
    "session_effect_layers",
    payload.effects
      .filter(
        (effect) =>
          effect.targetParticipantId == null ||
          participantIds.has(effect.targetParticipantId)
      )
      .map((effect) => ({
        id: effect.id,
        session_id: input.sessionId,
        target_participant_id: filterParticipantId(effect.targetParticipantId, participantIds),
        source_participant_id: filterParticipantId(effect.sourceParticipantId, participantIds),
        preset: effect.preset,
        note: effect.note,
        intensity: effect.intensity,
        duration_ms: effect.durationMs,
        expires_at: effect.expiresAt,
        created_at: effect.createdAt
      }))
  );

  await upsertRows(
    "session_notes",
    payload.notes
      .filter((note) => participantIds.has(note.authorParticipantId))
      .map((note) => ({
        id: note.id,
        session_id: input.sessionId,
        author_participant_id: note.authorParticipantId,
        kind: note.kind,
        scope_key: note.scopeKey,
        title: note.title,
        body: note.body,
        scene_id: note.sceneId,
        map_id: note.mapId,
        atlas_map_id: note.atlasMapId,
        created_at: note.createdAt,
        updated_at: note.updatedAt
      }))
  );

  await upsertRows(
    "session_memory_events",
    payload.memoryEvents
      .filter(
        (event) =>
          event.targetParticipantId == null ||
          participantIds.has(event.targetParticipantId)
      )
      .map((event) => ({
        id: event.id,
        session_id: input.sessionId,
        actor_participant_id: filterParticipantId(event.actorParticipantId, participantIds),
        target_participant_id: filterParticipantId(event.targetParticipantId, participantIds),
        category: event.category,
        title: event.title,
        detail: event.detail,
        stage_mode: event.stageMode,
        atlas_map_id: event.atlasMapId,
        atlas_pin_id: event.atlasPinId,
        audio_track_id: event.audioTrackId,
        created_at: event.createdAt
      }))
  );

  const { error: sessionError } = await getAdmin()
    .from("sessions")
    .update({
      active_scene: payload.snapshot.activeScene,
      active_scene_id: payload.snapshot.activeSceneId,
      active_map_id: payload.snapshot.activeMapId,
      active_atlas_map_id: payload.snapshot.activeAtlasMapId,
      active_stage_mode: payload.snapshot.stageMode,
      presentation_mode: payload.snapshot.presentationMode,
      combat_enabled: payload.snapshot.combatEnabled,
      combat_round: payload.snapshot.combatRound,
      combat_turn_index: payload.snapshot.combatTurnIndex,
      combat_active_token_id: payload.snapshot.combatActiveTokenId,
      scene_mood: payload.snapshot.sceneMood
    })
    .eq("id", input.sessionId);

  if (sessionError) {
    throw sessionError;
  }

  return {
    payload,
    restoredCounts: {
      assets: payload.assets.length,
      characters: payload.characters.length,
      scenes: payload.scenes.length,
      maps: payload.maps.length,
      atlasMaps: payload.atlasMaps.length,
      tracks: payload.tracks.length,
      notes: payload.notes.length,
      memoryEvents: payload.memoryEvents.length
    }
  };
}

export function parseSessionSnapshot(rawSnapshot: string): SessionSnapshotExportPayload {
  return normalizeSnapshotPayload(rawSnapshot);
}
