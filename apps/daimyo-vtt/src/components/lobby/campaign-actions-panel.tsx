"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Crown, UsersRound } from "lucide-react";

import {
  createSessionAction,
  joinSessionAction
} from "@/app/actions/session-actions";
import { SubmitButton } from "@/components/lobby/submit-button";
import type { InfraReadiness } from "@/types/infra";

type LobbyAction = "create" | "join";

interface CampaignActionsPanelProps {
  infra: InfraReadiness;
  presetCode?: string;
  onBack?: () => void;
}

const actionItems: Array<{
  id: LobbyAction;
  label: string;
  shortLabel: string;
  hint: string;
  icon: typeof Crown;
}> = [
  {
    id: "create",
    label: "Abrir campanha",
    shortLabel: "mestre",
    hint: "Criar sala",
    icon: Crown
  },
  {
    id: "join",
    label: "Entrar por codigo",
    shortLabel: "jogador",
    hint: "Entrar",
    icon: UsersRound
  }
];

export function CampaignActionsPanel({
  infra,
  presetCode = "",
  onBack
}: CampaignActionsPanelProps) {
  const [activeAction, setActiveAction] = useState<LobbyAction>("create");

  const activeMeta = useMemo(
    () => actionItems.find((item) => item.id === activeAction) ?? actionItems[0],
    [activeAction]
  );

  return (
    <section
      id="campaign-actions"
      className="surface-panel flex min-h-0 flex-col overflow-y-auto p-3 sm:p-3.5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 pb-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/18 text-[color:var(--ink-2)] transition hover:border-white/20 hover:text-white"
            >
              <ArrowLeft size={15} />
            </button>
          ) : null}
          <div className="min-w-0">
            <p className="section-label">Campanhas</p>
            <h2 className="mt-1 text-base font-semibold text-white">
              Criar ou entrar
            </h2>
          </div>
        </div>
        <span className="hud-chip border-white/10 bg-black/18 text-[color:var(--ink-2)]">
          <activeMeta.icon size={14} />
          {activeMeta.hint}
        </span>
      </header>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {actionItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveAction(item.id)}
            className={[
              "inline-flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
              activeAction === item.id
                ? "border-amber-300/28 bg-amber-300/10 text-amber-100"
                : "border-white/10 bg-white/[0.03] text-[color:var(--ink-2)] hover:border-white/18"
            ].join(" ")}
          >
            <item.icon size={14} />
            <span className="truncate">{item.shortLabel}</span>
          </button>
        ))}
      </div>

      <div className="mt-2.5 min-h-0 flex-1">
        {activeAction === "create" && (
          <form
            action={createSessionAction}
            className="flex min-h-0 flex-col rounded-[18px] border border-amber-300/14 bg-amber-300/8 p-3"
          >
            <p className="mb-2 text-sm text-[color:var(--ink-2)]">
              Abre a mesa e recebe o codigo curto.
            </p>

            <div className="grid gap-2">
              <label className="block">
                <span className="section-label">Campanha</span>
                <input
                  name="campaignName"
                  type="text"
                  required
                  disabled={!infra.lobbyReady}
                  placeholder="A Era das Espadas Quebradas"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                />
              </label>

              <label className="block">
                <span className="section-label">Mestre</span>
                <input
                  name="gmName"
                  type="text"
                  required
                  disabled={!infra.lobbyReady}
                  placeholder="Daimyo"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-amber-300/35"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <SubmitButton
                idleLabel="Abrir mesa"
                pendingLabel="Criando..."
                disabled={!infra.lobbyReady}
                className="border-amber-300/25 bg-amber-300/10 text-amber-50 hover:border-amber-300/40 hover:bg-amber-300/15"
              />
            </div>
          </form>
        )}

        {activeAction === "join" && (
          <form
            action={joinSessionAction}
            className="flex min-h-0 flex-col rounded-[18px] border border-rose-300/14 bg-rose-300/8 p-3"
          >
            <p className="mb-2 text-sm text-[color:var(--ink-2)]">
              Entra direto com codigo e nome.
            </p>

            <div className="grid gap-2">
              <label className="block">
                <span className="section-label">Codigo</span>
                <input
                  name="sessionCode"
                  type="text"
                  required
                  disabled={!infra.lobbyReady}
                  defaultValue={presetCode}
                  placeholder="AKAI-01"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-2.5 font-mono text-sm uppercase tracking-[0.2em] text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-rose-300/35"
                />
              </label>

              <label className="block">
                <span className="section-label">Nome</span>
                <input
                  name="playerName"
                  type="text"
                  required
                  disabled={!infra.lobbyReady}
                  placeholder="Akemi"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/20 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-[color:var(--ink-3)] focus:border-rose-300/35"
                />
              </label>
            </div>

            <div className="mt-3 flex items-center justify-end">
              <SubmitButton
                idleLabel="Entrar"
                pendingLabel="Entrando..."
                disabled={!infra.lobbyReady}
                className="border-rose-300/25 bg-rose-300/10 text-rose-50 hover:border-rose-300/40 hover:bg-rose-300/15"
              />
            </div>
          </form>
        )}

      </div>
    </section>
  );
}
