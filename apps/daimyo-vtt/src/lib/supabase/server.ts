import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv } from "@/lib/env";

export function createServerSupabaseClient() {
  const { url, publicKey } = getPublicSupabaseEnv();

  if (!url || !publicKey) {
    throw new Error(
      "Supabase nao configurado no servidor. Verifique NEXT_PUBLIC_SUPABASE_URL e a chave publica do Supabase."
    );
  }

  return createClient(url, publicKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
