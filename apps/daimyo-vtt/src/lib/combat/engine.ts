import type { SessionCharacterRecord } from "@/types/character";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
  AttackVariant,
  CombatantTurnState,
  CharacterConditionRecord,
  CharacterDamageSpec,
  CharacterTechniqueRecord,
  CharacterWeaponMode,
  CharacterWeaponRecord,
  CombatActionType,
  CombatDamageBreakdown,
  CombatDamageType,
  CombatDefenseOption,
  CombatDraftAction,
  CombatHitLocationId,
  CombatResolutionRecord,
  CombatRollRecord,
  CombatTargetModifiers,
  FeintType,
  SessionCharacterSheetProfile,
  StartOfTurnEffects
} from "@/types/combat";

import { createEmptySheetProfile, normalizeSheetProfile } from "@/lib/combat/sheet-profile";

export interface CombatTokenContext {
  tokenId: string;
  label: string;
  ownerParticipantId: string | null;
  character: SessionCharacterRecord | null;
}

export interface DefenseResponseInput {
  option: CombatDefenseOption;
  retreat?: boolean;
  acrobatic?: boolean;
  feverish?: boolean;
  manualModifier?: number;
}

export interface PreparedAttackPrompt {
  summary: string;
  options: CombatDefenseOption[];
  attackRoll: CombatRollRecord;
  canRetreat: boolean;
  canAcrobatic: boolean;
}

export interface ResolvedCombatExchange {
  resolution: CombatResolutionRecord;
  actorProfile: SessionCharacterSheetProfile | null;
  targetProfile: SessionCharacterSheetProfile | null;
}

export interface PreparedAttackResult {
  status: "resolved" | "awaiting-defense";
  draftAction: CombatDraftAction;
  resolution?: CombatResolutionRecord;
  actorProfile: SessionCharacterSheetProfile | null;
  targetProfile: SessionCharacterSheetProfile | null;
  prompt?: PreparedAttackPrompt;
}

export interface ContestResult extends ResolvedCombatExchange {
  actorWins: number;
  targetWins: number;
  finished: boolean;
}

export interface FeintResult {
  resolution: CombatResolutionRecord;
  feintPenalty: number;
  feintPenaltyBy: string | null;
  actorProfile: SessionCharacterSheetProfile | null;
  targetProfile: SessionCharacterSheetProfile | null;
}

export interface AimResult {
  resolution: CombatResolutionRecord;
  accumulatedAimTurns: number;
}

export interface DeathCheckResult {
  passed: boolean;
  roll: CombatRollRecord;
  threshold: string;
  autoKill: boolean;
}

export interface StartOfTurnResult {
  effects: StartOfTurnEffects;
  nextProfile: SessionCharacterSheetProfile;
}

interface DamageRoll {
  total: number;
  rawDice: number[];
  ignoreDr?: boolean;
}

interface CriticalAttackEffect {
  damageMultiplier: number;
  ignoreDr: boolean;
  forceVitals: boolean;
  forceGraveWound: boolean;
  forceCripple: boolean;
  note: string | null;
}

interface CriticalFailureEffect {
  note: string;
  prone?: boolean;
  fpLoss?: number;
}

const bleedingDamageTypes = new Set<CombatDamageType>([
  "cut",
  "imp",
  "pi-",
  "pi",
  "pi+",
  "pi++"
]);

const hitLocationData: Record<
  CombatHitLocationId,
  {
    attackModifier: number;
    drMultiplier?: number;
    drDivisor?: number;
    injuryMultiplier?: number;
  }
> = {
  torso: { attackModifier: 0 },
  vitals: { attackModifier: -3, injuryMultiplier: 3 },
  face: { attackModifier: -5, injuryMultiplier: 1 },
  neck: { attackModifier: -5, injuryMultiplier: 1.5 },
  skull: { attackModifier: -7, drMultiplier: 2, injuryMultiplier: 4 },
  arm: { attackModifier: -2, injuryMultiplier: 1 },
  hand: { attackModifier: -4, injuryMultiplier: 1 },
  leg: { attackModifier: -2, injuryMultiplier: 1 },
  foot: { attackModifier: -4, injuryMultiplier: 1 },
  eye: { attackModifier: -9, injuryMultiplier: 4 },
  chink: { attackModifier: -8, drDivisor: 2, injuryMultiplier: 1 }
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function rollDie(random: () => number) {
  return Math.max(1, Math.min(6, Math.floor(random() * 6) + 1));
}

function randomId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function roll3d6(random: () => number = Math.random) {
  const dice = [rollDie(random), rollDie(random), rollDie(random)] as [number, number, number];
  return {
    total: dice[0] + dice[1] + dice[2],
    dice
  };
}

function isCriticalSuccess(total: number, target: number) {
  return total <= 4 || (total === 5 && target >= 15) || (total === 6 && target >= 16);
}

function isCriticalFailure(total: number, target: number) {
  return total === 18 || (total === 17 && target <= 15) || total - target >= 10;
}

function buildRollRecord(target: number, random: () => number = Math.random): CombatRollRecord {
  const rolled = roll3d6(random);
  const margin = target - rolled.total;

  return {
    total: rolled.total,
    dice: rolled.dice,
    target,
    margin,
    critical: isCriticalSuccess(rolled.total, target)
      ? "critical-success"
      : isCriticalFailure(rolled.total, target)
        ? "critical-failure"
        : "none"
  };
}

function formatRollResult(roll: CombatRollRecord) {
  const diceStr = roll.dice.join("+");
  return `(${diceStr}=${roll.total} vs ${roll.target}, Margem: ${roll.margin >= 0 ? "+" : ""}${roll.margin})`;
}

function getProfile(character: SessionCharacterRecord | null) {
  if (!character) {
    return null;
  }

  return normalizeSheetProfile(
    character.sheetProfile,
    createEmptySheetProfile({
      name: character.name,
      attributes: {
        hpMax: character.hpMax,
        fpMax: character.fpMax
      }
    })
  );
}

function getSkillLevel(profile: SessionCharacterSheetProfile, skillName: string | null | undefined) {
  if (!skillName) {
    return profile.skills[0]?.level ?? profile.attributes.dx;
  }

  const normalized = skillName.trim().toLowerCase();
  const exact = profile.skills.find((skill) => skill.name.trim().toLowerCase() === normalized);

  if (exact) {
    return exact.level;
  }

  const fuzzy = profile.skills.find((skill) =>
    skill.name.trim().toLowerCase().includes(normalized)
  );

  return fuzzy?.level ?? profile.skills[0]?.level ?? profile.attributes.dx;
}

function getTechnique(
  profile: SessionCharacterSheetProfile,
  techniqueId: string | null | undefined
) {
  if (!techniqueId) {
    return null;
  }

  return profile.techniques.find((technique) => technique.id === techniqueId) ?? null;
}

function getWeapon(profile: SessionCharacterSheetProfile, weaponId: string | null | undefined) {
  if (weaponId) {
    return profile.weapons.find((weapon) => weapon.id === weaponId) ?? null;
  }

  return (
    profile.weapons.find((weapon) => weapon.id === profile.combat.activeWeaponId) ??
    profile.weapons[0] ??
    null
  );
}

function getWeaponMode(
  weapon: CharacterWeaponRecord | null,
  modeId: string | null | undefined
) {
  if (!weapon) {
    return null;
  }

  if (modeId) {
    return weapon.modes.find((mode) => mode.id === modeId) ?? null;
  }

  return weapon.modes.find((mode) => mode.id === weapon.id) ?? weapon.modes[0] ?? null;
}

function postureAttackPenalty(posture: SessionCharacterSheetProfile["combat"]["posture"]) {
  switch (posture) {
    case "kneeling":
      return -2;
    case "prone":
      return -4;
    case "sitting":
      return -2;
    case "crouching":
      // GURPS B551: Crouching dá -2 em ataques corpo-a-corpo
      return -2;
    default:
      return 0;
  }
}

function postureDefensePenalty(posture: SessionCharacterSheetProfile["combat"]["posture"]) {
  switch (posture) {
    case "kneeling":
      return -2;
    case "prone":
      return -3;
    case "sitting":
      return -2;
    case "crouching":
      // GURPS B551: Crouching não afeta defesas ativas
      return 0;
    default:
      return 0;
  }
}

export function calculateRangePenalty(rangeMeters?: number | null) {
  if (!rangeMeters || rangeMeters <= 2) {
    return 0;
  }

  if (rangeMeters <= 5) {
    return -1;
  }

  if (rangeMeters <= 10) {
    return -2;
  }

  if (rangeMeters <= 20) {
    return -3;
  }

  if (rangeMeters <= 30) {
    return -4;
  }

  if (rangeMeters <= 50) {
    return -5;
  }

  if (rangeMeters <= 70) {
    return -6;
  }

  if (rangeMeters <= 100) {
    return -7;
  }

  if (rangeMeters <= 150) {
    return -8;
  }

  if (rangeMeters <= 200) {
    return -9;
  }

  return -10;
}

function getHitLocationAttackModifier(location: CombatHitLocationId) {
  return hitLocationData[location]?.attackModifier ?? 0;
}

function getManualAttackModifier(
  mode: CharacterWeaponMode | null,
  profile: SessionCharacterSheetProfile,
  action: CombatDraftAction
) {
  const ranged = action.actionType === "ranged-attack";
  const rangePenalty = ranged ? calculateRangePenalty(action.modifiers.rangeMeters) : 0;
  const aimBonus =
    ranged && mode?.accuracy
      ? mode.accuracy + Math.max(0, (action.modifiers.aimTurns ?? 0) - 1)
      : 0;
  const deceptivePenalty = (action.deceptiveLevel ?? 0) * 2;
  const committedBonus = action.attackVariant === "committed" ? 2 : 0;
  const bracedBonus = ranged && action.modifiers.braced ? 1 : 0;
  const determinedBonus = action.modifiers.determined ? 1 : 0;
  const weaponStateModifier =
    getWeapon(profile, action.weaponId)?.state === "empowered"
      ? 1
      : getWeapon(profile, action.weaponId)?.state === "spent"
        ? -1
        : 0;

  const rapidStrikePenalty = action.rapidStrike ? 6 : 0;
  const dualWeaponPenalty = action.dualWeapon ? 4 : 0;

  return (
    action.modifiers.manualToHit +
    aimBonus +
    bracedBonus +
    determinedBonus +
    committedBonus +
    weaponStateModifier +
    rangePenalty +
    postureAttackPenalty(profile.combat.posture) +
    getHitLocationAttackModifier(action.hitLocation) -
    profile.combat.shock -
    deceptivePenalty +
    profile.combat.evaluateBonus -
    rapidStrikePenalty -
    dualWeaponPenalty
  );
}

function getAttackTarget(
  profile: SessionCharacterSheetProfile,
  action: CombatDraftAction,
  mode: CharacterWeaponMode | null
) {
  const technique = getTechnique(profile, action.techniqueId);
  const baseTarget = technique?.level ?? getSkillLevel(profile, technique?.skill ?? mode?.skill);
  return clamp(baseTarget + getManualAttackModifier(mode, profile, action), 3, 20);
}

export function getDefenseTargetWithModifiers(
  profile: SessionCharacterSheetProfile,
  option: CombatDefenseOption,
  targetState?: CombatantTurnState | null,
  response?: DefenseResponseInput,
  deceptivePenalty: number = 0,
  random: () => number = Math.random,
  iaiStrike: boolean = false
) {
  const posturePenalty = postureDefensePenalty(profile.combat.posture);
  
  // GURPS: Recuo dá +3 para Esquiva e +1 para Aparar/Bloqueio
  let retreatBonus = 0;
  if (response?.retreat) {
    retreatBonus = (option === "dodge") ? 3 : 1;
  }

  // GURPS: Esquiva Acrobática exige teste de perícia
  let acrobaticBonus = 0;
  if (option === "dodge" && response?.acrobatic) {
    const acrobaticTest = checkSkillTest(profile, "Acrobacia", random);
    acrobaticBonus = acrobaticTest.success ? 2 : -2;
  }

  // Daimyo/GURPS: Defesa Febril dá +2 em troca de 1 PF
  const feverishBonus = response?.feverish ? 2 : 0;

  // GURPS: Penalidade de Finta e Bônus de Defesa Total
  const feintPenalty = targetState?.feintPenalty ?? 0;
  const allOutDefenseBonus = targetState?.allOutDefenseVariant === "increased" ? 2 : 0;
  
  // Artes Marciais: Ataque Defensivo dá +1 Aparar/Bloqueio
  const defensiveAttackBonus = (targetState?.attackVariant === "defensive" && (option === "parry" || option === "block")) ? 1 : 0;
  
  // Artes Marciais: Ataque Ofensivo dá -2 na Defesa
  const committedAttackPenalty = targetState?.attackVariant === "committed" ? 2 : 0;

  // GURPS B376: Aparagens múltiplas — cada aparagem após a primeira sofre -4 cumulativo
  let multipleParryPenalty = 0;
  if (option === "parry" && targetState?.defenseUsedThisTurn) {
    const priorParries = targetState.defenseUsedThisTurn.filter((d) => d === "parry").length;
    if (priorParries > 0) {
      multipleParryPenalty = priorParries * 4;
    }
  }

  const base =
    option === "parry"
      ? profile.defenses.parry
      : option === "block"
        ? profile.defenses.block
        : profile.defenses.dodge;

  const manual = response?.manualModifier ?? 0;

  return clamp(
    base + 
    manual + 
    retreatBonus + 
    acrobaticBonus + 
    feverishBonus + 
    allOutDefenseBonus + 
    defensiveAttackBonus -
    feintPenalty -
    deceptivePenalty -
    committedAttackPenalty -
    multipleParryPenalty -
    (iaiStrike ? 1 : 0) +
    posturePenalty, 
    3, 18
  );
}

function checkSkillTest(
  profile: SessionCharacterSheetProfile,
  skillName: string,
  random: () => number = Math.random
) {
  const level = getSkillLevel(profile, skillName);
  const roll = buildRollRecord(level, random);
  return { success: roll.margin >= 0, roll };
}

export function listValidDefenseOptions(
  target: CombatTokenContext,
  actionType: CombatActionType,
  targetState?: CombatantTurnState | null
) {
  const profile = getProfile(target.character);

  if (!profile) {
    return ["none"] satisfies CombatDefenseOption[];
  }

  // Regra GURPS: Ataque Total impede qualquer defesa ativa até o próximo turno
  if (targetState?.allOutAttackVariant || targetState?.noDefenseThisTurn) {
    return ["none"] satisfies CombatDefenseOption[];
  }

  const options: CombatDefenseOption[] = [];

  if (profile.defenses.dodge > 0) {
    options.push("dodge");
  }

  if (actionType !== "ranged-attack" && profile.defenses.parry > 0) {
    options.push("parry");
  }

  if (actionType !== "ranged-attack" && profile.defenses.block > 0) {
    options.push("block");
  }

  options.push("none");
  return [...new Set(options)];
}

function getThrustDamage(st: number): { dice: number; adds: number } {
  if (st <= 8) return { dice: 1, adds: -3 };
  if (st <= 10) return { dice: 1, adds: -2 };
  if (st <= 12) return { dice: 1, adds: -1 };
  if (st <= 14) return { dice: 1, adds: 0 };
  if (st <= 16) return { dice: 1, adds: 1 };
  if (st <= 18) return { dice: 1, adds: 2 };
  if (st <= 20) return { dice: 2, adds: -1 };
  // GURPS B16: ST>20 segue progressão de +1 add por 2 ST, +1 dado por 4 ST
  // ST 21-22: 2d, ST 23-24: 2d+1, ST 25-26: 2d+2, ST 27-28: 3d-1, ST 29-30: 3d, etc.
  const stOver = st - 21;
  const extraDice = Math.floor(stOver / 4);
  const step = stOver % 4; // 0→+0, 1→+0, 2→+1, 3→+1 → simplificando: Math.floor(step/2)
  const addsTable = [0, 0, 1, 1];
  return { dice: 2 + extraDice, adds: addsTable[step] ?? 0 };
}

function getSwingDamage(st: number): { dice: number; adds: number } {
  if (st <= 8) return { dice: 1, adds: -2 };
  if (st <= 9) return { dice: 1, adds: -1 };
  if (st <= 10) return { dice: 1, adds: 0 };
  if (st <= 11) return { dice: 1, adds: 1 };
  if (st <= 12) return { dice: 1, adds: 2 };
  if (st <= 13) return { dice: 2, adds: -1 };
  if (st <= 14) return { dice: 2, adds: 0 };
  if (st <= 15) return { dice: 2, adds: 1 };
  if (st <= 16) return { dice: 2, adds: 2 };
  if (st <= 17) return { dice: 3, adds: -1 };
  if (st <= 18) return { dice: 3, adds: 0 };
  if (st <= 19) return { dice: 3, adds: 1 };
  if (st <= 20) return { dice: 3, adds: 2 };
  // GURPS B16: ST>20 segue progressão de +1 add por ST, +1 dado a cada 2
  // ST 21: 4d-1, ST 22: 4d, ST 23: 4d+1, ST 24: 4d+2, ST 25: 5d-1, etc.
  const stOver = st - 21;
  const extraDice = Math.floor(stOver / 4);
  const addsTable = [-1, 0, 1, 2];
  return { dice: 4 + extraDice, adds: addsTable[stOver % 4] ?? 0 };
}

function applyQualityDamageBonus(weapon: CharacterWeaponRecord | null, damageType: CombatDamageType) {
  const quality = weapon?.quality?.toLowerCase() ?? "";

  if (!["cut", "imp", "pi", "pi+", "pi++", "pi-"].includes(damageType)) {
    return 0;
  }

  if (quality.includes("muito fina")) {
    return 2;
  }

  if (quality.includes("fina")) {
    return 1;
  }

  return 0;
}

function rollDamage(
  spec: CharacterDamageSpec,
  st: number,
  weapon: CharacterWeaponRecord | null,
  random: () => number = Math.random,
  bonus: number = 0
): DamageRoll {
  const derived =
    spec.base === "thrust"
      ? getThrustDamage(st)
      : spec.base === "swing"
        ? getSwingDamage(st)
        : { dice: spec.dice, adds: 0 };
  const diceCount = spec.base === "flat" ? spec.dice : derived.dice;
  const adds =
    (spec.base === "flat" ? spec.adds : derived.adds + spec.adds) +
    applyQualityDamageBonus(weapon, spec.damageType) +
    (weapon?.state === "empowered" ? 1 : 0) -
    (weapon?.state === "spent" ? 1 : 0) +
    bonus;
  const rawDice = Array.from({ length: Math.max(1, diceCount) }, () => rollDie(random));
  const total = Math.max(1, rawDice.reduce((sum, die) => sum + die, 0) + adds);

  return { total, rawDice };
}

function damageMultiplierForType(type: CombatDamageType) {
  switch (type) {
    case "cut":
      return 1.5;
    case "imp":
      return 2;
    case "pi-":
      return 0.5;
    case "pi+":
      return 1.5;
    case "pi++":
      return 2;
    default:
      return 1;
  }
}

function injuryMultiplier(location: CombatHitLocationId, type: CombatDamageType) {
  if (location === "vitals") {
    return ["imp", "pi-", "pi", "pi+", "pi++", "burn"].includes(type) ? 3 : 1;
  }

  if (location === "skull" || location === "eye") {
    return 4;
  }

  if (location === "neck") {
    if (type === "cut") {
      return 2;
    }

    if (type === "imp") {
      return 1.5;
    }
  }

  return hitLocationData[location]?.injuryMultiplier ?? damageMultiplierForType(type);
}

function getEffectiveDr(
  profile: SessionCharacterSheetProfile,
  location: CombatHitLocationId
) {
  const baseDr = profile.armor.reduce((total, armor) => {
    if (armor.zone === "all" || armor.zone === location) {
      return total + armor.dr;
    }

    return total;
  }, 0);
  const locationMeta = hitLocationData[location];
  const scaled = locationMeta?.drMultiplier ? baseDr * locationMeta.drMultiplier : baseDr;
  const divided = locationMeta?.drDivisor ? scaled / locationMeta.drDivisor : scaled;
  return Math.max(0, Math.floor(divided));
}

function hasCripplingEffect(location: CombatHitLocationId) {
  return ["arm", "hand", "leg", "foot", "eye"].includes(location);
}

/**
 * Calcula o limite de dano para invalidez de membros (GURPS Lite/Básico).
 * Braço/Perna: > HP/2
 * Mão/Pé: > HP/3
 * Olho: > HP/10
 * Retorna { isCrippled: boolean, cappedInjury: number, isCapped: boolean }
 */
function getLimbCripplingLimit(location: CombatHitLocationId, maxHp: number, currentInjury: number) {
  let limit = Infinity;
  
  if (location === "arm" || location === "leg") {
    limit = Math.floor(maxHp / 2) + 1;
  } else if (location === "hand" || location === "foot") {
    limit = Math.floor(maxHp / 3) + 1;
  } else if (location === "eye") {
    limit = Math.floor(maxHp / 10) + 1;
  }

  if (currentInjury >= limit && limit !== Infinity) {
    return { isCrippled: true, cappedInjury: limit, isCapped: true };
  }

  return { isCrippled: false, cappedInjury: currentInjury, isCapped: false };
}

function applyCondition(
  profile: SessionCharacterSheetProfile,
  label: string,
  notes?: string
) {
  const existing = profile.conditions.find((condition) => condition.label === label);

  if (existing) {
    return profile;
  }

  const nextCondition: CharacterConditionRecord = {
    id: `${label.toLowerCase().replace(/\s+/g, "-")}-${profile.conditions.length + 1}`,
    label,
    source: "combat",
    ...(notes ? { notes } : {})
  };

  return {
    ...profile,
    conditions: [...profile.conditions, nextCondition]
  };
}

function criticalAttackEffect(
  attackRoll: CombatRollRecord,
  hitLocation: CombatHitLocationId,
  random: () => number = Math.random
): CriticalAttackEffect {
  if (attackRoll.critical !== "critical-success") {
    return {
      damageMultiplier: 1,
      ignoreDr: false,
      forceVitals: false,
      forceGraveWound: false,
      forceCripple: false,
      note: null
    };
  }

  const tableRoll = roll3d6(random).total;

  if ([3, 16, 17, 18].includes(tableRoll)) {
    return {
      damageMultiplier: 3,
      ignoreDr: false,
      forceVitals: false,
      forceGraveWound: false,
      forceCripple: false,
      note: "Golpe critico fulminante: dano triplo."
    };
  }

  if ([4, 13].includes(tableRoll)) {
    return {
      damageMultiplier: 1,
      ignoreDr: true,
      forceVitals: false,
      forceGraveWound: false,
      forceCripple: false,
      note: "Golpe critico: ignora RD."
    };
  }

  if ([5, 15].includes(tableRoll)) {
    return {
      damageMultiplier: 2,
      ignoreDr: false,
      forceVitals: false,
      forceGraveWound: false,
      forceCripple: false,
      note: "Golpe critico: dano dobrado."
    };
  }

  if (tableRoll === 7) {
    return {
      damageMultiplier: 1,
      ignoreDr: false,
      forceVitals: false,
      forceGraveWound: true,
      forceCripple: false,
      note: "Golpe critico: ferimento grave automatico."
    };
  }

  if (tableRoll === 8) {
    return {
      damageMultiplier: 1,
      ignoreDr: false,
      forceVitals: false,
      forceGraveWound: false,
      forceCripple: hasCripplingEffect(hitLocation),
      note: hasCripplingEffect(hitLocation)
        ? "Golpe critico: membro inutilizado."
        : "Golpe critico."
    };
  }

  if (tableRoll === 14 && hitLocation === "torso") {
    return {
      damageMultiplier: 1,
      ignoreDr: false,
      forceVitals: true,
      forceGraveWound: false,
      forceCripple: false,
      note: "Golpe critico: acerto nos vitais."
    };
  }

  return {
    damageMultiplier: 1,
    ignoreDr: false,
    forceVitals: false,
    forceGraveWound: false,
    forceCripple: false,
    note: "Golpe critico."
  };
}

function criticalFailureEffect(
  attackRoll: CombatRollRecord,
  random: () => number = Math.random
): CriticalFailureEffect | null {
  if (attackRoll.critical !== "critical-failure") {
    return null;
  }

  const tableRoll = roll3d6(random).total;

  if ([3, 4, 17, 18].includes(tableRoll)) {
    return { note: "Falha critica: a arma se quebra ou perde a utilidade imediata." };
  }

  if ([5, 16].includes(tableRoll)) {
    return { note: "Falha critica: acerta a si mesmo de raspao." };
  }

  if ([7, 13].includes(tableRoll)) {
    return { note: "Falha critica: perde o equilibrio e cai.", prone: true };
  }

  if (tableRoll === 14) {
    return {
      note: "Falha critica: torcao dolorosa, perde fadiga.",
      fpLoss: rollDie(random)
    };
  }

  return { note: "Falha critica: larga ou trava a arma." };
}

function buildDamageBreakdown(input: {
  targetProfile: SessionCharacterSheetProfile;
  damageRoll: DamageRoll;
  damageType: CombatDamageType;
  hitLocation: CombatHitLocationId;
  ignoreDr?: boolean;
  multiplier?: number;
}) {
  const effectiveDr = input.ignoreDr ? 0 : getEffectiveDr(input.targetProfile, input.hitLocation);
  const penetratingDamage = Math.max(0, input.damageRoll.total - effectiveDr);
  const multiplier =
    (input.multiplier ?? 1) * injuryMultiplier(input.hitLocation, input.damageType);
  const baseInjury = Math.max(0, Math.floor(penetratingDamage * multiplier));
  
  // Lógica de Crippling (Invalidez)
  const crippling = getLimbCripplingLimit(input.hitLocation, input.targetProfile.attributes.hpMax, baseInjury);
  const finalInjury = crippling.cappedInjury;

  return {
    rawDamage: input.damageRoll.total,
    rawDice: input.damageRoll.rawDice,
    damageType: input.damageType,
    hitLocation: input.hitLocation,
    armorDivisor: 1,
    effectiveDr,
    penetratingDamage,
    injury: finalInjury,
    multiplier,
    isCrippled: crippling.isCrippled,
    isCapped: crippling.isCapped
  } satisfies CombatDamageBreakdown;
}

function applyDamageToTarget(input: {
  profile: SessionCharacterSheetProfile;
  breakdown: CombatDamageBreakdown;
  random?: () => number;
  forceGraveWound?: boolean;
  forceCripple?: boolean;
}) {
  const random = input.random ?? Math.random;
  let nextProfile: SessionCharacterSheetProfile = {
    ...input.profile,
    combat: {
      ...input.profile.combat,
      currentHp: input.profile.combat.currentHp - input.breakdown.injury,
      shock: clamp(input.breakdown.injury, 0, 4),
      bleeding:
        input.profile.combat.bleeding +
        (input.breakdown.injury > 0 && bleedingDamageTypes.has(input.breakdown.damageType) ? 1 : 0)
    }
  };
  const appliedConditions: string[] = [];

  if (
    input.breakdown.injury > input.profile.attributes.hpMax / 2 ||
    input.forceGraveWound
  ) {
    const htRoll = buildRollRecord(input.profile.attributes.ht, random);

    if (htRoll.margin < 0 || input.forceGraveWound) {
      nextProfile = applyCondition(nextProfile, "Atordoado", "Ferimento grave.");
      appliedConditions.push("Atordoado");
    }

    nextProfile = applyCondition(nextProfile, "Ferimento grave");
    appliedConditions.push("Ferimento grave");
  }

  // Aplicar condição de Crippling (Invalidez)
  if (input.breakdown.isCrippled || input.forceCripple) {
    const labels: Record<string, string> = {
      arm: "Braço Inutilizado",
      leg: "Perna Inutilizada",
      hand: "Mão Inutilizada",
      foot: "Pé Inutilizado",
      eye: "Cegueira Parcial (Olho)"
    };
    const label = labels[input.breakdown.hitLocation] || "Membro Inutilizado";
    nextProfile = applyCondition(nextProfile, label, "Resultado de dano severo no membro.");
    appliedConditions.push(label);
  }

  if (nextProfile.combat.currentHp <= 0) {
    const htRoll = buildRollRecord(nextProfile.attributes.ht, random);

    if (htRoll.margin < 0) {
      nextProfile = applyCondition(nextProfile, "Colapso");
      appliedConditions.push("Colapso");
    } else {
      nextProfile = applyCondition(nextProfile, "Abaixo de 0 PV");
      appliedConditions.push("Abaixo de 0 PV");
    }
  }

  if (nextProfile.combat.bleeding > 0) {
    nextProfile = applyCondition(nextProfile, "Sangramento");
    appliedConditions.push("Sangramento");
  }

  return { nextProfile, appliedConditions };
}

function resolveMiss(
  action: CombatDraftAction,
  attackRoll: CombatRollRecord,
  summary: string,
  actorProfile: SessionCharacterSheetProfile | null,
  targetProfile: SessionCharacterSheetProfile | null
): PreparedAttackResult {
  return {
    status: "resolved",
    draftAction: action,
    actorProfile,
    targetProfile,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: action.actorTokenId,
      targetTokenId: action.targetTokenId,
      actionType: action.actionType,
      summary,
      attackRoll,
      defenseRoll: null,
      damage: null,
      appliedConditions: []
    }
  };
}

function buildAttackSummary(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  weaponMode: CharacterWeaponMode | null;
  technique?: CharacterTechniqueRecord | null;
  hitLocation: CombatHitLocationId;
  variant?: AttackVariant | null;
  deceptiveLevel?: number | null;
}) {
  const variantLabel = 
    input.variant === "committed" ? "Ataque Ofensivo (+2 acerto, -2 defesa)" :
    input.variant === "defensive" ? "Ataque Defensivo (-2 dano, +1 aparar)" :
    input.variant === "deceptive" ? `Ataque Enganoso (-${(input.deceptiveLevel || 0) * 2} acerto, -${input.deceptiveLevel || 0} defesa)` : "";
    
  const prefix = variantLabel ? `[${variantLabel}] ` : "";
  const weaponLabel = input.technique?.name ?? input.weaponMode?.label ?? "ataque";
  
  return `${prefix}${input.actor.label} ataca ${input.target.label} com ${weaponLabel} mirando ${input.hitLocation}.`;
}

export function prepareAttackResolution(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  promptPlayerDefense: boolean;
  targetState?: CombatantTurnState | null;
  variant?: AllOutAttackVariant | null;
  random?: () => number;
  iaiStrike?: boolean;
}): PreparedAttackResult {
  const random = input.random ?? Math.random;
  const actorProfile = getProfile(input.actor.character);
  const targetProfile = getProfile(input.target.character);

  if (!actorProfile || !targetProfile || !input.draftAction.targetTokenId) {
    return {
      status: "resolved",
      draftAction: input.draftAction,
      actorProfile,
      targetProfile,
      resolution: {
        id: randomId("combat-resolution"),
        createdAt: new Date().toISOString(),
        actorTokenId: input.draftAction.actorTokenId,
        targetTokenId: input.draftAction.targetTokenId,
        actionType: input.draftAction.actionType,
        summary: "Ataque invalido: ficha ou alvo incompleto.",
        appliedConditions: []
      }
    };
  }

  // Se houver variante (Ataque Total), processamos e chamamos recursivamente SEM a variante
  if (input.variant) {
    const modifiedAction = { ...input.draftAction };
    let nextActorProfile = actorProfile;

    if (input.variant === "strong" || input.variant === "double") {
      nextActorProfile = {
        ...actorProfile,
        combat: {
          ...actorProfile.combat,
          currentFp: Math.max(0, actorProfile.combat.currentFp - 1)
        }
      };
    }

    switch (input.variant) {
      case "determined":
        const isRanged = input.draftAction.actionType === "ranged-attack";
        const bonus = isRanged ? 1 : 4;
        modifiedAction.modifiers = {
          ...modifiedAction.modifiers,
          manualToHit: modifiedAction.modifiers.manualToHit + bonus,
          determined: true
        };
        break;
      case "strong":
        modifiedAction.modifiers = {
          ...modifiedAction.modifiers,
          manualDamage: modifiedAction.modifiers.manualDamage + 2,
          determined: false
        };
        break;
      case "long":
        modifiedAction.modifiers = {
          ...modifiedAction.modifiers,
          manualToHit: modifiedAction.modifiers.manualToHit + 1
        };
        break;
    }

    const result = prepareAttackResolution({
      ...input,
      variant: null, // Evita loop infinito
      actor: { ...input.actor, character: { ...input.actor.character!, sheetProfile: nextActorProfile } },
      draftAction: modifiedAction
    });

    if (result.resolution && input.variant) {
      const isRanged = input.draftAction.actionType === "ranged-attack";
      const variantLabels: Record<string, string> = {
        determined: `Determinado (${isRanged ? "+1" : "+4"})`,
        strong: "Forte (+2 dano, -1 PF)",
        double: "Duplo (-1 PF)",
        long: "Longo (+1 alcance, +1 acerto)"
      };
      const variantLabel = variantLabels[input.variant] || input.variant;
      result.resolution.summary = `[Ataque Total ${variantLabel}] ${result.resolution.summary}`;
    }

    return result;
  }

  const weapon = getWeapon(actorProfile, input.draftAction.weaponId);
  const mode = getWeaponMode(weapon, input.draftAction.weaponModeId);
  const attackTarget = getAttackTarget(actorProfile, input.draftAction, mode);
  const attackRoll = buildRollRecord(attackTarget, random);
  const technique = getTechnique(actorProfile, input.draftAction.techniqueId);
  const baseSummary = buildAttackSummary({
    actor: input.actor,
    target: input.target,
    weaponMode: mode,
    technique,
    hitLocation: input.draftAction.hitLocation,
    variant: input.draftAction.attackVariant,
    deceptiveLevel: input.draftAction.deceptiveLevel
  });

  if (attackRoll.margin < 0) {
    const failure = criticalFailureEffect(attackRoll, random);
    let nextActorProfile = actorProfile;
    const appliedConditions: string[] = [];

    if (failure?.fpLoss) {
      nextActorProfile = {
        ...actorProfile,
        combat: {
          ...actorProfile.combat,
          currentFp: Math.max(0, actorProfile.combat.currentFp - failure.fpLoss)
        }
      };
      appliedConditions.push(`Perde ${failure.fpLoss} PF`);
    }

    if (failure?.prone) {
      nextActorProfile = applyCondition(nextActorProfile, "Caido");
      appliedConditions.push("Caido");
    }

    return {
      status: "resolved",
      draftAction: input.draftAction,
      actorProfile: nextActorProfile,
      targetProfile,
      resolution: {
        id: randomId("combat-resolution"),
        createdAt: new Date().toISOString(),
        actorTokenId: input.actor.tokenId,
        targetTokenId: input.target.tokenId,
        actionType: input.draftAction.actionType,
        summary: failure 
          ? `${baseSummary} ${failure.note} ${formatRollResult(attackRoll)}` 
          : `${baseSummary} erra o ataque ${formatRollResult(attackRoll)}.`,
        attackRoll,
        defenseRoll: null,
        damage: null,
        appliedConditions
      }
    };
  }

  const defenses = listValidDefenseOptions(
    input.target,
    input.draftAction.actionType,
    input.targetState
  ).filter((option) => option !== "none");

  if (attackRoll.critical === "critical-success" || defenses.length === 0) {
    const resolved = finishAttackResolution({
      actor: input.actor,
      target: input.target,
      draftAction: input.draftAction,
      attackRoll,
      defenseResponse: { option: "none" },
      targetState: input.targetState,
      random,
      iaiStrike: input.iaiStrike
    });

    return {
      status: "resolved",
      draftAction: input.draftAction,
      actorProfile: resolved.actorProfile,
      targetProfile: resolved.targetProfile,
      resolution: {
        ...resolved.resolution,
        summary:
          attackRoll.critical === "critical-success"
            ? `${resolved.resolution.summary} Sem defesa ativa por critico.`
            : resolved.resolution.summary
      }
    };
  }

  if (input.promptPlayerDefense) {
    return {
      status: "awaiting-defense",
      draftAction: input.draftAction,
      actorProfile,
      targetProfile,
      prompt: {
        summary: `${baseSummary} O alvo pode tentar defesa ativa.`,
        options: defenses,
        attackRoll,
        canRetreat: defenses.some((option) => option === "dodge" || option === "parry"),
        canAcrobatic: defenses.includes("dodge")
      }
    };
  }

const resolved = finishAttackResolution({
      actor: input.actor,
      target: input.target,
      draftAction: input.draftAction,
      attackRoll,
      defenseResponse: {
        option: input.draftAction.selectedDefense ?? "none",
        retreat: input.draftAction.modifiers.retreat,
        acrobatic: input.draftAction.modifiers.acrobatic
      },
      targetState: input.targetState,
      random,
      iaiStrike: input.iaiStrike
    });

  return {
    status: "resolved",
    draftAction: input.draftAction,
    actorProfile: resolved.actorProfile,
    targetProfile: resolved.targetProfile,
    resolution: resolved.resolution
  };
}

export function finishAttackResolution(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  attackRoll: CombatRollRecord;
  defenseResponse?: DefenseResponseInput;
  targetState?: CombatantTurnState | null;
  random?: () => number;
  iaiStrike?: boolean;
}): ResolvedCombatExchange {
  const random = input.random ?? Math.random;
  const actorProfile = getProfile(input.actor.character);
  const targetProfile = getProfile(input.target.character);

  if (!actorProfile || !targetProfile) {
    return {
      actorProfile,
      targetProfile,
      resolution: {
        id: randomId("combat-resolution"),
        createdAt: new Date().toISOString(),
        actorTokenId: input.actor.tokenId,
        targetTokenId: input.target.tokenId,
        actionType: input.draftAction.actionType,
        summary: "Ataque invalido: faltou ficha completa no ator ou no alvo.",
        appliedConditions: []
      }
    };
  }

  const weapon = getWeapon(actorProfile, input.draftAction.weaponId);
  const mode = getWeaponMode(weapon, input.draftAction.weaponModeId);
  const critical = criticalAttackEffect(
    input.attackRoll,
    input.draftAction.hitLocation,
    random
  );
  const defenseOption =
    input.attackRoll.critical === "critical-success"
      ? "none"
      : input.defenseResponse?.option ?? "none";
  const finalTargetProfile = { ...targetProfile };
  let feverishNote = "";
  if (input.defenseResponse?.feverish) {
    finalTargetProfile.combat.currentFp = Math.max(0, finalTargetProfile.combat.currentFp - 1);
    feverishNote = " [Defesa Febril -1 PF]";
  }

  const defenseRoll =
    defenseOption !== "none"
      ? buildRollRecord(getDefenseTargetWithModifiers(finalTargetProfile, defenseOption, input.targetState ?? null, input.defenseResponse, (input.draftAction.deceptiveLevel || 0), random, input.iaiStrike), random)
      : null;
  const technique = getTechnique(actorProfile, input.draftAction.techniqueId);
  const baseSummary = buildAttackSummary({
    actor: input.actor,
    target: input.target,
    weaponMode: mode,
    technique,
    hitLocation: input.draftAction.hitLocation,
    variant: input.draftAction.attackVariant,
    deceptiveLevel: input.draftAction.deceptiveLevel
  });

  if (defenseRoll && defenseRoll.margin >= 0 && defenseRoll.critical !== "critical-failure") {
    return {
      actorProfile,
      targetProfile: finalTargetProfile,
      resolution: {
        id: randomId("combat-resolution"),
        createdAt: new Date().toISOString(),
        actorTokenId: input.actor.tokenId,
        targetTokenId: input.target.tokenId,
        actionType: input.draftAction.actionType,
        summary: `${baseSummary} ${input.target.label} evita o golpe com ${defenseOption}${feverishNote} ${formatRollResult(defenseRoll)}.`,
        attackRoll: input.attackRoll,
        defenseRoll,
        damage: null,
        appliedConditions: []
      }
    };
  }

  const hitLocation = critical.forceVitals ? "vitals" : input.draftAction.hitLocation;
  // GURPS Martial Arts p100: Ataque Defensivo aplica -2 dano OU -1 por dado (o que for maior)
  const damageSpec = mode?.damage ?? { base: "flat", dice: 1, adds: 0, damageType: "cr", raw: "1d cr" };
  const defensiveDamagePenalty = input.draftAction.attackVariant === "defensive"
    ? (() => {
        const derived = damageSpec.base === "thrust"
          ? getThrustDamage(actorProfile.attributes.st)
          : damageSpec.base === "swing"
            ? getSwingDamage(actorProfile.attributes.st)
            : { dice: damageSpec.dice, adds: 0 };
        const diceCount = damageSpec.base === "flat" ? damageSpec.dice : derived.dice;
        // -1 por dado ou -2, o que for mais penalizante (maior valor absoluto)
        return Math.max(2, diceCount);
      })()
    : 0;
  const damageRoll = rollDamage(
    damageSpec, 
    actorProfile.attributes.st, 
    weapon, 
    random,
    (input.draftAction.modifiers.manualDamage ?? 0) - defensiveDamagePenalty
  );
  const breakdown = buildDamageBreakdown({
    targetProfile: finalTargetProfile,
    damageRoll,
    damageType: mode?.damage.damageType ?? "cr",
    hitLocation,
    ignoreDr: critical.ignoreDr,
    multiplier: critical.damageMultiplier
  });
  const damageResult = applyDamageToTarget({
    profile: finalTargetProfile,
    breakdown,
    random,
    forceGraveWound: critical.forceGraveWound,
    forceCripple: critical.forceCripple
  });
  const summaryParts = [
    baseSummary,
    defenseOption !== "none" ? `${input.target.label} falha na defesa ${defenseRoll ? formatRollResult(defenseRoll) : ""}.` : null,
    critical.note,
    breakdown.injury > 0
      ? `${input.target.label} sofre ${breakdown.injury} de lesao (Dano: ${breakdown.rawDamage} [${breakdown.rawDice.join("+")}] vs RD ${breakdown.effectiveDr}).`
      : `A RD ${breakdown.effectiveDr} absorve o dano de ${breakdown.rawDamage} [${breakdown.rawDice.join("+")}].`
  ].filter(Boolean);

  const nextActorProfile: SessionCharacterSheetProfile = {
    ...actorProfile,
    combat: {
      ...actorProfile.combat,
      attackVariant: input.draftAction.attackVariant || null,
      deceptiveLevel: input.draftAction.deceptiveLevel || 0
    }
  };

  return {
    actorProfile: nextActorProfile,
    targetProfile: damageResult.nextProfile,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: input.actor.tokenId,
      targetTokenId: input.target.tokenId,
      actionType: input.draftAction.actionType,
      summary: `${summaryParts.join(" ")}${feverishNote} ${formatRollResult(input.attackRoll)}`,
      attackRoll: input.attackRoll,
      defenseRoll,
      damage: breakdown,
      hpDelta: -breakdown.injury,
      appliedConditions: damageResult.appliedConditions
    }
  };
}

function getContestSkill(
  token: CombatTokenContext,
  draftAction: CombatDraftAction,
  fallbackSkill?: string | null
) {
  const profile = getProfile(token.character);

  if (!profile) {
    return { profile: null, target: 10, label: "Combate" };
  }

  const weapon = getWeapon(profile, draftAction.weaponId);
  const mode = getWeaponMode(weapon, draftAction.weaponModeId);
  const technique = getTechnique(profile, draftAction.techniqueId);
  const label = technique?.name ?? mode?.skill ?? fallbackSkill ?? profile.skills[0]?.name ?? "Combate";
  const base = technique?.level ?? getSkillLevel(profile, technique?.skill ?? mode?.skill ?? fallbackSkill);

  return {
    profile,
    target: clamp(base - profile.combat.shock + draftAction.modifiers.manualToHit, 3, 20),
    label
  };
}

export function resolveQuickContest(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  random?: () => number;
}): ContestResult {
  const random = input.random ?? Math.random;
  const actorContest = getContestSkill(input.actor, input.draftAction);
  const targetContest = getContestSkill(
    input.target,
    {
      ...input.draftAction,
      actorTokenId: input.target.tokenId,
      targetTokenId: input.actor.tokenId,
      selectedDefense: null
    },
    actorContest.label
  );
  const actorRoll = buildRollRecord(actorContest.target, random);
  const targetRoll = buildRollRecord(targetContest.target, random);
  const actorMargin = actorRoll.margin >= 0 ? actorRoll.margin : -99;
  const targetMargin = targetRoll.margin >= 0 ? targetRoll.margin : -99;
  const actorWins = actorMargin > targetMargin ? 1 : 0;
  const targetWins = targetMargin > actorMargin ? 1 : 0;
  const winner =
    actorWins === targetWins
      ? "empate"
      : actorWins > targetWins
        ? input.actor.label
        : input.target.label;

  return {
    actorProfile: actorContest.profile,
    targetProfile: targetContest.profile,
    actorWins,
    targetWins,
    finished: true,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: input.actor.tokenId,
      targetTokenId: input.target.tokenId,
      actionType: input.draftAction.actionType,
      summary: `${input.actor.label} e ${input.target.label} entram em disputa rapida. Vencedor: ${winner}. Ator: ${formatRollResult(actorRoll)} Alvo: ${formatRollResult(targetRoll)}`,
      contestRolls: {
        actor: actorRoll,
        target: targetRoll
      },
      appliedConditions: []
    }
  };
}

export function resolveRegularContestRound(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  actorWins: number;
  targetWins: number;
  roundsNeeded: number;
  random?: () => number;
}): ContestResult {
  const result = resolveQuickContest(input);
  const actorWins = input.actorWins + result.actorWins;
  const targetWins = input.targetWins + result.targetWins;
  const finished = actorWins >= input.roundsNeeded || targetWins >= input.roundsNeeded;
  const winner =
    actorWins === targetWins
      ? "sem decisao"
      : actorWins > targetWins
        ? input.actor.label
        : input.target.label;

  return {
    ...result,
    actorWins,
    targetWins,
    finished,
    resolution: {
      ...result.resolution,
      summary: finished
        ? `${result.resolution.summary} Disputa regular decidida: ${winner}.`
        : `${result.resolution.summary} Parcial ${actorWins} x ${targetWins}.`
    }
  };
}

export function applyTechniqueSwap(input: {
  profile: SessionCharacterSheetProfile;
  newTechniqueId: string;
  replaceTechniqueId?: string | null;
  round: number;
}) {
  const known = new Set(input.profile.techniques.map((technique) => technique.id));

  if (!known.has(input.newTechniqueId)) {
    return input.profile;
  }

  const currentLoadout = [...input.profile.combat.loadoutTechniqueIds];
  const replaceIndex = input.replaceTechniqueId
    ? currentLoadout.findIndex((entry) => entry === input.replaceTechniqueId)
    : currentLoadout.length - 1;
  const safeIndex = replaceIndex >= 0 ? replaceIndex : Math.max(0, currentLoadout.length - 1);
  const nextLoadout = [...currentLoadout];

  nextLoadout[safeIndex] = input.newTechniqueId;

  return {
    ...input.profile,
    combat: {
      ...input.profile.combat,
      loadoutTechniqueIds: [...new Set(nextLoadout)].slice(0, 3),
      pendingTechniqueSwapId: null,
      lastTechniqueSwapRound: input.round
    }
  } satisfies SessionCharacterSheetProfile;
}

// ---------------------------------------------------------------------------
// Feint resolution — 3 types as Quick Contest
// ---------------------------------------------------------------------------

function getFeintTargets(
  actorProfile: SessionCharacterSheetProfile,
  targetProfile: SessionCharacterSheetProfile,
  feintType: FeintType,
  action: CombatDraftAction
) {
  const weapon = getWeapon(actorProfile, action.weaponId);
  const mode = getWeaponMode(weapon, action.weaponModeId);
  const technique = getTechnique(actorProfile, action.techniqueId);

  const targetDefenseSkill = Math.max(
    getSkillLevel(targetProfile, mode?.skill),
    targetProfile.defenses.parry > 0 ? (targetProfile.defenses.parry - 3) * 2 : 0
  );

  switch (feintType) {
    case "st":
      return {
        actorTarget: clamp(actorProfile.attributes.st + action.modifiers.manualToHit, 3, 20),
        targetTarget: clamp(
          Math.max(targetProfile.attributes.st, targetDefenseSkill),
          3,
          20
        ),
        label: "Batida (ST)"
      };
    case "iq":
      return {
        actorTarget: clamp(actorProfile.attributes.iq + action.modifiers.manualToHit, 3, 20),
        targetTarget: clamp(targetProfile.attributes.iq, 3, 20),
        label: "Finta Intelectual (IQ)"
      };
    case "dx":
    default: {
      const baseSkill = technique?.level ?? getSkillLevel(actorProfile, technique?.skill ?? mode?.skill);
      return {
        actorTarget: clamp(baseSkill + action.modifiers.manualToHit - actorProfile.combat.shock, 3, 20),
        targetTarget: clamp(targetDefenseSkill, 3, 20),
        label: "Finta (Pericia)"
      };
    }
  }
}

export function resolveFeint(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  feintType: FeintType;
  random?: () => number;
}): FeintResult {
  const random = input.random ?? Math.random;
  const actorProfile = getProfile(input.actor.character);
  const targetProfile = getProfile(input.target.character);

  if (!actorProfile || !targetProfile) {
    return {
      feintPenalty: 0,
      feintPenaltyBy: null,
      actorProfile,
      targetProfile,
      resolution: {
        id: randomId("combat-resolution"),
        createdAt: new Date().toISOString(),
        actorTokenId: input.actor.tokenId,
        targetTokenId: input.target.tokenId,
        actionType: input.draftAction.actionType,
        summary: "Finta invalida: ficha incompleta.",
        appliedConditions: []
      }
    };
  }

  const targets = getFeintTargets(actorProfile, targetProfile, input.feintType, input.draftAction);
  const actorRoll = buildRollRecord(targets.actorTarget, random);
  const targetRoll = buildRollRecord(targets.targetTarget, random);

  const actorMargin = Math.max(0, actorRoll.margin);
  const targetMargin = Math.max(0, targetRoll.margin);
  const feintPenalty = actorRoll.margin >= 0 ? Math.max(0, actorMargin - targetMargin) : 0;

  const summary = feintPenalty > 0
    ? `${targets.label}: ${input.actor.label} supera ${input.target.label} por ${feintPenalty}. Penalidade de -${feintPenalty} na proxima defesa. Ator: ${formatRollResult(actorRoll)} Alvo: ${formatRollResult(targetRoll)}`
    : `${targets.label}: ${input.target.label} resiste a finta de ${input.actor.label}. Ator: ${formatRollResult(actorRoll)} Alvo: ${formatRollResult(targetRoll)}`;

  return {
    feintPenalty,
    feintPenaltyBy: feintPenalty > 0 ? input.actor.tokenId : null,
    actorProfile,
    targetProfile,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: input.actor.tokenId,
      targetTokenId: input.target.tokenId,
      actionType: input.draftAction.actionType,
      summary,
      contestRolls: { actor: actorRoll, target: targetRoll },
      appliedConditions: feintPenalty > 0 ? [`Finta -${feintPenalty}`] : []
    }
  };
}


export function resolveAllOutAttackDouble(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  promptPlayerDefense: boolean;
  targetState?: CombatantTurnState | null;
  random?: () => number;
}): PreparedAttackResult[] {
  const random = input.random ?? Math.random;
  const actorProfile = getProfile(input.actor.character);
  const nextActorProfile = actorProfile ? {
    ...actorProfile,
    combat: {
      ...actorProfile.combat,
      currentFp: Math.max(0, actorProfile.combat.currentFp - 1)
    }
  } : null;

  const first = prepareAttackResolution({
    actor: { ...input.actor, character: nextActorProfile ? { ...input.actor.character!, sheetProfile: nextActorProfile } : input.actor.character },
    target: input.target,
    draftAction: input.draftAction,
    promptPlayerDefense: input.promptPlayerDefense,
    targetState: input.targetState,
    random
  });

  if (first.status === "awaiting-defense" || !first.resolution) {
    if (first.actorProfile && nextActorProfile) first.actorProfile = nextActorProfile;
    return [first];
  }

  const second = prepareAttackResolution({
    actor: { ...input.actor, character: nextActorProfile ? { ...input.actor.character!, sheetProfile: nextActorProfile } : input.actor.character },
    target: input.target,
    draftAction: input.draftAction,
    promptPlayerDefense: false,
    targetState: input.targetState,
    random
  });

  if (first.resolution) {
    first.actorProfile = nextActorProfile;
    first.resolution.fpDelta = -1;
    first.resolution.summary = `[Ataque Total Duplo 1/2 (-1 PF)] ${first.resolution.summary}`;
  }
  if (second.resolution) {
    second.actorProfile = nextActorProfile;
    second.resolution.summary = `[Ataque Total Duplo 2/2] ${second.resolution.summary}`;
  }

  return [first, second];
}

export function resolveRapidStrike(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  promptPlayerDefense: boolean;
  targetState?: CombatantTurnState | null;
  random?: () => number;
}): PreparedAttackResult[] {
  const random = input.random ?? Math.random;
  
  const first = prepareAttackResolution({
    actor: input.actor,
    target: input.target,
    draftAction: { ...input.draftAction, rapidStrike: true },
    promptPlayerDefense: input.promptPlayerDefense,
    targetState: input.targetState,
    random
  });

  if (first.status === "awaiting-defense" || !first.resolution) {
    return [first];
  }

  const second = prepareAttackResolution({
    actor: input.actor,
    target: input.target,
    draftAction: { ...input.draftAction, rapidStrike: true },
    promptPlayerDefense: false,
    targetState: input.targetState,
    random
  });

  if (first.resolution) {
    first.resolution.summary = `[Golpe Rápido 1/2 (-6 Acerto)] ${first.resolution.summary}`;
  }
  if (second.resolution) {
    second.resolution.summary = `[Golpe Rápido 2/2 (-6 Acerto)] ${second.resolution.summary}`;
  }

  return [first, second];
}

export function resolveDualWeaponAttack(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  promptPlayerDefense: boolean;
  targetState?: CombatantTurnState | null;
  random?: () => number;
}): PreparedAttackResult[] {
  const random = input.random ?? Math.random;
  
  const first = prepareAttackResolution({
    actor: input.actor,
    target: input.target,
    draftAction: { ...input.draftAction, dualWeapon: true },
    promptPlayerDefense: input.promptPlayerDefense,
    targetState: input.targetState,
    random
  });

  if (first.status === "awaiting-defense" || !first.resolution) {
    return [first];
  }

  const second = prepareAttackResolution({
    actor: input.actor,
    target: input.target,
    draftAction: { ...input.draftAction, dualWeapon: true },
    promptPlayerDefense: false,
    targetState: input.targetState,
    random
  });

  if (first.resolution) {
    first.resolution.summary = `[Ataque Duplo 1/2 (-4 Acerto)] ${first.resolution.summary}`;
  }
  if (second.resolution) {
    second.resolution.summary = `[Ataque Duplo 2/2 (-4 Acerto)] ${second.resolution.summary}`;
  }

  return [first, second];
}

// ---------------------------------------------------------------------------
// Aim
// ---------------------------------------------------------------------------

export function resolveAim(input: {
  actor: CombatTokenContext;
  draftAction: CombatDraftAction;
  currentAimTurns: number;
}): AimResult {
  const actorProfile = getProfile(input.actor.character);
  const weapon = actorProfile ? getWeapon(actorProfile, input.draftAction.weaponId) : null;
  const mode = weapon ? getWeaponMode(weapon, input.draftAction.weaponModeId) : null;
  const nextAimTurns = input.currentAimTurns + 1;
  const accBonus = mode?.accuracy ?? 0;
  const totalBonus = nextAimTurns === 1 ? accBonus : accBonus + (nextAimTurns - 1);

  return {
    accumulatedAimTurns: nextAimTurns,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: input.actor.tokenId,
      targetTokenId: input.draftAction.targetTokenId,
      actionType: "aim",
      summary: `${input.actor.label} mira com ${mode?.label ?? "arma"} (turno ${nextAimTurns}, bonus acumulado +${totalBonus}).`,
      appliedConditions: []
    }
  };
}

// ---------------------------------------------------------------------------
// All-Out Defense
// ---------------------------------------------------------------------------

export function resolveAllOutDefense(input: {
  actor: CombatTokenContext;
  variant: AllOutDefenseVariant;
}): CombatResolutionRecord {
  const variantLabel = input.variant === "increased"
    ? "Aumentada (+2 em uma defesa)"
    : "Dupla (duas defesas ativas)";

  return {
    id: randomId("combat-resolution"),
    createdAt: new Date().toISOString(),
    actorTokenId: input.actor.tokenId,
    targetTokenId: null,
    actionType: "all-out-defense",
    summary: `${input.actor.label} assume Defesa Total ${variantLabel}. Nenhum ataque neste turno.`,
    appliedConditions: []
  };
}

// ---------------------------------------------------------------------------
// Ready (draw/prepare weapon)
// ---------------------------------------------------------------------------

export function resolveReady(input: {
  actor: CombatTokenContext;
  draftAction: CombatDraftAction;
}): CombatResolutionRecord {
  const actorProfile = getProfile(input.actor.character);
  const weapon = actorProfile ? getWeapon(actorProfile, input.draftAction.weaponId) : null;
  const weaponName = weapon?.name ?? "equipamento";

  return {
    id: randomId("combat-resolution"),
    createdAt: new Date().toISOString(),
    actorTokenId: input.actor.tokenId,
    targetTokenId: null,
    actionType: "ready",
    summary: `${input.actor.label} usa o turno para preparar ${weaponName}.`,
    appliedConditions: []
  };
}

// ---------------------------------------------------------------------------
// Concentrate
// ---------------------------------------------------------------------------

export function resolveConcentrate(input: {
  actor: CombatTokenContext;
}): CombatResolutionRecord {
  return {
    id: randomId("combat-resolution"),
    createdAt: new Date().toISOString(),
    actorTokenId: input.actor.tokenId,
    targetTokenId: null,
    actionType: "concentrate",
    summary: `${input.actor.label} concentra-se. Qualquer dano recebido exigira teste de Will para manter a concentracao.`,
    appliedConditions: []
  };
}

// ---------------------------------------------------------------------------
// Do Nothing (stunned / incapacitated)
// ---------------------------------------------------------------------------

export function resolveDoNothing(input: {
  actor: CombatTokenContext;
  reason?: string;
}): CombatResolutionRecord {
  return {
    id: randomId("combat-resolution"),
    createdAt: new Date().toISOString(),
    actorTokenId: input.actor.tokenId,
    targetTokenId: null,
    actionType: "do-nothing",
    summary: input.reason ?? `${input.actor.label} esta incapacitado e nao age neste turno.`,
    appliedConditions: []
  };
}

// ---------------------------------------------------------------------------
// Evaluate (cumulative +1 up to +3)
// ---------------------------------------------------------------------------

export function resolveEvaluate(input: {
  actor: CombatTokenContext;
  currentEvaluateBonus: number;
}): { resolution: CombatResolutionRecord; nextEvaluateBonus: number } {
  const nextBonus = Math.min(3, input.currentEvaluateBonus + 1);

  return {
    nextEvaluateBonus: nextBonus,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: input.actor.tokenId,
      targetTokenId: null,
      actionType: "evaluate",
      summary: `${input.actor.label} avalia o campo e estuda o oponente (+${nextBonus} no proximo ataque, cumulativo ate +3).`,
      appliedConditions: []
    }
  };
}

// ---------------------------------------------------------------------------
// HT Checks — Stun, Death Thresholds, Concentration Break
// ---------------------------------------------------------------------------

export function checkStunFromHit(
  profile: SessionCharacterSheetProfile,
  hitLocation: CombatHitLocationId,
  random: () => number = Math.random
): { stunned: boolean; roll: CombatRollRecord | null; nextProfile: SessionCharacterSheetProfile } {
  if (hitLocation !== "skull" && hitLocation !== "face") {
    return { stunned: false, roll: null, nextProfile: profile };
  }

  const htTarget = profile.attributes.ht;
  const roll = buildRollRecord(htTarget, random);

  if (roll.margin < 0) {
    const nextProfile = applyCondition(profile, "Atordoado", `Acerto em ${hitLocation}.`);
    return { stunned: true, roll, nextProfile };
  }

  return { stunned: false, roll, nextProfile: profile };
}

export function checkDeathThresholds(
  profile: SessionCharacterSheetProfile,
  random: () => number = Math.random
): DeathCheckResult[] {
  const results: DeathCheckResult[] = [];
  const hpMax = profile.attributes.hpMax;
  const currentHp = profile.combat.currentHp;

  if (currentHp >= 0) {
    return results;
  }

  if (currentHp <= -5 * hpMax) {
    results.push({
      passed: false,
      roll: buildRollRecord(0, random),
      threshold: `-5×HP (${-5 * hpMax})`,
      autoKill: true
    });
    return results;
  }

  for (let mult = 1; mult <= 4; mult++) {
    const threshold = -mult * hpMax;
    if (currentHp <= threshold) {
      const htTarget = profile.attributes.ht;
      const roll = buildRollRecord(htTarget, random);
      results.push({
        passed: roll.margin >= 0,
        roll,
        threshold: `-${mult}×HP (${threshold})`,
        autoKill: false
      });
    }
  }

  return results;
}

export function checkConcentrationBreak(
  profile: SessionCharacterSheetProfile,
  damageReceived: number,
  random: () => number = Math.random
): { broken: boolean; roll: CombatRollRecord | null } {
  if (damageReceived <= 0) {
    return { broken: false, roll: null };
  }

  const willTarget = clamp(profile.attributes.will - damageReceived, 3, 18);
  const roll = buildRollRecord(willTarget, random);

  return {
    broken: roll.margin < 0,
    roll
  };
}

export function resolveHTCheck(input: {
  profile: SessionCharacterSheetProfile;
  kind: "consciousness" | "survival";
  threshold?: string;
  random?: () => number;
}): {
  resolution: CombatResolutionRecord;
  nextProfile: SessionCharacterSheetProfile;
  passed: boolean;
} {
  const random = input.random ?? Math.random;
  const target = input.profile.attributes.ht;
  const roll = buildRollRecord(target, random);
  const passed = roll.margin >= 0;
  
  let nextProfile = { ...input.profile };
  const appliedConditions: string[] = [];
  let summary = "";

  if (input.kind === "consciousness") {
    if (!passed) {
      nextProfile = applyCondition(nextProfile, "Inconsciente", "Falha no teste de HT para permanecer consciente.");
      appliedConditions.push("Inconsciente");
      summary = `Falhou no teste para ficar consciente ${formatRollResult(roll)}.`;
    } else {
      summary = `Passou no teste para ficar consciente ${formatRollResult(roll)}.`;
    }
  } else {
    // Survival
    if (!passed) {
      nextProfile = applyCondition(nextProfile, "Morto", `Falha no teste de sobrevivência em ${input.threshold}.`);
      appliedConditions.push("Morto");
      summary = `Falhou no teste de sobrevivência em ${input.threshold} ${formatRollResult(roll)}.`;
    } else {
      summary = `Sobreviveu ao limiar ${input.threshold} ${formatRollResult(roll)}.`;
    }
  }

  const resolution: CombatResolutionRecord = {
    id: `combat-resolution-${Date.now()}`,
    createdAt: new Date().toISOString(),
    actorTokenId: null, // Resolvido no prompt
    targetTokenId: null,
    actionType: "do-nothing",
    summary: `[Teste de HT] ${summary}`,
    attackRoll: roll,
    appliedConditions
  };

  return { resolution, nextProfile, passed };
}

// ---------------------------------------------------------------------------
// Start-of-Turn Effects
// ---------------------------------------------------------------------------

export function applyStartOfTurnEffects(input: {
  profile: SessionCharacterSheetProfile;
  random?: () => number;
}): StartOfTurnResult {
  const random = input.random ?? Math.random;
  let nextProfile = { ...input.profile };
  const effects: StartOfTurnEffects = {
    bleedingDamage: 0,
    shockCleared: false,
    htChecks: [],
    requiredChecks: [],
    appliedConditions: [],
    removedConditions: [],
    summary: ""
  };
  const summaryParts: string[] = [];

  if (nextProfile.combat.shock > 0) {
    effects.shockCleared = true;
    nextProfile = {
      ...nextProfile,
      combat: { ...nextProfile.combat, shock: 0 }
    };
    summaryParts.push("Shock resetado.");
  }

  if (nextProfile.combat.bleeding > 0) {
    const bleedDmg = nextProfile.combat.bleeding;
    effects.bleedingDamage = bleedDmg;
    nextProfile = {
      ...nextProfile,
      combat: {
        ...nextProfile.combat,
        currentHp: nextProfile.combat.currentHp - bleedDmg
      }
    };
    summaryParts.push(`Sangramento causa ${bleedDmg} de dano.`);
  }

  if (nextProfile.combat.currentHp <= 0) {
    const hpMax = nextProfile.attributes.hpMax;
    const currentHp = nextProfile.combat.currentHp;

    if (currentHp <= -5 * hpMax) {
      nextProfile = applyCondition(nextProfile, "Morto", "HP atingiu -5×HP.");
      effects.appliedConditions.push("Morto");
      summaryParts.push("Morto automaticamente (HP <= -5×HP).");
    } else {
      const isUnconscious = nextProfile.conditions.some(c => c.label === "Inconsciente" || c.label === "Colapso");
      
      // Se não estiver morto nem inconsciente, precisa testar HT para não desmaiar
      if (!isUnconscious) {
        effects.requiredChecks.push({
          kind: "consciousness",
          label: "Teste de HT para permanecer consciente (HP <= 0)",
          targetValue: nextProfile.attributes.ht
        });
      }

      // Se cruzou um limiar de morte (-1x, -2x, -3x, -4x), precisa de teste de sobrevivência
      for (let mult = 1; mult <= 4; mult++) {
        const threshold = -mult * hpMax;
        // Se o HP atual está abaixo do limiar, mas o HP ANTERIOR (ou o estado) indica que ainda não testamos?
        // Na verdade, GURPS diz que você testa IMEDIATAMENTE ao cruzar, e no início de cada turno se estiver abaixo?
        // Não, sobrevivência é só ao cruzar. Mas consciência é todo turno.
        // Como o VTT pode ter pulado o momento exato, vamos pedir o teste se estiver abaixo e não tiver a condição "Morto".
        // Para simplificar, vamos pedir teste de sobrevivência se o HP estiver abaixo de um limiar múltiplo.
        if (currentHp <= threshold) {
          effects.requiredChecks.push({
            kind: "survival",
            label: `Teste de HT para sobreviver em -${mult}×HP (${threshold})`,
            targetValue: nextProfile.attributes.ht,
            threshold: `-${mult}×HP`
          });
        }
      }
    }
  }

  const isStunned = nextProfile.conditions.some((c) => c.label === "Atordoado");
  if (isStunned) {
    const htRoll = buildRollRecord(nextProfile.attributes.ht, random);
    effects.htChecks.push({
      label: "Teste de HT para recuperar de atordoamento",
      roll: htRoll,
      passed: htRoll.margin >= 0
    });

    if (htRoll.margin >= 0) {
      nextProfile = {
        ...nextProfile,
        conditions: nextProfile.conditions.filter((c) => c.label !== "Atordoado")
      };
      effects.removedConditions.push("Atordoado");
      summaryParts.push(`Recuperou de atordoamento ${formatRollResult(htRoll)}.`);
    } else {
      summaryParts.push(`Ainda atordoado ${formatRollResult(htRoll)} (falha no teste de HT).`);
    }
  }

  effects.summary = summaryParts.join(" ");

  return { effects, nextProfile };
}

// ---------------------------------------------------------------------------
// Empty combatant turn state factory
// ---------------------------------------------------------------------------

export function createEmptyCombatantTurnState(): CombatantTurnState {
  return {
    evaluateBonus: 0,
    aimTurns: 0,
    lastManeuver: null,
    hasActed: false,
    defenseUsedThisTurn: [],
    allOutAttackVariant: null,
    allOutDefenseVariant: null,
    attackVariant: null,
    deceptiveLevel: 0,
    feintPenalty: 0,
    feintPenaltyBy: null,
    isWaiting: false,
    waitTrigger: null,
    concentrating: false,
    noDefenseThisTurn: false
  };
}

export function advanceTurnState(
  state: CombatantTurnState
): CombatantTurnState {
  return {
    ...createEmptyCombatantTurnState(),
    evaluateBonus:
      state.lastManeuver === "evaluate" ? state.evaluateBonus : 0,
    aimTurns:
      state.lastManeuver === "aim" ? state.aimTurns : 0,
    feintPenalty: state.feintPenalty,
    feintPenaltyBy: state.feintPenaltyBy,
    isWaiting: state.isWaiting,
    waitTrigger: state.waitTrigger,
    concentrating: state.lastManeuver === "concentrate"
  };
}

// ---------------------------------------------------------------------------
// Scenario-Specific Action Filtering (Espadas Quebradas)
// ---------------------------------------------------------------------------

export type MaestriaLevel = "Novato" | "Shoden" | "Chuden" | "Okuden" | "Menkyo Kaiden";

export function getMaestriaLevel(nh: number): MaestriaLevel {
  if (nh >= 20) return "Menkyo Kaiden";
  if (nh >= 17) return "Okuden";
  if (nh >= 15) return "Chuden";
  if (nh >= 12) return "Shoden";
  return "Novato";
}

export function getMaxTechniqueSlots(level: MaestriaLevel): number {
  switch (level) {
    case "Menkyo Kaiden": return 4;
    case "Okuden": return 3;
    case "Chuden": return 2;
    case "Shoden": return 1;
    default: return 0;
  }
}

export function getAvailableCombatActions(
  profile: SessionCharacterSheetProfile,
  weaponId: string | null
): {
  maneuvers: CombatActionType[];
  techniques: CharacterTechniqueRecord[];
  isIaiPossible: boolean;
} {
  const maneuvers: CombatActionType[] = [
    "move", "attack", "ranged-attack", "all-out-attack", 
    "feint", "all-out-defense", "aim", "ready", 
    "evaluate", "wait", "do-nothing", "swap-technique"
  ];

  const weapon = profile.weapons.find(w => w.id === weaponId) || profile.weapons[0];
  
  // No cenário de Daimyo/GURPS, Iaijutsu é possível se a arma NÃO estiver em punho (state != ready)
  const isIaiPossible = !!weapon && weapon.state !== "ready";

  if (isIaiPossible) {
    maneuvers.push("iai-strike");
  }

  const skillName = weapon?.modes[0]?.skill || "Briga";
  const skill = profile.skills.find(s => s.name === skillName);
  const nh = skill?.level ?? 10;
  const level = getMaestriaLevel(nh);
  const maxSlots = getMaxTechniqueSlots(level);

  const equippedIds = profile.combat.loadoutTechniqueIds || [];
  const availableTechniques = (profile.techniques || [])
    .filter(t => equippedIds.includes(t.id))
    .slice(0, maxSlots);

  return {
    maneuvers,
    techniques: availableTechniques,
    isIaiPossible
  };
}

// ---------------------------------------------------------------------------
// Iaijutsu (Draw & Strike)
// ---------------------------------------------------------------------------

export function resolveIaiStrike(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  targetState?: CombatantTurnState | null;
}): PreparedAttackResult {
  const actorProfile = getProfile(input.actor.character);
  const targetProfile = getProfile(input.target.character);

  if (!actorProfile || !targetProfile) {
    throw new Error("Perfis de combatentes invalidos.");
  }

  // Marcar arma como pronta (sacada)
  const weaponIndex = actorProfile.weapons.findIndex(w => w.id === input.draftAction.weaponId);
  const nextWeapons = [...actorProfile.weapons];
  if (weaponIndex >= 0) {
    nextWeapons[weaponIndex] = {
      ...nextWeapons[weaponIndex],
      state: "ready" as const
    };
  }

  const nextActorProfile = {
    ...actorProfile,
    weapons: nextWeapons
  };

  // Iaijutsu dá -1 na defesa do alvo por surpresa
  const result = prepareAttackResolution({
    ...input,
    actor: { ...input.actor, character: { ...input.actor.character!, sheetProfile: nextActorProfile } },
    promptPlayerDefense: false,
    iaiStrike: true
  });

  return {
    ...result,
    actorProfile: nextActorProfile
  };
}
