"use client";

import { useState, useTransition } from "react";
import { Users, RefreshCw, Send, Fingerprint, Sparkles, PlusCircle, UserPlus, User } from "lucide-react";
import { generateNPC } from "@/lib/oracle/engine";
import { NpcProfile } from "@/types/oracle";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction, spawnOracleNpcAction } from "@/app/actions/oracle-actions";

interface NpcGeneratorProps {
  sessionCode: string;
}

export function NpcGenerator({ sessionCode }: NpcGeneratorProps) {
  const [npc, setNpc] = useState<NpcProfile | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollNpc = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newNpc = generateNPC();
      setNpc(newNpc);
      setIsGenerating(false);
      
      addEntry({
        type: 'npc',
        title: `NPC: ${newNpc.nome}`,
        summary: `${newNpc.cla} | ${newNpc.especialidade}`,
        details: newNpc
      });
    }, 600);
  };

  const handleBroadcast = () => {
    if (!npc) return;
    startTransition(async () => {
      await broadcastOracleAction({
        sessionCode,
        title: "Figura Gerada",
        body: `**Nome:** ${npc.nome}\n**Clã:** ${npc.cla}\n**Especialidade:** ${npc.especialidade}\n**Traço:** ${npc.traco}`,
        payload: { type: 'npc', ...npc }
      });
    });
  };

  const handleAddToArena = () => {
    if (!npc) return;
    startTransition(async () => {
      await spawnOracleNpcAction({ sessionCode, npc });
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-sky-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Figuras (NPCs)</h3>
        </div>
        <button 
          onClick={rollNpc}
          disabled={isGenerating}
          className="p-1.5 hover:bg-white/5 rounded-lg text-[color:var(--text-muted)] hover:text-sky-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
        </button>
      </div>

      {!npc ? (
        <button 
          onClick={rollNpc}
          disabled={isGenerating}
          className="w-full py-4 bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[color:var(--text-secondary)] border border-[var(--border-panel)] rounded-lg text-[10px] uppercase font-black tracking-widest transition-all"
        >
          Gerar Novo NPC
        </button>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] relative overflow-hidden group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] text-[color:var(--accent)] font-black uppercase tracking-widest mb-1 block">Clã {npc.cla}</span>
                <h4 className="text-xl font-display font-black text-[color:var(--text-primary)] uppercase tracking-tight">{npc.nome}</h4>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] text-[color:var(--text-muted)] font-bold uppercase">{npc.especialidade}</span>
                <button 
                  onClick={handleBroadcast}
                  disabled={isPending}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-white/5 rounded text-sky-500/50 hover:text-sky-400"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
                <div className="flex items-center gap-2 mb-1.5">
                  <User size={12} className="text-[color:var(--text-muted)]" />
                  <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-bold block">Traço Distintivo</span>
                </div>
                <p className="text-xs text-[color:var(--text-secondary)] leading-tight">{npc.traco}</p>
              </div>
                <div className="space-y-1 p-2 rounded bg-rose-950/20 border border-rose-900/20">
                  <span className="text-[9px] text-rose-500 uppercase font-bold block">Segredo / Motivação</span>
                  <p className="text-xs text-rose-200/70 italic leading-tight">"{npc.segredo}"</p>
                </div>
              </div>
          </div>

          <button 
            onClick={handleBroadcast}
            disabled={isPending}
            className="w-full h-8 flex items-center justify-center gap-2 rounded-lg bg-sky-900 hover:bg-sky-800 text-white text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? "Transmitindo..." : "Transmitir ao Chat"}
          </button>
          <button
            onClick={handleAddToArena}
            disabled={isPending}
            className="w-full h-8 flex items-center justify-center gap-2 rounded-lg bg-emerald-900/40 hover:bg-emerald-900/60 text-emerald-300 text-[10px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {isPending ? "Criando..." : "Criar Ficha na Sessão"}
          </button>
        </div>
      )}
    </div>
  );
}
