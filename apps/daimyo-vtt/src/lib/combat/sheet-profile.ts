import type { CharacterTemplate } from "@/lib/content-bridge/contract";
import type {
  CharacterArmorRecord,
  CharacterDamageSpec,
  CharacterDefenseProfile,
  CharacterDerivedProfile,
  CharacterSkillRecord,
  CharacterTechniqueRecord,
  CharacterWeaponMode,
  CharacterWeaponRecord,
  CombatDamageType,
  SessionCharacterSheetProfile
} from "@/types/combat";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : typeof value === "string" && value.trim() && Number.isFinite(Number(value))
      ? Number(value)
      : fallback;
}

function extractNumber(value: string, fallback = 0) {
  const match = value.match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(",", ".")) : fallback;
}

function asObject(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseDamageType(raw: string): CombatDamageType {
  const normalized = raw.trim().toLowerCase();

  if (normalized.includes("pi++")) {
    return "pi++";
  }

  if (normalized.includes("pi+")) {
    return "pi+";
  }

  if (normalized.includes("pi-")) {
    return "pi-";
  }

  if (normalized.includes("pi")) {
    return "pi";
  }

  if (normalized.includes("imp") || normalized.includes("perf")) {
    return "imp";
  }

  if (normalized.includes("cut") || normalized.includes("cort")) {
    return "cut";
  }

  if (normalized.includes("burn") || normalized.includes("queim")) {
    return "burn";
  }

  if (normalized.includes("tox")) {
    return "tox";
  }

  return "cr";
}

function parseDamageSpec(raw: string): CharacterDamageSpec {
  const normalized = raw.trim();
  const lower = normalized.toLowerCase();
  const flatMatch = lower.match(/(\d+)d([+-]\d+)?/);

  if (flatMatch) {
    return {
      base: "flat",
      dice: Number(flatMatch[1]),
      adds: flatMatch[2] ? Number(flatMatch[2]) : 0,
      damageType: parseDamageType(lower),
      raw: normalized
    };
  }

  return {
    base: lower.includes("gdp") || lower.includes("thrust") ? "thrust" : "swing",
    dice: 0,
    adds: extractNumber(lower, 0),
    damageType: parseDamageType(lower),
    raw: normalized
  };
}

function createWeaponMode(input: {
  id: string;
  label: string;
  skill?: string;
  rawDamage: string;
  reach?: string;
  parry?: string;
  accuracy?: number | null;
  halfDamageRange?: number | null;
  maxRange?: number | null;
  recoil?: number | null;
  notes?: string;
  tags?: string[];
}): CharacterWeaponMode {
  return {
    id: input.id,
    label: input.label,
    skill: input.skill ?? "Combate",
    damage: parseDamageSpec(input.rawDamage),
    reach: input.reach ?? "1",
    parry: input.parry ?? "0",
    minStrength: null,
    accuracy: input.accuracy ?? null,
    halfDamageRange: input.halfDamageRange ?? null,
    maxRange: input.maxRange ?? null,
    recoil: input.recoil ?? null,
    tags: input.tags ?? [],
    notes: input.notes
  };
}

function createFallbackTechniques(style: string, skill: string) {
  return [
    {
      id: `${slugify(style)}-finta`,
      name: "Finta",
      style,
      skill,
      level: 12,
      defaultModifier: 0,
      tags: ["contest", "fallback"],
      notes: "Tecnica generica de abertura."
    },
    {
      id: `${slugify(style)}-ataque-direcionado`,
      name: "Ataque Direcionado",
      style,
      skill,
      level: 11,
      defaultModifier: -2,
      tags: ["attack", "fallback"],
      notes: "Tecnica generica de ataque direcionado."
    },
    {
      id: `${slugify(style)}-contra-ataque`,
      name: "Contra-Ataque",
      style,
      skill,
      level: 10,
      defaultModifier: -2,
      tags: ["attack", "defense", "fallback"],
      notes: "Tecnica generica para responder apos defesa."
    }
  ] satisfies CharacterTechniqueRecord[];
}

export function computeBasicSpeed(dx: number, ht: number) {
  return Number((((dx + ht) / 4) || 5).toFixed(2));
}

export function computeMove(basicSpeed: number, encumbranceLevel = 0) {
  const baseMove = Math.floor(basicSpeed);
  const factor = [1, 0.8, 0.6, 0.4, 0.2][clamp(encumbranceLevel, 0, 4)] ?? 1;
  return Math.max(1, Math.floor(baseMove * factor));
}

export function computeDodge(basicSpeed: number, encumbranceLevel = 0) {
  const base = Math.floor(basicSpeed) + 3;
  return Math.max(3, base - clamp(encumbranceLevel, 0, 4));
}

export function computeInitiativeScore(profile: SessionCharacterSheetProfile) {
  return clamp(Math.round(profile.derived.basicSpeed * 100), -99, 999);
}

function normalizeDefenseBlock(
  raw: Partial<CharacterDefenseProfile> | undefined,
  derived: CharacterDerivedProfile,
  fallbackSkill = 10
): CharacterDefenseProfile {
  return {
    dodge: toNumber(raw?.dodge, computeDodge(derived.basicSpeed, derived.encumbranceLevel)),
    parry: toNumber(raw?.parry, Math.floor(fallbackSkill / 2) + 3),
    block: toNumber(raw?.block, 0)
  };
}

function normalizeSkills(rawSkills: unknown): CharacterSkillRecord[] {
  if (!Array.isArray(rawSkills)) {
    return [];
  }

  return rawSkills
    .map((entry, index) => {
      if (!entry) {
        return null;
      }

      if (typeof entry === "object") {
        const candidate = entry as Partial<CharacterSkillRecord>;

        if (!candidate.name) {
          return null;
        }

        return {
          id: candidate.id ?? `${slugify(candidate.name)}-${index}`,
          name: candidate.name,
          specialization: candidate.specialization ?? null,
          relativeLevel: candidate.relativeLevel ?? null,
          governingAttribute: candidate.governingAttribute ?? null,
          difficulty: candidate.difficulty ?? null,
          level: toNumber(candidate.level, 10),
          notes: candidate.notes
        } satisfies CharacterSkillRecord;
      }

      const text = String(entry).trim();
      const match = text.match(/^(.+?)(?:\((.+?)\))?(?:\s*-\s*NH:\s*(-?\d+))?/i);

      if (!match?.[1]) {
        return null;
      }

      return {
        id: `${slugify(match[1])}-${index}`,
        name: match[1].trim(),
        level: toNumber(match[3], 10),
        notes: text
      } satisfies CharacterSkillRecord;
    })
    .filter(Boolean) as CharacterSkillRecord[];
}

function normalizeTechniques(
  rawTechniques: unknown,
  styleName: string,
  fallbackSkill: string
): CharacterTechniqueRecord[] {
  if (!Array.isArray(rawTechniques)) {
    return [];
  }

  return rawTechniques
    .map((entry, index) => {
      if (!entry) {
        return null;
      }

      if (typeof entry === "object") {
        const candidate = entry as Partial<CharacterTechniqueRecord>;

        if (!candidate.name) {
          return null;
        }

        return {
          id: candidate.id ?? `${slugify(candidate.name)}-${index}`,
          name: candidate.name,
          style: candidate.style ?? styleName,
          skill: candidate.skill ?? fallbackSkill,
          level: toNumber(candidate.level, 10),
          defaultModifier: candidate.defaultModifier ?? 0,
          tags: candidate.tags ?? [],
          notes: candidate.notes
        } satisfies CharacterTechniqueRecord;
      }

      const text = String(entry).trim();
      const match = text.match(/^(.+?)(?:\s*\(T.+?\/(.+?)\))?(?:\s*-\s*NH:\s*(-?\d+))?/i);

      if (!match?.[1]) {
        return null;
      }

      return {
        id: `${slugify(match[1])}-${index}`,
        name: match[1].trim(),
        style: match[2]?.trim() ?? styleName,
        skill: fallbackSkill,
        level: toNumber(match[3], 10),
        defaultModifier: 0,
        tags: [],
        notes: text
      } satisfies CharacterTechniqueRecord;
    })
    .filter(Boolean) as CharacterTechniqueRecord[];
}

function normalizeWeapons(rawWeapons: unknown): CharacterWeaponRecord[] {
  if (!Array.isArray(rawWeapons)) {
    return [];
  }

  return rawWeapons
    .map((entry, index) => {
      const candidate = asObject(entry) as Partial<CharacterWeaponRecord> | null;
      const name = candidate?.name;

      if (!candidate || !name) {
        return null;
      }

      const modes = Array.isArray(candidate.modes)
        ? candidate.modes.map((mode, modeIndex) => ({
            ...mode,
            id: mode.id ?? `${candidate.id ?? slugify(name)}-mode-${modeIndex}`
          }))
        : [];

      return {
        id: candidate.id ?? `${slugify(name)}-${index}`,
        name,
        category: candidate.category ?? "Arma",
        state: candidate.state ?? "ready",
        quality: candidate.quality ?? null,
        rawDamage: candidate.rawDamage ?? null,
        notes: candidate.notes,
        modes
      } satisfies CharacterWeaponRecord;
    })
    .filter(Boolean) as CharacterWeaponRecord[];
}

function normalizeArmor(rawArmor: unknown): CharacterArmorRecord[] {
  if (!Array.isArray(rawArmor)) {
    return [];
  }

  return rawArmor
    .map((entry, index) => {
      const candidate = asObject(entry) as Partial<CharacterArmorRecord> | null;
      const name = candidate?.name;

      if (!candidate || !name) {
        return null;
      }

      return {
        id: candidate.id ?? `${slugify(name)}-${index}`,
        name,
        zone: candidate.zone ?? "all",
        dr: toNumber(candidate.dr, 0),
        notes: candidate.notes
      } satisfies CharacterArmorRecord;
    })
    .filter(Boolean) as CharacterArmorRecord[];
}

function parseStyleName(template: CharacterTemplate) {
  const stats = template.stats as Record<string, unknown>;
  const advantages = Array.isArray(stats.advantages) ? stats.advantages : [];
  const skills = Array.isArray(stats.skills) ? stats.skills : [];
  const advantageStyle = advantages.find(
    (entry) => typeof entry === "string" && entry.includes("Estilo de Luta:")
  );

  if (typeof advantageStyle === "string") {
    return advantageStyle.split(":")[1]?.split("[")[0]?.trim() || "Combate Geral";
  }

  const skillStyle = skills.find(
    (entry) => typeof entry === "string" && /\(T.+?\/.+?\)/i.test(entry)
  );

  if (typeof skillStyle === "string") {
    const match = skillStyle.match(/\(T.+?\/(.+?)\)/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "Combate Geral";
}

function buildWeaponsFromEquipmentString(
  equipment: string,
  fallbackSkill: string
): CharacterWeaponRecord[] {
  const weapons: CharacterWeaponRecord[] = [];
  const lines = equipment.split("|").map((entry) => entry.trim());
  const weaponSegments = equipment
    .split(/Arma Principal:|Arma Secund[Ã¡a]ria:/i)
    .map((entry) => entry.trim())
    .filter(Boolean);

  weaponSegments.forEach((segment, index) => {
    const nameMatch = segment.match(/^(.+?)(?:\||$)/);
    const damageMatch = segment.match(/Dano:\s*(.+?)(?:\||$)/i);
    const reachMatch = segment.match(/Alcance:\s*(.+?)(?:\||$)/i);
    const parryMatch = segment.match(/Aparar:\s*(.+?)(?:\||$)/i);
    const accuracyMatch = segment.match(/Precis[Ã£a]o:\s*(\d+)/i);
    const name = nameMatch?.[1]?.trim();
    const damage = damageMatch?.[1]?.trim();

    if (!name || !damage) {
      return;
    }

    const parts = damage.split("/").map((part) => part.trim()).filter(Boolean);
    const modes = parts.map((part, modeIndex) =>
      createWeaponMode({
        id: `${slugify(name)}-mode-${modeIndex}`,
        label: parts.length > 1 ? `Modo ${modeIndex + 1}` : "Principal",
        skill: fallbackSkill,
        rawDamage: part,
        reach: reachMatch?.[1]?.trim() ?? "1",
        parry: parryMatch?.[1]?.trim() ?? "0",
        accuracy: accuracyMatch?.[1] ? Number(accuracyMatch[1]) : null,
        tags: []
      })
    );

    weapons.push({
      id: `${slugify(name)}-${index}`,
      name,
      category: "Arma",
      state: "ready",
      quality: null,
      rawDamage: damage,
      notes: segment,
      modes
    });
  });

  if (weapons.length > 0) {
    return weapons;
  }

  const rawDamage = lines.find((line) => /Dano:/i.test(line));

  if (!rawDamage) {
    return [];
  }

  return [
    {
      id: "arma-principal",
      name: "Arma Principal",
      category: "Arma",
      state: "ready",
      quality: null,
      rawDamage,
      notes: equipment,
      modes: [
        createWeaponMode({
          id: "arma-principal-modo",
          label: "Principal",
          skill: fallbackSkill,
          rawDamage,
          tags: []
        })
      ]
    }
  ];
}

function buildArmorFromEquipmentString(equipment: string): CharacterArmorRecord[] {
  const armorMatch = equipment.match(/Armadura:\s*(.+?)(?:\||$)/i);
  const drMatch = equipment.match(/RD:\s*(.+?)(?:\||$)/i);

  if (!armorMatch?.[1] && !drMatch?.[1]) {
    return [];
  }

  return [
    {
      id: "armadura-principal",
      name: armorMatch?.[1]?.trim() ?? "Armadura",
      zone: "all",
      dr: extractNumber(drMatch?.[1] ?? "0", 0),
      notes: equipment
    }
  ];
}

function ensureTechniqueLoadout(profile: SessionCharacterSheetProfile) {
  const primarySkill = profile.skills[0]?.name ?? "Combate";
  const techniques =
    profile.techniques.length > 0
      ? [...profile.techniques]
      : createFallbackTechniques(profile.style.name, primarySkill);
  const knownTechniqueIds = new Set(techniques.map((item) => item.id));
  const loadout = [...profile.combat.loadoutTechniqueIds].filter((id) => knownTechniqueIds.has(id));

  if (loadout.length >= 3) {
    return { techniques, loadout: loadout.slice(0, 3) };
  }

  const fallback = createFallbackTechniques(profile.style.name, primarySkill).filter(
    (technique) => !knownTechniqueIds.has(technique.id)
  );

  fallback.forEach((technique) => {
    techniques.push(technique);
    if (loadout.length < 3) {
      loadout.push(technique.id);
    }
  });

  techniques.forEach((technique) => {
    if (loadout.length < 3 && !loadout.includes(technique.id)) {
      loadout.push(technique.id);
    }
  });

  return { techniques, loadout: loadout.slice(0, 3) };
}

function normalizeConditions(rawConditions: unknown) {
  if (!Array.isArray(rawConditions)) {
    return [] as SessionCharacterSheetProfile["conditions"];
  }

  return rawConditions
    .map((entry, index) => {
      const item = asObject(entry);
      const label = typeof item?.label === "string" ? item.label.trim() : "";

      if (!item || !label) {
        return null;
      }

      return {
        id: typeof item.id === "string" ? item.id : `${slugify(label)}-${index}`,
        label,
        value: typeof item.value === "number" ? item.value : undefined,
        source:
          item.source === "manual" || item.source === "status" ? item.source : "combat",
        notes: typeof item.notes === "string" ? item.notes : undefined
      };
    })
    .filter(Boolean) as SessionCharacterSheetProfile["conditions"];
}

export function createEmptySheetProfile(input?: {
  name?: string;
  attributes?: Partial<SessionCharacterSheetProfile["attributes"]>;
}): SessionCharacterSheetProfile {
  const attributes = {
    st: toNumber(input?.attributes?.st, 10),
    dx: toNumber(input?.attributes?.dx, 10),
    iq: toNumber(input?.attributes?.iq, 10),
    ht: toNumber(input?.attributes?.ht, 10),
    hpMax: toNumber(input?.attributes?.hpMax, toNumber(input?.attributes?.st, 10)),
    fpMax: toNumber(input?.attributes?.fpMax, toNumber(input?.attributes?.ht, 10)),
    will: toNumber(input?.attributes?.will, toNumber(input?.attributes?.iq, 10)),
    per: toNumber(input?.attributes?.per, toNumber(input?.attributes?.iq, 10))
  };
  const basicSpeed = computeBasicSpeed(attributes.dx, attributes.ht);
  const derived = {
    basicSpeed,
    move: computeMove(basicSpeed),
    encumbranceLevel: 0
  };
  const skills = [
    {
      id: "combate",
      name: "Combate",
      level: attributes.dx,
      notes: "Pericia generica enquanto a ficha nao foi refinada."
    }
  ] satisfies CharacterSkillRecord[];
  const weapons = [
    {
      id: "fists",
      name: "Maos Nuas",
      category: "Natural",
      state: "ready",
      quality: null,
      rawDamage: "GdP cr",
      notes: "Ataque improvisado sem arma equipada.",
      modes: [
        createWeaponMode({
          id: "fists-mode",
          label: "Golpe",
          skill: "Briga",
          rawDamage: "GdP cr",
          reach: "C,1",
          parry: "0"
        })
      ]
    }
  ] satisfies CharacterWeaponRecord[];
  const profile: SessionCharacterSheetProfile = {
    version: 1,
    summary: input?.name ?? "Ficha de combate em branco",
    attributes,
    derived,
    defenses: normalizeDefenseBlock(undefined, derived, skills[0].level),
    style: {
      name: "Combate Geral",
      source: "manual"
    },
    skills,
    techniques: [],
    weapons,
    armor: [],
    notes: [],
    conditions: [],
    combat: {
      currentHp: attributes.hpMax,
      currentFp: attributes.fpMax,
      activeWeaponId: weapons[0].id,
      activeWeaponModeId: weapons[0].modes[0]?.id ?? null,
      loadoutTechniqueIds: [],
      posture: "standing",
      shock: 0,
      bleeding: 0,
      evaluateBonus: 0,
      pendingTechniqueSwapId: null,
      lastTechniqueSwapRound: null
    },
    raw: {}
  };
  const ensured = ensureTechniqueLoadout(profile);
  profile.techniques = ensured.techniques;
  profile.combat.loadoutTechniqueIds = ensured.loadout;
  return profile;
}

export function normalizeSheetProfile(
  raw: unknown,
  fallback?: SessionCharacterSheetProfile
): SessionCharacterSheetProfile {
  const base = fallback ?? createEmptySheetProfile();
  const candidate = asObject(raw);

  if (!candidate) {
    return base;
  }

  const candidateAttributes = asObject(candidate.attributes);
  const candidateDerived = asObject(candidate.derived);
  const candidateStyle = asObject(candidate.style);
  const candidateDefenses = asObject(candidate.defenses) as Partial<CharacterDefenseProfile> | null;
  const candidateCombat = asObject(candidate.combat);
  const attributes = {
    st: toNumber(candidateAttributes?.st, base.attributes.st),
    dx: toNumber(candidateAttributes?.dx, base.attributes.dx),
    iq: toNumber(candidateAttributes?.iq, base.attributes.iq),
    ht: toNumber(candidateAttributes?.ht, base.attributes.ht),
    hpMax: toNumber(candidateAttributes?.hpMax, base.attributes.hpMax),
    fpMax: toNumber(candidateAttributes?.fpMax, base.attributes.fpMax),
    will: toNumber(candidateAttributes?.will, base.attributes.will),
    per: toNumber(candidateAttributes?.per, base.attributes.per)
  };
  const basicSpeed = toNumber(
    candidateDerived?.basicSpeed,
    computeBasicSpeed(attributes.dx, attributes.ht)
  );
  const derived = {
    basicSpeed: Number(basicSpeed.toFixed(2)),
    move: toNumber(candidateDerived?.move, computeMove(basicSpeed)),
    encumbranceLevel: toNumber(candidateDerived?.encumbranceLevel, 0)
  };
  const skills = normalizeSkills(candidate.skills);
  const style = {
    name:
      typeof candidateStyle?.name === "string" && candidateStyle.name.trim()
        ? candidateStyle.name.trim()
        : base.style.name,
    source: typeof candidateStyle?.source === "string" ? candidateStyle.source : base.style.source
  };
  const techniques = normalizeTechniques(
    candidate.techniques,
    style.name,
    skills[0]?.name ?? "Combate"
  );
  const weapons = normalizeWeapons(candidate.weapons);
  const armor = normalizeArmor(candidate.armor);
  const profile: SessionCharacterSheetProfile = {
    version: Math.max(1, Math.floor(toNumber(candidate.version, base.version))),
    summary:
      typeof candidate.summary === "string" && candidate.summary.trim()
        ? candidate.summary.trim()
        : base.summary,
    attributes,
    derived,
    defenses: normalizeDefenseBlock(
      candidateDefenses ?? undefined,
      derived,
      skills[0]?.level ?? base.defenses.parry * 2 - 6
    ),
    style,
    skills: skills.length > 0 ? skills : base.skills,
    techniques,
    weapons: weapons.length > 0 ? weapons : base.weapons,
    armor,
    notes: Array.isArray(candidate.notes) ? candidate.notes.map(String) : base.notes,
    conditions: normalizeConditions(candidate.conditions),
    combat: {
      currentHp: toNumber(candidateCombat?.currentHp, attributes.hpMax),
      currentFp: toNumber(candidateCombat?.currentFp, attributes.fpMax),
      activeWeaponId:
        typeof candidateCombat?.activeWeaponId === "string"
          ? candidateCombat.activeWeaponId
          : weapons[0]?.id ?? base.combat.activeWeaponId,
      activeWeaponModeId:
        typeof candidateCombat?.activeWeaponModeId === "string"
          ? candidateCombat.activeWeaponModeId
          : weapons[0]?.modes[0]?.id ?? base.combat.activeWeaponModeId,
      loadoutTechniqueIds: Array.isArray(candidateCombat?.loadoutTechniqueIds)
        ? candidateCombat.loadoutTechniqueIds.map(String)
        : base.combat.loadoutTechniqueIds,
      posture:
        candidateCombat?.posture === "kneeling" ||
        candidateCombat?.posture === "prone" ||
        candidateCombat?.posture === "sitting" ||
        candidateCombat?.posture === "crouching"
          ? candidateCombat.posture
          : "standing",
      shock: clamp(toNumber(candidateCombat?.shock, 0), 0, 4),
      bleeding: clamp(toNumber(candidateCombat?.bleeding, 0), 0, 999),
      evaluateBonus: clamp(toNumber(candidateCombat?.evaluateBonus, 0), 0, 3),
      pendingTechniqueSwapId:
        typeof candidateCombat?.pendingTechniqueSwapId === "string"
          ? candidateCombat.pendingTechniqueSwapId
          : null,
      lastTechniqueSwapRound:
        typeof candidateCombat?.lastTechniqueSwapRound === "number"
          ? candidateCombat.lastTechniqueSwapRound
          : null
    },
    raw: asObject(candidate.raw) ?? base.raw
  };
  const ensured = ensureTechniqueLoadout(profile);
  profile.techniques = ensured.techniques;
  profile.combat.loadoutTechniqueIds = ensured.loadout;
  return profile;
}

export function deriveSummaryFromSheetProfile(profile: SessionCharacterSheetProfile) {
  return {
    hp: clamp(profile.combat.currentHp, -999, profile.attributes.hpMax),
    hpMax: profile.attributes.hpMax,
    fp: clamp(profile.combat.currentFp, 0, profile.attributes.fpMax),
    fpMax: profile.attributes.fpMax,
    initiative: computeInitiativeScore(profile)
  };
}

export function mirrorSummaryIntoSheetProfile(
  profile: SessionCharacterSheetProfile,
  summary: {
    hp: number;
    hpMax: number;
    fp: number;
    fpMax: number;
  }
) {
  return {
    ...profile,
    attributes: {
      ...profile.attributes,
      hpMax: clamp(summary.hpMax, 1, 999),
      fpMax: clamp(summary.fpMax, 1, 999)
    },
    combat: {
      ...profile.combat,
      currentHp: clamp(summary.hp, -999, summary.hpMax),
      currentFp: clamp(summary.fp, 0, summary.fpMax)
    }
  } satisfies SessionCharacterSheetProfile;
}

export function buildSheetProfileFromBaseTemplate(template: CharacterTemplate) {
  const stats = template.stats as Record<string, unknown>;
  const attributesRaw = asObject(stats.attributes) ?? {};
  const attributes = {
    st: toNumber(attributesRaw.st, 10),
    dx: toNumber(attributesRaw.dx, 10),
    iq: toNumber(attributesRaw.iq, 10),
    ht: toNumber(attributesRaw.ht, 10),
    hpMax: toNumber(attributesRaw.hp, toNumber(attributesRaw.st, 10)),
    fpMax: toNumber(attributesRaw.fp, toNumber(attributesRaw.ht, 10)),
    will: toNumber(attributesRaw.will, toNumber(attributesRaw.iq, 10)),
    per: toNumber(attributesRaw.per, toNumber(attributesRaw.iq, 10))
  };
  const basicSpeed = toNumber(stats.basicSpeed, computeBasicSpeed(attributes.dx, attributes.ht));
  const derived = {
    basicSpeed: Number(basicSpeed.toFixed(2)),
    move: computeMove(basicSpeed),
    encumbranceLevel: 0
  };
  const skills = normalizeSkills(stats.skills);
  const styleName = parseStyleName(template);
  const techniques = normalizeTechniques(stats.skills, styleName, skills[0]?.name ?? "Combate");
  const equipment = typeof stats.equipment === "string" ? stats.equipment : "";
  const weapons = buildWeaponsFromEquipmentString(equipment, skills[0]?.name ?? "Combate");
  const armor = buildArmorFromEquipmentString(equipment);
  const profile: SessionCharacterSheetProfile = {
    version: 1,
    summary:
      typeof stats.concept === "string" && stats.concept.trim()
        ? stats.concept
        : template.name,
    attributes,
    derived,
    defenses: normalizeDefenseBlock(undefined, derived, skills[0]?.level ?? attributes.dx),
    style: {
      name: styleName,
      source: "base-archetype"
    },
    skills: skills.length > 0 ? skills : createEmptySheetProfile({ attributes }).skills,
    techniques,
    weapons: weapons.length > 0 ? weapons : createEmptySheetProfile({ attributes }).weapons,
    armor,
    notes: [
      ...(Array.isArray(stats.advantages) ? stats.advantages.map(String) : []),
      ...(Array.isArray(stats.disadvantages) ? stats.disadvantages.map(String) : []),
      typeof stats.history === "string" ? stats.history : ""
    ].filter(Boolean),
    conditions: [],
    combat: {
      currentHp: attributes.hpMax,
      currentFp: attributes.fpMax,
      activeWeaponId: weapons[0]?.id ?? "fists",
      activeWeaponModeId: weapons[0]?.modes[0]?.id ?? "fists-mode",
loadoutTechniqueIds: [],
      posture: "standing",
      shock: 0,
      bleeding: 0,
      evaluateBonus: 0,
      pendingTechniqueSwapId: null,
      lastTechniqueSwapRound: null
    },
    raw: {
      totalPoints: toNumber(stats.points, 0),
      concept: typeof stats.concept === "string" ? stats.concept : "",
      clan: typeof stats.clan === "string" ? stats.clan : "",
      advantages: Array.isArray(stats.advantages) ? stats.advantages.join("\n") : "",
      disadvantages: Array.isArray(stats.disadvantages) ? stats.disadvantages.join("\n") : "",
      skills: Array.isArray(stats.skills) ? stats.skills.join("\n") : "",
      equipmentText: typeof stats.equipment === "string" ? stats.equipment : "",
      history: typeof stats.history === "string" ? stats.history : ""
    }
  };
  const ensured = ensureTechniqueLoadout(profile);
  profile.techniques = ensured.techniques;
  profile.combat.loadoutTechniqueIds = ensured.loadout;
  return profile;
}
