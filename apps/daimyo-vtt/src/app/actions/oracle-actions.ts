"use server";

import { requireSessionViewer } from "@/lib/session/access";
import { createSessionMessage } from "@/lib/chat/repository";
import { createSessionCharacter } from "@/lib/characters/repository";
import { getInfraReadiness } from "@/lib/env";
import type { EnemyStats, NpcProfile, ThreatLevel } from "@/types/oracle";
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
  const isUnarmed = name.toLowerCase().includes('mãos nuas') || name.toLowerCase().includes('maos nuas');
  
  const thrust = getThrustDamage(st);
  const swing = getSwingDamage(st);
  
  const thrustStr = `${thrust.dice}d${thrust.adds >= 0 ? '+' : ''}${thrust.adds}`;
  const swingStr = `${swing.dice}d${swing.adds >= 0 ? '+' : ''}${swing.adds}`;

  const modeId = crypto.randomUUID();
  
  if (isUnarmed) {
    return {
      id: "fists",
      name: "Mãos nuas",
      category: 'Natural',
      state: 'ready',
      rawDamage: "GdP-1 cr",
      modes: [
        {
          id: "punch",
          label: "Soco",
          skill: 'Briga',
          damage: parseDamageSpec("GdP-1 cr"),
          reach: 'C',
          parry: '0',
          tags: ["unarmed"]
        },
        {
          id: "kick",
          label: "Chute",
          skill: 'Briga',
          damage: parseDamageSpec("GdP cr"),
          reach: 'C,1',
          parry: 'Não',
          tags: ["unarmed"]
        }
      ]
    };
  }

  return {
    id: weaponId,
    name,
    category: isRanged ? 'ranged' : 'melee',
    state: 'ready',
    rawDamage: isRanged ? `${thrustStr} imp` : `${swingStr} cut`,
    modes: [{
      id: modeId,
      label: "Principal",
      skill: isRanged ? 'Kyujutsu' : 'Kenjutsu',
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

    // Normalização de Armaduras
    const armorRecords: any[] = [];
    const armorWords = ["gusoku", "haramaki", "do", "kabuto", "kote", "suneate", "mempo", "tatami", "manchira", "hachigane", "kesa", "kyahan", "zukin", "couro", "aco", "bambu"];
    const bodyText = (input.stats.notas + " " + input.stats.armas).toLowerCase();
    
    for (const word of armorWords) {
      if (bodyText.includes(word)) {
        const armorStats = await findEquipmentInArsenal(word, "Armaduras");
        if (armorStats) {
          const rd = parseInt(String(armorStats.rd || "0"), 10);
          const local = (armorStats.local || "corpo").toLowerCase();
          let zones: any = ["torso"];
          
          if (local.includes("tudo") || local.includes("corpo inteiro")) {
            zones = "all";
          } else if (local.includes("cabeça") || local.includes("elmo")) {
            zones = ["skull", "face"];
          } else if (local.includes("crânio")) {
            zones = ["skull"];
          } else if (local.includes("rosto") || local.includes("máscara")) {
            zones = ["face"];
          } else if (local.includes("pescoço")) {
            zones = ["neck"];
          } else if (local.includes("braços")) {
            zones = ["arm"];
          } else if (local.includes("mãos") || local.includes("manoplas")) {
            zones = ["hand"];
          } else if (local.includes("pernas") || local.includes("coxotes")) {
            zones = ["leg"];
          } else if (local.includes("pés")) {
            zones = ["foot"];
          } else if (local.includes("tronco") || local.includes("peito") || local.includes("corpo")) {
            zones = ["torso", "vitals"];
          }

          if (local.includes("+")) {
             const extra: string[] = [];
             if (local.includes("braços")) extra.push("arm");
             if (local.includes("pernas")) extra.push("leg");
             if (local.includes("mãos")) extra.push("hand");
             if (zones !== "all") {
               zones = Array.from(new Set([...zones, ...extra]));
             }
          }

          armorRecords.push({
            id: crypto.randomUUID(),
            name: armorStats.name,
            dr: rd,
            zone: zones,
            notes: "Gerado via Oráculo"
          });
        }
      }
    }

    // Heurística de Fallback se não encontrar nada no Codex
    if (armorRecords.length === 0) {
      if (bodyText.includes("pesada") || bodyText.includes("gusoku")) {
        armorRecords.push({ id: crypto.randomUUID(), name: "Armadura Pesada", dr: 5, zone: "all" });
      } else if (bodyText.includes("media") || bodyText.includes("haramaki")) {
        armorRecords.push({ id: crypto.randomUUID(), name: "Armadura Média", dr: 3, zone: ["torso", "vitals", "arm", "leg"] });
      } else if (bodyText.includes("leve") || bodyText.includes("couro")) {
        armorRecords.push({ id: crypto.randomUUID(), name: "Armadura Leve", dr: 2, zone: ["torso", "arm"] });
      }
    }

    // RD Legada para compatibilidade (será calculada pela engine, mas mantemos o campo preenchido)
    const legacyDr = { drTop: 0, drMiddle: 0, drBottom: 0 };
    armorRecords.forEach(a => {
       const z = Array.isArray(a.zone) ? a.zone : [a.zone];
       if (z.some((loc: string) => ["skull", "face", "neck"].includes(loc))) legacyDr.drTop = Math.max(legacyDr.drTop, a.dr);
       if (z.some((loc: string) => ["torso", "vitals"].includes(loc))) legacyDr.drMiddle = Math.max(legacyDr.drMiddle, a.dr);
       if (z.some((loc: string) => ["arm", "leg", "hand", "foot"].includes(loc)) || a.zone === "all") legacyDr.drBottom = Math.max(legacyDr.drBottom, a.dr);
    });

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
        ...legacyDr,
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
      armor: armorRecords,
      notes: [input.stats.armas, input.stats.notas],
      conditions: [],
      combat: {
        currentHp: input.stats.hpMax,
        currentFp: input.stats.pfMax,
        activeWeaponId: weaponRecord.id,
        activeWeaponModeId: weaponRecord.modes[0]?.id ?? null,
        loadoutTechniqueIds: input.stats.loadoutTechniqueIds || [],
        posture: "standing",
        shock: 0,
        fatigue: 0,
        pain: 0,
        bleeding: 0,
        evaluateBonus: 0,
        loadoutStyleTechniqueIds: [],
        pendingTechniqueSwapId: null,
        lastTechniqueSwapRound: null,
        pendingSwap: null
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
    
    // Modelos de Atributos baseados na especialidade e Rank Realista
    const spec = input.npc.especialidade.toLowerCase();
    
    let threat: ThreatLevel = "civil";
    if (spec.includes('espadachim') || spec.includes('ronin') || spec.includes('shinobi') || spec.includes('caçador')) {
      threat = "veterano";
    } else if (spec.includes('daimyo') || spec.includes('onmyoji')) {
      threat = "elite";
    } else if (spec.includes('mestre') || spec.includes('menkyo')) {
      threat = "mestre";
    } else if (spec.includes('guarda') || spec.includes('mensageiro')) {
      threat = "capanga";
    } else if (spec.includes('camponês') || spec.includes('artesão') || spec.includes('pescador') || spec.includes('servo')) {
      threat = "civil";
    }

    const config = THREAT_CONFIG[threat];
    const attrs = {
      st: rand(config.st[0], config.st[1]),
      dx: rand(config.dx[0], config.dx[1]),
      iq: rand(config.iq[0], config.iq[1]),
      ht: rand(config.ht[0], config.ht[1])
    };

    const hpMax = attrs.st + config.hpMod;
    
    // Perícias baseadas no Rank (NH relativo ao Atributo)
    let nhMod = 0;
    if (threat === "veterano") nhMod = 1;
    if (threat === "elite") nhMod = 2;
    if (threat === "mestre") nhMod = 4;

    const sheetProfile: SessionCharacterSheetProfile = {
      version: 1,
      summary: `${input.npc.especialidade} | ${input.npc.traco}`,
      attributes: { 
        ...attrs, 
        hpMax, 
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
        parry: Math.floor((attrs.dx + nhMod) / 2) + 3, 
        block: 0 
      },
      style: { name: input.npc.especialidade },
      skills: [
        { id: 'pericia-especialista', name: input.npc.especialidade, level: Math.max(attrs.dx, attrs.iq) + nhMod }
      ],
      techniques: [],
      weapons: [],
      armor: [],
      notes: [
        `Clã: ${input.npc.cla}`,
        `Especialidade: ${input.npc.especialidade}`,
        `Traço: ${input.npc.traco}`,
        `Segredo: ${input.npc.segredo}`,
        `Nível de Ameaça: ${threat.toUpperCase()}`,
        `Est. Pontos: ${100 + ((attrs.st - 10) * 10) + ((attrs.dx - 10) * 20) + ((attrs.iq - 10) * 20) + ((attrs.ht - 10) * 10) + (config.hpMod * 2) + (nhMod * 4)}`
      ],
      conditions: [],
      combat: {
        currentHp: hpMax,
        currentFp: attrs.ht,
        activeWeaponId: null,
        activeWeaponModeId: null,
        loadoutTechniqueIds: ["elite", "mestre"].includes(threat) 
          ? ["m2-contest", "m3-iai"] 
          : ["veterano", "capanga"].includes(threat) 
            ? ["m2-contest"] 
            : [],
        posture: "standing",
        shock: 0,
        fatigue: 0,
        pain: 0,
        bleeding: 0,
        evaluateBonus: 0,
        loadoutStyleTechniqueIds: [],
        pendingSwap: null,
        pendingTechniqueSwapId: null,
        lastTechniqueSwapRound: null
      }
    };

    // Adicionar equipamentos básicos baseados no Rank e Especialidade
    const isCombatant = ["veterano", "elite", "mestre", "capanga"].includes(threat);
    if (isCombatant || Math.random() > 0.7) {
      const weaponName = spec.includes('espadachim') || spec.includes('ronin') || spec.includes('mestre') ? "Katana" : 
                        spec.includes('caçador') ? "Arco" : "Faca";
      sheetProfile.weapons.push(createProceduralWeapon(weaponName, attrs.st));
    }

    if (threat === "elite" || threat === "mestre" || (threat === "veterano" && Math.random() > 0.5)) {
      sheetProfile.armor.push({
        id: crypto.randomUUID(),
        name: threat === "mestre" || threat === "elite" ? "Tosei-Gusoku" : "Colete de Couro",
        dr: threat === "mestre" ? 5 : (threat === "elite" ? 4 : 2),
        zone: threat === "mestre" || threat === "elite" ? "all" : ["torso"],
        weight: threat === "mestre" ? "12" : "5"
      });
    }

    // Calcular carga inicial
    const weaponWeight = sheetProfile.weapons.reduce((sum, w) => sum + parseFloat(String(w.weight || "0")), 0);
    const armorWeight = sheetProfile.armor.reduce((sum, a) => sum + parseFloat(String(a.weight || "0")), 0);
    const totalSlots = Math.ceil(weaponWeight + armorWeight);
    const maxSlots = sheetProfile.attributes.st;
    
    let encLevel = 0;
    let moveMult = 1.0;
    if (totalSlots > maxSlots * 6) { encLevel = 4; moveMult = 0.2; }
    else if (totalSlots > maxSlots * 3) { encLevel = 3; moveMult = 0.4; }
    else if (totalSlots > maxSlots * 2) { encLevel = 2; moveMult = 0.6; }
    else if (totalSlots > maxSlots) { encLevel = 1; moveMult = 0.8; }

    sheetProfile.derived.encumbranceLevel = encLevel;
    sheetProfile.derived.move = Math.max(1, Math.floor(sheetProfile.derived.basicSpeed * moveMult));
    sheetProfile.defenses.dodge = Math.max(3, Math.floor(sheetProfile.derived.basicSpeed) + 3 - encLevel);
    
    if (sheetProfile.weapons.length > 0) {
      sheetProfile.combat.activeWeaponId = sheetProfile.weapons[0].id;
      sheetProfile.combat.activeWeaponModeId = sheetProfile.weapons[0].modes[0].id;
    }

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

const THREAT_CONFIG: Record<ThreatLevel, { st: number[]; dx: number[]; iq: number[]; ht: number[]; hpMod: number }> = {
  civil:       { st: [10, 10], dx: [10, 10], iq: [10, 10], ht: [10, 10], hpMod: 0 },
  recruta:     { st: [10, 11], dx: [11, 11], iq: [10, 10], ht: [10, 11], hpMod: 1 },
  capanga:     { st: [11, 11], dx: [11, 12], iq: [10, 10], ht: [11, 11], hpMod: 2 },
  veterano:    { st: [11, 12], dx: [12, 13], iq: [11, 11], ht: [12, 12], hpMod: 3 },
  elite:       { st: [12, 13], dx: [13, 14], iq: [12, 12], ht: [12, 13], hpMod: 4 },
  excepcional: { st: [13, 14], dx: [14, 15], iq: [12, 13], ht: [13, 14], hpMod: 5 },
  mestre:      { st: [14, 15], dx: [15, 16], iq: [13, 15], ht: [13, 15], hpMod: 6 }
};

const WEAPON_TAGS: Record<string, string[]> = {
  civil: ["Faca", "Cajado", "Foice", "Pedras"],
  recruta: ["Yari", "Tantō", "Arco", "Naginata", "Bo"],
  capanga: ["Katana", "Yari", "Kusarigama", "Naginata", "Kanabō"],
  veterano: ["Katana", "Wakizashi", "Yumi", "Naginata", "Nodachi"],
  elite: ["Katana", "Ōdachi", "Nagamaki", "Sai"],
  excepcional: ["Katana", "Daisho", "Tessen"],
  mestre: ["Katana"]
};

const ARMOR_TAGS: Record<string, string[]> = {
  civil: ["Roupas"],
  recruta: ["Kamiko", "Traje de Ninja"],
  capanga: ["Kamiko", "Do de Couro", "Jingasa"],
  veterano: ["Tatami", "Do", "Kabuto"],
  elite: ["O-Yoroi", "Tosei-Gusoku"],
  excepcional: ["O-Yoroi"],
  mestre: ["Tosei-Gusoku", "Karamono"]
};

const ESTILOS = [
  'Agressivo — ataca sem hesitar.',
  'Defensivo — espera erros do oponente.',
  'Tático — usa o terreno a seu favor.',
  'Selvagem — luta sem técnica mas com fúria.',
  'Calculista — analisa antes de cada golpe.',
  'Desesperado — luta como se não tivesse nada a perder.',
  'Silencioso — prioriza ataques furtivos.',
  'Honrado — segue o código Bushido à risca.',
  'Traiçoeiro — usa truques sujos e venenos.',
  'Protetor — defende aliados a qualquer custo.'
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function parseWeightToKg(weightStr: string | null | undefined): number {
  if (!weightStr || weightStr === "-") return 0;
  const match = weightStr.match(/([\d.,]+)\s*kg/);
  if (match) {
    return parseFloat(match[1].replace(",", "."));
  }
  return 0;
}

function calculateSlotLevel(totalWeight: number, st: number): { level: number; name: string; penalty: { move: number; dodge: number } } {
  const ratio = totalWeight / st;
  if (ratio <= 1) return { level: 0, name: "Nenhuma", penalty: { move: 0, dodge: 0 } };
  if (ratio <= 2) return { level: 1, name: "Leve", penalty: { move: -1, dodge: -1 } };
  if (ratio <= 3) return { level: 2, name: "Média", penalty: { move: -2, dodge: -2 } };
  if (ratio <= 6) return { level: 3, name: "Pesada", penalty: { move: -3, dodge: -3 } };
  return { level: 4, name: "Muito Pesada", penalty: { move: -4, dodge: -4 } };
}

export async function generateEnemyWithArsenal(threat: ThreatLevel): Promise<EnemyStats> {
  const catalog = await loadBaseCatalog();
  const config = THREAT_CONFIG[threat];
  
  let st = rand(config.st[0], config.st[1]);
  let dx = rand(config.dx[0], config.dx[1]);
  let iq = rand(config.iq[0], config.iq[1]);
  let ht = rand(config.ht[0], config.ht[1]);

  if (st >= 13 && dx >= 13) {
    if (Math.random() > 0.4) iq = rand(8, 10); 
    if (Math.random() > 0.6) ht = Math.max(10, ht - 1);
  } else if (iq >= 13) {
    if (Math.random() > 0.5) st = rand(8, 10);
  } else if (st >= 15) {
    if (Math.random() > 0.5) dx = rand(9, 11);
  }

  const hp = st + config.hpMod;
  const name = `NPC ${threat}`;
  const initBase = (dx + ht) / 4;
  const esquivaBase = Math.floor(initBase) + 3;
  
  let skillBase = dx;
  if (threat === "veterano") skillBase += 1;
  if (threat === "elite") skillBase += 2;
  if (threat === "mestre") skillBase += 4;
  
  const aparar = Math.floor(skillBase / 2) + 3;
  const hasShield = Math.random() > 0.8 || threat === "elite" || threat === "mestre";
  const bloqueio = hasShield ? Math.floor(skillBase / 2) + 3 : 0;

  const weaponTags = WEAPON_TAGS[threat] || WEAPON_TAGS.capanga;
  const armorTags = ARMOR_TAGS[threat] || ARMOR_TAGS.capanga;

  const weapons = catalog.equipmentEntries.filter(e => 
    e.category === "Armas" && weaponTags.some(tag => 
      e.name.toLowerCase().includes(tag.toLowerCase()) ||
      (e.tags || []).some(t => t.toLowerCase().includes(tag.toLowerCase()))
    )
  );
  
  const armors = catalog.equipmentEntries.filter(a =>
    a.category === "Armaduras" && armorTags.some(tag =>
      a.name.toLowerCase().includes(tag.toLowerCase()) ||
      (a.tags || []).some(t => t.toLowerCase().includes(tag.toLowerCase()))
    )
  );

  // Probabilidades de Equipamento (Realismo)
  const isCivil = threat === "civil";
  const isCapangaPlus = !isCivil && threat !== "recruta";
  
  // Capanga para frente OBRIGATORIAMENTE tem arma
  let selectedWeapon = null;
  if (isCapangaPlus || (threat === "recruta" && Math.random() > 0.3) || (isCivil && Math.random() > 0.7)) {
    selectedWeapon = weapons.length > 0 ? weapons[Math.floor(Math.random() * weapons.length)] : null;
  }

  // Probabilidade de Armadura cresce com o Rank
  let armorProb = 0.1; // Civil
  if (threat === "recruta") armorProb = 0.3;
  if (threat === "capanga") armorProb = 0.6;
  if (threat === "veterano") armorProb = 0.8;
  if (threat === "elite" || threat === "excepcional" || threat === "mestre") armorProb = 1.0;

  let selectedArmor = null;
  if (Math.random() <= armorProb) {
    selectedArmor = armors.length > 0 ? armors[Math.floor(Math.random() * armors.length)] : null;
  }

  const weaponWeight = selectedWeapon ? parseWeightToKg(selectedWeapon.stats?.peso as string) : 0;
  const armorWeight = selectedArmor ? parseWeightToKg(selectedArmor.stats?.peso as string) : 0;
  const totalWeight = weaponWeight + armorWeight;
  
  const slotInfo = calculateSlotLevel(totalWeight, st);
  
  const weaponName = selectedWeapon?.name || "Mãos nuas";
  const armorName = selectedArmor?.name || "Sem armadura";
  const rd = selectedArmor?.stats?.rd as string || "0";

  const estilo = ESTILOS[Math.floor(Math.random() * ESTILOS.length)];
  
  // Cálculo de Custo de Pontos (GURPS)
  const attrCost = ((st - 10) * 10) + ((dx - 10) * 20) + ((iq - 10) * 20) + ((ht - 10) * 10);
  const hpCost = config.hpMod * 2;
  const adsDisads = threat === "civil" ? 0 : (threat === "recruta" ? 15 : (threat === "capanga" ? 25 : 40));
  const estimatedPoints = 75 + attrCost + hpCost + (skillBase > dx ? (skillBase - dx) * 4 : 0) + adsDisads;

  let weaponNote = selectedWeapon?.name || "Mãos nuas";
  if (selectedWeapon && (threat === "mestre" || threat === "excepcional")) weaponNote += " (Muito Fina +2)";
  else if (selectedWeapon && (threat === "elite" || threat === "veterano")) weaponNote += " (Fina +1)";

  let notas = `${estilo}`;
  if (selectedWeapon) notas += ` | Arma: ${weaponNote}`;
  if (selectedArmor) notas += ` | Armadura: ${selectedArmor.name} (RD ${rd})`;
  if (slotInfo.level > 0) notas += ` | Carga ${slotInfo.name}: Move${slotInfo.penalty.move}, Esquiva${slotInfo.penalty.dodge}`;
  if (hasShield) notas += ' [Escudo]';
  notas += ` | Est. Pontos: ${estimatedPoints}`;

  return {
    name: `${name} (${threat.toUpperCase()})`,
    st, dx, iq, ht,
    vont: iq + (Math.random() > 0.8 ? 1 : 0),
    hp,
    hpMax: hp,
    pf: ht,
    pfMax: ht,
    iniciativa: initBase,
    velocidade: initBase,
    esquiva: Math.max(1, esquivaBase + slotInfo.penalty.dodge),
    aparar,
    bloqueio,
    armas: weaponName,
    armor: armorName,
    rd: rd,
    carga: slotInfo.name,
    cargaLevel: slotInfo.level,
    pesoTotal: totalWeight.toFixed(1) + " kg",
    notas,
    isNPC: true
  };
}
