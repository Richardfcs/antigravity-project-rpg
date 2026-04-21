import { Crown, Sparkles, UsersRound } from "lucide-react";

import {
  createSessionAction,
  joinSessionAction,
  resumeSessionAction
} from "@/app/actions/session-actions";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SubmitButton } from "@/components/lobby/submit-button";
import { ThemeSettingsButton } from "@/components/theme/theme-provider";
import { getInfraReadiness } from "@/lib/env";

interface HomePageProps {
  searchParams: Promise<{
    error?: string;
    code?: string;
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const infra = getInfraReadiness();
  const params = await searchParams;
  const presetCode = params.code ?? "";

  return (
    <main className="daimyo-shell-bg relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-5 sm:gap-6">
        <section className="surface-panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="daimyo-hero-wash absolute inset-0" />

          <div className="relative space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="hud-chip border-amber-300/20 bg-amber-300/8 text-amber-100">
                  <Sparkles size={14} />
                  Daimyo VTT · pavilhao da mesa
                </span>
                <ThemeSettingsButton />
              </div>

              <div className="space-y-3">
                <h1 className="max-w-4xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Guarde sua mesa, retome sua campanha e volte ao salao sem perder nada
                </h1>
                <p className="max-w-3xl text-base leading-7 text-[color:var(--ink-2)] sm:text-lg">
                  O acesso fica logo na entrada do VTT. Use so email e senha para
                  abrir sua conta, recuperar as mesas ja visitadas e seguir direto para
                  criar uma campanha, entrar por codigo ou retomar um salao ja vinculado.
                </p>
              </div>
            </div>

            {params.error && (
              <div className="rounded-[20px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-50">
                {params.error}
              </div>
            )}

            <AuthPanel />
          </div>
        </section>

        <section id="campaign-actions" className="surface-panel p-6 sm:p-8">
          <div className="mb-6 space-y-2">
            <p className="section-label">Campanhas e entrada</p>
            <h2 className="text-3xl font-semibold text-white">
              Depois do acesso, abra os portoes da campanha
            </h2>
            <p className="max-w-3xl text-sm leading-6 text-[color:var(--ink-2)]">
              O fluxo continua direto: o mestre abre a campanha, os jogadores entram por codigo
              e quem ja passou por esse salao ainda pode retomar pelo atalho do proprio navegador.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <form action={createSessionAction} className="surface-panel bg-black/18 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/8 text-amber-100">
                  <Crown size={18} />
                </span>
                <div>
                  <p className="section-label">Mestre</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Abrir campanha
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-[color:var(--ink-2)]">
                    Nome da campanha
                  </span>
                  <input
                    name="campaignName"
                    type="text"
                    required
                    disabled={!infra.lobbyReady}
                    placeholder="A Era das Espadas Quebradas"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-[color:var(--ink-2)]">
                    Nome do mestre
                  </span>
                  <input
                    name="gmName"
                    type="text"
                    required
                    disabled={!infra.lobbyReady}
                    placeholder="Daimyo"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-[color:var(--ink-3)]">
                  Gera um codigo curto e leva o mestre direto ao conselho da mesa.
                </p>
                <SubmitButton
                  idleLabel="Abrir mesa"
                  pendingLabel="Criando..."
                  disabled={!infra.lobbyReady}
                  className="border-amber-300/25 bg-amber-300/10 text-amber-50 hover:border-amber-300/40 hover:bg-amber-300/15"
                />
              </div>
            </form>

            <form action={joinSessionAction} className="surface-panel bg-black/18 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-300/20 bg-rose-300/8 text-rose-100">
                  <UsersRound size={18} />
                </span>
                <div>
                  <p className="section-label">Jogador</p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    Entrar na campanha
                  </h2>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-2 block text-sm text-[color:var(--ink-2)]">
                    Codigo da sala
                  </span>
                  <input
                    name="sessionCode"
                    type="text"
                    required
                    disabled={!infra.lobbyReady}
                    defaultValue={presetCode}
                    placeholder="AKAI-01"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm uppercase tracking-[0.22em] text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-rose-300/35"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-[color:var(--ink-2)]">
                    Nome do jogador
                  </span>
                  <input
                    name="playerName"
                    type="text"
                    required
                    disabled={!infra.lobbyReady}
                    placeholder="Akemi"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-rose-300/35"
                  />
                </label>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-[color:var(--ink-3)]">
                  Entra direto na visao do jogador e liga este navegador a
                  sua conta quando voce ja estiver conectado.
                </p>
                <SubmitButton
                  idleLabel="Entrar"
                  pendingLabel="Entrando..."
                  disabled={!infra.lobbyReady}
                  className="border-rose-300/25 bg-rose-300/10 text-rose-50 hover:border-rose-300/40 hover:bg-rose-300/15"
                />
              </div>
            </form>
          </div>

          <form action={resumeSessionAction} className="mt-4 surface-panel bg-black/18 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="section-label">Retomar neste navegador</p>
                <p className="text-sm leading-6 text-[color:var(--ink-2)]">
                  Se este dispositivo ja entrou na sala antes, basta informar o codigo
                  para recuperar o vinculo local salvo.
                </p>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-xl">
                <input
                  name="sessionCode"
                  type="text"
                  required
                  defaultValue={presetCode}
                  placeholder="AKAI-01"
                  className="flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-sm uppercase tracking-[0.22em] text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                />
                <SubmitButton
                  idleLabel="Retomar"
                  pendingLabel="Abrindo..."
                  disabled={!infra.lobbyReady}
                  className="border-white/10 bg-white/[0.04] text-white hover:border-white/20 hover:bg-white/[0.08]"
                />
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

