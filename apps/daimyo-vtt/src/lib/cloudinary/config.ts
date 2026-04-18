import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryEnv } from "@/lib/env";

let configured = false;

export function getCloudinaryClient() {
  if (!configured) {
    const env = getCloudinaryEnv();

    if (!env.cloudName || !env.apiKey || !env.apiSecret) {
      throw new Error(
        "Cloudinary não configurado. Defina CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET."
      );
    }

    cloudinary.config({
      cloud_name: env.cloudName,
      api_key: env.apiKey,
      api_secret: env.apiSecret,
      secure: true
    });

    configured = true;
  }

  return cloudinary;
}
