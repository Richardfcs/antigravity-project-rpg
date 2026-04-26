"use server";

import { requireSessionViewer } from "@/lib/session/access";
import { createSessionMessage } from "@/lib/chat/repository";
import { createSessionCharacter } from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import type { EnemyStats, MonsterConcept, NpcProfile } from "@/types/oracle";
import type { SessionMessageRecord } from "@/types/message";
import type { SessionCharacterSheetProfile } from "@/types/combat";

interface OracleActionResult {
  ok: boolean;
  message?: string;
  data?: any;
}

export async function broadcastOracleAction(input: {
  sessionCode: string;
  title: string;
  body: string;
  payload: any;
}): Promise<OracleActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return { ok: false, message: "Infraestrutura não pronta." };
  }

  try {
    const { session, viewer } = await requireSessionViewer(input.sessionCode, "gm");
    
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "oracle",
      body: input.body,
      payload: {
        title: input.title,
        ...input.payload
      }
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Erro ao transmitir." };
  }
}

export async function spawnOracleEnemyAction(input: {
  sessionCode: string;
  stats: EnemyStats;
}): Promise<OracleActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return { ok: false, message: "Infraestrutura não pronta." };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");
    
    // Criar arma procedural baseada nos stats
    const weaponId = crypto.randomUUID();
    const weaponModeId = crypto.randomUUID();
    const isRanged = input.stats.armas.toLowerCase().includes('arco') || input.stats.armas.toLowerCase().includes('fukiya');
    const swingDice = Math.max(1, Math.floor(input.stats.st / 4));
    const thrustDice = Math.max(1, Math.floor((input.stats.st - 2) / 4));

    const weaponRecord = {
      id: weaponId,
      name: input.stats.armas,
      category: isRanged ? 'ranged' : 'melee',
      state: 'ready' as const,
      quality: null,
      rawDamage: isRanged ? `${thrustDice}d imp` : `${swingDice}d cut`,
      notes: 'Gerada proceduralmente',
      modes: [{
        id: weaponModeId,
        label: input.stats.armas,
        skill: isRanged ? 'Arco' : 'Espada',
        damage: {
          base: (isRanged ? 'thrust' : 'swing') as 'thrust' | 'swing',
          dice: isRanged ? thrustDice : swingDice,
          adds: 0,
          damageType: (isRanged ? 'imp' : 'cut') as 'imp' | 'cut',
          raw: isRanged ? `${thrustDice}d imp` : `${swingDice}d cut`
        },
        reach: isRanged ? '-' : '1,2',
        parry: isRanged ? 'Não' : '0',
        minStrength: Math.max(8, input.stats.st - 2),
        accuracy: isRanged ? 2 : null,
        halfDamageRange: null,
        maxRange: isRanged ? 150 : null,
        recoil: null,
        tags: [],
        notes: undefined
      }]
    };

    const sheetProfile: SessionCharacterSheetProfile = {
      version: 1,
      summary: `${input.stats.armas} | ${input.stats.notas}`,
      attributes: {
        st: input.stats.st,
        dx: input.stats.dx,
        iq: input.stats.iq,
        ht: input.stats.ht,
        hpMax: input.stats.hpMax,
        fpMax: input.stats.pfMax,
        will: input.stats.vont,
        per: input.stats.iq
      },
      derived: {
        basicSpeed: input.stats.velocidade,
        move: input.stats.velocidade,
        encumbranceLevel: 0
      },
      defenses: {
        dodge: input.stats.esquiva,
        parry: input.stats.aparar,
        block: input.stats.bloqueio
      },
      style: { name: "Gerado proceduralmente" },
      skills: [],
      techniques: [],
      weapons: [weaponRecord],
      armor: [],
      notes: [input.stats.armas, input.stats.notas],
      conditions: [],
      combat: {
        currentHp: input.stats.hpMax,
        currentFp: input.stats.pfMax,
        activeWeaponId: weaponId,
        activeWeaponModeId: weaponModeId,
        loadoutTechniqueIds: [],
        posture: "standing",
        shock: 0,
        bleeding: 0,
        evaluateBonus: 0
      }
    };

    const character = await createSessionCharacter({
      sessionId: session.id,
      name: input.stats.name,
      type: "npc",
      tier: "full",
      ownerParticipantId: null,
      assetId: null,
      hpMax: input.stats.hpMax,
      fpMax: input.stats.pfMax,
      initiative: input.stats.iniciativa,
      sheetProfile
    });

    // Log Automático do Mestre
    const { viewer } = await requireSessionViewer(input.sessionCode, "gm");
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "master-log",
      body: `Gerou inimigo via Oraculo: ${character.name}`,
      isPrivate: true
    });

    return { ok: true, data: character };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Erro ao criar inimigo." };
  }
}

export async function spawnOracleNpcAction(input: {
  sessionCode: string;
  npc: NpcProfile;
}): Promise<OracleActionResult> {
  if (!getInfraReadiness().serviceRole) {
    return { ok: false, message: "Infraestrutura não pronta." };
  }

  try {
    const { session } = await requireSessionViewer(input.sessionCode, "gm");

    const npcName = `${input.npc.nome} (${input.npc.cla})`;

    const sheetProfile: SessionCharacterSheetProfile = {
      version: 1,
      summary: `${input.npc.especialidade} | ${input.npc.traco}`,
      attributes: { st: 10, dx: 10, iq: 10, ht: 10, hpMax: 10, fpMax: 10, will: 10, per: 10 },
      derived: { basicSpeed: 5, move: 5, encumbranceLevel: 0 },
      defenses: { dodge: 8, parry: 8, block: 0 },
      style: { name: input.npc.especialidade },
      skills: [],
      techniques: [],
      weapons: [],
      armor: [],
      notes: [
        `Clã: ${input.npc.cla}`,
        `Especialidade: ${input.npc.especialidade}`,
        `Traço: ${input.npc.traco}`,
        `Segredo: ${input.npc.segredo}`
      ],
      conditions: [],
      combat: {
        currentHp: 10,
        currentFp: 10,
        activeWeaponId: null,
        activeWeaponModeId: null,
        loadoutTechniqueIds: [],
        posture: "standing",
        shock: 0,
        bleeding: 0,
        evaluateBonus: 0
      }
    };

    const character = await createSessionCharacter({
      sessionId: session.id,
      name: npcName,
      type: "npc",
      tier: "summary",
      ownerParticipantId: null,
      assetId: null,
      hpMax: 10,
      fpMax: 10,
      initiative: 5,
      sheetProfile
    });

    // Log Automático do Mestre
    const { viewer } = await requireSessionViewer(input.sessionCode, "gm");
    await createSessionMessage({
      sessionId: session.id,
      participantId: viewer.participantId,
      displayName: viewer.displayName,
      kind: "master-log",
      body: `Gerou NPC via Oraculo: ${character.name}`,
      isPrivate: true
    });

    return { ok: true, data: character };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Erro ao criar NPC." };
  }
}
