import { NextResponse } from "next/server";

import { createCloudinaryUploadSignature } from "@/lib/cloudinary/signer";
import { getCloudinaryEnv } from "@/lib/env";
import { requireSessionViewer } from "@/lib/session/access";

interface CloudinarySignBody {
  sessionCode?: string;
  folder?: string;
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
  resourceType?: "image" | "video" | "auto";
}

function buildSessionTag(sessionCode: string) {
  return sessionCode.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function isAllowedResourceType(value: unknown): value is "image" | "video" | "auto" | undefined {
  return value === undefined || value === "image" || value === "video" || value === "auto";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CloudinarySignBody;
    const sessionCode = body.sessionCode?.trim() ?? "";

    if (!sessionCode) {
      return NextResponse.json(
        { ok: false, message: "Informe a sessao para assinar o upload." },
        { status: 400 }
      );
    }

    await requireSessionViewer(sessionCode, "gm");

    if (!isAllowedResourceType(body.resourceType)) {
      return NextResponse.json(
        { ok: false, message: "Tipo de recurso invalido para upload." },
        { status: 400 }
      );
    }

    const env = getCloudinaryEnv();
    const sessionFolder = `${env.uploadFolder}/${buildSessionTag(sessionCode)}`;
    const folder = body.folder?.trim() || `${sessionFolder}/uploads`;

    if (folder !== sessionFolder && !folder.startsWith(`${sessionFolder}/`)) {
      return NextResponse.json(
        { ok: false, message: "Pasta de upload fora do escopo da sessao." },
        { status: 403 }
      );
    }

    const signed = createCloudinaryUploadSignature({
      folder,
      publicId: body.publicId,
      tags: body.tags,
      context: body.context,
      resourceType: body.resourceType
    });

    return NextResponse.json({
      ok: true,
      ...signed
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Falha ao gerar assinatura de upload."
      },
      { status: 500 }
    );
  }
}
