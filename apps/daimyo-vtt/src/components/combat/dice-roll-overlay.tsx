"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DiceRollOverlayProps {
  id: string;
  tokenId: string;
  value: number;
  dice: [number, number, number];
  isSuccess: boolean;
  isCritical: boolean;
  x: number;
  y: number;
  onComplete: (id: string) => void;
}

export function DiceRollOverlay({
  id,
  value,
  dice,
  isSuccess,
  isCritical,
  x,
  y,
  onComplete
}: DiceRollOverlayProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isSpinning, setIsSpinning] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animação de "giro" do dado
    let startTime = Date.now();
    const duration = 800; // ms

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;

      if (elapsed < duration) {
        setDisplayValue(Math.floor(Math.random() * 15) + 3);
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setIsSpinning(false);
        
        // Espera um pouco antes de iniciar a saída
        setTimeout(() => {
          setIsExiting(true);
          // Tempo para a animação de saída CSS terminar
          setTimeout(() => {
            onComplete(id);
          }, 500);
        }, 2000);
      }
    };

    requestAnimationFrame(animate);
  }, [id, value, onComplete]);

  return (
    <div
      className={cn(
        "absolute z-[100] flex flex-col items-center pointer-events-none select-none transition-all duration-500",
        isExiting ? "opacity-0 scale-150 -translate-y-20" : "animate-in fade-in zoom-in slide-in-from-bottom-5"
      )}
      style={{ 
        left: `${x}%`, 
        top: `${y}%`,
        transform: isExiting ? undefined : 'translate(-50%, -100%)' 
      }}
    >
      <div className={cn(
        "flex flex-col items-center justify-center rounded-2xl border-2 p-3 shadow-2xl backdrop-blur-md transition-all duration-300",
        isSpinning 
          ? "border-white/20 bg-black/40 text-white" 
          : isSuccess 
            ? isCritical 
              ? "border-amber-400 bg-amber-400/20 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
              : "border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
            : isCritical
              ? "border-rose-600 bg-rose-600/20 text-rose-400 shadow-[0_0_20px_rgba(225,29,72,0.4)]"
              : "border-rose-400 bg-rose-400/20 text-rose-300 shadow-[0_0_20px_rgba(248,113,113,0.4)]"
      )}>
        <div className="flex gap-1 mb-1">
          {dice.map((d, i) => (
            <div key={i} className="flex h-5 w-5 items-center justify-center rounded-md border border-white/10 bg-white/5 text-[10px] font-black">
              {isSpinning ? Math.floor(Math.random() * 6) + 1 : d}
            </div>
          ))}
        </div>
        
        <div className={cn(
          "text-3xl font-black tracking-tighter",
          isSpinning ? "animate-pulse" : "scale-110"
        )}>
          {displayValue}
        </div>
        
        {!isSpinning && (
          <div className="text-[8px] font-black uppercase tracking-widest opacity-80">
            {isCritical ? (isSuccess ? "Crítico!" : "Falha Crítica!") : (isSuccess ? "Sucesso" : "Falha")}
          </div>
        )}
      </div>
      
      {/* Efeito de impacto visual */}
      {!isSpinning && isSuccess && (
        <div className={cn(
          "absolute -z-10 h-12 w-12 rounded-full blur-xl animate-ping opacity-30",
          isCritical ? "bg-amber-400" : "bg-emerald-400"
        )} />
      )}
    </div>
  );
}
