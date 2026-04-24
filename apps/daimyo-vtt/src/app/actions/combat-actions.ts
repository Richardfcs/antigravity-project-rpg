"use server";

import {
  applyStartOfTurnEffects,
  applyTechniqueSwap,
  createEmptyCombatantTurnState,
  advanceTurnState,
  finishAttackResolution,
  listValidDefenseOptions,
  prepareAttackResolution,
  resolveAim,
  resolveAllOutAttack,
  resolveAllOutAttackDouble,
  resolveAllOutDefense,
  resolveConcentrate,
  resolveDoNothing,
  resolveEvaluate,
  resolveFeint,
  resolveQuickContest,
  resolveReady,
  resolveRegularContestRound
} from "@/lib/combat/engine";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
  CombatActionType,
  CombatantTurnState,
  CombatDefenseOption,
  CombatDraftAction,
  CombatResolutionRecord,
  FeintType,
  SessionCombatFlow
} from "@/types/combat";
import { createEmptyCombatFlow, normalizeCombatFlow } from "@/lib/combat/flow";
import { normalizeSheetProfile } from "@/lib/combat/sheet-profile";
import {
  findSessionCharacterById,
  listSessionCharacters,
  updateSessionCharacterProfile
} from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import { findMapTokenById, listMapTokens } from "@/lib/maps/repository";
import {
  consumePrivateEvent,
  createPrivateEvent,
  findPrivateEventById
} from "@/lib/private-events/repository";
import { requireSessionViewer } from "@/lib/session/access";
import { updateSessionCombatState } from "@/lib/session/repository";

interface CombatActionResult {
  ok: boolean;
  session?: Awaited<ReturnType<typeof updateSessionCombatState>>;
  characters?: Awaited<ReturnType<typeof listSessionCharacters>>;
  resolution?: CombatResolutionRecord | null;
  message?: string;
}

function buildInfraError() {
  return {
    ok: false,
    message: "O Supabase Service Role ainda nao esta configurado."
  } satisfies CombatActionResult;
}

interface OrderedCombatToken {
  id: string;
  createdAt: string;
  initiativeOrder: number;
  label: string;
}

function cloneFlow(flow: SessionCombatFlow | null) {
  return normalizeCombatFlow(flow);
}

function appendResolution(
  flow: SessionCombatFlow | null,
  resolution: CombatResolutionRecord,
  patch?: Partial<SessionCombatFlow>
) {
  const base = cloneFlow(flow);

  return {
    ...base,
    phase: "resolved",
    activeAction: null,
    pendingPrompt: null,
    lastResolution: resolution,
    log: [...base.log, resolution].slice(-40),
    updatedAt: resolution.createdAt,
    ...patch
  } satisfies SessionCombatFlow;
}

async function listActiveMapTokens(sessionId: string, activeMapId: string | null) {
  if (!activeMapId) {
    return [];
  }

  const tokens = await listMapTokens(sessionId);
  return tokens.filter((token) => token.mapId === activeMapId);
}

async function listOrderedCombatTokens(sessionId: string, activeMapId: string | null) {
  const [tokens, characters] = await Promise.all([
    listActiveMapTokens(sessionId, activeMapId),
    listSessionCharacters(sessionId)
  ]);
  const characterById = new Map(
    characters.map((character) => [character.id, character] as const)
  );

  return tokens
    .map((token) => {
      const character = token.characterId ? characterById.get(token.characterId) ?? null : null;
      const initiativeOrder = character?.sheetProfile
        ? (character.sheetProfile.derived.basicSpeed * 10000) +
          (character.sheetProfile.attributes.dx * 100) +
          character.sheetProfile.attributes.iq
        : (character?.initiative ?? 0) * 100;

      return {
        id: token.id,
        createdAt: token.createdAt,
        initiativeOrder,
        label: token.label || character?.name || "Token"
      } satisfies OrderedCombatToken;
    })
    .sort((left, right) => {
      if (left.initiativeOrder !== right.initiativeOrder) {
        return right.initiativeOrder - left.initiativeOrder;
      }

      if (left.label !== right.label) {
        return left.label.localeCompare(right.label);
      }

      return left.createdAt.localeCompare(right.createdAt);
    });
}

async function buildCombatTokenContext(
  tokenId: string
) {
  const token = await findMapTokenById(tokenId);

  if (!token) {
    throw new Error("Token de combate nao encontrado.");
  }

  const character = token.characterId ? await findSessionCharacterById(token.characterId) : null;

  return {
    tokenId: token.id,
    label: token.label || character?.name || "Token",
    ownerParticipantId: character?.ownerParticipantId ?? null,
    character
  };
}

async function persistCombatProfiles(input: {
  actorCharacterId?: string | null;
  actorProfile?: ReturnType<typeof normalizeSheetProfile> | null;
  targetCharacterId?: string | null;
  targetProfile?: ReturnType<typeof normalizeSheetProfile> | null;
}) {
  const updates = [];

  if (input.actorCharacterId && input.actorProfile) {
    updates.push(
      updateSessionCharacterProfile({
        characterId: input.actorCharacterId,
        sheetProfile: input.actorProfile
      })
    );
  }

  if (input.targetCharacterId && input.targetProfile) {
    updates.push(
      updateSessionCharacterProfile({
        characterId: input.targetCharacterId,
        sheetProfile: input.targetProfile
      })
    );
  }

  if (updates.length === 0) {
    return [];
  }

  return Promise.all(updates);
}

async function syncCombatSession(input: {
  sessionId: string;
  combatEnabled: boolean;
  combatRound: number;
  combatTurnIndex: number;
  combatActiveTokenId: string | null;
  combatFlow: SessionCombatFlow | null;
}) {
  return updateSessionCombatState({
    sessionId: input.sessionId,
    combatEnabled: input.combatEnabled,
    combatRound: input.combatRound,
    combatTurnIndex: input.combatTurnIndex,
    combatActiveTokenId: input.combatActiveTokenId,
    combatFlow: input.combatFlow
  });
}

export async function startCombatEncounterAction(input: {
  sessionCode: string;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const activeTokens = await listOrderedCombatTokens(session.id, session.activeMapId);

    if (activeTokens.length === 0) {
      throw new Error("Adicione pelo menos um token ao mapa ativo para iniciar o combate.");
    }

    const firstTokenId = activeTokens[0]?.id ?? null;
    const combatFlow = {
      ...createEmptyCombatFlow(),
      phase: "command",
      updatedAt: new Date().toISOString()
    } satisfies SessionCombatFlow;
    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: 1,
      combatTurnIndex: 0,
      combatActiveTokenId: firstTokenId,
      combatFlow
    });
    const characters = await listSessionCharacters(session.id);

    return {
      ok: true,
      session: updatedSession,
      characters
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao iniciar o encontro de combate."
    };
  }
}

export async function stopCombatEncounterAction(input: {
  sessionCode: string;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const flow = session.combatFlow ? cloneFlow(session.combatFlow) : null;

    if (flow?.pendingPrompt?.eventId) {
      await consumePrivateEvent(flow.pendingPrompt.eventId).catch(() => undefined);
    }

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: false,
      combatRound: 1,
      combatTurnIndex: 0,
      combatActiveTokenId: null,
      combatFlow: null
    });

    return {
      ok: true,
      session: updatedSession
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao encerrar o encontro de combate."
    };
  }
}

export async function advanceCombatTurnAction(input: {
  sessionCode: string;
  direction: "next" | "previous";
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const activeTokens = await listOrderedCombatTokens(session.id, session.activeMapId);

    if (activeTokens.length === 0) {
      throw new Error("Nao ha combatentes ativos neste mapa.");
    }

    const flow = cloneFlow(session.combatFlow);

    if (flow.pendingPrompt?.eventId) {
      await consumePrivateEvent(flow.pendingPrompt.eventId).catch(() => undefined);
    }

    const totalTurns = activeTokens.length;
    let nextIndex = Math.min(Math.max(session.combatTurnIndex, 0), totalTurns - 1);
    let nextRound = Math.max(1, session.combatRound);

    if (input.direction === "next") {
      nextIndex += 1;
      if (nextIndex >= totalTurns) {
        nextIndex = 0;
        nextRound += 1;
      }
    } else {
      nextIndex -= 1;
      if (nextIndex < 0) {
        nextIndex = totalTurns - 1;
        nextRound = Math.max(1, nextRound - 1);
      }
    }

    const previousTokenId = session.combatActiveTokenId;
    const nextCombatantStates = { ...flow.combatantStates };

    if (previousTokenId && nextCombatantStates[previousTokenId]) {
      nextCombatantStates[previousTokenId] = advanceTurnState(nextCombatantStates[previousTokenId]);
    }

    const nextTokenId = activeTokens[nextIndex]?.id ?? null;

    if (nextTokenId && nextCombatantStates[nextTokenId]) {
      const ts = nextCombatantStates[nextTokenId];
      nextCombatantStates[nextTokenId] = {
        ...ts,
        hasActed: false,
        defenseUsedThisTurn: [],
        noDefenseThisTurn: false,
        allOutAttackVariant: null
      };
    }

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: nextRound,
      combatTurnIndex: nextIndex,
      combatActiveTokenId: nextTokenId,
      combatFlow: {
        ...flow,
        phase: "command",
        activeAction: null,
        pendingPrompt: null,
        regularContest: null,
        combatantStates: nextCombatantStates,
        updatedAt: new Date().toISOString()
      }
    });

    return {
      ok: true,
      session: updatedSession
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao avancar o turno."
    };
  }
}

export async function selectCombatantAction(input: {
  sessionCode: string;
  tokenId: string;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    const activeTokens = await listOrderedCombatTokens(session.id, session.activeMapId);
    const targetIndex = activeTokens.findIndex((token) => token.id === input.tokenId);

    if (targetIndex < 0) {
      throw new Error("Combatente nao encontrado no mapa ativo.");
    }

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: Math.max(1, session.combatRound),
      combatTurnIndex: targetIndex,
      combatActiveTokenId: input.tokenId,
      combatFlow: {
        ...cloneFlow(session.combatFlow),
        phase: "command",
        updatedAt: new Date().toISOString()
      }
    });

    return {
      ok: true,
      session: updatedSession
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao destacar o combatente."
    };
  }
}

export async function executeCombatActionAction(input: {
  sessionCode: string;
  action: CombatDraftAction;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");

    if (!session.combatEnabled) {
      throw new Error("Inicie o combate antes de executar uma acao.");
    }

    const actor = await buildCombatTokenContext(input.action.actorTokenId);
    const target = input.action.targetTokenId
      ? await buildCombatTokenContext(input.action.targetTokenId)
      : null;

    if (!actor.character) {
      throw new Error("O token ativo precisa ter uma ficha vinculada.");
    }

    if (
      session.combatActiveTokenId &&
      session.combatActiveTokenId !== input.action.actorTokenId
    ) {
      throw new Error("A acao so pode ser executada pelo combatente ativo.");
    }

    if (input.action.actionType === "swap-technique") {
      const actorProfile = normalizeSheetProfile(actor.character.sheetProfile);
      const nextProfile = applyTechniqueSwap({
        profile: actorProfile,
        newTechniqueId: input.action.techniqueId ?? "",
        replaceTechniqueId: input.action.replaceTechniqueId ?? null,
        round: session.combatRound
      });
      const updatedActor = await updateSessionCharacterProfile({
        characterId: actor.character.id,
        sheetProfile: nextProfile
      });
      const resolution: CombatResolutionRecord = {
        id: `combat-resolution-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actorTokenId: actor.tokenId,
        targetTokenId: null,
        actionType: input.action.actionType,
        summary: `${actor.label} troca uma tecnica equipada e permanece parado neste turno.`,
        appliedConditions: []
      };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution)
      });

      return {
        ok: true,
        session: updatedSession,
        characters: [updatedActor],
        resolution
      };
    }

    const flow = cloneFlow(session.combatFlow);
    const actorState = flow.combatantStates[actor.tokenId] ?? createEmptyCombatantTurnState();

    if (input.action.actionType === "move") {
      const resolution: CombatResolutionRecord = {
        id: `combat-resolution-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actorTokenId: actor.tokenId,
        targetTokenId: input.action.targetTokenId,
        actionType: "move",
        summary: `${actor.label} usa o turno para se mover e reposicionar.`,
        appliedConditions: []
      };
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "move" };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution };
    }

    if (input.action.actionType === "wait") {
      const trigger = input.action.waitTrigger ?? "gatilho nao especificado";
      const resolution: CombatResolutionRecord = {
        id: `combat-resolution-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actorTokenId: actor.tokenId,
        targetTokenId: null,
        actionType: "wait",
        summary: `${actor.label} assume a manobra Esperar. Gatilho: ${trigger}.`,
        appliedConditions: []
      };
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "wait", isWaiting: true, waitTrigger: trigger };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution };
    }

    if (input.action.actionType === "evaluate") {
      const result = resolveEvaluate({ actor, currentEvaluateBonus: actorState.evaluateBonus });
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "evaluate", evaluateBonus: result.nextEvaluateBonus };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, result.resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution: result.resolution };
    }

    if (input.action.actionType === "aim") {
      const result = resolveAim({ actor, draftAction: input.action, currentAimTurns: actorState.aimTurns });
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "aim", aimTurns: result.accumulatedAimTurns };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, result.resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution: result.resolution };
    }

    if (input.action.actionType === "ready") {
      const resolution = resolveReady({ actor, draftAction: input.action });
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "ready" };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution };
    }

    if (input.action.actionType === "concentrate") {
      const resolution = resolveConcentrate({ actor });
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "concentrate", concentrating: true };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution };
    }

    if (input.action.actionType === "do-nothing") {
      const resolution = resolveDoNothing({ actor });
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "do-nothing" };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution };
    }

    if (input.action.actionType === "all-out-defense") {
      const variant = (input.action.allOutVariant === "increased" || input.action.allOutVariant === "double")
        ? input.action.allOutVariant as AllOutDefenseVariant
        : "increased" as const;
      const resolution = resolveAllOutDefense({ actor, variant });
      const nextState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: "all-out-defense", allOutDefenseVariant: variant };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextState }
        })
      });
      return { ok: true, session: updatedSession, resolution };
    }

    if (!target) {
      throw new Error("Selecione um alvo para esta acao.");
    }

    if (input.action.actionType === "feint" || input.action.actionType === "feint-beat" || input.action.actionType === "feint-mental") {
      const feintType: FeintType =
        input.action.actionType === "feint-beat" ? "st"
        : input.action.actionType === "feint-mental" ? "iq"
        : "dx";
      const result = resolveFeint({ actor, target, draftAction: input.action, feintType });
      await persistCombatProfiles({
        actorCharacterId: actor.character.id,
        actorProfile: result.actorProfile,
        targetCharacterId: target.character?.id,
        targetProfile: result.targetProfile
      });
      const targetState = flow.combatantStates[target.tokenId] ?? createEmptyCombatantTurnState();
      const nextActorState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: input.action.actionType };
      const nextTargetState: CombatantTurnState = { ...targetState, feintPenalty: targetState.feintPenalty + result.feintPenalty };
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, result.resolution, {
          combatantStates: {
            ...flow.combatantStates,
            [actor.tokenId]: nextActorState,
            [target.tokenId]: nextTargetState
          }
        })
      });
      return { ok: true, session: updatedSession, resolution: result.resolution };
    }

    if (input.action.actionType === "quick-contest") {
      const contest = resolveQuickContest({
        actor,
        target,
        draftAction: input.action
      });
      await persistCombatProfiles({
        actorCharacterId: actor.character.id,
        actorProfile: contest.actorProfile,
        targetCharacterId: target.character?.id,
        targetProfile: contest.targetProfile
      });
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, contest.resolution)
      });

      return {
        ok: true,
        session: updatedSession,
        resolution: contest.resolution
      };
    }

    if (input.action.actionType === "regular-contest") {
      const contestFlow = cloneFlow(session.combatFlow);
      const configuredRounds = input.action.roundsNeeded ?? 2;
      const regularContest = contestFlow.regularContest ?? {
        label: input.action.contestLabel ?? "Disputa regular",
        actorTokenId: actor.tokenId,
        targetTokenId: target.tokenId,
        actorWins: 0,
        targetWins: 0,
        roundsNeeded: Math.max(1, configuredRounds)
      };
      const contest = resolveRegularContestRound({
        actor,
        target,
        draftAction: input.action,
        actorWins: regularContest.actorWins,
        targetWins: regularContest.targetWins,
        roundsNeeded: regularContest.roundsNeeded
      });
      await persistCombatProfiles({
        actorCharacterId: actor.character.id,
        actorProfile: contest.actorProfile,
        targetCharacterId: target.character?.id,
        targetProfile: contest.targetProfile
      });
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, contest.resolution, {
          regularContest: contest.finished
            ? null
            : {
                ...regularContest,
                actorWins: contest.actorWins,
                targetWins: contest.targetWins
              }
        })
      });

      return {
        ok: true,
        session: updatedSession,
        resolution: contest.resolution
      };
    }

    if (input.action.actionType === "all-out-attack") {
      const variant = (
        input.action.allOutVariant === "determined" ||
        input.action.allOutVariant === "strong" ||
        input.action.allOutVariant === "double" ||
        input.action.allOutVariant === "long"
      ) ? input.action.allOutVariant as AllOutAttackVariant : "determined" as const;

      const nextActorState: CombatantTurnState = {
        ...actorState,
        hasActed: true,
        lastManeuver: "all-out-attack",
        allOutAttackVariant: variant,
        noDefenseThisTurn: true
      };

      if (variant === "double") {
        const results = resolveAllOutAttackDouble({
          actor, target, draftAction: input.action,
          promptPlayerDefense: false
        });
        const lastResult = results[results.length - 1];
        if (lastResult?.actorProfile) {
          await persistCombatProfiles({
            actorCharacterId: actor.character.id,
            actorProfile: lastResult.actorProfile,
            targetCharacterId: target.character?.id,
            targetProfile: lastResult.targetProfile
          });
        }
        let currentFlow = cloneFlow(session.combatFlow);
        for (const r of results) {
          if (r.resolution) {
            currentFlow = appendResolution(currentFlow, r.resolution);
          }
        }
        currentFlow = { ...currentFlow, combatantStates: { ...currentFlow.combatantStates, [actor.tokenId]: nextActorState } };
        const updatedSession = await syncCombatSession({
          sessionId: session.id,
          combatEnabled: true,
          combatRound: session.combatRound,
          combatTurnIndex: session.combatTurnIndex,
          combatActiveTokenId: session.combatActiveTokenId,
          combatFlow: currentFlow
        });
        return { ok: true, session: updatedSession, resolution: lastResult?.resolution ?? null };
      }

      const defenses = listValidDefenseOptions(target, input.action.actionType).filter((o) => o !== "none");
      const targetIsPlayerControlled = Boolean(target.ownerParticipantId);
      const prepared = resolveAllOutAttack({
        actor, target, draftAction: input.action, variant,
        promptPlayerDefense: targetIsPlayerControlled && defenses.length > 0 && viewer.participantId !== target.ownerParticipantId
      });

      if (prepared.status === "awaiting-defense" && prepared.prompt && target.ownerParticipantId) {
        const promptPayload = {
          promptKind: "defense" as const,
          sessionId: session.id,
          actorTokenId: actor.tokenId,
          targetTokenId: target.tokenId,
          actionType: input.action.actionType,
          options: prepared.prompt.options,
          summary: prepared.prompt.summary,
          attackRoll: prepared.prompt.attackRoll,
          canRetreat: prepared.prompt.canRetreat,
          canAcrobatic: prepared.prompt.canAcrobatic,
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString()
        };
        const event = await createPrivateEvent({
          sessionId: session.id,
          targetParticipantId: target.ownerParticipantId,
          sourceParticipantId: viewer.participantId,
          kind: "combat",
          title: "Defesa ativa",
          body: prepared.prompt.summary,
          payload: promptPayload,
          intensity: 4,
          durationMs: 120000
        });
        const updatedSession = await syncCombatSession({
          sessionId: session.id,
          combatEnabled: true,
          combatRound: session.combatRound,
          combatTurnIndex: session.combatTurnIndex,
          combatActiveTokenId: session.combatActiveTokenId,
          combatFlow: {
            ...flow,
            phase: "awaiting-defense",
            activeAction: prepared.draftAction,
            pendingPrompt: {
              eventId: event.id,
              participantId: target.ownerParticipantId,
              payload: promptPayload
            },
            combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextActorState },
            updatedAt: new Date().toISOString()
          }
        });
        return { ok: true, session: updatedSession, message: "Defesa ativa enviada ao jogador alvo." };
      }

      if (!prepared.resolution) {
        throw new Error("Falha ao preparar o ataque total.");
      }

      await persistCombatProfiles({
        actorCharacterId: actor.character.id,
        actorProfile: prepared.actorProfile,
        targetCharacterId: target.character?.id,
        targetProfile: prepared.targetProfile
      });
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, prepared.resolution, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextActorState }
        })
      });
      return { ok: true, session: updatedSession, resolution: prepared.resolution };
    }

    const defenses = listValidDefenseOptions(target, input.action.actionType).filter(
      (option) => option !== "none"
    );
    const targetIsPlayerControlled = Boolean(target.ownerParticipantId);
    const prepared = prepareAttackResolution({
      actor,
      target,
      draftAction: input.action,
      promptPlayerDefense:
        targetIsPlayerControlled && defenses.length > 0 && viewer.participantId !== target.ownerParticipantId
    });

    if (prepared.status === "awaiting-defense" && prepared.prompt && target.ownerParticipantId) {
      const promptPayload = {
        promptKind: "defense" as const,
        sessionId: session.id,
        actorTokenId: actor.tokenId,
        targetTokenId: target.tokenId,
        actionType: input.action.actionType,
        options: prepared.prompt.options,
        summary: prepared.prompt.summary,
        attackRoll: prepared.prompt.attackRoll,
        canRetreat: prepared.prompt.canRetreat,
        canAcrobatic: prepared.prompt.canAcrobatic,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      };
      const event = await createPrivateEvent({
        sessionId: session.id,
        targetParticipantId: target.ownerParticipantId,
        sourceParticipantId: viewer.participantId,
        kind: "combat",
        title: "Defesa ativa",
        body: prepared.prompt.summary,
        payload: promptPayload,
        intensity: 4,
        durationMs: 120000
      });
      const flow = cloneFlow(session.combatFlow);
      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: {
          ...flow,
          phase: "awaiting-defense",
          activeAction: prepared.draftAction,
          pendingPrompt: {
            eventId: event.id,
            participantId: target.ownerParticipantId,
            payload: promptPayload
          },
          updatedAt: new Date().toISOString()
        }
      });

      return {
        ok: true,
        session: updatedSession,
        message: "Defesa ativa enviada ao jogador alvo."
      };
    }

    if (!prepared.resolution) {
      throw new Error("Falha ao preparar a acao de combate.");
    }

    await persistCombatProfiles({
      actorCharacterId: actor.character.id,
      actorProfile: prepared.actorProfile,
      targetCharacterId: target.character?.id,
      targetProfile: prepared.targetProfile
    });

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: session.combatActiveTokenId,
      combatFlow: appendResolution(session.combatFlow, prepared.resolution)
    });

    return {
      ok: true,
      session: updatedSession,
      resolution: prepared.resolution
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao executar a acao de combate."
    };
  }
}

export async function respondCombatPromptAction(input: {
  sessionCode: string;
  eventId: string;
  defenseOption?: CombatDefenseOption;
  retreat?: boolean;
  acrobatic?: boolean;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const event = await findPrivateEventById(input.eventId);

    if (!event || event.sessionId !== session.id || event.kind !== "combat") {
      throw new Error("Prompt de combate nao encontrado.");
    }

    if (viewer.role !== "gm" && event.targetParticipantId !== viewer.participantId) {
      throw new Error("Voce nao pode responder ao prompt de combate de outro jogador.");
    }

    const flow = cloneFlow(session.combatFlow);

    if (!flow.pendingPrompt || flow.pendingPrompt.eventId !== event.id || !flow.activeAction) {
      throw new Error("O fluxo de combate nao esta aguardando esta resposta.");
    }

    const actor = await buildCombatTokenContext(flow.activeAction.actorTokenId);
    const target = await buildCombatTokenContext(flow.pendingPrompt.payload.targetTokenId);

    if (!actor.character || !target.character) {
      throw new Error("As fichas do combate nao puderam ser carregadas.");
    }

    const attackRoll = flow.pendingPrompt.payload.attackRoll;

    if (!attackRoll) {
      throw new Error("A rolagem de ataque pendente nao foi encontrada.");
    }

    const finished = finishAttackResolution({
      actor,
      target,
      draftAction: flow.activeAction,
      attackRoll,
      defenseResponse: {
        option: input.defenseOption ?? "none",
        retreat: input.retreat,
        acrobatic: input.acrobatic
      }
    });

    await consumePrivateEvent(event.id).catch(() => undefined);
    await persistCombatProfiles({
      actorCharacterId: actor.character.id,
      actorProfile: finished.actorProfile,
      targetCharacterId: target.character.id,
      targetProfile: finished.targetProfile
    });

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: session.combatActiveTokenId,
      combatFlow: appendResolution(session.combatFlow, finished.resolution)
    });

    return {
      ok: true,
      session: updatedSession,
      resolution: finished.resolution
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao responder ao prompt de combate."
    };
  }
}

export async function processStartOfTurnAction(input: {
  sessionCode: string;
  tokenId: string;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    if (!session.combatEnabled) {
      throw new Error("O combate nao esta ativo.");
    }

    const tokenCtx = await buildCombatTokenContext(input.tokenId);

    if (!tokenCtx.character) {
      return { ok: true, message: "Token sem ficha vinculada, sem efeitos de inicio de turno." };
    }

    const profile = normalizeSheetProfile(tokenCtx.character.sheetProfile);
    const result = applyStartOfTurnEffects({ profile });

    if (!result.effects.summary) {
      return { ok: true, message: "Sem efeitos de inicio de turno." };
    }

    await updateSessionCharacterProfile({
      characterId: tokenCtx.character.id,
      sheetProfile: result.nextProfile
    });

    const resolution: CombatResolutionRecord = {
      id: `combat-resolution-${Date.now()}`,
      createdAt: new Date().toISOString(),
      actorTokenId: input.tokenId,
      targetTokenId: null,
      actionType: "do-nothing",
      summary: `[Inicio de turno] ${tokenCtx.label}: ${result.effects.summary}`,
      hpDelta: result.effects.bleedingDamage > 0 ? -result.effects.bleedingDamage : undefined,
      appliedConditions: result.effects.appliedConditions
    };

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: session.combatActiveTokenId,
      combatFlow: appendResolution(session.combatFlow, resolution)
    });

    return { ok: true, session: updatedSession, resolution };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao processar inicio de turno."
    };
  }
}

export async function gmTakeOverPlayerTurnAction(input: {
  sessionCode: string;
  tokenId: string;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    if (!session.combatEnabled) {
      throw new Error("O combate nao esta ativo.");
    }

    const flow = cloneFlow(session.combatFlow);

    if (flow.pendingPrompt?.eventId) {
      await consumePrivateEvent(flow.pendingPrompt.eventId).catch(() => undefined);
    }

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: input.tokenId,
      combatFlow: {
        ...flow,
        phase: "command",
        pendingPrompt: null,
        updatedAt: new Date().toISOString()
      }
    });

    return { ok: true, session: updatedSession, message: "GM assumiu o controle do turno." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao assumir o turno."
    };
  }
}

export async function playerExecuteManeuverAction(input: {
  sessionCode: string;
  action: CombatDraftAction;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const actor = await buildCombatTokenContext(input.action.actorTokenId);

    if (!actor.character) {
      throw new Error("O token precisa ter uma ficha vinculada.");
    }

    if (viewer.role !== "gm" && actor.ownerParticipantId !== viewer.participantId) {
      throw new Error("Voce nao controla este combatente.");
    }

    if (session.combatActiveTokenId && session.combatActiveTokenId !== input.action.actorTokenId) {
      throw new Error("Nao e a vez deste combatente.");
    }

    return executeCombatActionAction({
      sessionCode: input.sessionCode,
      action: input.action
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Falha ao executar manobra do jogador."
    };
  }
}
