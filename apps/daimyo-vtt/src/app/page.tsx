import { Sparkles } from "lucide-react";

import { LobbyShell } from "@/components/lobby/lobby-shell";
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
    <main className="daimyo-shell-bg relative min-h-screen overflow-y-auto px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      <div className="mx-auto max-w-5xl">
        <section className="surface-panel-strong relative overflow-hidden p-3 sm:p-3.5 lg:p-4">
          <div className="daimyo-hero-wash absolute inset-0" />

          <div className="relative flex w-full flex-col gap-2">
            <header className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <span className="hud-chip border-amber-300/20 bg-amber-300/8 text-amber-100">
                  <Sparkles size={14} />
                  Daimyo VTT · pavilhao da mesa
                </span>
                <h1 className="max-w-4xl text-lg font-semibold tracking-tight text-white sm:text-[1.45rem] lg:text-[1.6rem]">
                  Entre na mesa
                </h1>
                <p className="max-w-3xl text-xs text-[color:var(--ink-2)] sm:text-sm">
                  Login rapido para abrir ou entrar em campanhas.
                </p>
              </div>
              <ThemeSettingsButton />
            </header>

            {params.error && (
              <div className="rounded-[18px] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-50">
                {params.error}
              </div>
            )}

            <LobbyShell infra={infra} presetCode={presetCode} />
          </div>
        </section>
      </div>
    </main>
  );
}
