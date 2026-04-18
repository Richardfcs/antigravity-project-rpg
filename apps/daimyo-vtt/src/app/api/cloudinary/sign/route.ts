import { NextResponse } from "next/server";

import { createCloudinaryUploadSignature } from "@/lib/cloudinary/signer";

interface CloudinarySignBody {
  folder?: string;
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
  resourceType?: "image" | "video" | "auto";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as CloudinarySignBody;

    const signed = createCloudinaryUploadSignature({
      folder: body.folder,
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
