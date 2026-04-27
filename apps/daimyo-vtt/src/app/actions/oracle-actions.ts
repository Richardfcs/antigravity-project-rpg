"use server";

import { requireSessionViewer } from "@/lib/session/access";
import { createSessionMessage } from "@/lib/chat/repository";
import { createSessionCharacter } from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import type { EnemyStats, NpcProfile } from "@/types/oracle";
import type { SessionCharacterSheetProfile, CharacterWeaponRecord, CharacterWeaponMode } from "@/types/combat";
import { loadBaseCatalog } from "@/lib/content-bridge/base-loader";
import { getThrustDamage, getSwingDamage } from "@/lib/combat/engine";
import { parseDamageSpec, createWeaponMode } from "@/lib/combat/sheet-profile";

interface OracleActionResult {
  ok: boolean;
  message?: string;
  data?: any;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function findEquipmentInArsenal(query: string, category: "Armas" | "Armaduras"): Promise<any | null> {
  const catalog = await loadBaseCatalog();
  const entries = catalog.equipmentEntries.filter(e => e.category === category);
  
  const normalizedQuery = query.toLowerCase().trim();
  const found = entries.find(e => 
    e.name.toLowerCase().includes(normalizedQuery) || 
    normalizedQuery.includes(e.name.toLowerCase())
  );

  return found ? { ...found.stats as any, name: found.name } : null;
}

async function findWeaponInArsenal(query: string): Promise<CharacterWeaponRecord | null> {
  const stats = await findEquipmentInArsenal(query, "Armas");
  if (!stats) return null;

  const weaponId = crypto.randomUUID();
  const skillMap: Record<string, string> = {
    "Lâmina": "Kenjutsu",
    "Haste": "Sojutsu",
    "Esmagamento": "Kobujutsu",
    "Força Bruta": "Machado/Maça",
    "Especialista": "Armas Especiais",
    "Arco": "Kyujutsu",
    "Arremesso": "Arremesso"
  };

  const rawDamage = stats.dano || "GdP cr";
  const parts = rawDamage.split("/").map((part: string) => part.trim()).filter(Boolean);
  
  const modes: CharacterWeaponMode[] = parts.map((part: string, index: number) => {
    const isGeb = part.toLowerCase().includes("geb") || part.toLowerCase().includes("swing");
    const isGdp = part.toLowerCase().includes("gdp") || part.toLowerCase().includes("thrust");
    
    let typeLabel = "Principal";
    if (part.includes("cort")) typeLabel = "Corte";
    else if (part.includes("perf")) typeLabel = "Perfuração";
    else if (part.includes("esm")) typeLabel = "Esmagamento";
    else if (part.includes("pi")) typeLabel = "Perfuração (P)";

    const hasDuplicateType = parts.filter((p: string) => {
       if (part.includes("cort") && p.includes("cort")) return true;
       if (part.includes("perf") && p.includes("perf")) return true;
       if (part.includes("esm") && p.includes("esm")) return true;
       return false;
    }).length > 1;

    const label = (parts.length > 1 && hasDuplicateType) 
      ? `${isGeb ? "GeB" : isGdp ? "GdP" : ""} ${typeLabel}`.trim()
      : (parts.length > 1 ? typeLabel : "Principal");

    return createWeaponMode({
      id: `${weaponId}-mode-${index}`,
      label,
      skill: skillMap[stats.tipo] || "Combate",
      rawDamage: part,
      reach: stats.alcance || "1",
      parry: stats.aparar || "0",
      accuracy: stats.precisao ? Number(stats.precisao) : (stats.tipo === "Arco" ? 3 : null)
    });
  });

  return {
    id: weaponId,
    name: stats.name,
    category: stats.tipo || "Arma",
    state: "ready",
    notes: stats.notas,
    modes
  };
}

function createProceduralWeapon(name: string, st: number): CharacterWeaponRecord {
  const weaponId = crypto.randomUUID();
  const isRanged = name.toLowerCase().includes('arco') || name.toLowerCase().includes('fukiya') || name.toLowerCase().includes('shuriken');
  
  const thrust = getThrustDamage(st);
  const swing = getSwingDamage(st);
  
  const thrustStr = `${thrust.dice}d${thrust.adds >= 0 ? '+' : ''}${thrust.adds}`;
  const swingStr = `${swing.dice}d${swing.adds >= 0 ? '+' : ''}${swing.adds}`;

  const modeId = crypto.randomUUID();
  
  return {
    id: weaponId,
    name,
    category: isRanged ? 'ranged' : 'melee',
    state: 'ready',
    rawDamage: isRanged ? `${thrustStr} imp` : `${swingStr} cut`,
    modes: [{
      id: modeId,
      label: "Principal",
      skill: isRanged ? 'Arco' : 'Espada',
      damage: parseDamageSpec(isRanged ? `GdP ${thrust.adds >= 0 ? '+' : ''}${thrust.adds} imp` : `GeB ${swing.adds >= 0 ? '+' : ''}${swing.adds} cut`),
      reach: isRanged ? '-' : '1',
      parry: isRanged ? 'Não' : '0',
      accuracy: isRanged ? 2 : null,
      tags: []
    }]
  };
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
    
    // Tentar encontrar arma no arsenal ou gerar uma procedural correta
    let weaponRecord = await findWeaponInArsenal(input.stats.armas);
    if (!weaponRecord) {
      weaponRecord = createProceduralWeapon(input.stats.armas, input.stats.st);
    }

    const weaponSkill = weaponRecord.modes[0]?.skill;
    const skills = [
      { id: 'combate', name: 'Combate', level: input.stats.dx, notes: 'Perícia automática' }
    ];

    if (weaponSkill && weaponSkill !== 'Combate') {
      skills.push({ 
        id: slugify(weaponSkill), 
        name: weaponSkill, 
        level: input.stats.dx, 
        notes: 'Perícia da arma' 
      });
    }

    // Tentar encontrar armadura no arsenal
    const armorWords = ["gusoku", "haramaki", "do", "kabuto", "kote", "suneate", "mempo", "tatami", "couro", "aco"];
    let detectedDr = { drTop: 0, drMiddle: 0, drBottom: 0 };
    
    const bodyText = (input.stats.notas + " " + input.stats.armas).toLowerCase();
    for (const word of armorWords) {
      if (bodyText.includes(word)) {
        const armorStats = await findEquipmentInArsenal(word, "Armaduras");
        if (armorStats) {
          const dr = parseInt(String(armorStats.rd || "0"), 10);
          const local = (armorStats.local || "corpo").toLowerCase();
          if (local.includes("cabeca") || local.includes("rosto") || local.includes("pescoco")) detectedDr.drTop = Math.max(detectedDr.drTop, dr);
          else if (local.includes("corpo") || local.includes("torso") || local.includes("todos")) detectedDr.drMiddle = Math.max(detectedDr.drMiddle, dr);
          else detectedDr.drBottom = Math.max(detectedDr.drBottom, dr);
        }
      }
    }

    // Heurística simples caso não encontre no Codex
    if (detectedDr.drMiddle === 0) {
      if (bodyText.includes("pesada") || bodyText.includes("gusoku")) detectedDr = { drTop: 4, drMiddle: 5, drBottom: 3 };
      else if (bodyText.includes("media") || bodyText.includes("haramaki")) detectedDr = { drTop: 2, drMiddle: 3, drBottom: 2 };
      else if (bodyText.includes("leve") || bodyText.includes("couro")) detectedDr = { drTop: 1, drMiddle: 2, drBottom: 1 };
    }

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
      raw: {
        ...detectedDr,
        speedBonus: 0,
        moveBonus: 0,
        dodgeBonus: 0,
        hpBonus: 0
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
      skills,
      techniques: [],
      weapons: [weaponRecord],
      armor: [],
      notes: [input.stats.armas, input.stats.notas],
      conditions: [],
      combat: {
        currentHp: input.stats.hpMax,
        currentFp: input.stats.pfMax,
        activeWeaponId: weaponRecord.id,
        activeWeaponModeId: weaponRecord.modes[0]?.id ?? null,
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
    
    // Modelos de Atributos baseados na especialidade
    const spec = input.npc.especialidade.toLowerCase();
    let attrs = { st: 10, dx: 10, iq: 10, ht: 10 };
    
    if (spec.includes('espadachim') || spec.includes('ronin') || spec.includes('shinobi')) {
      attrs = { st: 11, dx: 12, iq: 10, ht: 11 };
    } else if (spec.includes('monge') || spec.includes('onmyoji')) {
      attrs = { st: 9, dx: 10, iq: 13, ht: 10 };
    } else if (spec.includes('daimyo') || spec.includes('cortesã')) {
      attrs = { st: 10, dx: 10, iq: 12, ht: 10 };
    } else if (spec.includes('ferreiro') || spec.includes('sumô')) {
      attrs = { st: 13, dx: 10, iq: 10, ht: 12 };
    }

    const sheetProfile: SessionCharacterSheetProfile = {
      version: 1,
      summary: `${input.npc.especialidade} | ${input.npc.traco}`,
      attributes: { 
        ...attrs, 
        hpMax: attrs.st, 
        fpMax: attrs.ht, 
        will: attrs.iq, 
        per: attrs.iq 
      },
      derived: { 
        basicSpeed: (attrs.dx + attrs.ht) / 4, 
        move: Math.floor((attrs.dx + attrs.ht) / 4), 
        encumbranceLevel: 0 
      },
      defenses: { 
        dodge: Math.floor((attrs.dx + attrs.ht) / 4) + 3, 
        parry: Math.floor(attrs.dx / 2) + 3, 
        block: 0 
      },
      style: { name: input.npc.especialidade },
      skills: [
        { id: 'pericia-especialista', name: input.npc.especialidade, level: attrs.dx > attrs.iq ? attrs.dx + 2 : attrs.iq + 2 }
      ],
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
        currentHp: attrs.st,
        currentFp: attrs.ht,
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
      tier: "medium", // Mudado para medium para ter mais utilidade
      ownerParticipantId: null,
      assetId: null,
      hpMax: attrs.st,
      fpMax: attrs.ht,
      initiative: Math.round((attrs.dx + attrs.ht) / 4 * 100),
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
