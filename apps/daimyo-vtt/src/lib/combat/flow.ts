import type {
  CombatActionType,
  CombatantTurnState,
  CombatDamageBreakdown,
  CombatDefenseOption,
  CombatDraftAction,
  CombatFlowPhase,
  CombatPendingPrompt,
  CombatPromptKind,
  CombatPromptPayload,
  CombatRegularContestState,
  CombatResolutionRecord,
  CombatRollRecord,
  CombatTargetModifiers,
  AllOutAttackVariant,
  AllOutDefenseVariant,
  AttackVariant,
  FeintType,
  SessionCombatFlow
} from "@/types/combat";

import { advanceTurnState } from "@/lib/combat/engine";

const combatActionTypes = new Set<CombatActionType>([
  "move",
  "attack",
  "ranged-attack",
  "wait",
  "all-out-attack",
  "all-out-defense",
  "feint",
  "feint-beat",
  "feint-mental",
  "aim",
  "ready",
  "concentrate",
  "evaluate",
  "swap-technique",
  "quick-contest",
  "regular-contest",
  "do-nothing"
]);

const combatFlowPhases = new Set<CombatFlowPhase>([
  "idle",
  "start-of-turn",
  "command",
  "awaiting-player-command",
  "rolling-attack",
  "awaiting-defense",
  "awaiting-contest",
  "rolling-defense",
  "resolving-damage",
  "resolved",
  "end-of-turn"
]);

const combatDefenseOptions = new Set<CombatDefenseOption>([
  "none",
  "dodge",
  "parry",
  "block"
]);

const combatPromptKinds = new Set<CombatPromptKind>([
  "defense",
  "quick-contest",
  "regular-contest",
  "player-command",
  "ht-check"
]);

const allOutAttackVariants = new Set<AllOutAttackVariant>([
  "determined",
  "strong",
  "double",
  "long"
]);

const allOutDefenseVariants = new Set<AllOutDefenseVariant>(["increased", "double"]);
const attackVariants = new Set<AttackVariant>(["standard", "defensive", "committed", "deceptive"]);

const feintTypes = new Set<FeintType>([
  "dx",
  "st",
  "iq"
]);

const hitLocations = new Set<CombatTargetModifiers["hitLocation"]>([
  "torso",
  "vitals",
  "face",
  "neck",
  "skull",
  "arm",
  "hand",
  "leg",
  "foot",
  "eye",
  "chink"
]);

function asObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
}

function asBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeCritical(value: unknown): CombatRollRecord["critical"] {
  return value === "critical-success" || value === "critical-failure" ? value : "none";
}

function normalizeHitLocation(value: unknown): CombatTargetModifiers["hitLocation"] {
  return typeof value === "string" && hitLocations.has(value as CombatTargetModifiers["hitLocation"])
    ? (value as CombatTargetModifiers["hitLocation"])
    : "torso";
}

function normalizeActionType(value: unknown): CombatActionType {
  return typeof value === "string" && combatActionTypes.has(value as CombatActionType)
    ? (value as CombatActionType)
    : "attack";
}

function normalizeDefenseOption(value: unknown): CombatDefenseOption {
  return typeof value === "string" && combatDefenseOptions.has(value as CombatDefenseOption)
    ? (value as CombatDefenseOption)
    : "none";
}

function normalizePromptKind(value: unknown): CombatPromptKind {
  return typeof value === "string" && combatPromptKinds.has(value as CombatPromptKind)
    ? (value as CombatPromptKind)
    : "defense";
}

function normalizeTargetModifiers(raw: unknown): CombatTargetModifiers {
  const candidate = asObject(raw);

  return {
    manualToHit: asNumber(candidate?.manualToHit, 0),
    manualDamage: asNumber(candidate?.manualDamage, 0),
    hitLocation: normalizeHitLocation(candidate?.hitLocation),
    rangeMeters:
      candidate?.rangeMeters === null || candidate?.rangeMeters === undefined
        ? null
        : asNumber(candidate.rangeMeters, 0),
    sizeModifier:
      candidate?.sizeModifier === null || candidate?.sizeModifier === undefined
        ? null
        : asNumber(candidate.sizeModifier, 0),
    aimTurns:
      candidate?.aimTurns === null || candidate?.aimTurns === undefined
        ? null
        : asNumber(candidate.aimTurns, 0),
    braced: asBoolean(candidate?.braced, false),
    determined: asBoolean(candidate?.determined, false),
    retreat: asBoolean(candidate?.retreat, false),
    acrobatic: asBoolean(candidate?.acrobatic, false),
    recoil: asBoolean(candidate?.recoil, false)
  };
}

function normalizeRoll(raw: unknown): CombatRollRecord | null {
  const candidate = asObject(raw);

  if (!candidate) {
    return null;
  }

  const dice = Array.isArray(candidate.dice)
    ? candidate.dice.map((value) => asNumber(value, 1)).slice(0, 3)
    : [];

  if (dice.length !== 3) {
    return null;
  }

  return {
    total: asNumber(candidate.total, dice[0] + dice[1] + dice[2]),
    dice: [dice[0], dice[1], dice[2]],
    target: asNumber(candidate.target, 0),
    margin: asNumber(candidate.margin, 0),
    critical: normalizeCritical(candidate.critical)
  };
}

function normalizeDamage(raw: unknown): CombatDamageBreakdown | null {
  const candidate = asObject(raw);

  if (!candidate) {
    return null;
  }

  return {
    rawDamage: asNumber(candidate.rawDamage, 0),
    rawDice: Array.isArray(candidate.rawDice)
      ? candidate.rawDice.map((value) => asNumber(value, 0))
      : [],
    damageType:
      candidate.damageType === "cut" ||
      candidate.damageType === "imp" ||
      candidate.damageType === "pi-" ||
      candidate.damageType === "pi" ||
      candidate.damageType === "pi+" ||
      candidate.damageType === "pi++" ||
      candidate.damageType === "burn" ||
      candidate.damageType === "tox"
        ? candidate.damageType
        : "cr",
    hitLocation: normalizeHitLocation(candidate.hitLocation),
    armorDivisor: asNumber(candidate.armorDivisor, 1),
    effectiveDr: asNumber(candidate.effectiveDr, 0),
    penetratingDamage: asNumber(candidate.penetratingDamage, 0),
    injury: asNumber(candidate.injury, 0),
    multiplier: asNumber(candidate.multiplier, 1)
  };
}

function normalizeResolution(raw: unknown, index = 0): CombatResolutionRecord | null {
  const candidate = asObject(raw);

  if (!candidate) {
    return null;
  }

  return {
    id: asString(candidate.id) ?? `combat-resolution-${index}`,
    createdAt: asString(candidate.createdAt) ?? new Date().toISOString(),
    actorTokenId: asString(candidate.actorTokenId),
    targetTokenId: asString(candidate.targetTokenId),
    actionType: normalizeActionType(candidate.actionType),
    summary: asString(candidate.summary) ?? "Resolucao de combate",
    attackRoll: normalizeRoll(candidate.attackRoll),
    defenseRoll: normalizeRoll(candidate.defenseRoll),
    contestRolls: (() => {
      const contest = asObject(candidate.contestRolls);

      if (!contest) {
        return null;
      }

      const actor = normalizeRoll(contest.actor);
      const target = normalizeRoll(contest.target);

      if (!actor || !target) {
        return null;
      }

      return { actor, target };
    })(),
    damage: normalizeDamage(candidate.damage),
    hpDelta:
      candidate.hpDelta === null || candidate.hpDelta === undefined
        ? undefined
        : asNumber(candidate.hpDelta, 0),
    fpDelta:
      candidate.fpDelta === null || candidate.fpDelta === undefined
        ? undefined
        : asNumber(candidate.fpDelta, 0),
    appliedConditions: Array.isArray(candidate.appliedConditions)
      ? candidate.appliedConditions.map((value) => String(value))
      : []
  };
}

function normalizeDraftAction(raw: unknown): CombatDraftAction | null {
  const candidate = asObject(raw);
  const actorTokenId = asString(candidate?.actorTokenId);

  if (!candidate || !actorTokenId) {
    return null;
  }

  return {
    actorTokenId,
    targetTokenId: asString(candidate.targetTokenId),
    actionType: normalizeActionType(candidate.actionType),
    weaponId: asString(candidate.weaponId),
    weaponModeId: asString(candidate.weaponModeId),
    techniqueId: asString(candidate.techniqueId),
    replaceTechniqueId: asString(candidate.replaceTechniqueId),
    hitLocation: normalizeHitLocation(candidate.hitLocation),
    modifiers: normalizeTargetModifiers(candidate.modifiers),
    selectedDefense:
      candidate.selectedDefense === null || candidate.selectedDefense === undefined
        ? null
        : normalizeDefenseOption(candidate.selectedDefense),
    contestLabel: asString(candidate.contestLabel),
    allOutVariant:
      typeof candidate.allOutVariant === "string" &&
      allOutAttackVariants.has(candidate.allOutVariant as AllOutAttackVariant)
        ? (candidate.allOutVariant as AllOutAttackVariant)
        : null,
    allOutDefenseVariant:
      typeof candidate.allOutDefenseVariant === "string" &&
      allOutDefenseVariants.has(candidate.allOutDefenseVariant as AllOutDefenseVariant)
        ? (candidate.allOutDefenseVariant as AllOutDefenseVariant)
        : typeof candidate.allOutVariant === "string" &&
          allOutDefenseVariants.has(candidate.allOutVariant as AllOutDefenseVariant)
          ? (candidate.allOutVariant as AllOutDefenseVariant)
          : null,
    evaluateBonus:
      candidate.evaluateBonus === null || candidate.evaluateBonus === undefined
        ? null
        : Math.min(3, Math.max(0, Math.floor(asNumber(candidate.evaluateBonus, 0)))),
    feintAttribute:
      typeof candidate.feintAttribute === "string" &&
      feintTypes.has(candidate.feintAttribute as FeintType)
        ? (candidate.feintAttribute as FeintType)
        : null,
    attackVariant:
      typeof candidate.attackVariant === "string" &&
      attackVariants.has(candidate.attackVariant as AttackVariant)
        ? (candidate.attackVariant as AttackVariant)
        : null,
    deceptiveLevel: asNumber(candidate.deceptiveLevel, 0),
    rapidStrike: asBoolean(candidate.rapidStrike, false),
    dualWeapon: asBoolean(candidate.dualWeapon, false),
    waitTrigger: asString(candidate.waitTrigger),
    roundsNeeded:
      candidate.roundsNeeded === null || candidate.roundsNeeded === undefined
        ? null
        : Math.max(1, Math.floor(asNumber(candidate.roundsNeeded, 1)))
  };
}

function normalizePromptPayload(raw: unknown): CombatPromptPayload | null {
  const candidate = asObject(raw);
  const sessionId = asString(candidate?.sessionId);
  const actorTokenId = asString(candidate?.actorTokenId);
  const targetTokenId = asString(candidate?.targetTokenId);

  if (!candidate || !sessionId || !actorTokenId || !targetTokenId) {
    return null;
  }

  return {
    promptKind: normalizePromptKind(candidate.promptKind),
    sessionId,
    actorTokenId,
    targetTokenId,
    actionType: normalizeActionType(candidate.actionType),
    options: Array.isArray(candidate.options)
      ? candidate.options
          .map((option) => normalizeDefenseOption(option))
          .filter((option, index, array) => array.indexOf(option) === index)
      : ["none"],
    summary: asString(candidate.summary) ?? "Resolucao pendente",
    attackRoll: normalizeRoll(candidate.attackRoll),
    canRetreat: asBoolean(candidate.canRetreat, false),
    canAcrobatic: asBoolean(candidate.canAcrobatic, false),
    requestedAt: asString(candidate.requestedAt) ?? new Date().toISOString(),
    expiresAt:
      candidate.expiresAt === undefined || candidate.expiresAt === null
        ? null
        : asString(candidate.expiresAt),
    maneuverOptions: Array.isArray(candidate.maneuverOptions)
      ? candidate.maneuverOptions
          .map((option) => normalizeActionType(option))
          .filter((option, index, array) => array.indexOf(option) === index)
      : null,
    htCheck: candidate.htCheck
      ? (() => {
          const ht = asObject(candidate.htCheck);
          if (!ht) return undefined;
          return {
            kind: ht.kind === "survival" ? ("survival" as const) : ("consciousness" as const),
            targetValue: asNumber(ht.targetValue, 10),
            threshold: asString(ht.threshold) ?? undefined
          };
        })()
      : undefined
  };
}

function normalizePendingPrompt(raw: unknown): CombatPendingPrompt | null {
  const candidate = asObject(raw);
  const payload = normalizePromptPayload(candidate?.payload);

  if (!candidate || !payload) {
    return null;
  }

  return {
    eventId: asString(candidate.eventId),
    participantId: asString(candidate.participantId),
    payload
  };
}

function normalizeRegularContest(raw: unknown): CombatRegularContestState | null {
  const candidate = asObject(raw);
  const label = asString(candidate?.label);
  const actorTokenId = asString(candidate?.actorTokenId);
  const targetTokenId = asString(candidate?.targetTokenId);

  if (!candidate || !label || !actorTokenId || !targetTokenId) {
    return null;
  }

  return {
    label,
    actorTokenId,
    targetTokenId,
    actorWins: Math.max(0, Math.floor(asNumber(candidate.actorWins, 0))),
    targetWins: Math.max(0, Math.floor(asNumber(candidate.targetWins, 0))),
    roundsNeeded: Math.max(1, Math.floor(asNumber(candidate.roundsNeeded, 1)))
  };
}

export function createEmptyCombatFlow(): SessionCombatFlow {
  return {
    version: 1,
    phase: "idle",
    activeAction: null,
    pendingPrompt: null,
    regularContest: null,
    lastResolution: null,
    log: [],
    combatantStates: {},
    updatedAt: new Date().toISOString()
  };
}

function normalizeCombatantStates(
  raw: unknown,
  fallback: Record<string, CombatantTurnState>
): Record<string, CombatantTurnState> {
  const candidate = asObject(raw);

  if (!candidate) {
    return fallback;
  }

  const result: Record<string, CombatantTurnState> = {};

  for (const [tokenId, stateRaw] of Object.entries(candidate)) {
    const stateObj = asObject(stateRaw);

    if (!stateObj) {
      continue;
    }

    result[tokenId] = {
      evaluateBonus: Math.min(3, Math.max(0, asNumber(stateObj.evaluateBonus, 0))),
      aimTurns: Math.max(0, asNumber(stateObj.aimTurns, 0)),
      lastManeuver: normalizeActionType(stateObj.lastManeuver) as CombatantTurnState["lastManeuver"],
      hasActed: asBoolean(stateObj.hasActed, false),
      defenseUsedThisTurn: Array.isArray(stateObj.defenseUsedThisTurn)
        ? stateObj.defenseUsedThisTurn.map((d) => normalizeDefenseOption(d))
        : [],
      allOutAttackVariant:
        typeof stateObj.allOutAttackVariant === "string" &&
        allOutAttackVariants.has(stateObj.allOutAttackVariant as AllOutAttackVariant)
          ? (stateObj.allOutAttackVariant as AllOutAttackVariant)
          : null,
      allOutDefenseVariant:
        typeof stateObj.allOutDefenseVariant === "string" &&
        allOutDefenseVariants.has(stateObj.allOutDefenseVariant as AllOutDefenseVariant)
          ? (stateObj.allOutDefenseVariant as AllOutDefenseVariant)
          : null,
      attackVariant:
        typeof stateObj.attackVariant === "string" &&
        attackVariants.has(stateObj.attackVariant as AttackVariant)
          ? (stateObj.attackVariant as AttackVariant)
          : null,
      deceptiveLevel: asNumber(stateObj.deceptiveLevel, 0),
      feintPenalty: Math.max(0, asNumber(stateObj.feintPenalty, 0)),
      feintPenaltyBy: asString(stateObj.feintPenaltyBy),
      isWaiting: asBoolean(stateObj.isWaiting, false),
      waitTrigger: asString(stateObj.waitTrigger),
      concentrating: asBoolean(stateObj.concentrating, false),
      noDefenseThisTurn: asBoolean(stateObj.noDefenseThisTurn, false)
    };
  }

  return result;
}

export function normalizeCombatFlow(
  raw: unknown,
  fallback?: SessionCombatFlow | null
): SessionCombatFlow {
  const base = fallback ?? createEmptyCombatFlow();
  const candidate = asObject(raw);
  const normalizedLog = Array.isArray(candidate?.log)
    ? candidate.log
        .map((entry, index) => normalizeResolution(entry, index))
        .filter(Boolean)
        .slice(-40) as CombatResolutionRecord[]
    : base.log;

  const lastResolution =
    normalizeResolution(candidate?.lastResolution) ??
    normalizedLog[normalizedLog.length - 1] ??
    base.lastResolution;

  return {
    version: Math.max(1, Math.floor(asNumber(candidate?.version, base.version))),
    phase:
      typeof candidate?.phase === "string" && combatFlowPhases.has(candidate.phase as CombatFlowPhase)
        ? (candidate.phase as CombatFlowPhase)
        : base.phase,
    activeAction: normalizeDraftAction(candidate?.activeAction),
    pendingPrompt: normalizePendingPrompt(candidate?.pendingPrompt),
    regularContest: normalizeRegularContest(candidate?.regularContest),
    lastResolution,
    log: normalizedLog,
    combatantStates: normalizeCombatantStates(candidate?.combatantStates, base.combatantStates),
    updatedAt: asString(candidate?.updatedAt) ?? base.updatedAt
  };
}

export function pushCombatResolution(
  flow: SessionCombatFlow | null,
  resolution: CombatResolutionRecord
) {
  const base = normalizeCombatFlow(flow);
  const log = [...base.log, resolution].slice(-40);

  return {
    ...base,
    phase: "resolved",
    pendingPrompt: null,
    lastResolution: resolution,
    log,
    updatedAt: resolution.createdAt
  } satisfies SessionCombatFlow;
}

export function resetTurnState(state: CombatantTurnState): CombatantTurnState {
  return advanceTurnState(state);
}
