"use client";

import { useState } from "react";
import { 
  Zap, 
  UserPlus, 
  RotateCw, 
  Send,
  User,
  Shield,
  Search
} from "lucide-react";
import { generateNPC, TWISTS } from "@/lib/oracle/engine";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface QuickOracleProps {
  sessionCode: string;
}

export function QuickOracle({ sessionCode }: QuickOracleProps) {
  const [npc, setNpc] = useState<any>(null);
  const [twist, setTwist] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const addEntry = useOracleStore(state => state.addEntry);

  const rollNpc = () => {
    setIsGenerating(true);
    setTwist(null);
    setTimeout(() => {
      const result = generateNPC();
      setNpc(result);
      setIsGenerating(false);
      addEntry({
        type: 'npc',
        title: `NPC: ${result.nome}`,
        summary: `${result.especialidade} do Clã ${result.cla}`,
        details: result
      });
    }, 500);
  };

  const rollTwist = () => {
    setIsGenerating(true);
    setNpc(null);
    setTimeout(() => {
      const result = TWISTS[Math.floor(Math.random() * TWISTS.length)];
      setTwist(result);
      setIsGenerating(false);
      addEntry({
        type: 'plot',
        title: `Reviravolta de Trama`,
        summary: result,
        details: { twist: result }
      });
    }, 500);
  };

  const handleBroadcastNpc = async () => {
    if (!npc) return;
    await broadcastOracleAction({
      sessionCode,
      title: `Personagem: ${npc.nome}`,
      body: `**Clã:** ${npc.cla} | **Especialidade:** ${npc.especialidade}\n\n*${npc.traco}*`,
      payload: { type: 'npc', ...npc }
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Geração Rápida</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={rollNpc}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[10px] font-bold text-[color:var(--text-secondary)] transition-colors border border-[var(--border-panel)]"
        >
          <UserPlus size={14} />
          Novo NPC
        </button>
        <button 
          onClick={rollTwist}
          className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[10px] font-bold text-[color:var(--text-secondary)] transition-colors border border-[var(--border-panel)]"
        >
          <RotateCw size={14} />
          Reviravolta
        </button>
      </div>

      {npc && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)]">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-[8px] font-black text-[color:var(--text-muted)] uppercase tracking-widest">Clã {npc.cla}</p>
                <h4 className="text-sm font-black text-[color:var(--text-primary)] uppercase">{npc.nome}</h4>
              </div>
              <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-[8px] font-black text-[color:var(--text-muted)] uppercase border border-[var(--border-panel)]">
                {npc.especialidade}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <User size={12} className="text-[color:var(--text-muted)] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[color:var(--text-secondary)] italic leading-tight">{npc.traco}</p>
              </div>
              <div className="flex gap-2">
                <Shield size={12} className="text-rose-500/50 shrink-0 mt-0.5" />
                <p className="text-[10px] text-[color:var(--text-muted)] leading-tight">
                  <span className="text-rose-400/70 font-bold uppercase text-[8px] mr-1">Segredo (Mestre):</span>
                  {npc.segredo}
                </p>
              </div>
            </div>
            <button 
              onClick={handleBroadcastNpc}
              className="mt-3 w-full h-7 flex items-center justify-center gap-2 rounded-md bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[9px] font-bold text-[color:var(--text-muted)] uppercase transition-colors border border-[var(--border-panel)]"
            >
              <Send size={10} />
              Transmitir Identidade
            </button>
          </div>
        </div>
      )}

      {twist && (
        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 mb-1.5">
            <Search size={12} className="text-amber-500" />
            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Complicação Súbita</span>
          </div>
          <p className="text-xs text-[color:var(--text-primary)] leading-relaxed font-medium">
            {twist}
          </p>
        </div>
      )}
    </div>
  );
}
