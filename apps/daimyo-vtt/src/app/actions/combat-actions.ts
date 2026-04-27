"use server";

import {
  applyStartOfTurnEffects,
  applyTechniqueSwap,
  checkConcentrationBreak,
  checkStunFromHit,
  createEmptyCombatantTurnState,
  finishAttackResolution,
  listValidDefenseOptions,
  prepareAttackResolution,
  resolveAim,
  resolveAllOutAttackDouble,
  resolveAllOutDefense,
  resolveConcentrate,
  resolveDoNothing,
  resolveEvaluate,
  resolveFeint,
  resolveQuickContest,
  resolveReady,
  resolveRegularContestRound,
  resolveHTCheck,
  resolveRapidStrike,
  resolveDualWeaponAttack,
  resolveIaiStrike,
  resolveClashSimple,
  advanceTurnState,
  type CombatTokenContext
} from "@/lib/combat/engine";
import type {
  AllOutAttackVariant,
  AllOutDefenseVariant,
  CombatantTurnState,
  CombatDefenseOption,
  CombatDraftAction,
  CombatHitLocationId,
  CombatResolutionRecord,
  FeintType,
  SessionCharacterSheetProfile,
  SessionCombatFlow,
  CombatPromptPayload
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
import { updateSessionCombatState, listSessionParticipants } from "@/lib/session/repository";

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

async function applyPostDamageChecks(input: {
  targetProfile: SessionCharacterSheetProfile;
  targetCharacterId: string;
  targetTokenId: string;
  hitLocation: CombatHitLocationId;
  damageInjury: number;
}) {
  if (!input.targetProfile || input.damageInjury <= 0) return;

  if (input.hitLocation === "skull" || input.hitLocation === "face") {
    const stunResult = checkStunFromHit(input.targetProfile, input.hitLocation);
    if (stunResult.stunned) {
      await updateSessionCharacterProfile({
        characterId: input.targetCharacterId,
        sheetProfile: stunResult.nextProfile
      });
    }
  }
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

function consumeFeintPenaltyForDefense(
  states: Record<string, CombatantTurnState>,
  targetTokenId: string,
  actorTokenId: string
) {
  const targetState = states[targetTokenId];

  if (
    !targetState?.feintPenalty ||
    (targetState.feintPenaltyBy && targetState.feintPenaltyBy !== actorTokenId)
  ) {
    return states;
  }

  return {
    ...states,
    [targetTokenId]: {
      ...targetState,
      feintPenalty: 0,
      feintPenaltyBy: null
    }
  };
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

async function performTurnAdvancement(session: any, flow: SessionCombatFlow, currentTokenId: string | null) {
  const activeTokens = await listOrderedCombatTokens(session.id, session.activeMapId);
  const currentIndex = activeTokens.findIndex((t) => t.id === currentTokenId);
  
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1 >= activeTokens.length ? 0 : currentIndex + 1)
    : 0;
  
  const nextTokenId = activeTokens[nextIndex]?.id ?? null;
  let nextRound = session.combatRound;
  
  if (nextIndex === 0 && currentIndex > 0) {
    const turnIndexToCheck = activeTokens.findIndex((t) => t.id === currentTokenId);
    if (turnIndexToCheck >= 0 && turnIndexToCheck < activeTokens.length - 1) {
      nextRound = session.combatRound + 1;
    }
  }

  if (!nextTokenId) return null;

  const currentActorState = flow.combatantStates[currentTokenId ?? ""];
  if (currentActorState && currentActorState.isWaiting) {
    const waitingResolution: CombatResolutionRecord = {
      id: `combat-resolution-${Date.now()}`,
      createdAt: new Date().toISOString(),
      actorTokenId: currentTokenId ?? "",
      targetTokenId: null,
      actionType: "wait",
      summary: `O combatente estava esperando e o gatilho '${currentActorState.waitTrigger}' ocorreu.`,
      appliedConditions: []
    };
    flow.log = [...flow.log, waitingResolution].slice(-40);
  }

  const nextCombatantStates = { ...flow.combatantStates };
  if (nextCombatantStates[nextTokenId]) {
    nextCombatantStates[nextTokenId] = advanceTurnState(nextCombatantStates[nextTokenId]);
  }

  return await syncCombatSession({
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
        error instanceof Error ? error.message : "Falha ao destacar o combatente."
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

    if (!session.combatEnabled) {
      throw new Error("Inicie o combate antes de avancar o turno.");
    }

    const currentTokenId = session.combatActiveTokenId;
    const flow = session.combatFlow ? cloneFlow(session.combatFlow) : createEmptyCombatFlow();

    if (flow?.pendingPrompt?.eventId) {
      await consumePrivateEvent(flow.pendingPrompt.eventId).catch(() => undefined);
    }

    const updatedSession = await performTurnAdvancement(session, flow, currentTokenId);

    if (!updatedSession) {
       throw new Error("Nenhum combatente encontrado.");
    }

    return {
      ok: true,
      session: updatedSession
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao avancar o turno."
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
      message:
        error instanceof Error ? error.message : "Falha ao destacar o combatente."
    };
  }
}

export async function skipTurnAction(input: {
  sessionCode: string;
}): Promise<CombatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    if (!session.combatEnabled) {
      throw new Error("Nenhum combate ativo.");
    }

    const currentTokenId = session.combatActiveTokenId;
    if (!currentTokenId) {
      throw new Error("Nenhum combatente ativo no momento.");
    }

    const actor = await buildCombatTokenContext(currentTokenId);
    const resolution: CombatResolutionRecord = {
      id: `combat-resolution-${Date.now()}`,
      createdAt: new Date().toISOString(),
      actorTokenId: actor.tokenId,
      actorName: actor.label,
      targetTokenId: null,
      actionType: "do-nothing",
      summary: `${actor.label} pula o turno (acao ignorada pelo GM).`,
      appliedConditions: []
    };

    const flow = cloneFlow(session.combatFlow);
    const actorState = flow.combatantStates[actor.tokenId] ?? createEmptyCombatantTurnState();
    const nextActorState: CombatantTurnState = {
      ...actorState,
      hasActed: true,
      lastManeuver: null
    };

    const activeTokens = await listOrderedCombatTokens(session.id, session.activeMapId);
    const currentIndex = activeTokens.findIndex((t) => t.id === currentTokenId);
    const nextIndex = currentIndex >= 0 && currentIndex + 1 < activeTokens.length ? currentIndex + 1 : 0;
    const nextTokenId = activeTokens[nextIndex]?.id ?? activeTokens[0]?.id ?? null;
    const nextRound = currentIndex >= 0 && currentIndex + 1 >= activeTokens.length ? session.combatRound + 1 : session.combatRound;

    const nextFlow = cloneFlow(session.combatFlow);
    nextFlow.combatantStates = { ...flow.combatantStates, [actor.tokenId]: nextActorState };
    nextFlow.phase = "command";
    nextFlow.activeAction = null;
    nextFlow.pendingPrompt = null;
    nextFlow.lastResolution = resolution;
    nextFlow.log = [...flow.log, resolution].slice(-40);
    nextFlow.updatedAt = new Date().toISOString();

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: nextRound,
      combatTurnIndex: nextIndex,
      combatActiveTokenId: nextTokenId,
      combatFlow: nextFlow
    });

    return {
      ok: true,
      session: updatedSession,
      resolution
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Falha ao pular o turno."
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
    const { session, viewer } = await requireSessionViewer(input.sessionCode);

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

    if (viewer.role !== "gm" && actor.ownerParticipantId !== viewer.participantId) {
      throw new Error("Voce nao controla este combatente.");
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
        round: session.combatRound,
        isStyle: input.action.isStyle
      });
      const updatedActor = await updateSessionCharacterProfile({
        characterId: actor.character.id,
        sheetProfile: nextProfile
      });

      const flow = cloneFlow(session.combatFlow);
      const actorState = flow.combatantStates[actor.tokenId] ?? createEmptyCombatantTurnState();
      
      const resolution: CombatResolutionRecord = {
        id: `combat-resolution-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actorTokenId: actor.tokenId,
        actorName: actor.label,
        targetTokenId: null,
        actionType: input.action.actionType,
        summary: `${actor.label} troca o foco de suas tecnicas. Este esforco mental consome o turno e o impede de se defender ate o proximo turno.`,
        appliedConditions: ["Sem Defesa"]
      };

      const nextActorState: CombatantTurnState = { 
        ...actorState, 
        hasActed: true, 
        lastManeuver: "swap-technique",
        noDefenseThisTurn: true
      };

      const intermediateFlow = appendResolution(flow, resolution, {
        combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextActorState }
      });

      // Avançar o turno automaticamente como solicitado
      const updatedSession = await performTurnAdvancement(session, intermediateFlow, actor.tokenId);

      return {
        ok: true,
        session: updatedSession ?? session,
        characters: [updatedActor],
        resolution
      };
    }

    const flow = cloneFlow(session.combatFlow);
    const actorState = flow.combatantStates[actor.tokenId] ?? createEmptyCombatantTurnState();

    if (input.action.actionType === "iai-strike") {
      const targetToken = await findMapTokenById(input.action.targetTokenId ?? "");
      if (!targetToken) throw new Error("Alvo nao encontrado.");

      const targetCharacter = await findSessionCharacterById(targetToken.characterId ?? "");
      const targetContext: CombatTokenContext = {
        tokenId: targetToken.id,
        label: targetToken.label,
        ownerParticipantId: targetCharacter?.ownerParticipantId ?? null,
        character: targetCharacter
      };

      const result = resolveIaiStrike({
        actor,
        target: targetContext,
        draftAction: input.action,
        targetState: flow.combatantStates[targetContext.tokenId] ?? null
      });

      if (result.actorProfile) {
        await persistCombatProfiles({
          actorCharacterId: actor.character.id,
          actorProfile: result.actorProfile,
          targetCharacterId: targetContext.character?.id,
          targetProfile: result.targetProfile
        });
      }

      const nextActorState: CombatantTurnState = { 
        ...actorState, 
        hasActed: true, 
        lastManeuver: "iai-strike" 
      };

      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(flow, result.resolution!, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextActorState }
        })
      });

      return {
        ok: true,
        session: updatedSession,
        resolution: result.resolution
      };
    }
    if (input.action.actionType === "clash-simple") {
      const targetToken = await findMapTokenById(input.action.targetTokenId ?? "");
      if (!targetToken) throw new Error("Alvo nao encontrado.");

      const targetCharacter = await findSessionCharacterById(targetToken.characterId ?? "");
      const targetContext: CombatTokenContext = {
        tokenId: targetToken.id,
        label: targetToken.label,
        ownerParticipantId: targetCharacter?.ownerParticipantId ?? null,
        character: targetCharacter
      };

      const result = resolveClashSimple({ actor, target: targetContext, draftAction: input.action });

      if (result.actorProfile) {
        await persistCombatProfiles({
          actorCharacterId: actor.character.id,
          actorProfile: result.actorProfile,
          targetCharacterId: targetContext.character?.id,
          targetProfile: result.targetProfile
        });
      }

      const nextActorState: CombatantTurnState = { 
        ...actorState, 
        hasActed: true, 
        lastManeuver: input.action.actionType 
      };

      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(flow, result.resolution!, {
          combatantStates: { ...flow.combatantStates, [actor.tokenId]: nextActorState }
        })
      });

      return {
        ok: true,
        session: updatedSession,
        resolution: result.resolution
      };
    }

    if (input.action.actionType === "move") {
      const resolution: CombatResolutionRecord = {
        id: `combat-resolution-${Date.now()}`,
        createdAt: new Date().toISOString(),
        actorTokenId: actor.tokenId,
        actorName: actor.label,
        targetTokenId: input.action.targetTokenId,
        targetName: target?.label,
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
        actorName: actor.label,
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
      const variant = (input.action.allOutDefenseVariant === "increased" || input.action.allOutDefenseVariant === "double")
        ? input.action.allOutDefenseVariant as AllOutDefenseVariant
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
        input.action.feintType ||
        (input.action.actionType === "feint-beat" ? "st"
        : input.action.actionType === "feint-mental" ? "iq"
        : "dx");
      const result = resolveFeint({ actor, target, draftAction: input.action, feintType });
      await persistCombatProfiles({
        actorCharacterId: actor.character.id,
        actorProfile: result.actorProfile,
        targetCharacterId: target.character?.id,
        targetProfile: result.targetProfile
      });
      const targetState = flow.combatantStates[target.tokenId] ?? createEmptyCombatantTurnState();
      const nextActorState: CombatantTurnState = { ...actorState, hasActed: true, lastManeuver: input.action.actionType };
      const nextTargetState: CombatantTurnState = {
        ...targetState,
        feintPenalty: targetState.feintPenalty + result.feintPenalty,
        feintPenaltyBy: result.feintPenalty > 0 ? actor.tokenId : targetState.feintPenaltyBy
      };
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
        const targetState = flow.combatantStates[target.tokenId] ?? null;
        const results = resolveAllOutAttackDouble({
          actor, target, draftAction: input.action,
          promptPlayerDefense: false,
          targetState
        });
        const lastResult = results[results.length - 1];
        if (lastResult?.actorProfile) {
          await persistCombatProfiles({
            actorCharacterId: actor.character.id,
            actorProfile: lastResult.actorProfile,
            targetCharacterId: target.character?.id,
            targetProfile: lastResult.targetProfile
          });
          if (lastResult.targetProfile && target.character?.id) {
            for (const r of results) {
              if (r.targetProfile && r.resolution?.damage && r.resolution.damage.injury > 0) {
                const hitLoc = r.resolution.damage.hitLocation;
                await applyPostDamageChecks({
                  targetProfile: r.targetProfile,
                  targetCharacterId: target.character.id,
                  targetTokenId: target.tokenId,
                  hitLocation: hitLoc,
                  damageInjury: r.resolution.damage.injury
                });
                if (r.resolution.damage.injury > 0) {
                  if (flow.combatantStates[target.tokenId]?.concentrating) {
                    const concResult = checkConcentrationBreak(r.targetProfile, r.resolution.damage.injury);
                    if (concResult.broken) {
                      flow.combatantStates[target.tokenId] = { ...flow.combatantStates[target.tokenId], concentrating: false };
                    }
                  }
                }
              }
            }
          }
        }
        let currentFlow = cloneFlow(session.combatFlow);
        for (const r of results) {
          if (r.resolution) {
            currentFlow = appendResolution(currentFlow, r.resolution);
          }
        }
        currentFlow = {
          ...currentFlow,
          combatantStates: consumeFeintPenaltyForDefense(
            { ...currentFlow.combatantStates, [actor.tokenId]: nextActorState },
            target.tokenId,
            actor.tokenId
          )
        };
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

      const targetState = flow.combatantStates[target.tokenId] ?? null;
      const defenses = listValidDefenseOptions(target, input.action.actionType, targetState).filter((o) => o !== "none");
      const targetIsPlayerControlled = Boolean(target.ownerParticipantId);
      const prepared = prepareAttackResolution({
        actor, target, draftAction: input.action, variant,
        promptPlayerDefense: defenses.length > 0, // Sempre pergunta se houver defesa valida
        targetState
      });

      if (prepared.status === "awaiting-defense" && prepared.prompt) {
        let targetParticipantId = target.ownerParticipantId;
        if (!targetParticipantId) {
          const participants = await listSessionParticipants(session.id);
          const gm = participants.find(p => p.role === "gm");
          targetParticipantId = gm?.id || viewer.participantId;
        }

        const promptPayload = {
          promptKind: "defense" as const,
          sessionId: session.id,
          actorTokenId: actor.tokenId,
          targetTokenId: target.tokenId,
          actionType: input.action.actionType,
          options: prepared.prompt.options,
          defenseLevels: prepared.prompt.defenseLevels,
          summary: prepared.prompt.summary,
          attackRoll: prepared.prompt.attackRoll,
          canRetreat: prepared.prompt.canRetreat,
          canAcrobatic: prepared.prompt.canAcrobatic,
          requestedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString()
        };
        const event = await createPrivateEvent({
          sessionId: session.id,
          targetParticipantId: targetParticipantId,
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
              participantId: targetParticipantId,
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

      if (prepared.targetProfile && target.character?.id && prepared.resolution) {
        const resolution = prepared.resolution;
        const damage = resolution.damage;
        const hitLocation = damage?.hitLocation ?? input.action.hitLocation;
        const injury = damage?.injury ?? 0;
        await applyPostDamageChecks({
          targetProfile: prepared.targetProfile,
          targetCharacterId: target.character.id,
          targetTokenId: target.tokenId,
          hitLocation,
          damageInjury: injury
        });
        if (flow.combatantStates[target.tokenId]?.concentrating && injury > 0) {
          const concResult = checkConcentrationBreak(prepared.targetProfile, injury);
          if (concResult.broken) {
            flow.combatantStates[target.tokenId] = { ...flow.combatantStates[target.tokenId], concentrating: false };
          }
        }
      }

      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: appendResolution(session.combatFlow, prepared.resolution, {
          combatantStates: consumeFeintPenaltyForDefense(
            { ...flow.combatantStates, [actor.tokenId]: nextActorState },
            target.tokenId,
            actor.tokenId
          )
        })
      });
      return { ok: true, session: updatedSession, resolution: prepared.resolution };
    }

    if ((input.action.actionType === "attack" || input.action.actionType === "ranged-attack") && (input.action.rapidStrike || input.action.dualWeapon)) {
      const targetState = flow.combatantStates[target.tokenId] ?? null;
      const results = input.action.rapidStrike
        ? resolveRapidStrike({ actor, target, draftAction: input.action, promptPlayerDefense: false, targetState })
        : resolveDualWeaponAttack({ actor, target, draftAction: input.action, promptPlayerDefense: false, targetState });
      
      const lastResult = results[results.length - 1];
      if (lastResult?.actorProfile) {
        await persistCombatProfiles({
          actorCharacterId: actor.character.id,
          actorProfile: lastResult.actorProfile,
          targetCharacterId: target.character?.id,
          targetProfile: lastResult.targetProfile
        });
        if (lastResult.targetProfile && target.character?.id) {
          for (const r of results) {
            if (r.targetProfile && r.resolution?.damage && r.resolution.damage.injury > 0) {
              await applyPostDamageChecks({
                targetProfile: r.targetProfile,
                targetCharacterId: target.character.id,
                targetTokenId: target.tokenId,
                hitLocation: r.resolution.damage.hitLocation,
                damageInjury: r.resolution.damage.injury
              });
            }
          }
        }
      }

      let currentFlow = cloneFlow(session.combatFlow);
      for (const r of results) {
        if (r.resolution) {
          currentFlow = appendResolution(currentFlow, r.resolution);
        }
      }

      const nextActorState: CombatantTurnState = {
        ...actorState,
        hasActed: true,
        lastManeuver: input.action.actionType,
        attackVariant: input.action.attackVariant || null
      };

      currentFlow = {
        ...currentFlow,
        combatantStates: consumeFeintPenaltyForDefense(
          { ...currentFlow.combatantStates, [actor.tokenId]: nextActorState },
          target.tokenId,
          actor.tokenId
        )
      };

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

    const defenses = listValidDefenseOptions(target, input.action.actionType).filter(
      (option) => option !== "none"
    );
    const targetIsPlayerControlled = Boolean(target.ownerParticipantId);
    const targetState = flow.combatantStates[target.tokenId] ?? null;
    
    const shouldPrompt = defenses.length > 0;

    const prepared = prepareAttackResolution({
      actor,
      target,
      draftAction: input.action,
      promptPlayerDefense: shouldPrompt,
      targetState,
      variant: input.action.allOutVariant as AllOutAttackVariant
    });

    let targetParticipantId = target.ownerParticipantId;
    if (!targetParticipantId && shouldPrompt) {
      const participants = await listSessionParticipants(session.id);
      const gm = participants.find(p => p.role === "gm");
      targetParticipantId = gm?.id || viewer.participantId;
    }

    if (prepared.status === "awaiting-defense" && prepared.prompt && targetParticipantId) {
      const promptPayload = {
        promptKind: "defense" as const,
        sessionId: session.id,
        actorTokenId: actor.tokenId,
        targetTokenId: target.tokenId,
        actionType: input.action.actionType,
        options: prepared.prompt.options,
        defenseLevels: prepared.prompt.defenseLevels,
        summary: prepared.prompt.summary,
        attackRoll: prepared.prompt.attackRoll,
        canRetreat: prepared.prompt.canRetreat,
        canAcrobatic: prepared.prompt.canAcrobatic,
        requestedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 2 * 60 * 1000).toISOString()
      };
      const event = await createPrivateEvent({
        sessionId: session.id,
        targetParticipantId: targetParticipantId,
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
            participantId: targetParticipantId,
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

    const damage = prepared.resolution.damage;
    if (prepared.targetProfile && target.character?.id && damage && damage.injury > 0) {
      const damageHitLocation = damage.hitLocation;
      if (damageHitLocation === "skull" || damageHitLocation === "face") {
        const stunResult = checkStunFromHit(prepared.targetProfile, damageHitLocation);
        if (stunResult.stunned) {
          await updateSessionCharacterProfile({
            characterId: target.character.id,
            sheetProfile: stunResult.nextProfile
          });
          prepared.resolution = {
            ...prepared.resolution,
            appliedConditions: [...prepared.resolution.appliedConditions, "Atordoado"]
          };
        }
      }
      const targetState = flow.combatantStates[target.tokenId];
      if (targetState?.concentrating) {
        const concResult = checkConcentrationBreak(prepared.targetProfile, damage.injury);
        if (concResult.broken) {
          flow.combatantStates[target.tokenId] = { ...targetState, concentrating: false };
          prepared.resolution = {
            ...prepared.resolution,
            appliedConditions: [...prepared.resolution.appliedConditions, "Concentracao quebrada"]
          };
        }
      }
    }

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: session.combatActiveTokenId,
      combatFlow: appendResolution(flow, prepared.resolution, {
        combatantStates: consumeFeintPenaltyForDefense(
          { ...flow.combatantStates },
          target.tokenId,
          actor.tokenId
        )
      })
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
  feverish?: boolean;
  manualModifier?: number;
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

    if (!flow.pendingPrompt || flow.pendingPrompt.eventId !== event.id) {
      throw new Error("O fluxo de combate nao esta aguardando esta resposta.");
    }

    if (flow.pendingPrompt.payload.promptKind === "ht-check") {
      const actor = await buildCombatTokenContext(flow.pendingPrompt.payload.actorTokenId);
      if (!actor.character || !actor.character.sheetProfile) {
        throw new Error("Ficha nao encontrada.");
      }
      
      const profile = normalizeSheetProfile(actor.character.sheetProfile);
      const htData = flow.pendingPrompt.payload.htCheck;
      if (!htData) throw new Error("Dados de HT nao encontrados.");

      const result = resolveHTCheck({
        profile,
        kind: htData.kind,
        threshold: htData.threshold
      });

      await consumePrivateEvent(event.id).catch(() => undefined);
      await updateSessionCharacterProfile({
        characterId: actor.character.id,
        sheetProfile: result.nextProfile
      });

      const resolution = {
        ...result.resolution,
        actorTokenId: actor.tokenId,
        actorName: actor.label
      };

      const updatedSession = await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: {
          ...appendResolution(session.combatFlow, resolution),
          pendingPrompt: null,
          updatedAt: new Date().toISOString()
        }
      });

      return { ok: true, session: updatedSession, resolution };
    }

    if (!flow.activeAction) {
      throw new Error("O fluxo de combate nao possui uma acao ativa para resolver.");
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

    const targetState = flow.combatantStates[target.tokenId] ?? null;

    const finished = finishAttackResolution({
      actor,
      target,
      draftAction: flow.activeAction,
      attackRoll,
      defenseResponse: {
        option: input.defenseOption ?? "none",
        retreat: input.retreat,
        acrobatic: input.acrobatic,
        feverish: input.feverish,
        manualModifier: input.manualModifier
      },
      targetState
    });

    await consumePrivateEvent(event.id).catch(() => undefined);
    await persistCombatProfiles({
      actorCharacterId: actor.character.id,
      actorProfile: finished.actorProfile,
      targetCharacterId: target.character.id,
      targetProfile: finished.targetProfile
    });

    if (finished.targetProfile && finished.resolution.damage && finished.resolution.damage.injury > 0) {
      const hitLoc = finished.resolution.damage.hitLocation;
      await applyPostDamageChecks({
        targetProfile: finished.targetProfile,
        targetCharacterId: target.character.id,
        targetTokenId: target.tokenId,
        hitLocation: hitLoc,
        damageInjury: finished.resolution.damage.injury
      });
      if (flow.combatantStates[target.tokenId]?.concentrating) {
        const concResult = checkConcentrationBreak(finished.targetProfile, finished.resolution.damage.injury);
        if (concResult.broken) {
          flow.combatantStates[target.tokenId] = { ...flow.combatantStates[target.tokenId], concentrating: false };
        }
      }
    }

    const updatedSession = await syncCombatSession({
      sessionId: session.id,
      combatEnabled: true,
      combatRound: session.combatRound,
      combatTurnIndex: session.combatTurnIndex,
      combatActiveTokenId: session.combatActiveTokenId,
      combatFlow: appendResolution(session.combatFlow, finished.resolution, {
        combatantStates: consumeFeintPenaltyForDefense(
          { ...flow.combatantStates },
          target.tokenId,
          actor.tokenId
        )
      })
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
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");

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

    // Se houver testes de HT pendentes, criar o prompt
    if (result.effects.requiredChecks.length > 0) {
      const check = result.effects.requiredChecks[0];
      const promptPayload: CombatPromptPayload = {
        promptKind: "ht-check",
        sessionId: session.id,
        actorTokenId: input.tokenId,
        targetTokenId: input.tokenId,
        actionType: "do-nothing",
        options: [],
        summary: check.label,
        requestedAt: new Date().toISOString(),
        htCheck: {
          kind: check.kind,
          targetValue: check.targetValue,
          threshold: check.threshold
        }
      };

      const participantId = tokenCtx.ownerParticipantId ?? viewer.participantId;
      const event = await createPrivateEvent({
        sessionId: session.id,
        targetParticipantId: participantId,
        kind: "combat",
        payload: promptPayload as any,
        title: "Teste de HT",
        body: check.label
      });

      await syncCombatSession({
        sessionId: session.id,
        combatEnabled: true,
        combatRound: session.combatRound,
        combatTurnIndex: session.combatTurnIndex,
        combatActiveTokenId: session.combatActiveTokenId,
        combatFlow: {
          ...updatedSession.combatFlow!,
          pendingPrompt: {
            eventId: event.id,
            participantId,
            payload: promptPayload
          },
          updatedAt: new Date().toISOString()
        }
      });
    }

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
