import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicSupabaseEnv, getServerSupabaseEnv } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { url } = getPublicSupabaseEnv();
  const { serviceRoleKey } = getServerSupabaseEnv();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin client indisponível. Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
