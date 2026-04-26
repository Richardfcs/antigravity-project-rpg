"use client";

import { useState, useTransition } from "react";
import { Package, RefreshCw, Send, Sparkles, Coins } from "lucide-react";
import { generateLoot, ItemAchado } from "@/lib/oracle/engine";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface LootGeneratorProps {
  sessionCode: string;
}

export function LootGenerator({ sessionCode }: LootGeneratorProps) {
  const [loot, setLoot] = useState<ItemAchado | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollLoot = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newItem = generateLoot();
      setLoot(newItem);
      setIsGenerating(false);
      
      addEntry({
        type: 'plot', // Usando plot como categoria genérica ou poderíamos criar 'loot'
        title: `Achado: ${newItem.nome}`,
        summary: newItem.detalhe,
        details: newItem
      });
    }, 600);
  };

  const handleBroadcast = () => {
    if (!loot) return;
    startTransition(async () => {
      await broadcastOracleAction({
        sessionCode,
        title: "Item Encontrado",
        body: `**Item:** ${loot.nome}\n**Detalhe:** ${loot.detalhe}\n**Valor:** ${loot.valor}`,
        payload: { type: 'loot', ...loot }
      });
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Achados & Curiosidades</h3>
        </div>
        <button 
          onClick={rollLoot}
          disabled={isGenerating}
          className="p-1.5 hover:bg-white/5 rounded-lg text-[color:var(--text-muted)] hover:text-amber-500 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <button 
          onClick={rollLoot}
          disabled={isGenerating}
          className="w-full py-4 border border-dashed border-[var(--border-panel)] rounded-lg text-[10px] uppercase font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] hover:bg-white/[0.02] transition-all"
        >
          Gerar Item Aleatório
        </button>
      </div>

      {loot && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] relative group">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-3.5 h-3.5 text-amber-500/50" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">{loot.valor}</span>
            </div>
            <h4 className="text-sm font-display font-black text-amber-500 uppercase tracking-tight mb-2">{loot.nome}</h4>
            <p className="text-xs text-[color:var(--text-secondary)] italic leading-tight">
              "{loot.detalhe}"
            </p>
          </div>
          
          <button 
            onClick={handleBroadcast}
            disabled={isPending}
            className="w-full h-8 flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[10px] font-bold text-[color:var(--text-secondary)] transition-colors disabled:opacity-50 border border-[var(--border-panel)]"
          >
            <Send className="w-3 h-3" />
            {isPending ? "Enviando..." : "Transmitir Item"}
          </button>
        </div>
      )}
    </div>
  );
}
