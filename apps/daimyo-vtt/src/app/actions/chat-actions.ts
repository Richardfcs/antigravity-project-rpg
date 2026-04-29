"use server";

import { rollDiceFormula, formatRollSummary } from "@/lib/dice/gurps";
import { getInfraReadiness } from "@/lib/env";
import { createSessionMessage, clearSessionMessages } from "@/lib/chat/repository";
import { findSessionCharacterById, updateSessionCharacterProfile } from "@/lib/characters/repository";
import { requireSessionViewer } from "@/lib/session/access";
import type { TacticalRollMode, TacticalSkillRollPayload, TacticalRollSet } from "@/types/combat";
import type { SessionMessageRecord } from "@/types/message";

interface ChatActionResult {
  ok: boolean;
  message?: SessionMessageRecord;
  error?: string;
}

function buildInfraError(): ChatActionResult {
  return {
    ok: false,
    error: "O Supabase Service Role ainda nao esta configurado."
  };
}

function roll3d6(): TacticalRollSet {
  const dice: [number, number, number] = [
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1,
    Math.floor(Math.random() * 6) + 1
  ];

  return {
    dice,
    total: dice[0] + dice[1] + dice[2]
  };
}

function getGurpsOutcome(total: number, target: number): TacticalSkillRollPayload["outcome"] {
  if (total <= 4 || (total === 5 && target >= 15) || (total === 6 && target >= 16)) {
    return "critical-success";
  }

  if (total >= 18 || (total === 17 && target <= 15) || total - target >= 10) {
    return "critical-failure";
  }

  return total <= target ? "success" : "failure";
}

function formatSkillRollSummary(payload: TacticalSkillRollPayload) {
  const outcomeMap: Record<TacticalSkillRollPayload["outcome"], string> = {
    "critical-success": "critico de sucesso",
    success: "sucesso",
    failure: "falha",
    "critical-failure": "critico de falha"
  };
  const modeLabel =
    payload.rollMode === "advantage"
      ? "com vantagem"
      : payload.rollMode === "disadvantage"
        ? "com desvantagem"
        : "normal";
  const rolls = payload.rolls
    .map((roll, index) => `${index === payload.keptRollIndex ? "*" : ""}${roll.total} [${roll.dice.join(", ")}]`)
    .join(" / ");

  return `${payload.skillName}: ${payload.total} vs ${payload.targetNumber} (${outcomeMap[payload.outcome]}, margem ${payload.margin}) - ${modeLabel}. Rolagens: ${rolls}${payload.inspirationSpent ? " - Inspiracao gasta." : ""}`;
}

export async function sendChatMessageAction(input: {
  sessionCode: string;
  body: string;
  isPrivate?: boolean;
}): Promise<ChatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    const message = await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: input.isPrivate ? "master-log" : "chat",
      body: input.body,
      isPrivate: input.isPrivate ?? false
    });

    return { ok: true, message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao enviar a mensagem."
    };
  }
}

export async function rollDiceAction(input: {
  sessionCode: string;
  formula: string;
  target?: number | null;
  label?: string | null;
  isPrivate?: boolean;
  tokenId?: string | null;
  characterId?: string | null;
  skillId?: string | null;
  skillName?: string | null;
  modifiers?: Array<{ label: string; value: number }> | null;
  rollMode?: TacticalRollMode;
  inspirationSpent?: boolean;
  rerollOf?: string | null;
}): Promise<ChatActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return buildInfraError();
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);

    if (input.skillName && typeof input.target === "number") {
      let character = input.characterId ? await findSessionCharacterById(input.characterId) : null;

      if (character && character.sessionId !== session.id) {
        throw new Error("Ficha nao encontrada nesta sessao.");
      }

      if (character && viewer.role !== "gm" && character.ownerParticipantId !== viewer.participantId) {
        throw new Error("Voce so pode rolar pericias da ficha vinculada ao seu navegador.");
      }

      if (input.inspirationSpent) {
        if (!character?.sheetProfile) {
          throw new Error("Inspiracao exige uma ficha completa vinculada.");
        }

        const currentInspiration = Math.max(0, character.sheetProfile.combat.inspiration ?? 0);
        if (currentInspiration < 1) {
          throw new Error("Este personagem nao possui Inspiracao disponivel.");
        }

        character = await updateSessionCharacterProfile({
          characterId: character.id,
          sheetProfile: {
            ...character.sheetProfile,
            combat: {
              ...character.sheetProfile.combat,
              inspiration: currentInspiration - 1
            }
          }
        });
      }

      const rollMode = input.rollMode ?? "normal";
      const rolls = rollMode === "normal" ? [roll3d6()] : [roll3d6(), roll3d6()];
      const keptRollIndex =
        rollMode === "advantage"
          ? rolls[0].total <= rolls[1].total ? 0 : 1
          : rollMode === "disadvantage"
            ? rolls[0].total >= rolls[1].total ? 0 : 1
            : 0;
      const keptRoll = rolls[keptRollIndex];
      const modifierTotal = (input.modifiers ?? []).reduce((sum, item) => sum + item.value, 0);
      const targetNumber = input.target;
      const margin = targetNumber - keptRoll.total;
      const payload: TacticalSkillRollPayload = {
        rollKind: "skill",
        formula: "3d6",
        skillId: input.skillId ?? null,
        skillName: input.skillName,
        tokenId: input.tokenId ?? null,
        characterId: character?.id ?? input.characterId ?? null,
        targetNumber,
        modifierTotal,
        modifiers: input.modifiers ?? [],
        rollMode,
        rolls,
        keptRollIndex,
        total: keptRoll.total,
        margin,
        outcome: getGurpsOutcome(keptRoll.total, targetNumber),
        inspirationSpent: input.inspirationSpent ?? false,
        rerollOf: input.rerollOf ?? null
      };
      const message = await createSessionMessage({
        sessionId: session.id,
        participantId: viewer.participantId,
        displayName: viewer.displayName,
        kind: "roll",
        body: formatSkillRollSummary(payload),
        payload: payload as unknown as Record<string, unknown>,
        isPrivate: input.isPrivate ?? false
      });

      return { ok: true, message };
    }

    const payload = rollDiceFormula(input.formula, input.target, input.label);
    const message = await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "roll",
      body: formatRollSummary(payload),
      payload: { 
        ...payload as unknown as Record<string, unknown>,
        tokenId: input.tokenId || null
      },
      isPrivate: input.isPrivate ?? false
    });

    return { ok: true, message };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao rolar os dados."
    };
  }
}

export async function clearChatAction(input: {
  sessionCode: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode);
    
    if (viewer.role !== "gm") {
      return { ok: false, error: "Apenas o mestre pode limpar o chat." };
    }

    await clearSessionMessages(session.id);
    
    // Log da ação de limpeza
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "master-log",
      body: "O mestre limpou o historico de mensagens da sessao.",
      isPrivate: true
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Falha ao limpar o chat."
    };
  }
}
