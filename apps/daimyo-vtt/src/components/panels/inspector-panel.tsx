import {
  CheckCircle2,
  CircleAlert,
  DatabaseZap,
  ImageUp,
  Webhook
} from "lucide-react";

import type { InfraReadiness } from "@/types/infra";
import type { OnlinePresence } from "@/types/presence";
import type { SessionShellSnapshot } from "@/types/session";

interface InspectorPanelProps {
  snapshot: SessionShellSnapshot;
  infra: InfraReadiness;
  party: OnlinePresence[];
}

export function InspectorPanel({
  snapshot,
  infra,
  party
}: InspectorPanelProps) {
  return (
    <section className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[var(--bg-panel-strong)] p-4">
      <header className="border-b border-white/8 pb-4">
        <p className="section-label">Inspector</p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Estado da Infraestrutura
        </h2>
      </header>

      <div className="scrollbar-thin mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
        <article className="stat-card">
          <p className="section-label">Sessão</p>
          <div className="mt-3 space-y-2 text-sm text-[color:var(--ink-2)]">
            <div className="flex items-center justify-between">
              <span>Código</span>
              <strong className="font-mono text-white">{snapshot.code}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Campanha</span>
              <strong className="text-white">{snapshot.campaignName}</strong>
            </div>
            <div className="flex items-center justify-between">
              <span>Participantes</span>
              <strong className="text-white">{party.length}</strong>
            </div>
          </div>
        </article>

        <article className="stat-card">
          <p className="section-label">Serviços</p>
          <div className="mt-3 space-y-3">
            {[
              {
                label: "Supabase Client",
                ok: infra.supabase,
                icon: DatabaseZap
              },
              {
                label: "Cloudinary Upload",
                ok: infra.cloudinary,
                icon: ImageUp
              },
              {
                label: "Service Role",
                ok: infra.serviceRole,
                icon: Webhook
              }
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-3"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
                  <item.icon size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  <p className="mt-1 text-xs text-[color:var(--ink-3)]">
                    {item.ok ? "ready" : "missing env"}
                  </p>
                </div>
                {item.ok ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : (
                  <CircleAlert size={18} className="text-amber-400" />
                )}
              </div>
            ))}
          </div>
        </article>

        <article className="stat-card">
          <p className="section-label">API Surfaces</p>
          <div className="mt-3 space-y-3 text-sm text-[color:var(--ink-2)]">
            <div className="rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="font-medium text-white">GET /api/health</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--ink-3)]">
                expõe readiness das integrações base da aplicação
              </p>
            </div>
            <div className="rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-3">
              <p className="font-medium text-white">POST /api/cloudinary/sign</p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--ink-3)]">
                retorna assinatura para upload direto no Cloudinary
              </p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
