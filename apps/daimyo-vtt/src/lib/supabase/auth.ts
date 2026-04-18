import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function verifySupabaseAccessToken(accessToken: string) {
  const token = accessToken.trim();

  if (!token) {
    throw new Error("Sessao de autenticacao ausente.");
  }

  const { data, error } = await createSupabaseAdminClient().auth.getUser(token);

  if (error || !data.user) {
    throw error ?? new Error("Nao foi possivel validar o usuario autenticado.");
  }

  return data.user;
}
