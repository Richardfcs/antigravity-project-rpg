export interface SkillModifier {
  cargaPenalty: number;
  choquePenalty: number;
  fadigaPenalty: number;
  totalPenalty: number;
  description: string;
}

export interface LoadoutInfo {
  totalWeight: number;
  st: number;
  cargaLevel: number;
  cargaRatio: number;
  cargaPenalty: number;
  dodgePenalty: number;
  moveMultiplier: number;
}

export interface CharacterCondition {
  choque: number;
  fadiga: number;
  dor: number;
  penalties: string[];
}

const SLOT_RULES = [
  { maxRatio: 1, name: "Nenhuma", moveMult: 1.0, dodgePenalty: 0, cargaPenalty: 0 },
  { maxRatio: 2, name: "Leve", moveMult: 0.8, dodgePenalty: 1, cargaPenalty: 1 },
  { maxRatio: 3, name: "Média", moveMult: 0.6, dodgePenalty: 2, cargaPenalty: 2 },
  { maxRatio: 6, name: "Pesada", moveMult: 0.4, dodgePenalty: 3, cargaPenalty: 3 },
  { maxRatio: Infinity, name: "Muito Pesada", moveMult: 0.2, dodgePenalty: 4, cargaPenalty: 4 }
];

export function calculateLoadoutPenalty(totalWeight: number, st: number): LoadoutInfo {
  const ratio = totalWeight / st;
  const rule = SLOT_RULES.find(r => ratio <= r.maxRatio) || SLOT_RULES[SLOT_RULES.length - 1];
  const level = SLOT_RULES.indexOf(rule);
  
  return {
    totalWeight,
    st,
    cargaLevel: level,
    cargaRatio: ratio,
    cargaPenalty: rule.cargaPenalty,
    dodgePenalty: rule.dodgePenalty,
    moveMultiplier: rule.moveMult
  };
}

export function calculateSkillPenalties(
  baseSkillLevel: number,
  loadoutPenalty: number,
  choque: number,
  fadiga: number,
  dor: number
): SkillModifier {
  const penalties: string[] = [];
  
  let totalPenalty = 0;
  
  if (loadoutPenalty > 0) {
    totalPenalty += loadoutPenalty;
    penalties.push(`Carga (-${loadoutPenalty})`);
  }
  
  if (choque > 0) {
    const penalty = Math.min(choque, 3);
    totalPenalty += penalty;
    penalties.push(`Choque (-${penalty})`);
  }
  
  if (fadiga > 0) {
    const penalty = Math.min(Math.floor(fadiga / 2), 3);
    totalPenalty += penalty;
    penalties.push(`Fadiga (-${penalty})`);
  }
  
  if (dor > 0) {
    const penalty = Math.min(Math.floor(dor / 3), 5);
    totalPenalty += penalty;
    penalties.push(`Dor (-${penalty})`);
  }
  
  const effectiveLevel = Math.max(0, baseSkillLevel - totalPenalty);
  
  return {
    cargaPenalty: loadoutPenalty,
    choquePenalty: Math.min(choque, 3),
    fadigaPenalty: Math.min(Math.floor(fadiga / 2), 3),
    totalPenalty,
    description: penalties.length > 0 ? penalties.join(", ") : "Sem penalidades"
  };
}

export function getEffectiveSkillLevel(
  baseLevel: number,
  loadoutPenalty: number,
  choque: number = 0,
  fadiga: number = 0,
  dor: number = 0
): number {
  const modifier = calculateSkillPenalties(baseLevel, loadoutPenalty, choque, fadiga, dor);
  return Math.max(0, baseLevel - modifier.totalPenalty);
}

export function getSkillRollTarget(
  baseLevel: number,
  loadoutPenalty: number,
  choque: number = 0,
  fadiga: number = 0,
  dor: number = 0
): { target: number; modifier: SkillModifier } {
  const effectiveLevel = getEffectiveSkillLevel(baseLevel, loadoutPenalty, choque, fadiga, dor);
  const modifier = calculateSkillPenalties(baseLevel, loadoutPenalty, choque, fadiga, dor);
  
  const target = 14 + baseLevel - effectiveLevel;
  
  return { target, modifier };
}

export function getMoveWithLoadout(baseMove: number, loadoutInfo: LoadoutInfo): number {
  return Math.floor(baseMove * loadoutInfo.moveMultiplier);
}

export function formatSkillRollSummary(
  skillName: string,
  baseLevel: number,
  effectiveLevel: number,
  rollResult: number,
  modifier: SkillModifier
): { success: boolean; margin: number; summary: string } {
  const target = 14 + baseLevel - effectiveLevel;
  const success = rollResult <= target;
  const margin = success ? target - rollResult : rollResult - target;
  
  let summary = `[${skillName}] NH ${baseLevel} → Alvo ${target} | Rolou ${rollResult}`;
  if (modifier.totalPenalty > 0) {
    summary += ` (${modifier.description})`;
  }
  summary += ` → ${success ? "SUCESSO" : "FALHA"} ${success ? `+${margin}` : `-${margin}`}`;
  
  return { success, margin, summary };
}

export const DEFAULT_STATS = {
  st: 10,
  hp: 10,
  fp: 10,
  choque: 0,
  fadiga: 0,
  dor: 0
};