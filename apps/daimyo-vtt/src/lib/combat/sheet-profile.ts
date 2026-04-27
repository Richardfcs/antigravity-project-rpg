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
  CombatHitLocationId,
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

  if (normalized.includes("pi++")) return "pi++";
  if (normalized.includes("pi+")) return "pi+";
  if (normalized.includes("pi-")) return "pi-";
  if (normalized.includes("pi")) return "pi";
  if (normalized.includes("imp") || normalized.includes("perf")) return "imp";
  if (normalized.includes("cut") || normalized.includes("cort")) return "cut";
  if (normalized.includes("burn") || normalized.includes("queim")) return "burn";
  if (normalized.includes("tox")) return "tox";

  return "cr";
}

export function parseDamageSpec(raw: string): CharacterDamageSpec {
  const normalized = raw.trim();
  const lower = normalized.toLowerCase();

  const divisorMatch = lower.match(/\((\d+)\)/);
  const armorDivisor = divisorMatch ? Number(divisorMatch[1]) : 1;
  
  const flatMatch = lower.match(/(\d+)d([+-]\d+)?/);

  if (flatMatch) {
    return {
      base: "flat",
      dice: Number(flatMatch[1]),
      adds: flatMatch[2] ? Number(flatMatch[2]) : 0,
      damageType: parseDamageType(lower),
      armorDivisor,
      raw: normalized
    };
  }

  const relativeMatch = lower.match(/(?:geb|gdp|swing|thrust)\s*([+-]\d+)?/);
  const adds = relativeMatch?.[1] ? Number(relativeMatch[1]) : extractNumber(lower, 0);

  return {
    base: lower.includes("gdp") || lower.includes("thrust") ? "thrust" : "swing",
    dice: 0,
    adds,
    damageType: parseDamageType(lower),
    armorDivisor,
    raw: normalized
  };
}

export function formatDamageSpec(spec: CharacterDamageSpec, st: number): string {
  if (spec.base === "flat") {
    const diceStr = `${spec.dice}d`;
    const addsStr = spec.adds === 0 ? "" : spec.adds > 0 ? `+${spec.adds}` : `${spec.adds}`;
    return `${diceStr}${addsStr}`;
  }

  const derived = spec.base === "thrust" ? 
    (st <= 8 ? { d: 1, a: -3 } :
     st <= 10 ? { d: 1, a: -2 } :
     st <= 12 ? { d: 1, a: -1 } :
     st <= 14 ? { d: 1, a: 0 } :
     st <= 16 ? { d: 1, a: 1 } :
     st <= 18 ? { d: 1, a: 2 } :
     st <= 20 ? { d: 2, a: -1 } :
     { d: 2 + Math.floor((st - 21) / 4), a: [0, 0, 1, 1][(st - 21) % 4] ?? 0 }) :
    (st <= 8 ? { d: 1, a: -2 } :
     st <= 9 ? { d: 1, a: -1 } :
     st <= 10 ? { d: 1, a: 0 } :
     st <= 11 ? { d: 1, a: 1 } :
     st <= 12 ? { d: 1, a: 2 } :
     st <= 13 ? { d: 2, a: -1 } :
     st <= 14 ? { d: 2, a: 0 } :
     st <= 15 ? { d: 2, a: 1 } :
     st <= 16 ? { d: 2, a: 2 } :
     st <= 17 ? { d: 3, a: -1 } :
     st <= 18 ? { d: 3, a: 0 } :
     st <= 19 ? { d: 3, a: 1 } :
     st <= 20 ? { d: 3, a: 2 } :
     { d: 4 + Math.floor((st - 21) / 4), a: [-1, 0, 1, 2][(st - 21) % 4] ?? 0 });

  const totalDice = derived.d;
  const totalAdds = derived.a + spec.adds;
  const addsStr = totalAdds === 0 ? "" : totalAdds > 0 ? `+${totalAdds}` : `${totalAdds}`;
  
  return `${totalDice}d${addsStr}`;
}

export function createWeaponMode(input: {
  id: string;
  label: string;
  skill?: string;
  rawDamage: string;
  reach?: string;
  parry?: string;
  accuracy?: number | null;
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
    halfDamageRange: null,
    maxRange: null,
    recoil: null,
    tags: input.tags ?? [],
    notes: ""
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
  if (!Array.isArray(rawSkills)) return [];

  return rawSkills
    .map((entry, index) => {
      if (!entry) return null;
      if (typeof entry === "object") {
        const candidate = entry as Partial<CharacterSkillRecord>;
        if (!candidate.name) return null;
        return {
          id: candidate.id ?? `${slugify(candidate.name)}-${index}`,
          name: candidate.name,
          specialization: candidate.specialization ?? null,
          level: toNumber(candidate.level, 10),
          notes: candidate.notes
        } as CharacterSkillRecord;
      }
      const text = String(entry).trim();
      const match = text.match(/^(.+?)(?:\s*-\s*NH:\s*(-?\d+))?/i);
      if (!match?.[1]) return null;
      return {
        id: `${slugify(match[1])}-${index}`,
        name: match[1].trim(),
        level: toNumber(match[2], 10),
        notes: text
      } as CharacterSkillRecord;
    })
    .filter(Boolean) as CharacterSkillRecord[];
}

function normalizeTechniques(
  rawTechniques: unknown,
  styleName: string,
  fallbackSkill: string
): CharacterTechniqueRecord[] {
  if (!Array.isArray(rawTechniques)) return [];

  return rawTechniques
    .map((entry, index) => {
      if (!entry) return null;
      if (typeof entry === "object") {
        const candidate = entry as Partial<CharacterTechniqueRecord>;
        if (!candidate.name) return null;
        return {
          id: candidate.id ?? `${slugify(candidate.name)}-${index}`,
          name: candidate.name,
          style: candidate.style ?? styleName,
          skill: candidate.skill ?? fallbackSkill,
          level: toNumber(candidate.level, 10),
          defaultModifier: candidate.defaultModifier ?? 0,
          tags: candidate.tags ?? [],
          notes: candidate.notes
        } as CharacterTechniqueRecord;
      }
      return null;
    })
    .filter(Boolean) as CharacterTechniqueRecord[];
}

function normalizeWeapons(rawWeapons: unknown): CharacterWeaponRecord[] {
  if (!Array.isArray(rawWeapons)) return [];

  return rawWeapons
    .map((entry, index) => {
      const candidate = asObject(entry) as Partial<CharacterWeaponRecord> | null;
      const name = candidate?.name;
      if (!candidate || !name) return null;

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
      } as CharacterWeaponRecord;
    })
    .filter(Boolean) as CharacterWeaponRecord[];
}

function normalizeArmor(rawArmor: unknown): CharacterArmorRecord[] {
  if (!Array.isArray(rawArmor)) return [];

  return rawArmor
    .map((entry, index) => {
      const candidate = asObject(entry) as Partial<CharacterArmorRecord> | null;
      const name = candidate?.name;
      if (!candidate || !name) return null;

      return {
        id: candidate.id ?? `${slugify(name)}-${index}`,
        name,
        zone: candidate.zone ?? "all",
        dr: toNumber(candidate.dr, 0),
        notes: candidate.notes
      } as CharacterArmorRecord;
    })
    .filter(Boolean) as CharacterArmorRecord[];
}

function normalizeConditions(rawConditions: unknown) {
  if (!Array.isArray(rawConditions)) return [];

  return rawConditions
    .map((entry, index) => {
      const item = asObject(entry);
      const label = typeof item?.label === "string" ? item.label.trim() : "";
      if (!item || !label) return null;

      return {
        id: typeof item.id === "string" ? item.id : `${slugify(label)}-${index}`,
        label,
        value: typeof item.value === "number" ? item.value : undefined,
        source: item.source === "manual" || item.source === "status" ? item.source : "combat",
        notes: typeof item.notes === "string" ? item.notes : undefined
      };
    })
    .filter(Boolean) as any[];
}

export function normalizeSheetProfile(
  raw: unknown,
  fallback?: SessionCharacterSheetProfile
): SessionCharacterSheetProfile {
  const base = fallback ?? createEmptySheetProfile();
  const candidate = asObject(raw);

  if (!candidate) return base;

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
  
  const basicSpeed = toNumber(candidateDerived?.basicSpeed, computeBasicSpeed(attributes.dx, attributes.ht));
  const derived = {
    basicSpeed: Number(basicSpeed.toFixed(2)),
    move: toNumber(candidateDerived?.move, computeMove(basicSpeed)),
    encumbranceLevel: toNumber(candidateDerived?.encumbranceLevel, 0)
  };
  
  const skills = normalizeSkills(candidate.skills);
  const style = {
    name: typeof candidateStyle?.name === "string" ? candidateStyle.name : base.style.name,
    source: typeof candidateStyle?.source === "string" ? candidateStyle.source : base.style.source
  };
  
  const techniques = normalizeTechniques(candidate.techniques, style.name, skills[0]?.name ?? "Combate");
  const weapons = normalizeWeapons(candidate.weapons);
  const armor = normalizeArmor(candidate.armor);
  
  return {
    version: toNumber(candidate.version, base.version),
    summary: typeof candidate.summary === "string" ? candidate.summary : base.summary,
    attributes,
    derived,
    defenses: normalizeDefenseBlock(candidateDefenses ?? undefined, derived, skills[0]?.level ?? 10),
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
      activeWeaponId: candidateCombat?.activeWeaponId ?? weapons[0]?.id ?? null,
      activeWeaponModeId: candidateCombat?.activeWeaponModeId ?? weapons[0]?.modes[0]?.id ?? null,
      loadoutTechniqueIds: Array.isArray(candidateCombat?.loadoutTechniqueIds) ? candidateCombat.loadoutTechniqueIds : [],
      posture: candidateCombat?.posture ?? "standing",
      shock: clamp(toNumber(candidateCombat?.shock, 0), 0, 4),
      bleeding: toNumber(candidateCombat?.bleeding, 0),
      evaluateBonus: toNumber(candidateCombat?.evaluateBonus, 0),
      pendingTechniqueSwapId: candidateCombat?.pendingTechniqueSwapId ?? null,
      lastTechniqueSwapRound: candidateCombat?.lastTechniqueSwapRound ?? null
    },
    raw: asObject(candidate.raw) ?? {}
  } as SessionCharacterSheetProfile;
}

export function buildSheetProfileFromBaseTemplate(template: CharacterTemplate): SessionCharacterSheetProfile {
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
    summary: typeof stats.concept === "string" ? stats.concept : template.name,
    attributes,
    derived,
    defenses: normalizeDefenseBlock(undefined, derived, skills[0]?.level ?? attributes.dx),
    style: { name: styleName, source: "base-archetype" },
    skills: skills.length > 0 ? skills : createEmptySheetProfile({ attributes }).skills,
    techniques,
    weapons: weapons.length > 0 ? weapons : createEmptySheetProfile({ attributes }).weapons,
    armor,
    notes: [],
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
      equipmentText: equipment,
      history: typeof stats.history === "string" ? stats.history : "",
      drTop: 0,
      drMiddle: 0,
      drBottom: 0
    }
  };

  const raw = profile.raw as Record<string, any>;

  // Automação de RD de Alto Nível
  const searchStr = `${template.name} ${raw.concept || ""} ${profile.summary || ""}`.toLowerCase();
  const isElite = searchStr.includes("mestre") || searchStr.includes("líder") || searchStr.includes("chefe") || 
                  searchStr.includes("comandante") || searchStr.includes("capitão") || searchStr.includes("samurai") ||
                  searchStr.includes("daimyo") || searchStr.includes("shogun") || searchStr.includes("mestre de armas");
  const isSoldier = searchStr.includes("soldado") || searchStr.includes("guarda") || searchStr.includes("guerreiro") || 
                    searchStr.includes("ronin") || searchStr.includes("ashigaru") || searchStr.includes("busaki");

  let drTop = 0;
  let drMiddle = 0;
  let drBottom = 0;

  // 1. Calcula RD real das armaduras equipadas
  profile.armor.forEach(a => {
    const zones = Array.isArray(a.zone) ? a.zone : (a.zone === "all" ? ["skull", "torso", "arm"] : [a.zone]);
    if (zones.some(z => ["skull", "face", "neck"].includes(z))) drTop = Math.max(drTop, a.dr);
    if (zones.some(z => ["torso", "vitals"].includes(z))) drMiddle = Math.max(drMiddle, a.dr);
    if (zones.some(z => ["arm", "leg", "hand", "foot"].includes(z))) drBottom = Math.max(drBottom, a.dr);
  });

  // 2. Aplica "Status RD" apenas se NÃO houver armaduras específicas
  // Se o usuário definiu armadura só pra uma parte, respeitamos isso (as outras ficam 0)
  const hasSpecificArmor = profile.armor.length > 0;

  if (!hasSpecificArmor) {
    if (isElite) {
      drTop = 2; drMiddle = 5; drBottom = 3;
    } else if (isSoldier) {
      drTop = 1; drMiddle = 2; drBottom = 1;
    }
  }

  raw.drTop = drTop;
  raw.drMiddle = drMiddle;
  raw.drBottom = drBottom;

  const ensured = ensureTechniqueLoadout(profile);
  profile.techniques = ensured.techniques;
  profile.combat.loadoutTechniqueIds = ensured.loadout;
  return profile;
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
  const skills = [{ id: "combate", name: "Combate", level: attributes.dx, notes: "" }];
  const weapons = [{
    id: "fists",
    name: "Maos Nuas",
    category: "Natural",
    state: "ready",
    quality: null,
    rawDamage: "GdP cr",
    modes: [createWeaponMode({ id: "fists-mode", label: "Golpe", skill: "Briga", rawDamage: "GdP cr", reach: "C,1", parry: "0" })]
  }] as CharacterWeaponRecord[];
  
  return {
    version: 1,
    summary: input?.name ?? "Ficha em branco",
    attributes,
    derived,
    defenses: normalizeDefenseBlock(undefined, derived, skills[0].level),
    style: { name: "Combate Geral", source: "manual" },
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
  } as SessionCharacterSheetProfile;
}

function parseStyleName(template: CharacterTemplate) {
  const stats = template.stats as Record<string, unknown>;
  const advantages = Array.isArray(stats.advantages) ? stats.advantages : [];
  const advantageStyle = advantages.find(e => typeof e === "string" && e.includes("Estilo de Luta:"));
  if (typeof advantageStyle === "string") return advantageStyle.split(":")[1]?.split("[")[0]?.trim() || "Combate Geral";
  return "Combate Geral";
}

function buildWeaponsFromEquipmentString(
  equipment: string,
  fallbackSkill: string
): CharacterWeaponRecord[] {
  const weaponSegments = equipment.split(/Arma Principal:|Arma Secund[áa]ria:/i).map(e => e.trim()).filter(Boolean);
  
  const getSmartSkill = (weaponName: string, fallback: string): string => {
    const n = weaponName.toLowerCase();
    if (n.includes("katana") || n.includes("tachi") || n.includes("wakizashi") || n.includes("espada")) return "Kenjutsu";
    if (n.includes("yari") || n.includes("naginata") || n.includes("bo") || n.includes("bastão") || n.includes("lança")) return "Sojutsu";
    if (n.includes("tetsubo") || n.includes("kanabo") || n.includes("clava") || n.includes("porrete")) return "Kobujutsu";
    if (n.includes("ono") || n.includes("machado") || n.includes("mace")) return "Machado/Maça";
    if (n.includes("yumi") || n.includes("arco")) return "Arqueiria";
    if (n.includes("shuriken") || n.includes("faca")) return "Arremesso";
    if (n.includes("kusarigama") || n.includes("corrente")) return "Kusarigamajutsu";
    return fallback;
  };

  return weaponSegments.map((segment, index) => {
    const nameMatch = segment.match(/^(.+?)(?:\||$)/);
    const damageMatch = segment.match(/Dano:\s*(.+?)(?:\||$)/i);
    const name = nameMatch?.[1]?.trim() ?? "Arma";
    const damage = damageMatch?.[1]?.trim() ?? "GdP cr";
    return {
      id: `${slugify(name)}-${index}`,
      name,
      category: "Arma",
      state: "ready",
      quality: null,
      rawDamage: damage,
      modes: [createWeaponMode({ id: `${slugify(name)}-mode`, label: "Principal", skill: getSmartSkill(name, fallbackSkill), rawDamage: damage })]
    } as CharacterWeaponRecord;
  });
}

function buildArmorFromEquipmentString(equipment: string): CharacterArmorRecord[] {
  // Suporta múltiplas armaduras separadas por || ou nova linha
  const segments = equipment.split(/\|\||\n/).map(s => s.trim()).filter(s => s.includes("Armadura:") || s.includes("RD:"));
  
  return segments.map((segment, index) => {
    const armorMatch = segment.match(/Armadura:\s*(.+?)(?:\||$)/i);
    const drMatch = segment.match(/RD:\s*(.+?)(?:\||$)/i);
    const localMatch = segment.match(/Local:\s*(.+?)(?:\||$)/i);
    
    if (!armorMatch?.[1] && !drMatch?.[1]) return null;
    
    const drValue = extractNumber(drMatch?.[1] ?? "0", 0);
    const local = (localMatch?.[1] || "corpo").toLowerCase();
    let zones: CombatHitLocationId[] | "all" = "all";
    
    if (local.includes("cabeça") || local.includes("topo")) zones = ["skull", "face", "eye", "neck"];
    else if (local.includes("tronco") || local.includes("meio")) zones = ["torso", "vitals"];
    else if (local.includes("membros") || local.includes("base")) zones = ["arm", "leg", "hand", "foot"];

    return { 
      id: `armadura-${index}`, 
      name: armorMatch?.[1]?.trim() ?? "Armadura", 
      zone: zones, 
      dr: drValue, 
      notes: "" 
    } as CharacterArmorRecord;
  }).filter(Boolean) as CharacterArmorRecord[];
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

function ensureTechniqueLoadout(profile: SessionCharacterSheetProfile) {
  const loadout = profile.combat.loadoutTechniqueIds.slice(0, 3);
  return { techniques: profile.techniques, loadout };
}
