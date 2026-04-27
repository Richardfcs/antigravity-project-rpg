"use client";

import { useEffect, useState } from "react";
import type { CombatResolutionRecord } from "@/types/combat";
import { 
  Heart, 
  Skull, 
  Swords, 
  Shield, 
  XCircle, 
  CheckCircle2,
  Activity,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CombatNotificationProps {
  resolution: CombatResolutionRecord;
  duration?: number;
}

export function CombatNotification({ resolution, duration = 5000 }: CombatNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [resolution.id, duration]);

  if (!visible) return null;

  const isSuccess = resolution.summary.toLowerCase().includes("sucesso") || 
                   resolution.summary.toLowerCase().includes("acerta") ||
                   resolution.summary.toLowerCase().includes("supera");
  
  const isFailure = resolution.summary.toLowerCase().includes("falha") || 
                   resolution.summary.toLowerCase().includes("erro") ||
                   resolution.summary.toLowerCase().includes("resiste");

  const hasDamage = (resolution.hpDelta && resolution.hpDelta < 0) || (resolution.damage && resolution.damage.injury > 0);
  const isDeath = resolution.appliedConditions?.includes("Morto") || resolution.summary.toLowerCase().includes("morto");

  const getThemeColor = () => {
    if (isDeath) return "rose";
    if (hasDamage) return "rose";
    if (isSuccess) return "emerald";
    if (isFailure) return "rose";
    return "amber";
  };

  const theme = getThemeColor();

  return (
    <div className="pointer-events-none fixed left-1/2 top-8 z-[150] -translate-x-1/2 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className={cn(
        "flex items-center gap-4 rounded-full border px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl",
        theme === "rose" ? "border-rose-500/30 bg-rose-950/40" :
        theme === "emerald" ? "border-emerald-500/30 bg-emerald-950/40" :
        "border-amber-500/30 bg-amber-950/40"
      )}>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border",
          theme === "rose" ? "border-rose-500/40 bg-rose-500/20 text-rose-400" :
          theme === "emerald" ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400" :
          "border-amber-500/40 bg-amber-500/20 text-amber-400"
        )}>
          {isDeath ? <Skull size={20} /> : 
           hasDamage ? <Heart size={20} fill="currentColor" /> : 
           isSuccess ? <Swords size={20} /> : 
           <Activity size={20} />}
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-tighter text-white">
              {resolution.actorName || resolution.summary.split("ataca")[0]?.split("troca")[0]?.split("se move")[0]?.split("falhou")[0]?.split("sobreviveu")[0]?.split("evita")[0]?.split("resiste")[0]?.split("supera")[0]?.trim() || "Desconhecido"}
            </span>
            <ArrowRight size={12} className="text-white/20" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {resolution.targetName || (resolution.summary.includes("ataca") ? resolution.summary.split("ataca")[1]?.split("com")[0]?.trim() : null) || "Alvo"}
            </span>
          </div>
          <p className={cn(
            "text-sm font-black tracking-tight uppercase italic",
            theme === "rose" ? "text-rose-400" :
            theme === "emerald" ? "text-emerald-400" :
            "text-amber-400"
          )}>
            {(() => {
              if (isDeath) return "K.O. - Inimigo Derrotado!";
              if (hasDamage) return `Dano Crítico: -${resolution.damage?.injury || Math.abs(resolution.hpDelta || 0)} PV`;
              if (resolution.defenseRoll && resolution.defenseRoll.margin >= 0) return "Defesa Bem Sucedida!";
              if (isSuccess) return "Ataque Conectado!";
              return "Ação Finalizada";
            })()}
          </p>
        </div>

        <div className="h-8 w-[1px] bg-white/10 mx-2" />

        <div className="flex flex-col items-center">
           <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Dados</span>
           <span className="text-xs font-black text-white/80">
              {resolution.attackRoll?.total || resolution.defenseRoll?.total || "--"}
           </span>
        </div>
      </div>
    </div>
  );
}
