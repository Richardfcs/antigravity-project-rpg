"use server";

import { getInfraReadiness } from "@/lib/env";
import { createSessionAsset } from "@/lib/assets/repository";
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
