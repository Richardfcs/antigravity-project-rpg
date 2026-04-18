import "server-only";

import type { InfraReadiness } from "@/types/infra";

export function getPublicSupabaseEnv() {
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "";

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: publicKey,
    publicKey
  };
}

export function getServerSupabaseEnv() {
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
  };
}

export function getCloudinaryEnv() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER ?? "daimyo-vtt"
  };
}

export function getInfraReadiness(): InfraReadiness {
  const supabaseEnv = getPublicSupabaseEnv();
  const cloudinaryEnv = getCloudinaryEnv();
  const serverEnv = getServerSupabaseEnv();

  const supabase = Boolean(supabaseEnv.url && supabaseEnv.publicKey);
  const cloudinary = Boolean(
    cloudinaryEnv.cloudName && cloudinaryEnv.apiKey && cloudinaryEnv.apiSecret
  );
  const serviceRole = Boolean(serverEnv.serviceRoleKey);

  const missing = [
    !supabaseEnv.url && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseEnv.publicKey &&
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY",
    !serverEnv.serviceRoleKey && "SUPABASE_SERVICE_ROLE_KEY",
    !cloudinaryEnv.cloudName && "CLOUDINARY_CLOUD_NAME",
    !cloudinaryEnv.apiKey && "CLOUDINARY_API_KEY",
    !cloudinaryEnv.apiSecret && "CLOUDINARY_API_SECRET"
  ].filter(Boolean) as string[];

  return {
    supabase,
    cloudinary,
    serviceRole,
    lobbyReady: supabase && serviceRole,
    all: supabase && cloudinary && serviceRole,
    missing
  };
}
