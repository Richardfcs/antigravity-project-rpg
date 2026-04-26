"use client";

import { useState, useTransition } from "react";
import { Users, Info, Send } from "lucide-react";
import { getSocialReaction } from "@/lib/oracle/engine";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface SocialReactionProps {
  sessionCode: string;
}

export function SocialReaction({ sessionCode }: SocialReactionProps) {
  const [modifier, setModifier] = useState(0);
  const [result, setResult] = useState<{ total: number, tier: string, text: string } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollReaction = () => {
    setIsRolling(true);
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3 + modifier;
      
      const reaction = getSocialReaction(total);
      setResult({ 
        total, 
        ...reaction 
      });
      setIsRolling(false);
      
      addEntry({
        type: 'reaction',
        title: `Reação Social: ${reaction.tier}`,
        summary: `Total: ${total} | Modificador: ${modifier}`,
        details: { total, modifier, ...reaction }
      });
    }, 600);
  };

  const handleBroadcast = () => {
    if (!result) return;
    startTransition(async () => {
      await broadcastOracleAction({
        sessionCode,
        title: "Reação Social",
        body: `**Nível:** ${result.tier} (${result.total})\n*${result.text}*`,
        payload: { type: 'reaction', ...result }
      });
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-panel)] pb-2">
        <Users className="w-4 h-4 text-emerald-500" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Reação Social (3d6)</h3>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-[10px] text-[color:var(--text-muted)] uppercase font-black mb-1 block">Modificador</label>
          <input 
            type="number" 
            value={modifier}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setModifier(parseInt(e.target.value) || 0)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border-panel)] rounded-lg px-3 py-2 text-sm text-[color:var(--text-primary)] outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>
        <button 
          onClick={rollReaction} 
          disabled={isRolling}
          className="flex-[2] mt-5 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-100 border border-emerald-900/40 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all"
        >
          Rolar Reação
        </button>
      </div>

      {result && (
        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] animate-in fade-in zoom-in duration-300">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-black text-emerald-500">{result.total}</span>
            <span className="text-[10px] font-black uppercase text-[color:var(--text-muted)] tracking-tighter">{result.tier}</span>
            <button 
              onClick={handleBroadcast}
              disabled={isPending}
              className="ml-auto p-1.5 hover:bg-white/5 rounded-lg text-emerald-500/50 hover:text-emerald-400 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed italic">
            "{result.text}"
          </p>
          
          <div className="mt-3 flex items-start gap-2 p-2 rounded bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
            <Info className="w-3 h-3 text-[color:var(--text-muted)] shrink-0 mt-0.5" />
            <p className="text-[9px] text-[color:var(--text-muted)] leading-tight">
              GURPS: Adicione bônus de aparência, carisma e status social ao teste.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
