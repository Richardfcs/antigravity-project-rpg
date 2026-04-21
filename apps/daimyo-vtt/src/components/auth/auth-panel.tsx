"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

function scrollToCampaignActions() {
  if (typeof document === "undefined") {
    return;
  }

  window.requestAnimationFrame(() => {
    document
      .getElementById("campaign-actions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function AuthPanel() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [linkedSessions, setLinkedSessions] = useState<LinkedSessionSummary[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        setFeedback(
          "Conta conectada. Suas mesas vinculadas apareceram logo abaixo."
        );
        scrollToCampaignActions();
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

  return (
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="section-label">Acesso do cla</p>
          <h2 className="mt-2 text-xl font-semibold text-white sm:text-2xl lg:text-3xl">
            Entre com email e senha sem cerimonia extra
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[color:var(--ink-2)]">
            Use apenas email e senha. Se a conta ainda nao existir, o app a cria
            na hora e ja liga sua presenca as mesas sem confirmacao adicional.
          </p>
        </div>

        {authEmail && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/20 disabled:opacity-60 sm:w-auto"
          >
            {pendingKey === "logout" ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <LogOut size={14} />
            )}
            sair
          </button>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="rounded-[24px] border border-amber-300/14 bg-amber-300/8 p-4 sm:p-5">
          <form
            className="grid gap-3"
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
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
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
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
              placeholder="pelo menos 6 caracteres"
            />
          </label>

            <button
              type="submit"
              disabled={isPending || !client}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300/28 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-50 transition hover:border-amber-300/45 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pendingKey === "auth" ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              entrar ou abrir conta
            </button>
          </form>

          <div className="mt-4 rounded-[18px] border border-white/10 bg-black/18 px-4 py-3 text-sm text-[color:var(--ink-2)]">
            {authEmail ? (
              <span className="inline-flex min-w-0 items-center gap-2 break-all text-emerald-100">
                <ShieldCheck size={16} />
                conectado como {authEmail}
              </span>
            ) : (
              <span className="inline-flex items-start gap-2">
                <KeyRound size={16} className="text-amber-100" />
                Se a conta nao existir ainda, ela e aberta na hora com este mesmo email e senha.
              </span>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="section-label">Minhas mesas</p>
              <p className="mt-1 text-sm text-[color:var(--ink-2)]">
                {authEmail
                  ? "Retome qualquer mesa em que voce ja entrou como Mestre ou Jogador."
                  : "Depois do acesso, seus saloes vinculados aparecem aqui automaticamente."}
              </p>
            </div>
            <span className="hud-chip w-fit border-white/10 bg-black/18 text-[color:var(--ink-2)]">
              {linkedSessions.length} saloes
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {!isReady && (
              <div className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-4 text-sm text-[color:var(--ink-2)]">
                carregando suas mesas...
              </div>
            )}

            {isReady && linkedSessions.length === 0 && (
              <div className="rounded-[18px] border border-dashed border-white/12 bg-black/18 px-4 py-4 text-sm text-[color:var(--ink-2)]">
                Nenhum salao vinculado ainda. Entre em uma campanha abaixo e o VTT
                vai ligar essa passagem a sua conta automaticamente.
              </div>
            )}

            {linkedSessions.map((item) => (
              <article
                key={`${item.sessionId}:${item.participantId}`}
                className="rounded-[18px] border border-white/10 bg-black/18 px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-300/24 bg-rose-300/10 px-4 py-3 text-sm font-semibold text-rose-50 transition hover:border-rose-300/40 disabled:opacity-60 sm:w-auto"
                  >
                    {pendingKey === `restore:${item.participantId}` ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <ShieldCheck size={16} />
                    )}
                    retomar mesa
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {effectiveFeedback && (
        <p className="mt-4 text-sm text-[color:var(--ink-2)]">{effectiveFeedback}</p>
      )}
    </section>
  );
}

