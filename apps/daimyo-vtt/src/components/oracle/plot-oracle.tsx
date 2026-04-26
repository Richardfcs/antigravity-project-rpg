"use client";

import { useState, useTransition } from "react";
import { Dice6, RefreshCw, Send, Sparkles } from "lucide-react";
import { TABELA_PLOT_D66 } from "@/lib/oracle/engine";
import { generateName } from "@/lib/oracle/name-generator";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface PlotOracleProps {
  sessionCode: string;
}

export function PlotOracle({ sessionCode }: PlotOracleProps) {
  const [result, setResult] = useState<{ roll: string, acao: string, tema: string } | null>(null);
  const [rumor, setRumor] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollD66 = () => {
    setIsRolling(true);
    setRumor(null);
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const roll = `${d1}${d2}`;
      const entry = TABELA_PLOT_D66[roll as keyof typeof TABELA_PLOT_D66];
      setResult({ roll, ...entry });
      setIsRolling(false);
      
      addEntry({
        type: 'plot',
        title: `Trama: ${entry.acao} + ${entry.tema}`,
        summary: `Resultado D66: ${roll}`,
        details: entry
      });
    }, 600);
  };

  const rollRumor = () => {
    setIsRolling(true);
    setResult(null);
    setTimeout(() => {
      const p1 = pick(['Dizem que', 'Corre o boato de que', 'Um viajante contou que', 'Houve um presságio de que']);
      const p2 = pick(['o Clã ' + generateName('clan'), 'a Vila ' + generateName('place'), 'a ' + generateName('establishment')]);
      const p3 = pick(['esconde um segredo terrível', 'foi atacado por sombras', 'está acumulando armas', 'recebeu um presente amaldiçoado', 'guarda uma relíquia sagrada']);
      const text = `${p1} ${p2} ${p3}.`;
      setRumor(text);
      setIsRolling(false);
      
      addEntry({
        type: 'plot',
        title: `Boato Narrativo`,
        summary: text,
        details: { rumor: text }
      });
    }, 600);
  };

  function pick(arr: string[]) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const handleBroadcast = () => {
    if (!result && !rumor) return;
    startTransition(async () => {
      if (result) {
        await broadcastOracleAction({
          sessionCode,
          title: "Oráculo de Trama",
          body: `**Ação:** ${result.acao} | **Tema:** ${result.tema}`,
          payload: { type: 'plot', ...result }
        });
      } else if (rumor) {
        await broadcastOracleAction({
          sessionCode,
          title: "Boatos e Rumores",
          body: `*${rumor}*`,
          payload: { type: 'rumor', text: rumor }
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Dice6 className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Trama & Boatos</h3>
        </div>
        <div className="flex gap-1">
          <button 
            onClick={rollD66}
            disabled={isRolling}
            title="Rolar Trama (d66)"
            className="p-1.5 hover:bg-white/5 rounded-lg text-[color:var(--text-muted)] hover:text-amber-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRolling && !rumor && "animate-spin")} />
          </button>
          <button 
            onClick={rollRumor}
            disabled={isRolling}
            title="Gerar Boato"
            className="p-1.5 hover:bg-white/5 rounded-lg text-[color:var(--text-muted)] hover:text-sky-400 transition-colors disabled:opacity-50"
          >
            <Sparkles className={cn("w-3.5 h-3.5", isRolling && rumor && "animate-pulse")} />
          </button>
        </div>
      </div>

      {!result && !rumor ? (
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={rollD66}
            disabled={isRolling}
            className="py-4 border border-dashed border-[var(--border-panel)] rounded-lg text-[9px] uppercase font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] hover:bg-white/[0.02] transition-all"
          >
            Trama (D66)
          </button>
          <button 
            onClick={rollRumor}
            disabled={isRolling}
            className="py-4 border border-dashed border-[var(--border-panel)] rounded-lg text-[9px] uppercase font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] hover:bg-white/[0.02] transition-all"
          >
            Boato
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          {result && (
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[var(--bg-input)] border border-[var(--border-panel)] shadow-inner">
                <span className="text-[10px] font-bold text-[color:var(--text-muted)] leading-none mb-1">D66</span>
                <span className="text-lg font-black text-amber-500 leading-none">{result.roll}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500/50" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Resultado</span>
                </div>
                <p className="text-sm font-display font-black text-[color:var(--text-primary)] uppercase tracking-tight">
                  {result.acao} <span className="text-[color:var(--text-muted)]">+</span> {result.tema}
                </p>
              </div>
            </div>
          )}

          {rumor && (
            <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-900/30">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 text-sky-500" />
                <span className="text-[9px] font-black uppercase text-sky-500 tracking-widest">Dizem nas ruas...</span>
              </div>
              <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed italic">
                "{rumor}"
              </p>
            </div>
          )}
          
          <div className="flex gap-2 pt-2 border-t border-[var(--border-panel)]">
            <button 
              onClick={handleBroadcast}
              disabled={isPending}
              className="flex-1 h-8 flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-input)] text-[10px] font-bold text-[color:var(--text-secondary)] transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              {isPending ? "Enviando..." : "Transmitir"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
