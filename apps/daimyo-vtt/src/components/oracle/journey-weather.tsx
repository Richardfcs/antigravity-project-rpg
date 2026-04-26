"use client";

import { useState, useTransition } from "react";
import { CloudRain, Wind, Compass, RefreshCw, Sun, Snowflake, Trees, Send, Cloud } from "lucide-react";
import { generateJourney } from "@/lib/oracle/engine";
import { JourneyEvent, Estacao } from "@/types/oracle";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface JourneyWeatherProps {
  sessionCode: string;
}

export function JourneyWeather({ sessionCode }: JourneyWeatherProps) {
  const [estacao, setEstacao] = useState<Estacao>("Primavera");
  const [journey, setJourney] = useState<JourneyEvent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollJourney = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newJourney = generateJourney(estacao);
      setJourney(newJourney);
      setIsGenerating(false);
      
      addEntry({
        type: 'journey',
        title: `Jornada: ${estacao}`,
        summary: newJourney.clima.split(':')[0],
        details: { estacao, ...newJourney }
      });
    }, 600);
  };

  const handleBroadcast = () => {
    if (!journey) return;
    startTransition(async () => {
      await broadcastOracleAction({
        sessionCode,
        title: `Clima e Jornada (${estacao})`,
        body: `**Clima:** ${journey.clima}\n**Visibilidade:** ${journey.visibilidade}\n**Encontro:** ${journey.encontro}`,
        payload: { type: 'journey', estacao, ...journey }
      });
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-sky-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Jornada & Clima</h3>
        </div>
      </div>

      <div className="flex gap-1.5 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-panel)]">
        {([
          { id: 'Primavera', icon: Trees, color: 'text-emerald-500' },
          { id: 'Verão', icon: Sun, color: 'text-amber-500' },
          { id: 'Outono', icon: Wind, color: 'text-orange-500' },
          { id: 'Inverno', icon: Snowflake, color: 'text-sky-400' },
        ] as const).map((e) => (
          <button
            key={e.id}
            onClick={() => setEstacao(e.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-1.5 rounded-md transition-all text-[8px] font-black uppercase",
              estacao === e.id
                ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] shadow-md border border-[var(--border-panel)]" 
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
            )}
          >
            <e.icon className={cn("w-4 h-4", estacao === e.id ? e.color : "text-[color:var(--text-muted)]")} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{e.id}</span>
          </button>
        ))}
      </div>

      <button 
        onClick={rollJourney}
        disabled={isGenerating}
        className="w-full h-9 bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[color:var(--text-secondary)] border border-[var(--border-panel)] rounded-lg text-[10px] uppercase font-black tracking-widest transition-all"
      >
        <RefreshCw className={cn("w-3 h-3 mr-2 inline", isGenerating && "animate-spin")} />
        Gerar Condições
      </button>

      {journey && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] text-center relative group">
              <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-bold block mb-1">Clima Atual</span>
              <p className="text-sm font-black text-[color:var(--text-primary)] leading-none">{journey.clima.split(':')[0]}</p>
              <button 
                onClick={handleBroadcast}
                disabled={isPending}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/5 rounded text-sky-500/50 hover:text-sky-400"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] text-center">
              <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-bold block mb-1">Visibilidade</span>
              <p className="text-sm font-black text-[color:var(--text-primary)] leading-none">{journey.visibilidade}</p>
            </div>
          </div>

          <div className="p-4 bg-[var(--bg-card)]/50 rounded-lg border border-[var(--border-panel)]">
            <div className="flex items-center gap-2 mb-2">
              <Wind className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest">Encontro de Jornada</span>
            </div>
            <p className="text-xs text-[color:var(--text-secondary)] leading-relaxed font-medium italic">
              "{journey.encontro}"
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
