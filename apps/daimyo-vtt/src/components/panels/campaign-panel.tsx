"use client";

import { MissionBoard } from "@/components/oracle/mission-board";
import { JourneyWeather } from "@/components/oracle/journey-weather";
import { TaintOracle } from "@/components/oracle/taint-oracle";
import { SocialReaction } from "@/components/oracle/social-reaction";
import { MonogatariOracle } from "@/components/oracle/monogatari-oracle";
import { PlotOracle } from "@/components/oracle/plot-oracle";
import { QuickOracle } from "@/components/oracle/quick-oracle";
import { Map, Cloud, Eye, ScrollText, Users, Ghost, Dice6, Zap } from "lucide-react";

interface CampaignPanelProps {
  sessionCode: string;
}

export function CampaignPanel({ sessionCode }: CampaignPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[var(--bg-deep)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-panel)] bg-[var(--bg-panel)]/50">
        <h2 className="text-sm font-display font-black text-[color:var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-2">
          <Map className="w-4 h-4 text-[color:var(--gold)]" />
          Crônicas da Campanha
        </h2>
        <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-wider mt-1">Gestão de Mundo e Narrativa</p>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-10 pb-24 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Oráculo de Trama */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
              <Dice6 size={14} className="text-amber-500" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--text-primary)]">Oráculo de Trama</h3>
          </div>
          <div className="grid gap-4">
            <PlotOracle sessionCode={sessionCode} />
            <QuickOracle sessionCode={sessionCode} />
          </div>
        </section>

        {/* Mural de Missões */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]">
              <Map size={14} className="text-sky-500" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--text-primary)]">Mural de Missões</h3>
          </div>
          <MissionBoard sessionCode={sessionCode} />
        </section>

        {/* Clima e Jornada */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
              <Cloud size={14} className="text-cyan-500" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--text-primary)]">Condições de Jornada</h3>
          </div>
          <JourneyWeather sessionCode={sessionCode} />
        </section>

        {/* Reação Social */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
              <Users size={14} className="text-orange-500" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--text-primary)]">Interação Social</h3>
          </div>
          <SocialReaction sessionCode={sessionCode} />
        </section>

        {/* Monogatari */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
              <Ghost size={14} className="text-fuchsia-500" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--text-primary)]">Aberrações Monogatari</h3>
          </div>
          <MonogatariOracle sessionCode={sessionCode} />
        </section>

        {/* Mácula e Corrupção */}
        <section className="space-y-4 relative">
          <div className="flex items-center gap-2 px-1">
            <div className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
              <Eye size={14} className="text-rose-500" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[color:var(--text-primary)]">Mácula e Corrupção</h3>
          </div>
          <TaintOracle sessionCode={sessionCode} />
        </section>
      </div>
    </div>
  );
}
