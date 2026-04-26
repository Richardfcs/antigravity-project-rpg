"use client";

import { useState } from "react";
import { PlotOracle } from "@/components/oracle/plot-oracle";
import { SocialReaction } from "@/components/oracle/social-reaction";
import { NpcGenerator } from "@/components/oracle/npc-generator";
import { JourneyWeather } from "@/components/oracle/journey-weather";
import { EnemyGenerator } from "@/components/oracle/enemy-generator";
import { TaintOracle } from "@/components/oracle/taint-oracle";
import { LootGenerator } from "@/components/oracle/loot-generator";
import { FullLootGenerator } from "@/components/oracle/full-loot-generator";
import { MissionBoard } from "@/components/oracle/mission-board";
import { MonogatariOracle } from "@/components/oracle/monogatari-oracle";
import { Sparkles, Sword, Eye, History, Trash2, Coins, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";

type OracleTab = "session" | "creation" | "loot" | "missions" | "taint" | "history";

interface OraclePanelProps {
  sessionCode: string;
}

export function OraclePanel({ sessionCode }: OraclePanelProps) {
  const [activeTab, setActiveTab] = useState<OracleTab>("session");
  const { history, clearHistory } = useOracleStore();

  const tabs = [
    { id: "session", label: "Sessão", icon: Sparkles },
    { id: "creation", label: "Criação", icon: Sword },
    { id: "loot", label: "Loot", icon: Coins },
    { id: "missions", label: "Missões", icon: Map },
    { id: "taint", label: "Mácula", icon: Eye },
    { id: "history", label: "Logs", icon: History }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)] overflow-hidden">
      <div className="p-4 border-b border-[var(--border-panel)] bg-[var(--bg-card)]/50">
        <h2 className="text-sm font-display font-black text-[color:var(--text-primary)] uppercase tracking-[0.2em] flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[color:var(--gold)]" />
          Oráculo do Daimyo
        </h2>
        <p className="text-[10px] text-[color:var(--text-muted)] uppercase tracking-wider mt-1">Ferramentas de Improvisação e Narrativa</p>
      </div>

      <div className="px-4 pt-4">
        <div className="flex p-1 bg-[var(--bg-input)] border border-[var(--border-panel)] rounded-xl gap-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as OracleTab)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all min-w-0 shrink-0",
                activeTab === tab.id 
                  ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] shadow-lg border border-[var(--border-panel)]" 
                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)] hover:bg-[var(--bg-panel)]/5"
              )}
            >
              <tab.icon className="w-3 h-3 shrink-0" />
              <span className="hidden sm:inline truncate">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-8 pb-24">
          {activeTab === "session" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <PlotOracle sessionCode={sessionCode} />
              <SocialReaction sessionCode={sessionCode} />
              <JourneyWeather sessionCode={sessionCode} />
              <LootGenerator sessionCode={sessionCode} />
            </div>
          )}

          {activeTab === "creation" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <NpcGenerator sessionCode={sessionCode} />
              <EnemyGenerator sessionCode={sessionCode} />
              <MonogatariOracle sessionCode={sessionCode} />
            </div>
          )}

          {activeTab === "loot" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <FullLootGenerator sessionCode={sessionCode} />
            </div>
          )}

          {activeTab === "missions" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <MissionBoard sessionCode={sessionCode} />
            </div>
          )}

          {activeTab === "taint" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
               <TaintOracle sessionCode={sessionCode} />
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-[color:var(--text-muted)] uppercase font-black">Histórico Recente</span>
                <button 
                  onClick={clearHistory}
                  className="p-1.5 text-[color:var(--text-muted)]/60 hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <History className="w-8 h-8 text-[color:var(--text-muted)]/20 mx-auto mb-2" />
                  <p className="text-xs text-[color:var(--text-muted)]/40 uppercase font-bold">Nenhum log disponível</p>
                </div>
              ) : (
                history.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-lg bg-[var(--bg-input)] border border-[var(--border-panel)] hover:border-[color:var(--gold)]/30 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[9px] text-[color:var(--text-muted)]/50 font-mono">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-[8px] bg-[var(--bg-card)] px-1 rounded text-[color:var(--text-muted)] uppercase font-black">
                        {entry.type}
                      </span>
                    </div>
                    <h5 className="text-[11px] font-black text-[color:var(--text-primary)] uppercase leading-tight mb-1">{entry.title}</h5>
                    <p className="text-[10px] text-[color:var(--text-secondary)] leading-tight italic line-clamp-2">
                      {entry.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
