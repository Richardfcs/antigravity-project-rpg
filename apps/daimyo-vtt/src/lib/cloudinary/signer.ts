import "server-only";

import { getCloudinaryClient } from "@/lib/cloudinary/config";
import { getCloudinaryEnv } from "@/lib/env";

interface SignatureInput {
  folder?: string;
  publicId?: string;
  tags?: string[];
  context?: Record<string, string>;
  resourceType?: "image" | "video" | "auto";
}

function cleanFragment(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9/_-]/g, "-");
}

function cleanTag(value: string) {
  return value.trim().replace(/[^a-zA-Z0-9:_-]/g, "-");
}

export function createCloudinaryUploadSignature(input: SignatureInput) {
  const cloudinary = getCloudinaryClient();
  const env = getCloudinaryEnv();
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: cleanFragment(input.folder || env.uploadFolder)
  };

  if (input.publicId) {
    paramsToSign.public_id = cleanFragment(input.publicId);
  }

  if (input.tags?.length) {
    paramsToSign.tags = input.tags.map(cleanTag).join(",");
  }

  if (input.context && Object.keys(input.context).length > 0) {
    paramsToSign.context = Object.entries(input.context)
      .map(([key, value]) => `${cleanTag(key)}=${String(value).trim()}`)
      .join("|");
  }

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    env.apiSecret
  );

  return {
    cloudName: env.cloudName,
    apiKey: env.apiKey,
    resourceType: input.resourceType ?? "image",
    timestamp,
    folder: paramsToSign.folder,
    publicId: paramsToSign.public_id ?? null,
    tags: input.tags ?? [],
    context: typeof paramsToSign.context === "string" ? paramsToSign.context : null,
    signature
  };
}
