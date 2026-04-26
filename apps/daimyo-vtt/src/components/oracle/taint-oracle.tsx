"use client";

import { useState, useTransition } from "react";
import { Eye, Zap, ShieldAlert, Dice6, Ghost, Send } from "lucide-react";
import { MUTACOES_KEGARE } from "@/lib/oracle/engine";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface TaintOracleProps {
  sessionCode: string;
}

const FRIGHT_TABLE = [
  { min: 0, max: 3, level: 'Leve', effect: 'O personagem solta o que estiver segurando e fica atordoado por 1 turno.' },
  { min: 4, max: 6, level: 'Moderado', effect: 'Fuga descontrolada: o personagem deve fugir da fonte do medo por 1d turnos.' },
  { min: 7, max: 9, level: 'Grave', effect: 'Paralisia de Terror: o personagem cai no chão e fica incapaz de agir por 1d turnos.' },
  { min: 10, max: 12, level: 'Crítico', effect: 'Desmaio: o personagem perde a consciência por 1d minutos.' },
  { min: 13, max: 15, level: 'Traumático', effect: 'Pesadelos Recorrentes: adicione uma fobia ou desvantagem mental temporária.' },
  { min: 16, max: 18, level: 'Obsessivo', effect: 'O personagem desenvolve um tique nervoso ou obsessão relacionada à fonte do medo.' },
  { min: 19, max: 21, level: 'Catatônico', effect: 'Estado vegetativo por 1d horas. O personagem não responde a estímulos externos.' },
  { min: 22, max: Infinity, level: 'Fatal', effect: 'O coração para. O personagem morre de susto ou entra em coma permanente.' }
];

export function TaintOracle({ sessionCode }: TaintOracleProps) {
  const [mutation, setMutation] = useState<{ titulo: string, desc: string } | null>(null);
  const [fright, setFright] = useState<{ total: number, level: string, effect: string } | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollMutation = () => {
    setIsRolling(true);
    setTimeout(() => {
      const mut = MUTACOES_KEGARE[Math.floor(Math.random() * MUTACOES_KEGARE.length)];
      setMutation(mut);
      setFright(null);
      setIsRolling(false);
      
      addEntry({
        type: 'taint',
        title: `Mutação: ${mut.titulo}`,
        summary: mut.desc,
        details: mut
      });
    }, 500);
  };

  const rollFright = () => {
    setIsRolling(true);
    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const total = d1 + d2 + d3;
      
      const res = FRIGHT_TABLE.find(t => total >= t.min && total <= t.max) || FRIGHT_TABLE[0];
      setFright({ total, level: res.level, effect: res.effect });
      setMutation(null);
      setIsRolling(false);
      
      addEntry({
        type: 'taint',
        title: `Pânico: ${res.level}`,
        summary: `Resultado: ${total} | ${res.effect}`,
        details: { total, ...res }
      });
    }, 500);
  };

  const handleBroadcast = () => {
    startTransition(async () => {
      if (mutation) {
        await broadcastOracleAction({
          sessionCode,
          title: "Corrupção de Kegare",
          body: `**${mutation.titulo}**\n*${mutation.desc}*`,
          payload: { type: 'mutation', ...mutation }
        });
      } else if (fright) {
        await broadcastOracleAction({
          sessionCode,
          title: "Efeito de Pânico",
          body: `**Nível:** ${fright.level} (${fright.total})\n**Efeito:** ${fright.effect}`,
          payload: { type: 'fright', ...fright }
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-panel)] pb-2">
        <Eye className="w-4 h-4 text-purple-500" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Oráculo da Mácula</h3>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={rollMutation} 
          disabled={isRolling}
          className="flex-1 h-9 flex items-center justify-center bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-900/40 rounded-lg text-[10px] uppercase font-black transition-all"
        >
          <Zap className="w-3 h-3 mr-2 text-purple-400" />
          Mutação
        </button>
        <button 
          onClick={rollFright} 
          disabled={isRolling}
          className="flex-1 h-9 flex items-center justify-center bg-[var(--bg-input)] hover:bg-[var(--bg-card)] text-[color:var(--text-secondary)] border border-[var(--border-panel)] rounded-lg text-[10px] uppercase font-black transition-all"
        >
          <Ghost className="w-3 h-3 mr-2 text-[color:var(--text-muted)]" />
          Medo
        </button>
      </div>

      {(mutation || fright) && (
        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-purple-900/30 animate-in fade-in zoom-in duration-300 relative group">
          <button 
            onClick={handleBroadcast}
            disabled={isPending}
            className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-purple-400 hover:bg-white/5 rounded"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
          
          {mutation && (
            <div className="text-center">
              <span className="text-[10px] text-purple-500 font-black uppercase tracking-[0.2em] block mb-1">Kegare Reificado</span>
              <h4 className="text-sm font-display font-black text-purple-100 uppercase mb-2">{mutation.titulo}</h4>
              <p className="text-xs text-[color:var(--text-muted)] leading-tight italic">
                "{mutation.desc}"
              </p>
            </div>
          )}
          {fright && (
            <div className="text-center">
              <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest block mb-1">
                Falha Crítica no Medo ({fright.total})
              </span>
              <p className="text-sm text-rose-100 font-medium leading-tight">
                {fright.effect}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-2 p-3 rounded-lg bg-rose-950/10 border border-rose-900/20">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-3 h-3 text-rose-700" />
          <span className="text-[9px] text-rose-700 font-black uppercase">Lembrete GURPS</span>
        </div>
        <p className="text-[9px] text-[color:var(--text-muted)] leading-tight">
          Testes de Medo falhos adicionam a margem de falha ao resultado da tabela de pânico acima.
        </p>
      </div>
    </div>
  );
}
