"use client";

import { useState, useTransition } from "react";
import {
  Map, RefreshCw, Send, Skull, Trees, Anchor, Building, Mountain, ChevronDown,
  Sparkles, AlertTriangle, Clock, Coins, User, Flame, Snowflake, Sun, Wind, Shield
} from "lucide-react";
import {
  generateMissions, Mission, MissionParams, Ambiente, Tensao,
  AMBIENTE_LABELS, TENSAO_LABELS, PERIGO_LABELS
} from "@/lib/oracle/mission-generator";
import { Estacao } from "@/types/oracle";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface MissionBoardProps {
  sessionCode: string;
}

const AMBIENTE_ICONS: Record<Ambiente, any> = {
  urbano: Building,
  rural: Trees,
  naval: Anchor,
  selvagem: Mountain,
  subterraneo: Skull
};

const ESTACAO_ICONS: Record<Estacao, any> = {
  'Primavera': Trees,
  'Verão': Sun,
  'Outono': Wind,
  'Inverno': Snowflake
};

const PERIGO_COLORS = ['', 'text-emerald-400', 'text-sky-400', 'text-amber-400', 'text-orange-400', 'text-rose-400'];
const PERIGO_BG = ['', 'bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500'];

export function MissionBoard({ sessionCode }: MissionBoardProps) {
  const [params, setParams] = useState<MissionParams>({
    ambiente: 'rural',
    estacao: 'Primavera',
    tensao: 'calmaria',
    kegarePresente: false,
    nivelPerigo: 2
  });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollMissions = () => {
    setIsGenerating(true);
    setExpandedIdx(null);
    setTimeout(() => {
      const result = generateMissions(params, 3);
      setMissions(result);
      setIsGenerating(false);

      result.forEach(m => {
        addEntry({
          type: 'plot',
          title: `Missão: ${m.titulo}`,
          summary: `${m.tipo} — ${m.localizacao}`,
          details: m
        });
      });
    }, 1000);
  };

  const broadcastMission = (mission: Mission) => {
    startTransition(async () => {
      const extras = mission.recompensa.extras.length > 0
        ? `\n**Extras:** ${mission.recompensa.extras.join(', ')}`
        : '';

      await broadcastOracleAction({
        sessionCode,
        title: `Missão: ${mission.titulo}`,
        body: [
          `**Tipo:** ${mission.tipo} | **Perigo:** ${PERIGO_LABELS[mission.perigo]}`,
          `**Local:** ${mission.localizacao} | **Duração:** ${mission.duracao}`,
          `**Contato:** ${mission.npcContato}`,
          `\n**Objetivo:** ${mission.objetivo}`,
          `**Complicação:** ${mission.complicacao}`,
          `\n**Recompensa:** ${mission.recompensa.koku} Koku, ${mission.recompensa.mon} Mon${extras}`,
          mission.encontroSobrenatural ? `\n⚠️ *${mission.encontroSobrenatural}*` : ''
        ].filter(Boolean).join('\n'),
        payload: { type: 'mission', ...mission }
      });
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Map className="w-4 h-4 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Gerador de Missões</h3>
        </div>
        <button
          onClick={rollMissions}
          disabled={isGenerating}
          className="p-1.5 hover:bg-white/5 rounded-lg text-[color:var(--text-muted)] hover:text-emerald-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
        </button>
      </div>

      {/* ─── Parâmetros ─── */}
      <div className="space-y-3">
        {/* Ambiente */}
        <div>
          <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-black tracking-widest block mb-1.5">Ambiente</span>
          <div className="flex gap-1 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-panel)]">
            {(Object.keys(AMBIENTE_LABELS) as Ambiente[]).map((amb) => {
              const Icon = AMBIENTE_ICONS[amb];
              return (
                <button
                  key={amb}
                  onClick={() => setParams(p => ({ ...p, ambiente: amb }))}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-md transition-all text-[8px] font-black uppercase",
                    params.ambiente === amb
                      ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] shadow-md border border-[var(--border-panel)]"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", params.ambiente === amb ? "text-emerald-500" : "")} />
                  <span>{AMBIENTE_LABELS[amb]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Estação + Tensão (lado a lado) */}
        <div className="grid grid-cols-2 gap-2">
          {/* Estação */}
          <div>
            <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-black tracking-widest block mb-1.5">Estação</span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-panel)]">
              {(['Primavera', 'Verão', 'Outono', 'Inverno'] as Estacao[]).map((est) => {
                const Icon = ESTACAO_ICONS[est];
                return (
                  <button
                    key={est}
                    onClick={() => setParams(p => ({ ...p, estacao: est }))}
                    className={cn(
                      "flex items-center gap-1 py-1.5 px-2 rounded-md transition-all text-[8px] font-black uppercase",
                      params.estacao === est
                        ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] border border-[var(--border-panel)]"
                        : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{est.slice(0, 3)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tensão */}
          <div>
            <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-black tracking-widest block mb-1.5">Tensão</span>
            <div className="flex flex-col gap-1 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-panel)]">
              {(Object.keys(TENSAO_LABELS) as Tensao[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setParams(p => ({ ...p, tensao: t }))}
                  className={cn(
                    "py-1.5 px-2 rounded-md transition-all text-[8px] font-black uppercase text-left",
                    params.tensao === t
                      ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] border border-[var(--border-panel)]"
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
                  )}
                >
                  {TENSAO_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Perigo + Kegare */}
        <div className="grid grid-cols-2 gap-2">
          {/* Nível de perigo */}
          <div>
            <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-black tracking-widest block mb-1.5">Perigo ({PERIGO_LABELS[params.nivelPerigo]})</span>
            <div className="flex gap-1 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-panel)]">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setParams(p => ({ ...p, nivelPerigo: n }))}
                  className={cn(
                    "flex-1 py-2 rounded-md transition-all text-[10px] font-black",
                    params.nivelPerigo === n
                      ? `bg-[var(--bg-card)] ${PERIGO_COLORS[n]} shadow-md border border-[var(--border-panel)]`
                      : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Kegare toggle */}
          <div>
            <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-black tracking-widest block mb-1.5">Mácula (Kegare)</span>
            <button
              onClick={() => setParams(p => ({ ...p, kegarePresente: !p.kegarePresente }))}
              className={cn(
                "w-full py-3 rounded-lg border transition-all text-[10px] font-black uppercase flex items-center justify-center gap-2",
                params.kegarePresente
                  ? "bg-rose-950/40 border-rose-800/50 text-rose-400"
                  : "bg-[var(--bg-input)] border-[var(--border-panel)] text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
              )}
            >
              <Flame className={cn("w-3.5 h-3.5", params.kegarePresente && "text-rose-500")} />
              {params.kegarePresente ? 'Ativo' : 'Inativo'}
            </button>
          </div>
        </div>
      </div>

      {/* Botão gerar */}
      <button
        onClick={rollMissions}
        disabled={isGenerating}
        className="w-full h-10 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/40 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all disabled:opacity-50"
      >
        <RefreshCw className={cn("w-3 h-3 mr-2 inline", isGenerating && "animate-spin")} />
        Gerar 3 Missões
      </button>

      {/* ─── Resultados ─── */}
      {missions.length > 0 && (
        <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {missions.map((mission, idx) => (
            <div
              key={idx}
              className="rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] overflow-hidden hover:border-[color:var(--gold)]/20 transition-colors"
            >
              {/* Header clicável */}
              <button
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                className="w-full p-3 flex items-start gap-3 text-left"
              >
                {/* Perigo badge */}
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", PERIGO_BG[mission.perigo] + '/20')}>
                  <span className={cn("text-sm font-black", PERIGO_COLORS[mission.perigo])}>{mission.perigo}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[8px] uppercase font-black tracking-widest text-[color:var(--text-muted)]">{mission.tipo}</span>
                    {mission.encontroSobrenatural && (
                      <Sparkles className="w-2.5 h-2.5 text-rose-400" />
                    )}
                  </div>
                  <h4 className="text-xs font-black text-[color:var(--text-primary)] leading-tight truncate">{mission.titulo}</h4>
                  <p className="text-[9px] text-[color:var(--text-muted)] truncate">{mission.localizacao}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Coins className="w-3 h-3 text-amber-500" />
                  <span className="text-[9px] text-amber-400 font-bold">{mission.recompensa.koku}K</span>
                </div>

                <ChevronDown className={cn(
                  "w-3.5 h-3.5 text-[color:var(--text-muted)] transition-transform shrink-0",
                  expandedIdx === idx && "rotate-180"
                )} />
              </button>

              {/* Detalhes expandidos */}
              {expandedIdx === idx && (
                <div className="px-3 pb-3 space-y-3 border-t border-[var(--border-panel)] pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div>
                    <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Objetivo</span>
                    <p className="text-[10px] text-[color:var(--text-secondary)] leading-relaxed mt-0.5">{mission.objetivo}</p>
                  </div>

                  <div>
                    <span className="text-[8px] text-orange-600 uppercase font-black">Complicação</span>
                    <p className="text-[10px] text-[color:var(--text-muted)] leading-relaxed mt-0.5 italic">{mission.complicacao}</p>
                  </div>

                  {mission.encontroSobrenatural && (
                    <div className="p-2 rounded-md bg-rose-950/20 border border-rose-900/20">
                      <div className="flex items-center gap-1.5 mb-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span className="text-[8px] text-rose-400 uppercase font-black">Encontro Sobrenatural</span>
                      </div>
                      <p className="text-[9px] text-[color:var(--text-muted)] italic leading-tight">{mission.encontroSobrenatural}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded-md bg-[var(--bg-card)]/50 text-center">
                      <User className="w-3 h-3 text-[color:var(--text-muted)] mx-auto mb-0.5" />
                      <span className="text-[8px] text-[color:var(--text-muted)] uppercase block">Contato</span>
                      <span className="text-[9px] text-[color:var(--text-primary)] font-bold block truncate">{mission.npcContato}</span>
                    </div>
                    <div className="p-2 rounded-md bg-[var(--bg-card)]/50 text-center">
                      <Clock className="w-3 h-3 text-[color:var(--text-muted)] mx-auto mb-0.5" />
                      <span className="text-[8px] text-[color:var(--text-muted)] uppercase block">Duração</span>
                      <span className="text-[9px] text-[color:var(--text-primary)] font-bold block">{mission.duracao}</span>
                    </div>
                    <div className="p-2 rounded-md bg-amber-950/30 text-center">
                      <Coins className="w-3 h-3 text-amber-500 mx-auto mb-0.5" />
                      <span className="text-[8px] text-amber-600 uppercase block">Recompensa</span>
                      <span className="text-[9px] text-amber-300 font-bold block">{mission.recompensa.koku}K / {mission.recompensa.mon}M</span>
                    </div>
                  </div>

                  {mission.recompensa.extras.length > 0 && (
                    <div>
                      <span className="text-[8px] text-emerald-600 uppercase font-black">Bônus</span>
                      {mission.recompensa.extras.map((ex, i) => (
                        <p key={i} className="text-[9px] text-emerald-400 mt-0.5">★ {ex}</p>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => broadcastMission(mission)}
                    disabled={isPending}
                    className="w-full h-8 flex items-center justify-center gap-2 rounded-lg bg-emerald-900/30 hover:bg-emerald-900/50 text-[10px] font-bold text-emerald-300 transition-colors disabled:opacity-50"
                  >
                    <Send className="w-3 h-3" />
                    {isPending ? "Enviando..." : "Transmitir Missão"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
