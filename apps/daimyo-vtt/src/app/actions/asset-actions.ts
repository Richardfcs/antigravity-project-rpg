"use server";

import { getInfraReadiness } from "@/lib/env";
import { getCloudinaryClient } from "@/lib/cloudinary/config";
import {
  createSessionAsset,
  deleteSessionAsset,
  describeSessionAssetUsage,
  findSessionAssetById,
  updateSessionAssetMetadata
} from "@/lib/assets/repository";
import { requireSessionViewer } from "@/lib/session/access";
import type { AssetKind, SessionAssetRecord } from "@/types/asset";

interface RegisterUploadedAssetInput {
  sessionCode: string;
  kind: AssetKind;
  label: string;
  publicId: string;
  secureUrl: string;
  width?: number | null;
  height?: number | null;
  tags?: string[];
}

interface AssetActionResult {
  ok: boolean;
  asset?: SessionAssetRecord;
  message?: string;
}

export async function registerUploadedAssetAction(
  input: RegisterUploadedAssetInput
): Promise<AssetActionResult> {
  const infra = getInfraReadiness();

  if (!infra.serviceRole) {
    return {
      ok: false,
      message: "O Service Role do Supabase ainda não está configurado."
    };
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    const asset = await createSessionAsset({
      sessionId: session.id,
      ownerParticipantId: viewer.participantId,
      kind: input.kind,
      label: input.label,
      publicId: input.publicId,
      secureUrl: input.secureUrl,
      width: input.width ?? null,
      height: input.height ?? null,
      tags: input.tags ?? []
    });

    return { ok: true, asset };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao registrar o asset."
    };
  }
}

export async function updateAssetMetadataAction(input: {
  sessionCode: string;
  assetId: string;
  label: string;
  kind: AssetKind;
}): Promise<AssetActionResult> {
  const infra = getInfraReadiness();

  if (!infra.serviceRole) {
    return {
      ok: false,
      message: "O Service Role do Supabase ainda nao esta configurado."
    };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const asset = await findSessionAssetById(input.assetId);

    if (!asset || asset.sessionId !== session.id) {
      throw new Error("Recurso nao encontrado nesta sessao.");
    }

    const updated = await updateSessionAssetMetadata({
      assetId: asset.id,
      label: input.label,
      kind: input.kind
    });

    return { ok: true, asset: updated };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao atualizar o recurso."
    };
  }
}

export async function deleteAssetAction(input: {
  sessionCode: string;
  assetId: string;
}): Promise<AssetActionResult> {
  const infra = getInfraReadiness();

  if (!infra.serviceRole) {
    return {
      ok: false,
      message: "O Service Role do Supabase ainda nao esta configurado."
    };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const asset = await findSessionAssetById(input.assetId);

    if (!asset || asset.sessionId !== session.id) {
      throw new Error("Recurso nao encontrado nesta sessao.");
    }

    const usage = await describeSessionAssetUsage(asset.id);

    if (usage) {
      throw new Error(`Este recurso ainda esta vinculado a ${usage}. Remova o vinculo antes de excluir.`);
    }

    const removed = await deleteSessionAsset(asset.id);

    try {
      const cloudinary = getCloudinaryClient();
      await cloudinary.uploader.destroy(removed.publicId, {
        resource_type: "image",
        invalidate: true
      });
    } catch {
      // limpeza remota best-effort
    }

    return { ok: true, asset: removed };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Falha ao excluir o recurso."
    };
  }
}
