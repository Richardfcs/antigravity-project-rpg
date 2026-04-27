"use client";

import { useEffect, useState } from "react";
import { 
  Heart, 
  Skull, 
  Swords, 
  XCircle, 
  CheckCircle2,
  Activity,
  ArrowRight,
  Dice6,
  Sparkles,
  Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionMessageRecord } from "@/types/message";

interface UnifiedNotificationProps {
  message: SessionMessageRecord;
  duration?: number;
  onClose?: () => void;
}

export function UnifiedNotification({ message, duration = 6000, onClose }: UnifiedNotificationProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) setTimeout(onClose, 500);
    }, duration);
    return () => clearTimeout(timer);
  }, [message.id, duration, onClose]);

  if (!visible) return null;

  const isCombat = message.kind === "combat";
  const isRoll = message.kind === "roll";
  const isOracle = message.kind === "oracle";
  
  const body = message.body.toLowerCase();
  const isSuccess = body.includes("sucesso") || body.includes("acerta") || body.includes("supera");
  const isFailure = body.includes("falha") || body.includes("erro") || body.includes("resiste");
  const isCritical = body.includes("crítico") || body.includes("decisivo");
  
  const getTheme = () => {
    if (isCritical) return "amber";
    if (isSuccess) return "emerald";
    if (isFailure) return "rose";
    if (isOracle) return "purple";
    if (isCombat) return "sky";
    return "slate";
  };

  const theme = getTheme();

  return (
    <div className="pointer-events-none fixed left-1/2 top-12 z-[200] -translate-x-1/2 animate-in fade-in slide-in-from-top-8 duration-500">
      <div className={cn(
        "flex items-center gap-4 rounded-full border px-6 py-4 shadow-[0_32px_64px_rgba(0,0,0,0.6)] backdrop-blur-2xl",
        theme === "rose" ? "border-rose-500/40 bg-rose-950/60" :
        theme === "emerald" ? "border-emerald-500/40 bg-emerald-950/60" :
        theme === "amber" ? "border-amber-500/50 bg-amber-950/70 shadow-[0_0_30px_rgba(245,158,11,0.2)]" :
        theme === "purple" ? "border-purple-500/40 bg-purple-950/60" :
        theme === "sky" ? "border-sky-500/40 bg-sky-950/60" :
        "border-white/20 bg-black/60"
      )}>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-full border shadow-inner",
          theme === "rose" ? "border-rose-400/50 bg-rose-500/20 text-rose-400" :
          theme === "emerald" ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-400" :
          theme === "amber" ? "border-amber-400/60 bg-amber-500/30 text-amber-400 animate-pulse" :
          theme === "purple" ? "border-purple-400/50 bg-purple-500/20 text-purple-400" :
          theme === "sky" ? "border-sky-400/50 bg-sky-500/20 text-sky-400" :
          "border-white/30 bg-white/10 text-white"
        )}>
          {isCombat ? <Swords size={24} /> : 
           isRoll ? <Dice6 size={24} /> : 
           isOracle ? <Sparkles size={24} /> : 
           <Activity size={24} />}
        </div>

        <div className="flex flex-col min-w-[200px] max-w-[400px]">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
              {message.displayName}
            </span>
            <div className="h-[2px] w-4 bg-white/10" />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              theme === "rose" ? "text-rose-400" :
              theme === "emerald" ? "text-emerald-400" :
              theme === "amber" ? "text-amber-400" :
              theme === "purple" ? "text-purple-400" :
              theme === "sky" ? "text-sky-400" :
              "text-white/40"
            )}>
              {message.kind === "roll" ? "Teste de Perícia" : message.kind === "combat" ? "Combate" : "Notificação"}
            </span>
          </div>
          <p className={cn(
            "text-base font-bold tracking-tight leading-tight",
            theme === "rose" ? "text-rose-100" :
            theme === "emerald" ? "text-emerald-100" :
            theme === "amber" ? "text-amber-100" :
            theme === "purple" ? "text-purple-100" :
            theme === "sky" ? "text-sky-100" :
            "text-white"
          )}>
            {message.body}
          </p>
        </div>

        {isRoll && (message.payload as any)?.total && (
          <>
            <div className="h-10 w-[1px] bg-white/10 mx-2" />
            <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl px-4 py-2 border border-white/5">
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">Resultado</span>
               <span className={cn(
                 "text-xl font-black tabular-nums",
                 isCritical ? "text-amber-400" : "text-white"
               )}>
                  {(message.payload as any).total}
               </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
