"use client";

import { useState, useTransition } from "react";
import { Sword, Skull, RefreshCw, PlusCircle, Ghost, Copy, Send } from "lucide-react";
import { generateEnemy, generateMonsterConcept } from "@/lib/oracle/enemy-logic";
import { EnemyStats, MonsterConcept, ThreatLevel } from "@/types/oracle";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction, spawnOracleEnemyAction } from "@/app/actions/oracle-actions";

interface EnemyGeneratorProps {
  sessionCode: string;
}

export function EnemyGenerator({ sessionCode }: EnemyGeneratorProps) {
  const [enemy, setEnemy] = useState<EnemyStats | null>(null);
  const [monster, setMonster] = useState<MonsterConcept | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [threat, setThreat] = useState<ThreatLevel>("capanga");
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollEnemy = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newEnemy = generateEnemy(threat);
      setEnemy(newEnemy);
      setMonster(null);
      setIsGenerating(false);
      
      addEntry({
        type: 'enemy',
        title: `Inimigo: ${newEnemy.name}`,
        summary: `Ameaça: ${threat} | ST ${newEnemy.st} DX ${newEnemy.dx}`,
        details: newEnemy
      });
    }, 600);
  };

  const rollMonster = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const newMonster = generateMonsterConcept();
      setMonster(newMonster);
      setEnemy(null);
      setIsGenerating(false);
      
      addEntry({
        type: 'enemy',
        title: `Yokai: ${newMonster.forma}`,
        summary: `${newMonster.essencia} | ${newMonster.manifestacao}`,
        details: newMonster
      });
    }, 600);
  };

  const handleBroadcast = () => {
    startTransition(async () => {
      if (enemy) {
        await broadcastOracleAction({
          sessionCode,
          title: "Inimigo Identificado",
          body: `**${enemy.name}**\nST: ${enemy.st} | DX: ${enemy.dx} | IQ: ${enemy.iq} | HT: ${enemy.ht}\n*${enemy.notas}*`,
          payload: { type: 'enemy', ...enemy }
        });
      } else if (monster) {
        await broadcastOracleAction({
          sessionCode,
          title: "Manifestação Sobrenatural",
          body: `**${monster.forma}**\nEssência: ${monster.essencia}\nManifestação: ${monster.manifestacao}\n*${monster.presenca}*`,
          payload: { type: 'monster', ...monster }
        });
      }
    });
  };

  const handleAddToArena = () => {
    if (!enemy) return;
    startTransition(async () => {
      const res = await spawnOracleEnemyAction({ sessionCode, stats: enemy });
      if (res.ok) {
        // Sucesso
      }
    });
  };

  const threatLevels: { id: ThreatLevel, label: string, color: string }[] = [
    { id: 'civil', label: 'Civil', color: 'bg-[var(--bg-card)]' },
    { id: 'recruta', label: 'Recruta', color: 'bg-blue-900' },
    { id: 'capanga', label: 'Capanga', color: 'bg-emerald-900' },
    { id: 'veterano', label: 'Veterano', color: 'bg-amber-700' },
    { id: 'elite', label: 'Elite', color: 'bg-rose-900' },
    { id: 'civil', label: 'Civil', color: 'bg-[var(--color-bg-civil)]' },
    { id: 'recruta', label: 'Recruta', color: 'bg-[var(--color-bg-recruta)]' },
    { id: 'capanga', label: 'Capanga', color: 'bg-[var(--color-bg-capanga)]' },
    { id: 'veterano', label: 'Veterano', color: 'bg-[var(--color-bg-veterano)]' },
    { id: 'elite', label: 'Elite', color: 'bg-[var(--color-bg-elite)]' },
    { id: 'excepcional', label: 'Líder', color: 'bg-[var(--color-bg-lider)]' },
    { id: 'mestre', label: 'Mestre', color: 'bg-[var(--color-bg-mestre)]' },
  ];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center gap-2 border-b border-[var(--border-panel)] pb-2">
        <Sword className="w-4 h-4 text-[var(--color-accent)]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Forja de Combates</h3>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {threatLevels.map((t) => (
          <button
            key={t.id}
            onClick={() => setThreat(t.id)}
            className={cn(
              "px-2 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all border",
              threat === t.id 
                ? `${t.color} border-white/20 text-white scale-105 shadow-lg` 
                : "bg-[var(--bg-input)] border-[var(--border-panel)] text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button 
          onClick={rollEnemy} 
          disabled={isGenerating}
          className="flex-1 h-9 flex items-center justify-center bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[color:var(--text-secondary)] border border-[var(--border-panel)] rounded-lg text-[10px] font-bold uppercase transition-all"
        >
          <Skull className={cn("w-3.5 h-3.5", isGenerating ? "animate-pulse" : "mr-2")} />
          {isGenerating && !monster ? "" : "Inimigo GURPS"}
        </button>
        <button 
          onClick={rollMonster} 
          disabled={isGenerating}
          className="flex-1 h-9 flex items-center justify-center bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[color:var(--text-secondary)] border border-[var(--border-panel)] rounded-lg text-[10px] font-bold uppercase transition-all"
        >
          <Ghost className={cn("w-3.5 h-3.5", isGenerating ? "animate-pulse" : "mr-2")} />
          {isGenerating && !enemy ? "" : "Yokai/Concept"}
        </button>
      </div>

      {enemy && (
        <div className="p-4 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-panel)] animate-in fade-in zoom-in duration-300">
          <div className="flex justify-between items-start mb-3">
            <h4 className="text-sm font-display font-black text-[var(--color-accent)] uppercase tracking-tight">{enemy.name}</h4>
            <div className="flex gap-1">
              <button onClick={handleBroadcast} className="p-1 hover:bg-white/5 rounded text-[color:var(--text-muted)] hover:text-[var(--color-accent)]">
                <Send className="w-3 h-3" />
              </button>
              <span className="text-[10px] bg-[var(--color-accent-dark)] text-[var(--color-accent-light)] px-1.5 rounded font-bold self-center">GURPS</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: 'ST', val: enemy.st },
              { label: 'DX', val: enemy.dx },
              { label: 'IQ', val: enemy.iq },
              { label: 'HT', val: enemy.ht }
            ].map(s => (
              <div key={s.label} className="bg-[var(--bg-card)] border border-[var(--border-panel)] rounded p-1 text-center">
                <span className="text-[8px] text-[color:var(--text-muted)] font-bold block">{s.label}</span>
                <span className="text-xs text-[color:var(--text-primary)] font-black">{s.val}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1 text-[11px] border-t border-[var(--border-panel)]/50 pt-2">
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">HP: {enemy.hp} / PF: {enemy.pf}</span>
              <span className="text-[color:var(--text-muted)]">Esquiva: {enemy.esquiva}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[color:var(--text-muted)]">Aparar: {enemy.aparar}{enemy.bloqueio > 0 ? ` | Bloqueio: ${enemy.bloqueio}` : ''}</span>
              <span className="text-[color:var(--text-muted)]">Inic: {enemy.iniciativa.toFixed(2)}</span>
            </div>
            <div className="mt-2 p-2 rounded bg-[var(--color-rare-bg)] border border-[var(--color-rare-border)]">
              <span className="text-[8px] text-[var(--color-rare-text)] uppercase font-black block mb-0.5">Arma</span>
              <span className="text-[10px] text-[var(--color-rare-text)] font-bold">{enemy.armas}</span>
            </div>
            <p className="text-[color:var(--text-muted)] italic text-[10px] mt-1 bg-[var(--bg-input)] p-2 rounded border border-[var(--border-panel)]">
              {enemy.notas}
            </p>
          </div>

          <button 
            onClick={handleAddToArena}
            disabled={isPending}
            className="w-full mt-4 h-8 flex items-center justify-center bg-[var(--color-accent)] hover:bg-[var(--color-accent-dark)] text-white text-[10px] uppercase font-black tracking-widest rounded-lg transition-colors shadow-lg disabled:opacity-50"
          >
            <PlusCircle className="w-3 h-3 mr-2" />
            {isPending ? "Criando..." : "Adicionar à Arena"}
          </button>
        </div>
      )}

      {monster && (
        <div className="p-4 rounded-lg bg-[var(--color-monster-bg)] border border-[var(--color-monster-border)] animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-3 relative group">
             <span className="text-[10px] text-[var(--color-monster-accent)] font-black uppercase tracking-[0.2em] block mb-1">Manifestação Sobrenatural</span>
             <h4 className="text-lg font-display font-black text-[var(--text-primary)] tracking-tighter leading-none">{monster.forma}</h4>
             <button 
               onClick={handleBroadcast}
               className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--color-monster-accent)]"
             >
               <Send className="w-3 h-3" />
             </button>
          </div>
          
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-bold">Infusão Elemental</span>
              <p className="text-sm text-[var(--color-monster-accent)] font-medium">{monster.essencia}</p>
            </div>
            <div className="text-center">
              <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-bold">Habilidade Terrível</span>
              <p className="text-sm text-[var(--color-accent)] font-medium">{monster.manifestacao}</p>
            </div>
            <div className="text-center pt-2 border-t border-[var(--color-monster-border)]">
              <span className="text-[9px] text-[color:var(--text-muted)] uppercase font-bold">Origem/Presença</span>
              <p className="text-xs text-[color:var(--text-muted)] italic">"{monster.presenca}"</p>
            </div>
          </div>

          <button className="w-full mt-4 h-7 flex items-center justify-center text-[10px] text-[color:var(--text-muted)] hover:text-[var(--color-monster-accent)] hover:bg-white/5 rounded transition-all">
            <Copy className="w-3 h-3 mr-1" />
            Copiar Conceito
          </button>
        </div>
      )}
    </div>
  );
}
