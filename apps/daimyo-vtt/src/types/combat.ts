export type CombatFlowPhase =
  | "idle"
  | "start-of-turn"
  | "command"
  | "awaiting-player-command"
  | "rolling-attack"
  | "awaiting-defense"
  | "awaiting-contest"
  | "rolling-defense"
  | "resolving-damage"
  | "resolved"
  | "end-of-turn";

export type CombatActionType =
  | "move"
  | "attack"
  | "ranged-attack"
  | "wait"
  | "all-out-attack"
  | "all-out-defense"
  | "feint"
  | "feint-beat"
  | "feint-mental"
  | "aim"
  | "ready"
  | "concentrate"
  | "evaluate"
  | "swap-technique"
  | "quick-contest"
  | "regular-contest"
  | "do-nothing"
  | "iai-strike"
  | "clash-simple";

export type AllOutAttackVariant = "determined" | "strong" | "double" | "long";
export type AttackVariant = "standard" | "defensive" | "committed" | "deceptive";
export type AllOutDefenseVariant = "increased" | "double";
export type FeintType = "dx" | "st" | "iq";

export type CombatDefenseOption = "none" | "dodge" | "parry" | "block";
export type CombatPromptKind = "defense" | "quick-contest" | "regular-contest" | "player-command" | "ht-check";
export type CombatWeaponState = "ready" | "drawn" | "empowered" | "guarded" | "spent";
export type CombatPosture = "standing" | "kneeling" | "prone" | "sitting" | "crouching";

export type CombatHitLocationId =
  | "torso"
  | "vitals"
  | "face"
  | "neck"
  | "skull"
  | "arm"
  | "hand"
  | "leg"
  | "foot"
  | "eye"
  | "chink";

export type CombatDamageType =
  | "cr"
  | "cut"
  | "imp"
  | "pi-"
  | "pi"
  | "pi+"
  | "pi++"
  | "burn"
  | "tox";

export type CombatDerivedDamageBase = "swing" | "thrust" | "flat";

export interface CharacterSkillRecord {
  id: string;
  name: string;
  specialization?: string | null;
  relativeLevel?: string | null;
  governingAttribute?: string | null;
  difficulty?: string | null;
  level: number;
  notes?: string;
}

export interface CharacterTechniqueRecord {
  id: string;
  name: string;
  style: string;
  skill: string;
  level: number;
  defaultModifier?: number;
  tags: string[];
  notes?: string;
}

export interface CharacterDamageSpec {
  base: CombatDerivedDamageBase;
  dice: number;
  adds: number;
  damageType: CombatDamageType;
  armorDivisor?: number;
  raw: string;
}

export interface CharacterWeaponMode {
  id: string;
  label: string;
  skill: string;
  damage: CharacterDamageSpec;
  reach: string;
  parry: string;
  minStrength?: number | null;
  accuracy?: number | null;
  halfDamageRange?: number | null;
  maxRange?: number | null;
  recoil?: number | null;
  tags: string[];
  notes?: string;
}

export interface CharacterWeaponRecord {
  id: string;
  name: string;
  category: string;
  state: CombatWeaponState;
  quality?: string | null;
  rawDamage?: string | null;
  notes?: string;
  modes: CharacterWeaponMode[];
  weight?: string | null;
}

export interface CharacterArmorRecord {
  id: string;
  name: string;
  zone: CombatHitLocationId | CombatHitLocationId[] | "all";
  dr: number;
  notes?: string;
  weight?: string | null;
}

export interface CharacterConditionRecord {
  id: string;
  label: string;
  value?: number;
  source: "combat" | "manual" | "status";
  notes?: string;
}

export interface CharacterAttributeProfile {
  st: number;
  dx: number;
  iq: number;
  ht: number;
  hpMax: number;
  fpMax: number;
  will: number;
  per: number;
}

export interface CharacterDerivedProfile {
  basicSpeed: number;
  move: number;
  encumbranceLevel: number;
}

export interface CharacterDefenseProfile {
  dodge: number;
  parry: number;
  block: number;
}

export interface CharacterStyleProfile {
  name: string;
  source?: string | null;
  allStyleTechniques?: string[];
}

export interface CharacterCombatStateProfile {
  currentHp: number;
  currentFp: number;
  activeWeaponId: string | null;
  activeWeaponModeId: string | null;
  loadoutTechniqueIds: string[];
  posture: CombatPosture;
  shock: number;
  fatigue: number;
  pain: number;
  bleeding: number;
  evaluateBonus: number;
  attackVariant?: AttackVariant | null;
  deceptiveLevel?: number;
  pendingTechniqueSwapId?: string | null;
  lastTechniqueSwapRound?: number | null;
  pendingSwap?: {
    newId: string;
    replaceId: string | null;
    isStyle: boolean;
  } | null;
  loadoutStyleTechniqueIds: string[];
}

export interface SessionCharacterSheetProfile {
  version: number;
  summary?: string;
  attributes: CharacterAttributeProfile;
  derived: CharacterDerivedProfile;
  defenses: CharacterDefenseProfile;
  style: CharacterStyleProfile;
  skills: CharacterSkillRecord[];
  techniques: CharacterTechniqueRecord[];
  weapons: CharacterWeaponRecord[];
  armor: CharacterArmorRecord[];
  notes: string[];
  conditions: CharacterConditionRecord[];
  combat: CharacterCombatStateProfile;
  raw?: Record<string, unknown>;
}

export interface CombatTargetModifiers {
  manualToHit: number;
  manualDamage: number;
  hitLocation: CombatHitLocationId;
  rangeMeters?: number | null;
  sizeModifier?: number | null;
  aimTurns?: number | null;
  braced?: boolean;
  determined?: boolean;
  retreat?: boolean;
  acrobatic?: boolean;
  feverish?: boolean;
  recoil?: boolean;
}

export interface CombatDraftAction {
  actorTokenId: string;
  targetTokenId: string | null;
  actionType: CombatActionType;
  weaponId: string | null;
  weaponModeId: string | null;
  techniqueId?: string | null;
  loadoutTechniqueIds?: string[];
  replaceTechniqueId?: string | null;
  hitLocation: CombatHitLocationId;
  modifiers: CombatTargetModifiers;
  selectedDefense?: CombatDefenseOption | null;
  contestLabel?: string | null;
  allOutVariant?: AllOutAttackVariant | null;
  allOutDefenseVariant?: AllOutDefenseVariant | null;
  attackVariant?: AttackVariant | null;
  deceptiveLevel?: number | null;
  rapidStrike?: boolean;
  dualWeapon?: boolean;
  evaluateBonus?: number | null;
  feintAttribute?: FeintType | null;
  feintType?: FeintType | null;
  waitTrigger?: string | null;
  roundsNeeded?: number | null;
  isStyle?: boolean;
}

export interface CombatRollRecord {
  total: number;
  dice: [number, number, number];
  target: number;
  margin: number;
  critical: "critical-success" | "critical-failure" | "none";
}

export interface CombatDamageBreakdown {
  rawDamage: number;
  rawDice: number[];
  damageType: CombatDamageType;
  hitLocation: CombatHitLocationId;
  armorDivisor: number;
  effectiveDr: number;
  penetratingDamage: number;
  injury: number;
  multiplier: number;
  isCrippled?: boolean;
  isCapped?: boolean;
}

export interface CombatResolutionRecord {
  id: string;
  createdAt: string;
  actorTokenId: string | null;
  actorName?: string;
  targetTokenId: string | null;
  targetName?: string;
  actionType: CombatActionType;
  summary: string;
  attackRoll?: CombatRollRecord | null;
  defenseRoll?: CombatRollRecord | null;
  contestRolls?: {
    actor: CombatRollRecord;
    target: CombatRollRecord;
  } | null;
  damage?: CombatDamageBreakdown | null;
  hpDelta?: number;
  fpDelta?: number;
  appliedConditions: string[];
}

export interface FeintResult {
  resolution: CombatResolutionRecord;
  feintPenalty: number;
  feintPenaltyBy: string | null;
  actorProfile: SessionCharacterSheetProfile | null;
  targetProfile: SessionCharacterSheetProfile | null;
}

export interface CombatPromptPayload {
  promptKind: CombatPromptKind;
  sessionId: string;
  actorTokenId: string;
  targetTokenId: string;
  actionType: CombatActionType;
  options: CombatDefenseOption[];
  summary: string;
  attackRoll?: CombatRollRecord | null;
  canRetreat?: boolean;
  canAcrobatic?: boolean;
  requestedAt: string;
  expiresAt?: string | null;
  maneuverOptions?: CombatActionType[] | null;
  defenseLevels?: Record<string, number> | null;
  htCheck?: {
    kind: "consciousness" | "survival";
    targetValue: number;
    threshold?: string;
  };
}

export interface CombatPendingPrompt {
  eventId: string | null;
  participantId: string | null;
  payload: CombatPromptPayload;
}

export interface CombatRegularContestState {
  label: string;
  actorTokenId: string;
  targetTokenId: string;
  actorWins: number;
  targetWins: number;
  roundsNeeded: number;
}

export interface CombatantTurnState {
  evaluateBonus: number;
  aimTurns: number;
  lastManeuver: CombatActionType | null;
  hasActed: boolean;
  defenseUsedThisTurn: CombatDefenseOption[];
  allOutAttackVariant: AllOutAttackVariant | null;
  allOutDefenseVariant: AllOutDefenseVariant | null;
  attackVariant: AttackVariant | null;
  deceptiveLevel: number;
  feintPenalty: number;
  feintPenaltyBy: string | null;
  isWaiting: boolean;
  waitTrigger: string | null;
  concentrating: boolean;
  noDefenseThisTurn: boolean;
}

export interface StartOfTurnEffects {
  bleedingDamage: number;
  shockCleared: boolean;
  htChecks: Array<{
    label: string;
    roll: CombatRollRecord;
    passed: boolean;
  }>;
  requiredChecks: Array<{
    kind: "consciousness" | "survival";
    label: string;
    targetValue: number;
    threshold?: string;
  }>;
  appliedConditions: string[];
  removedConditions: string[];
  summary: string;
}

export interface SessionCombatFlow {
  version: number;
  phase: CombatFlowPhase;
  activeAction: CombatDraftAction | null;
  pendingPrompt: CombatPendingPrompt | null;
  regularContest: CombatRegularContestState | null;
  lastResolution: CombatResolutionRecord | null;
  log: CombatResolutionRecord[];
  combatantStates: Record<string, CombatantTurnState>;
  updatedAt: string;
}
