"use client";

import { useState, useTransition } from "react";
import { Coins, Package, RefreshCw, Send, Users, User, ChevronDown, Sparkles, Shield, Sword, FlaskConical, Gem, ScrollText } from "lucide-react";
import { generateFullLoot, LootResult, LootMode, RARITY_COLORS, RARITY_BG, CATEGORY_LABELS } from "@/lib/oracle/loot-tables";
import { cn } from "@/lib/utils";
import { useOracleStore } from "@/stores/oracle-store";
import { broadcastOracleAction } from "@/app/actions/oracle-actions";

interface FullLootGeneratorProps {
  sessionCode: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  arma: Sword,
  armadura: Shield,
  consumivel: FlaskConical,
  material: Package,
  roleplay: ScrollText,
  reliquias: Gem,
  moeda: Coins
};

export function FullLootGenerator({ sessionCode }: FullLootGeneratorProps) {
  const [mode, setMode] = useState<LootMode>('grupo');
  const [loot, setLoot] = useState<LootResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isPending, startTransition] = useTransition();
  const addEntry = useOracleStore(state => state.addEntry);

  const rollLoot = () => {
    setIsRolling(true);
    setTimeout(() => {
      const result = generateFullLoot(mode);
      setLoot(result);
      setIsRolling(false);

      addEntry({
        type: 'plot',
        title: `Loot (${mode === 'grupo' ? 'Grupo' : 'Solo'})`,
        summary: `${result.moedas.koku} Koku, ${result.moedas.mon} Mon, ${result.itens.length} itens`,
        details: result
      });
    }, 800);
  };

  const handleBroadcast = () => {
    if (!loot) return;
    startTransition(async () => {
      const itensText = loot.itens.map(i =>
        `• **[${i.raridade.toUpperCase()}]** ${i.nome} _(${CATEGORY_LABELS[i.categoria]})_${i.valorKoku ? ` — ${i.valorKoku} Koku` : i.valorMon ? ` — ${i.valorMon} Mon` : ''}`
      ).join('\n');

      await broadcastOracleAction({
        sessionCode,
        title: `Espólios (${mode === 'grupo' ? 'Grupo' : 'Solo'})`,
        body: `**Moedas:** ${loot.moedas.koku} Koku, ${loot.moedas.mon} Mon\n\n${itensText}${loot.encontroEspecial ? `\n\n⚠️ *${loot.encontroEspecial}*` : ''}`,
        payload: { type: 'loot', ...loot }
      });
    });
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl bg-[var(--bg-card)]/50 border border-[var(--border-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--border-panel)] pb-2">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[color:var(--text-secondary)]">Espólios & Loot</h3>
        </div>
        <button
          onClick={rollLoot}
          disabled={isRolling}
          className="p-1.5 hover:bg-white/5 rounded-lg text-[color:var(--text-muted)] hover:text-amber-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", isRolling && "animate-spin")} />
        </button>
      </div>

      {/* Modo selector */}
      <div className="flex gap-1.5 p-1 bg-[var(--bg-input)] rounded-lg border border-[var(--border-panel)]">
        {([
          { id: 'grupo' as LootMode, label: 'Grupo', icon: Users, desc: '3-7 itens' },
          { id: 'solo' as LootMode, label: 'Solo', icon: User, desc: '1-3 itens raros' }
        ]).map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 py-2 rounded-md transition-all",
              mode === m.id
                ? "bg-[var(--bg-card)] text-[color:var(--text-primary)] shadow-md border border-[var(--border-panel)]"
                : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
            )}
          >
            <m.icon className={cn("w-4 h-4", mode === m.id ? "text-amber-500" : "text-[color:var(--text-muted)]")} />
            <span className="text-[9px] font-black uppercase tracking-tighter">{m.label}</span>
            <span className="text-[8px] text-[color:var(--text-muted)]">{m.desc}</span>
          </button>
        ))}
      </div>

      {!loot ? (
        <button
          onClick={rollLoot}
          disabled={isRolling}
          className="w-full py-5 border border-dashed border-[var(--border-panel)] rounded-lg text-[10px] uppercase font-bold text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)] hover:bg-white/[0.02] transition-all"
        >
          {isRolling ? 'Gerando...' : 'Gerar Espólios'}
        </button>
      ) : (
        <div className="space-y-3 animate-in fade-in zoom-in duration-300">
          {/* Moedas */}
          <div className="flex gap-2">
            <div className="flex-1 p-3 rounded-lg bg-amber-950/20 border border-amber-900/30 text-center">
              <Coins className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <span className="text-lg font-black text-amber-400 block">{loot.moedas.koku}</span>
              <span className="text-[8px] text-amber-600 uppercase font-black tracking-widest">Koku</span>
            </div>
            <div className="flex-1 p-3 rounded-lg bg-orange-950/20 border border-orange-900/30 text-center">
              <Coins className="w-4 h-4 text-orange-400 mx-auto mb-1" />
              <span className="text-lg font-black text-orange-400 block">{loot.moedas.mon}</span>
              <span className="text-[8px] text-orange-600 uppercase font-black tracking-widest">Mon</span>
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-1.5">
            {loot.itens.map((item, idx) => {
              const Icon = CATEGORY_ICONS[item.categoria] || Package;
              return (
                <div key={idx} className={cn("p-3 rounded-lg border", RARITY_BG[item.raridade])}>
                  <div className="flex items-start gap-2">
                    <Icon className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", RARITY_COLORS[item.raridade])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn("text-[8px] uppercase font-black tracking-widest", RARITY_COLORS[item.raridade])}>
                          {item.raridade}
                        </span>
                        <span className="text-[8px] text-[color:var(--text-muted)] uppercase">
                          {CATEGORY_LABELS[item.categoria]}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-[color:var(--text-primary)] leading-tight">{item.nome}</h4>
                      {item.estado && (
                        <span className="text-[9px] text-[color:var(--text-muted)] italic">Estado: {item.estado}</span>
                      )}
                      {item.bonus && (
                        <p className="text-[9px] text-amber-500 mt-0.5">★ {item.bonus}</p>
                      )}
                      {item.descricao !== item.nome && item.categoria === 'roleplay' && (
                        <p className="text-[9px] text-[color:var(--text-muted)] mt-1 italic leading-tight">{item.descricao}</p>
                      )}
                    </div>
                    {(item.valorKoku || item.valorMon) && (
                      <span className="text-[9px] text-[color:var(--text-muted)] font-mono shrink-0">
                        {item.valorKoku ? `${item.valorKoku}K` : `${item.valorMon}M`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Encontro especial */}
          {loot.encontroEspecial && (
            <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3 h-3 text-rose-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Encontro Especial</span>
              </div>
              <p className="text-[10px] text-[color:var(--text-secondary)] italic leading-tight">
                "{loot.encontroEspecial}"
              </p>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-2 border-t border-[var(--border-panel)]/50">
            <button
              onClick={rollLoot}
              disabled={isRolling}
              className="flex-1 h-8 flex items-center justify-center gap-2 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-panel)] text-[10px] font-bold text-[color:var(--text-secondary)] transition-colors disabled:opacity-50 border border-[var(--border-panel)]"
            >
              <RefreshCw className={cn("w-3 h-3", isRolling && "animate-spin")} />
              Re-gerar
            </button>
            <button
              onClick={handleBroadcast}
              disabled={isPending}
              className="flex-1 h-8 flex items-center justify-center gap-2 rounded-lg bg-amber-900/40 hover:bg-amber-900/60 text-[10px] font-bold text-amber-300 transition-colors disabled:opacity-50"
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
