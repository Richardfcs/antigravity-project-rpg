"use client";

import { useState, useTransition } from "react";
import {
  Brain, RefreshCw, Send, ChevronDown, Eye, Heart, Ghost,
  Skull, Shield, MessageCircle, Sparkles, AlertTriangle, Search, KeyRound
} from "lucide-react";
import {
  generateMonogatariEvent, MonogatariEvent,
  INTENSIDADE_COLORS, INTENSIDADE_BG, INTENSIDADE_LABELS
} from "@/lib/oracle/monogatari-generator";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface MonogatariOracleProps {
  sessionCode: string;
}

export function MonogatariOracle({ sessionCode }: MonogatariOracleProps) {
  const [event, setEvent] = useState<MonogatariEvent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollEvent = () => {
    setIsGenerating(true);
    setExpandedSection(null);
    setTimeout(() => {
      const result = generateMonogatariEvent();
      setEvent(result);
      setIsGenerating(false);

      addEntry({
        type: 'taint',
        title: `Monogatari: ${result.aberracao.nome}`,
        summary: `${result.origem.emocao} — Intensidade ${result.intensidade}`,
        details: result
      });
    }, 1000);
  };

  const handleBroadcast = () => {
    if (!event) return;
    startTransition(async () => {
      await broadcastOracleAction({
        sessionCode,
        title: `Aberração: ${event.aberracao.nome}`,
        body: [
          `*${event.frase}*`,
          `\n**Aparência:** ${event.aberracao.aparencia}`,
          `**Natureza Aparente:** ${event.aberracao.natureza}`,
          `\n**Intensidade:** ${INTENSIDADE_LABELS[event.intensidade]} (${event.intensidade}/5)`,
          `\n> ⚠️ *A verdade por trás desta aberração não é o que parece...*`
        ].join('\n'),
        payload: { type: 'monogatari', ...event }
      });
    });
  };

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  const Section = ({ id, icon: Icon, label, color, children }: {
    id: string; icon: any; label: string; color: string; children: React.ReactNode;
  }) => (
    <div className="rounded-lg bg-[var(--bg-input)] border border-[var(--border-panel)] overflow-hidden">
      <button
        onClick={() => toggleSection(id)}
        className="w-full p-3 flex items-center gap-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
        <span className={cn("text-[9px] font-black uppercase tracking-widest flex-1", color)}>{label}</span>
        <ChevronDown className={cn(
          "w-3 h-3 text-[color:var(--text-muted)] transition-transform",
          expandedSection === id && "rotate-180"
        )} />
      </button>
      {expandedSection === id && (
        <div className="px-3 pb-3 border-t border-[var(--border-panel)] pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-[color:var(--accent)]" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Monogatari</h3>
            <p className="text-[8px] text-[color:var(--text-muted)] uppercase tracking-wider">Aberrações da Psique</p>
          </div>
        </div>
        <button
          onClick={rollEvent}
          disabled={isGenerating}
          className="p-1.5 hover:bg-[var(--mist)] rounded-lg text-[color:var(--text-muted)] hover:text-[color:var(--gold)] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
        </button>
      </div>

      {!event ? (
        <div className="text-center py-6">
          <Ghost className="w-8 h-8 text-[color:var(--text-muted)]/20 mx-auto mb-3" />
          <p className="text-[10px] text-[color:var(--text-muted)] italic mb-4 max-w-[200px] mx-auto leading-relaxed">
            "O monstro que você vê é o monstro que você criou."
          </p>
          <button
            onClick={rollEvent}
            disabled={isGenerating}
            className="px-6 py-3 border border-dashed border-[var(--border-panel)] rounded-lg text-[10px] uppercase font-bold text-[color:var(--text-muted)] hover:text-[color:var(--accent)] hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 transition-all"
          >
            Manifestar Aberração
          </button>
        </div>
      ) : (
        <div className="space-y-3 animate-in fade-in zoom-in duration-500">
          {/* Frase temática */}
          <div className="p-3 rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-center">
            <p className="text-[10px] text-[var(--accent)]/80 italic leading-relaxed">
              {event.frase}
            </p>
          </div>

          {/* Header: Nome + Intensidade */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)]">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              INTENSIDADE_BG[event.intensidade] + '/20'
            )}>
              <span className={cn("text-lg font-black", INTENSIDADE_COLORS[event.intensidade])}>
                {event.intensidade}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <span className={cn(
                "text-[8px] uppercase font-black tracking-widest",
                INTENSIDADE_COLORS[event.intensidade]
              )}>
                {INTENSIDADE_LABELS[event.intensidade]}
              </span>
              <h4 className="text-sm font-black text-[color:var(--text-primary)] uppercase tracking-tight leading-tight">
                {event.aberracao.nome}
              </h4>
            </div>
          </div>

          {/* Aparência */}
          <div className="p-3 rounded-lg bg-[var(--bg-card)]/30 border border-[var(--border-panel)]">
            <div className="flex items-center gap-2 mb-1.5">
              <Eye className="w-3 h-3 text-[color:var(--text-muted)]" />
              <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black tracking-widest">O que se vê</span>
            </div>
            <p className="text-[10px] text-[color:var(--text-secondary)] leading-relaxed italic">
              {event.aberracao.aparencia}
            </p>
            <p className="text-[9px] text-[color:var(--text-muted)] mt-2 leading-relaxed">
              {event.aberracao.natureza}
            </p>
          </div>

          {/* Seções expansíveis */}
          <Section id="origem" icon={Heart} label="Origem Psicológica" color="text-rose-400">
            <div className="space-y-2">
              <div>
                <span className="text-[8px] text-rose-600 uppercase font-black">Emoção Raiz</span>
                <p className="text-[10px] text-rose-300 font-bold mt-0.5">{event.origem.emocao}</p>
              </div>
              <div>
                <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Trauma</span>
                <p className="text-[10px] text-[color:var(--text-secondary)] mt-0.5 leading-relaxed">{event.origem.trauma}</p>
              </div>
              <div>
                <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Portador</span>
                <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5 italic">{event.origem.portador}</p>
              </div>
            </div>
          </Section>

          <Section id="manifestacao" icon={Ghost} label="Manifestação" color="text-[var(--accent)]">
            <div className="space-y-2">
              <div>
                <span className="text-[8px] text-[var(--accent)]/70 uppercase font-black">Como Aparece</span>
                <p className="text-[10px] text-[color:var(--text-secondary)] mt-0.5 leading-relaxed">{event.manifestacao.como}</p>
              </div>
              <div>
                <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Onde</span>
                <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5">{event.manifestacao.onde}</p>
              </div>
              <div>
                <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Gatilho</span>
                <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5">{event.manifestacao.quando}</p>
              </div>
            </div>
          </Section>

          <Section id="sintomas" icon={AlertTriangle} label="Sintomas do Portador" color="text-amber-400">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[8px] text-amber-600 uppercase font-black w-12 shrink-0 pt-0.5">Físico</span>
                <p className="text-[10px] text-[color:var(--text-secondary)] leading-relaxed">{event.sintomas.fisico}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[8px] text-amber-600 uppercase font-black w-12 shrink-0 pt-0.5">Mental</span>
                <p className="text-[10px] text-[color:var(--text-secondary)] leading-relaxed">{event.sintomas.mental}</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[8px] text-amber-600 uppercase font-black w-12 shrink-0 pt-0.5">Social</span>
                <p className="text-[10px] text-[color:var(--text-secondary)] leading-relaxed">{event.sintomas.social}</p>
              </div>
            </div>
          </Section>

          <Section id="verdade" icon={Search} label="Verdade Oculta (Mestre)" color="text-sky-400">
            <div className="space-y-2">
              <div className="p-2 rounded-md bg-sky-950/20 border border-sky-900/20">
                <span className="text-[8px] text-sky-500 uppercase font-black">A Verdade</span>
                <p className="text-[10px] text-sky-200 mt-0.5 leading-relaxed font-medium">{event.verdade.revelacao}</p>
              </div>
              <div>
                <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Pista para os Jogadores</span>
                <p className="text-[10px] text-[color:var(--text-muted)] mt-0.5 italic leading-relaxed">{event.verdade.pista}</p>
              </div>
            </div>
          </Section>

          <Section id="resolucao" icon={KeyRound} label="Resolução & Consequências" color="text-emerald-400">
            <div className="space-y-2">
              <div>
                <span className="text-[8px] text-emerald-600 uppercase font-black">Método de Cura</span>
                <p className="text-[10px] text-emerald-300 mt-0.5 leading-relaxed">{event.resolucao.metodo}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[8px] text-[color:var(--text-muted)] uppercase font-black">Dificuldade:</span>
                <span className={cn(
                  "text-[9px] font-black uppercase px-2 py-0.5 rounded",
                  event.resolucao.dificuldade === 'Simples' ? 'bg-emerald-900/30 text-emerald-400' :
                  event.resolucao.dificuldade === 'Moderado' ? 'bg-amber-900/30 text-amber-400' :
                  event.resolucao.dificuldade === 'Difícil' ? 'bg-orange-900/30 text-orange-400' :
                  'bg-rose-900/30 text-rose-400'
                )}>
                  {event.resolucao.dificuldade}
                </span>
              </div>
              <div className="p-2 rounded-md bg-rose-950/20 border border-rose-900/20">
                <span className="text-[8px] text-rose-500 uppercase font-black">Se Não Resolver...</span>
                <p className="text-[10px] text-rose-300/80 mt-0.5 leading-relaxed">{event.resolucao.consequencia}</p>
              </div>
            </div>
          </Section>

          {/* Ações */}
          <div className="flex gap-2 pt-2 border-t border-[var(--border-panel)]">
            <button
              onClick={rollEvent}
              disabled={isGenerating}
              className="flex-1 h-8 flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[10px] font-bold text-[color:var(--text-secondary)] transition-colors disabled:opacity-50 border border-[var(--border-panel)]"
            >
              <RefreshCw className={cn("w-3 h-3", isGenerating && "animate-spin")} />
              Nova Aberração
            </button>
            <button
              onClick={handleBroadcast}
              disabled={isPending}
              className="flex-1 h-8 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)]/20 hover:bg-[var(--accent)]/40 text-[10px] font-bold text-[var(--accent)] transition-colors disabled:opacity-50"
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
