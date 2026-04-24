import type { SessionCharacterRecord } from "@/types/character";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
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
      return -1;
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
      return -1;
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
  const bracedBonus = ranged && action.modifiers.braced ? 1 : 0;
  const determinedBonus = action.modifiers.determined ? 1 : 0;
  const weaponStateModifier =
    getWeapon(profile, action.weaponId)?.state === "empowered"
      ? 1
      : getWeapon(profile, action.weaponId)?.state === "spent"
        ? -1
        : 0;

  return (
    action.modifiers.manual +
    aimBonus +
    bracedBonus +
    determinedBonus +
    weaponStateModifier +
    rangePenalty +
    postureAttackPenalty(profile.combat.posture) +
    getHitLocationAttackModifier(action.hitLocation) -
    profile.combat.shock +
    profile.combat.evaluateBonus
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

function getDefenseTarget(
  profile: SessionCharacterSheetProfile,
  option: CombatDefenseOption,
  response?: DefenseResponseInput
) {
  const posturePenalty = postureDefensePenalty(profile.combat.posture);
  const retreatBonus = response?.retreat ? 1 : 0;
  const acrobaticBonus = option === "dodge" && response?.acrobatic ? 2 : 0;
  const base =
    option === "parry"
      ? profile.defenses.parry
      : option === "block"
        ? profile.defenses.block
        : profile.defenses.dodge;

  return clamp(base + posturePenalty + retreatBonus + acrobaticBonus, 3, 18);
}

export function listValidDefenseOptions(
  target: CombatTokenContext,
  actionType: CombatActionType
) {
  const profile = getProfile(target.character);

  if (!profile) {
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
  return { dice: 2 + Math.floor((st - 20) / 4), adds: 0 };
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
  return { dice: 4 + Math.floor((st - 20) / 4), adds: 0 };
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
  random: () => number = Math.random
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
    (weapon?.state === "spent" ? 1 : 0);
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
  return location === "arm" || location === "hand" || location === "leg" || location === "foot";
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
  const injury = Math.max(0, Math.floor(penetratingDamage * multiplier));

  return {
    rawDamage: input.damageRoll.total,
    rawDice: input.damageRoll.rawDice,
    damageType: input.damageType,
    hitLocation: input.hitLocation,
    armorDivisor: 1,
    effectiveDr,
    penetratingDamage,
    injury,
    multiplier
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

  if (
    (hasCripplingEffect(input.breakdown.hitLocation) &&
      input.breakdown.injury >= Math.ceil(input.profile.attributes.hpMax / 2)) ||
    input.forceCripple
  ) {
    const label =
      input.breakdown.hitLocation === "leg" || input.breakdown.hitLocation === "foot"
        ? "Membro inferior inutilizado"
        : "Membro superior inutilizado";
    nextProfile = applyCondition(nextProfile, label);
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
  hitLocation: CombatHitLocationId;
}) {
  return `${input.actor.label} ataca ${input.target.label} com ${
    input.weaponMode?.label ?? "ataque"
  } mirando ${input.hitLocation}.`;
}

export function prepareAttackResolution(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  promptPlayerDefense: boolean;
  targetState?: CombatantTurnState | null;
  random?: () => number;
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
        summary: "Ataque invalido: faltou ficha completa no ator ou no alvo.",
        appliedConditions: []
      }
    };
  }

  const weapon = getWeapon(actorProfile, input.draftAction.weaponId);
  const mode = getWeaponMode(weapon, input.draftAction.weaponModeId);
  const attackTarget = getAttackTarget(actorProfile, input.draftAction, mode);
  const attackRoll = buildRollRecord(attackTarget, random);
  const baseSummary = buildAttackSummary({
    actor: input.actor,
    target: input.target,
    weaponMode: mode,
    hitLocation: input.draftAction.hitLocation
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
        summary: failure ? `${baseSummary} ${failure.note}` : `${baseSummary} erra o ataque.`,
        attackRoll,
        defenseRoll: null,
        damage: null,
        appliedConditions
      }
    };
  }

  const defenses = listValidDefenseOptions(input.target, input.draftAction.actionType).filter(
    (option) => option !== "none"
  );

  if (attackRoll.critical === "critical-success" || defenses.length === 0) {
    const resolved = finishAttackResolution({
      actor: input.actor,
      target: input.target,
      draftAction: input.draftAction,
      attackRoll,
      defenseResponse: { option: "none" },
      targetState: input.targetState,
      random
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
      random
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
  const defenseRoll =
    defenseOption !== "none"
      ? buildRollRecord(getDefenseTargetWithModifiers(targetProfile, defenseOption, input.targetState ?? null, input.defenseResponse), random)
      : null;
  const baseSummary = buildAttackSummary({
    actor: input.actor,
    target: input.target,
    weaponMode: mode,
    hitLocation: input.draftAction.hitLocation
  });

  if (defenseRoll && defenseRoll.margin >= 0 && defenseRoll.critical !== "critical-failure") {
    return {
      actorProfile,
      targetProfile,
      resolution: {
        id: randomId("combat-resolution"),
        createdAt: new Date().toISOString(),
        actorTokenId: input.actor.tokenId,
        targetTokenId: input.target.tokenId,
        actionType: input.draftAction.actionType,
        summary: `${baseSummary} ${input.target.label} evita o golpe com ${defenseOption}.`,
        attackRoll: input.attackRoll,
        defenseRoll,
        damage: null,
        appliedConditions: []
      }
    };
  }

  const hitLocation = critical.forceVitals ? "vitals" : input.draftAction.hitLocation;
  const damageRoll = rollDamage(mode?.damage ?? { base: "flat", dice: 1, adds: 0, damageType: "cr", raw: "1d cr" }, actorProfile.attributes.st, weapon, random);
  const breakdown = buildDamageBreakdown({
    targetProfile,
    damageRoll,
    damageType: mode?.damage.damageType ?? "cr",
    hitLocation,
    ignoreDr: critical.ignoreDr,
    multiplier: critical.damageMultiplier
  });
  const damageResult = applyDamageToTarget({
    profile: targetProfile,
    breakdown,
    random,
    forceGraveWound: critical.forceGraveWound,
    forceCripple: critical.forceCripple
  });
  const summaryParts = [
    baseSummary,
    defenseOption !== "none" ? `${input.target.label} falha na defesa.` : null,
    critical.note,
    breakdown.injury > 0
      ? `${input.target.label} sofre ${breakdown.injury} de lesao.`
      : "A RD absorve o dano."
  ].filter(Boolean);

  return {
    actorProfile,
    targetProfile: damageResult.nextProfile,
    resolution: {
      id: randomId("combat-resolution"),
      createdAt: new Date().toISOString(),
      actorTokenId: input.actor.tokenId,
      targetTokenId: input.target.tokenId,
      actionType: input.draftAction.actionType,
      summary: summaryParts.join(" "),
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
    target: clamp(base - profile.combat.shock + draftAction.modifiers.manual, 3, 20),
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
      summary: `${input.actor.label} e ${input.target.label} entram em disputa rapida. Vencedor: ${winner}.`,
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
        actorTarget: clamp(actorProfile.attributes.st + action.modifiers.manual, 3, 20),
        targetTarget: clamp(
          Math.max(targetProfile.attributes.st, targetDefenseSkill),
          3,
          20
        ),
        label: "Batida (ST)"
      };
    case "iq":
      return {
        actorTarget: clamp(actorProfile.attributes.iq + action.modifiers.manual, 3, 20),
        targetTarget: clamp(targetProfile.attributes.iq, 3, 20),
        label: "Finta Intelectual (IQ)"
      };
    case "dx":
    default: {
      const baseSkill = technique?.level ?? getSkillLevel(actorProfile, technique?.skill ?? mode?.skill);
      return {
        actorTarget: clamp(baseSkill + action.modifiers.manual - actorProfile.combat.shock, 3, 20),
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

  const actorMargin = actorRoll.margin >= 0 ? actorRoll.margin : -99;
  const targetMargin = targetRoll.margin >= 0 ? targetRoll.margin : -99;
  const feintPenalty = Math.max(0, actorMargin - targetMargin);

  const winner = feintPenalty > 0 ? input.actor.label : input.target.label;
  const summary = feintPenalty > 0
    ? `${targets.label}: ${input.actor.label} supera ${input.target.label} por ${feintPenalty}. Penalidade de -${feintPenalty} na proxima defesa.`
    : `${targets.label}: ${input.target.label} resiste a finta de ${input.actor.label}.`;

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

// ---------------------------------------------------------------------------
// All-Out Attack — 4 variants
// ---------------------------------------------------------------------------

export function resolveAllOutAttack(input: {
  actor: CombatTokenContext;
  target: CombatTokenContext;
  draftAction: CombatDraftAction;
  variant: AllOutAttackVariant;
  promptPlayerDefense: boolean;
  targetState?: CombatantTurnState | null;
  random?: () => number;
}): PreparedAttackResult {
  const random = input.random ?? Math.random;
  const modifiedAction = { ...input.draftAction };

  switch (input.variant) {
    case "determined":
      modifiedAction.modifiers = {
        ...modifiedAction.modifiers,
        manual: modifiedAction.modifiers.manual + 4
      };
      break;
    case "strong":
      break;
    case "double":
    case "long":
      break;
  }

  const result = prepareAttackResolution({
    actor: input.actor,
    target: input.target,
    draftAction: modifiedAction,
    promptPlayerDefense: input.promptPlayerDefense,
    targetState: input.targetState,
    random
  });

  if (result.resolution && input.variant === "strong") {
    const currentDamage = result.resolution.damage;
    if (currentDamage && currentDamage.rawDamage > 0) {
      const bonusDamage = 2;
      const boostedRaw = currentDamage.rawDamage + bonusDamage;
      const boostedPenetrating = Math.max(0, boostedRaw - currentDamage.effectiveDr);
      const boostedInjury = Math.max(0, Math.floor(boostedPenetrating * currentDamage.multiplier));
      result.resolution = {
        ...result.resolution,
        damage: {
          ...currentDamage,
          rawDamage: boostedRaw,
          penetratingDamage: boostedPenetrating,
          injury: boostedInjury
        },
        summary: `${result.resolution.summary} (Ataque Total Forte: +2 dano)`
      };
    }
  }

  if (result.resolution) {
    const variantLabel =
      input.variant === "determined" ? "Determinado (+4)"
      : input.variant === "strong" ? "Forte (+2 dano)"
      : input.variant === "double" ? "Duplo"
      : "Longo (+1 alcance)";
    result.resolution = {
      ...result.resolution,
      summary: `[Ataque Total ${variantLabel}] ${result.resolution.summary}`
    };
  }

  return result;
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
  const first = prepareAttackResolution({
    actor: input.actor,
    target: input.target,
    draftAction: input.draftAction,
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
    draftAction: input.draftAction,
    promptPlayerDefense: false,
    targetState: input.targetState,
    random
  });

  if (first.resolution) {
    first.resolution = {
      ...first.resolution,
      summary: `[Ataque Total Duplo 1/2] ${first.resolution.summary}`
    };
  }
  if (second.resolution) {
    second.resolution = {
      ...second.resolution,
      summary: `[Ataque Total Duplo 2/2] ${second.resolution.summary}`
    };
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
    const deathChecks = checkDeathThresholds(nextProfile, random);
    for (const check of deathChecks) {
      effects.htChecks.push({
        label: `Teste de HT em ${check.threshold}`,
        roll: check.roll,
        passed: check.passed
      });

      if (check.autoKill) {
        nextProfile = applyCondition(nextProfile, "Morto", `HP abaixo de -5×HP.`);
        effects.appliedConditions.push("Morto");
        summaryParts.push("Morto automaticamente (HP <= -5×HP).");
      } else if (!check.passed) {
        nextProfile = applyCondition(nextProfile, "Colapso", `Falha no teste de HT em ${check.threshold}.`);
        effects.appliedConditions.push("Colapso");
        summaryParts.push(`Falha no teste de HT em ${check.threshold}: colapso.`);
      } else {
        summaryParts.push(`Teste de HT em ${check.threshold}: sucesso.`);
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
      summaryParts.push("Recuperou de atordoamento.");
    } else {
      summaryParts.push("Ainda atordoado (falha no teste de HT).");
    }
  }

  effects.summary = summaryParts.join(" ");

  return { effects, nextProfile };
}

// ---------------------------------------------------------------------------
// Defense with feint penalty & all-out defense bonus
// ---------------------------------------------------------------------------

export function getDefenseTargetWithModifiers(
  profile: SessionCharacterSheetProfile,
  option: CombatDefenseOption,
  combatantState: CombatantTurnState | null,
  response?: DefenseResponseInput
) {
  const base = getDefenseTarget(profile, option, response);
  const feintPenalty = combatantState?.feintPenalty ?? 0;
  const allOutDefenseBonus =
    combatantState?.allOutDefenseVariant === "increased" ? 2 : 0;

  return clamp(base - feintPenalty + allOutDefenseBonus, 3, 18);
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
