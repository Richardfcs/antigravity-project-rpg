"use server";

import { getInfraReadiness } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface EnsurePasswordAccountResult {
  ok: boolean;
  created?: boolean;
  existing?: boolean;
  message?: string;
}

function formatActionError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return null;
}

export async function ensurePasswordAccountAction(input: {
  email: string;
  password: string;
}): Promise<EnsurePasswordAccountResult> {
  if (!getInfraReadiness().serviceRole) {
    return {
      ok: false,
      message:
        "A criacao automatica de conta ainda nao esta disponivel. Configure a service role do Supabase."
    };
  }

  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();

  if (!email || !password) {
    return {
      ok: false,
      message: "Informe email e senha para continuar."
    };
  }

  if (password.length < 6) {
    return {
      ok: false,
      message: "A senha precisa ter pelo menos 6 caracteres."
    };
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (!error) {
      return {
        ok: true,
        created: true
      };
    }

    const normalizedMessage = error.message.toLowerCase();
    if (
      normalizedMessage.includes("already") &&
      (normalizedMessage.includes("registered") ||
        normalizedMessage.includes("exists") ||
        normalizedMessage.includes("taken"))
    ) {
      return {
        ok: false,
        existing: true,
        message: "Esta conta ja existe. Confira a senha para entrar."
      };
    }

    return {
      ok: false,
      message: error.message
    };
  } catch (error) {
    return {
      ok: false,
      message:
        formatActionError(error) ??
        "Nao foi possivel preparar a conta agora."
    };
  }
}
