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
}

function getAdmin() {
  return createSupabaseAdminClient();
}

function isMissingRelationError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("relation")
  );
}

function isMissingFunctionError(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    error?.code === "PGRST202" ||
    message.includes("function public.reset_session_dataset_tx") ||
    message.includes("function public.reset_session_content_tx")
  );
}

function buildTransactionalResetError() {
  return new Error(
    "A migration de reset transacional ainda nao foi aplicada no Supabase."
  );
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

async function fetchAssetPublicIds(sessionId: string) {
  const { data, error } = await getAdmin()
    .from("assets")
    .select("public_id")
    .eq("session_id", sessionId)
    .returns<AssetCleanupRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as string[];
    }

    throw error;
  }

  return (data ?? []).map((asset) => asset.public_id).filter(Boolean);
}

async function fetchAudioPublicIds(sessionId: string) {
  const { data, error } = await getAdmin()
    .from("session_audio_tracks")
    .select("source_public_id")
    .eq("session_id", sessionId)
    .returns<AudioCleanupRow[]>();

  if (error) {
    if (isMissingRelationError(error)) {
      return [] as string[];
    }

    throw error;
  }

  return (data ?? []).map((track) => track.source_public_id).filter(Boolean);
}

async function runDatasetResetTransaction(
  sessionId: string,
  dataset: ResettableSessionDataset
) {
  const { error } = await getAdmin().rpc("reset_session_dataset_tx", {
    p_session_id: sessionId,
    p_dataset: dataset
  });

  if (error) {
    if (isMissingFunctionError(error)) {
      throw buildTransactionalResetError();
    }

    throw error;
  }
}

async function runFullResetTransaction(sessionId: string) {
  const { error } = await getAdmin().rpc("reset_session_content_tx", {
    p_session_id: sessionId
  });

  if (error) {
    if (isMissingFunctionError(error)) {
      throw buildTransactionalResetError();
    }

    throw error;
  }
}

export async function resetSessionDataset(
  sessionId: string,
  dataset: ResettableSessionDataset
) {
  const [imagePublicIds, audioPublicIds] = await Promise.all([
    dataset === "assets" ? fetchAssetPublicIds(sessionId) : Promise.resolve([] as string[]),
    dataset === "audio" ? fetchAudioPublicIds(sessionId) : Promise.resolve([] as string[])
  ]);

  await runDatasetResetTransaction(sessionId, dataset);

  await Promise.all([
    safeDestroyCloudinary(imagePublicIds, "image"),
    safeDestroyCloudinary(audioPublicIds, "video")
  ]);
}

export async function resetSessionContent(sessionId: string) {
  const [imagePublicIds, audioPublicIds] = await Promise.all([
    fetchAssetPublicIds(sessionId),
    fetchAudioPublicIds(sessionId)
  ]);

  await runFullResetTransaction(sessionId);

  await Promise.all([
    safeDestroyCloudinary(imagePublicIds, "image"),
    safeDestroyCloudinary(audioPublicIds, "video")
  ]);
}
