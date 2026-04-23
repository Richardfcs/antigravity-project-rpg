"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  KeyRound,
  LoaderCircle,
  LogIn,
  LogOut,
  ShieldCheck
} from "lucide-react";

import { ensurePasswordAccountAction } from "@/app/actions/auth-actions";
import {
  listLinkedSessionsByAuthAction,
  restoreSessionViewerByAuthAction
} from "@/app/actions/session-actions";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { LinkedSessionSummary } from "@/types/session";

type AuthPanelVariant = "login-only" | "account";

interface AuthPanelProps {
  variant?: AuthPanelVariant;
  onAuthenticatedChange?: (state: {
    isAuthenticated: boolean;
    email: string | null;
  }) => void;
  onOpenCampaigns?: () => void;
}

function formatRole(role: LinkedSessionSummary["role"]) {
  return role === "gm" ? "Mestre" : "Jogador";
}

function formatLastSeen(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "sem historico";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatFriendlyAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("email not confirmed")
  ) {
    return "Email ou senha invalidos.";
  }

  return message;
}

export function AuthPanel({
  variant = "login-only",
  onAuthenticatedChange,
  onOpenCampaigns
}: AuthPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [linkedSessions, setLinkedSessions] = useState<LinkedSessionSummary[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const onAuthenticatedChangeRef = useRef(onAuthenticatedChange);

  const client = useMemo(() => {
    try {
      return createBrowserSupabaseClient();
    } catch {
      return null;
    }
  }, []);

  const effectiveFeedback =
    feedback ??
    (client ? null : "As envs publicas do Supabase ainda nao estao prontas para login.");

  useEffect(() => {
    onAuthenticatedChangeRef.current = onAuthenticatedChange;
  }, [onAuthenticatedChange]);

  useEffect(() => {
    if (!client) {
      return;
    }

    let isMounted = true;

    const syncAuthState = async () => {
      const {
        data: { session }
      } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      const currentEmail = session?.user?.email ?? null;
      setAuthEmail(currentEmail);
      onAuthenticatedChangeRef.current?.({
        isAuthenticated: Boolean(currentEmail),
        email: currentEmail
      });
      if (currentEmail) {
        setEmail(currentEmail);
      }

      if (!session?.access_token) {
        setLinkedSessions([]);
        setIsReady(true);
        return;
      }

      const result = await listLinkedSessionsByAuthAction({
        accessToken: session.access_token
      });

      if (!isMounted) {
        return;
      }

      if (result.ok) {
        setLinkedSessions(result.sessions);
        setFeedback(null);
      } else {
        setLinkedSessions([]);
        setFeedback(result.message ?? "Falha ao carregar as mesas vinculadas.");
      }

      setIsReady(true);
    };

    void syncAuthState();

    const {
      data: { subscription }
    } = client.auth.onAuthStateChange(() => {
      void syncAuthState();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [client]);

  const handleAuthenticate = () => {
    if (!client) {
      setFeedback("Supabase Auth nao esta disponivel neste ambiente.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setFeedback("Informe email e senha para entrar.");
      return;
    }

    setPendingKey("auth");
    setFeedback(null);
    startTransition(async () => {
      const normalizedEmail = email.trim().toLowerCase();
      let signIn = await client.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (signIn.error) {
        const ensureResult = await ensurePasswordAccountAction({
          email: normalizedEmail,
          password
        });

        if (!ensureResult.ok && !ensureResult.existing) {
          setFeedback(
            ensureResult.message ??
              formatFriendlyAuthError(signIn.error.message)
          );
          setPendingKey(null);
          return;
        }

        signIn = await client.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
      }

      if (signIn.error) {
        setFeedback(formatFriendlyAuthError(signIn.error.message));
      } else {
        setPassword("");
        setFeedback("Conta conectada.");
        onAuthenticatedChangeRef.current?.({
          isAuthenticated: true,
          email: normalizedEmail
        });
      }

      setPendingKey(null);
    });
  };

  const handleLogout = () => {
    if (!client) {
      return;
    }

    setPendingKey("logout");
    setFeedback(null);
    startTransition(async () => {
      const { error } = await client.auth.signOut();

      if (error) {
        setFeedback(error.message);
      } else {
        setAuthEmail(null);
        setLinkedSessions([]);
        setPassword("");
        onAuthenticatedChangeRef.current?.({
          isAuthenticated: false,
          email: null
        });
      }

      setPendingKey(null);
    });
  };

  const handleRestore = (item: LinkedSessionSummary) => {
    if (!client) {
      return;
    }

    setPendingKey(`restore:${item.participantId}`);
    setFeedback(null);
    startTransition(async () => {
      const {
        data: { session }
      } = await client.auth.getSession();

      if (!session?.access_token) {
        setFeedback("Entre com sua conta antes de retomar a mesa.");
        setPendingKey(null);
        return;
      }

      const result = await restoreSessionViewerByAuthAction({
        sessionCode: item.sessionCode,
        role: item.role,
        accessToken: session.access_token
      });

      if (!result.ok || !result.route) {
        setFeedback(result.message ?? "Nao foi possivel retomar a sessao.");
        setPendingKey(null);
        return;
      }

      window.location.assign(result.route);
    });
  };

  if (variant === "account") {
    return (
      <section className="flex min-h-0 flex-col rounded-[22px] border border-white/10 bg-black/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="section-label">Minhas mesas</p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Entre onde voce ja joga
            </h2>
            <p className="mt-1 text-xs text-[color:var(--ink-2)]">
              Conta conectada como {authEmail ?? "cla ativo"}.
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-[16px] border border-emerald-300/16 bg-emerald-300/8 px-3 py-2 text-sm text-emerald-100">
          <span className="inline-flex min-w-0 items-center gap-2 break-all">
            <ShieldCheck size={16} />
            conectado como {authEmail ?? "conta ativa"}
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenCampaigns}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-amber-300/24 bg-amber-300/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 transition hover:border-amber-300/40"
            >
              <LogIn size={14} />
              criar ou entrar
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20 disabled:opacity-60"
            >
              {pendingKey === "logout" ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <LogOut size={14} />
              )}
              sair
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex min-h-0 flex-1 flex-col rounded-[16px] border border-white/10 bg-white/[0.04] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="section-label">Mesas</p>
              <p className="mt-1 text-xs text-[color:var(--ink-2)]">
                Toque para entrar direto na mesa.
              </p>
            </div>
            <span className="hud-chip w-fit border-white/10 bg-black/18 text-[color:var(--ink-2)]">
              {linkedSessions.length} saloes
            </span>
          </div>

          <div className="mt-2 min-h-0 space-y-2 overflow-y-auto pr-1 lg:max-h-[46vh]">
            {!isReady && (
              <div className="rounded-[12px] border border-white/10 bg-black/18 px-3 py-2 text-sm text-[color:var(--ink-2)]">
                carregando suas mesas...
              </div>
            )}

            {isReady && linkedSessions.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-[12px] border border-dashed border-white/12 bg-black/18 px-4 py-5 text-center">
                <p className="text-sm text-[color:var(--ink-2)]">
                  Nenhuma mesa vinculada ainda.
                </p>
                <button
                  type="button"
                  onClick={onOpenCampaigns}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/24 bg-amber-300/10 px-5 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/40"
                >
                  <LogIn size={16} />
                  criar ou entrar em uma mesa
                </button>
              </div>
            )}

            {linkedSessions.map((item) => (
              <article
                key={`${item.sessionId}:${item.participantId}`}
                className="rounded-[12px] border border-white/10 bg-black/18 px-3 py-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">
                      {item.sessionName}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                      {formatRole(item.role)} · {item.displayName} · codigo {item.sessionCode}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                      ultimo acesso {formatLastSeen(item.lastSeenAt)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRestore(item)}
                    disabled={isPending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-rose-300/10 px-3 py-2.5 text-sm font-semibold text-rose-50 transition hover:border-rose-300/40 disabled:opacity-60 sm:w-auto"
                  >
                    {pendingKey === `restore:${item.participantId}` ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    entrar na mesa
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        {effectiveFeedback && (
          <p className="mt-2 text-sm text-[color:var(--ink-2)]">{effectiveFeedback}</p>
        )}
      </section>
    );
  }

  return (
    <section className="flex min-h-0 flex-col rounded-[24px] border border-white/10 bg-black/20 p-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="section-label">Acesso do cla</p>
          <h2 className="mt-1 text-base font-semibold text-white sm:text-lg">
            Email e senha, sem etapas extras
          </h2>
          <p className="mt-1 text-xs text-[color:var(--ink-2)] sm:text-sm">
            Conta nova entra na hora.
          </p>
        </div>

        <span className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)]">
          acesso rapido
        </span>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 items-center">
        <div className="w-full rounded-[18px] border border-amber-300/14 bg-amber-300/8 p-3">
          <form
            className="grid gap-2.5"
            onSubmit={(event) => {
              event.preventDefault();
              handleAuthenticate();
            }}
          >
            <label className="block">
              <span className="section-label">Email</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                autoComplete="email"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                placeholder="voce@mesa.com"
              />
            </label>

            <label className="block">
              <span className="section-label">Senha</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                placeholder="pelo menos 6 caracteres"
              />
            </label>

            <button
              type="submit"
              disabled={isPending || !client}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-2.5 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingKey === "auth" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              entrar ou abrir conta
            </button>
          </form>

          <div className="mt-2.5 rounded-[14px] border border-white/10 bg-black/18 px-3 py-2 text-xs text-[color:var(--ink-2)]">
            <span className="inline-flex items-start gap-2">
              <KeyRound size={16} className="text-amber-100" />
              Usa este email e senha para entrar ou criar.
            </span>
          </div>
        </div>
      </div>

      {effectiveFeedback && (
        <p className="mt-2 text-sm text-[color:var(--ink-2)]">{effectiveFeedback}</p>
      )}
    </section>
  );
}

