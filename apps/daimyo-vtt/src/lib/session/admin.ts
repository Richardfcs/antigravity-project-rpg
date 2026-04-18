import "server-only";

import { getCloudinaryClient } from "@/lib/cloudinary/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type ResettableSessionDataset =
  | "maps"
  | "scenes"
  | "atlas"
  | "characters"
  | "assets"
  | "audio"
  | "chat"
  | "effects";

interface AssetCleanupRow {
  public_id: string;
}

interface AudioCleanupRow {
  source_public_id: string;
  cloudinary_resource_type: "video" | null;
}

function getAdmin() {
  return createSupabaseAdminClient();
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "PGRST205" ||
    error?.message?.toLowerCase().includes("could not find the table") === true ||
    error?.message?.toLowerCase().includes("relation") === true
  );
}

async function safeDeleteBySession(table: string, sessionId: string) {
  const { error } = await getAdmin().from(table).delete().eq("session_id", sessionId);

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

async function updateSessionAfterCleanup(sessionId: string, patch: Record<string, unknown>) {
  const { error } = await getAdmin().from("sessions").update(patch).eq("id", sessionId);

  if (error) {
    throw error;
  }
}

async function safeDestroyCloudinary(publicIds: string[], resourceType: "image" | "video") {
  if (publicIds.length === 0) {
    return;
  }

  let cloudinary;

  try {
    cloudinary = getCloudinaryClient();
  } catch {
    return;
  }

  await Promise.allSettled(
    publicIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
        invalidate: true
      })
    )
  );
}

async function clearMaps(sessionId: string) {
  await safeDeleteBySession("map_tokens", sessionId);
  await safeDeleteBySession("session_maps", sessionId);
  await updateSessionAfterCleanup(sessionId, {
    active_map_id: null
  });
}

async function clearScenes(sessionId: string) {
  await safeDeleteBySession("scene_cast", sessionId);
  await safeDeleteBySession("session_scenes", sessionId);
  await updateSessionAfterCleanup(sessionId, {
    active_scene: "Sem palco ativo",
    active_scene_id: null,
    scene_mood: "aguardando preparacao"
  });
}

async function clearAtlas(sessionId: string) {
  await safeDeleteBySession("session_atlas_pin_characters", sessionId);
  await safeDeleteBySession("session_atlas_pins", sessionId);
  await safeDeleteBySession("session_atlas_maps", sessionId);
  await updateSessionAfterCleanup(sessionId, {
    active_atlas_map_id: null
  });
}

async function clearCharacters(sessionId: string) {
  await safeDeleteBySession("session_characters", sessionId);
}

async function clearAssets(sessionId: string) {
  const { data, error } = await getAdmin()
    .from("assets")
    .select("public_id")
    .eq("session_id", sessionId)
    .returns<AssetCleanupRow[]>();

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  await safeDestroyCloudinary((data ?? []).map((asset) => asset.public_id), "image");
  await safeDeleteBySession("assets", sessionId);
}

async function clearAudio(sessionId: string) {
  const { data, error } = await getAdmin()
    .from("session_audio_tracks")
    .select("source_public_id,cloudinary_resource_type")
    .eq("session_id", sessionId)
    .returns<AudioCleanupRow[]>();

  if (error && !isMissingRelationError(error)) {
    throw error;
  }

  const videoPublicIds = (data ?? [])
    .filter((track) => track.source_public_id)
    .map((track) => track.source_public_id);

  await safeDestroyCloudinary(videoPublicIds, "video");
  await safeDeleteBySession("session_audio_state", sessionId);
  await safeDeleteBySession("session_audio_tracks", sessionId);
}

async function clearChat(sessionId: string) {
  await safeDeleteBySession("session_messages", sessionId);
}

async function clearEffects(sessionId: string) {
  await safeDeleteBySession("session_effect_layers", sessionId);
  await safeDeleteBySession("session_private_events", sessionId);
}

const datasetHandlers: Record<ResettableSessionDataset, (sessionId: string) => Promise<void>> = {
  maps: clearMaps,
  scenes: clearScenes,
  atlas: clearAtlas,
  characters: clearCharacters,
  assets: clearAssets,
  audio: clearAudio,
  chat: clearChat,
  effects: clearEffects
};

export async function resetSessionDataset(sessionId: string, dataset: ResettableSessionDataset) {
  await datasetHandlers[dataset](sessionId);
}

export async function resetSessionContent(sessionId: string) {
  const orderedDatasets: ResettableSessionDataset[] = [
    "effects",
    "chat",
    "audio",
    "atlas",
    "maps",
    "scenes",
    "characters",
    "assets"
  ];

  for (const dataset of orderedDatasets) {
    await datasetHandlers[dataset](sessionId);
  }

  await updateSessionAfterCleanup(sessionId, {
    active_scene: "Sem palco ativo",
    active_scene_id: null,
    active_map_id: null,
    active_atlas_map_id: null,
    active_stage_mode: "theater",
    presentation_mode: "standard",
    scene_mood: "aguardando preparacao"
  });
}
