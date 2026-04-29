"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  Save,
  Shield,
  HeartPulse,
  Zap,
  Swords,
  Brain,
  BicepsFlexed,
  Activity,
  User,
  Package,
  ScrollText,
  Dumbbell,
  Sparkles,
  Search,
  ChevronDown,
  LayoutGrid,
  RotateCcw,
  Dices,
  EyeOff,
  Eye,
  PlusCircle,
  Plus,
  Trash2,
  ShieldAlert
} from "lucide-react";

import type { SessionCharacterRecord } from "@/types/character";
import type { SessionCharacterSheetProfile, TacticalRollMode } from "@/types/combat";
import type { SessionViewerIdentity } from "@/types/session";
import { 
  updateCharacterProfileAction, 
  getBaseArchetypesAction, 
  applyBaseArchetypeAction,
  getArsenalAction,
  getStylesAction
} from "@/app/actions/character-actions";
import { rollDiceAction } from "@/app/actions/chat-actions";
import { useCharacterStore } from "@/stores/character-store";
import { useChatStore } from "@/stores/chat-store";
import { cn } from "@/lib/utils";
import { 
  formatDamageSpec, 
  parseDamageSpec, 
  calculateTotalSlots, 
  getEncumbranceLevelFromSlots,
  getSlotThresholds,
  normalizeStyleTechniqueId,
  normalizeStyleTechniqueRecords
} from "@/lib/combat/sheet-profile";
import { 
  calculateSkillPenalties, 
  getSkillRollTarget,
  formatSkillRollSummary 
} from "@/lib/combat/skill-calculator";

interface CharacterSheetModalProps {
  sessionCode: string;
  character: SessionCharacterRecord;
  onClose: () => void;
  canManage: boolean;
  tokenId?: string | null;
}

export function CharacterSheetModal({
  sessionCode,
  character,
  onClose,
  canManage,
  tokenId = null
}: CharacterSheetModalProps) {
  const upsertMessage = useChatStore((state) => state.upsertMessage);
  const [isPrivateRoll, setIsPrivateRoll] = useState(false);
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [archetypes, setArchetypes] = useState<any[]>([]);
  const [showArchetypeSelector, setShowArchetypeSelector] = useState(false);
  const [archetypeSearch, setArchetypeSearch] = useState("");
  const [equipment, setEquipment] = useState<any[]>([]);
  const [arsenalCategory, setArsenalCategory] = useState<"Tudo" | "Armas" | "Armaduras" | "Equipamentos">("Tudo");
  const [showArsenalSelector, setShowArsenalSelector] = useState(false);
  const [arsenalSearch, setArsenalSearch] = useState("");
  const [styles, setStyles] = useState<any[]>([]);

  useEffect(() => {
    if (canManage) {
      getBaseArchetypesAction({ sessionCode }).then(res => {
        if (res.ok) setArchetypes(res.archetypes);
      });
      getArsenalAction({ sessionCode }).then(res => {
        if (res.ok) setEquipment(res.equipment);
      });
      getStylesAction({ sessionCode }).then(res => {
        if (res.ok) setStyles(res.styles);
      });
    }
  }, [sessionCode, canManage]);

  const defaultProfile: SessionCharacterSheetProfile = {
    version: 1,
    attributes: { st: 10, dx: 10, iq: 10, ht: 10, hpMax: 10, fpMax: 10, will: 10, per: 10 },
    derived: { basicSpeed: 5, move: 5, encumbranceLevel: 0 },
    defenses: { dodge: 8, parry: 8, block: 0 },
    style: { name: "Básico" },
    skills: [],
    techniques: [],
    weapons: [],
    armor: [],
    notes: [],
    conditions: [],
    combat: {
      currentHp: 10,
      currentFp: 10,
      inspiration: 0,
      activeWeaponId: null,
      activeWeaponModeId: null,
      loadoutTechniqueIds: [],
      posture: "standing",
      shock: 0,
      fatigue: 0,
      pain: 0,
      bleeding: 0,
      evaluateBonus: 0,
      loadoutStyleTechniqueIds: []
    },
    raw: {
      totalPoints: 150,
      concept: "",
      clan: "",
      advantages: "",
      disadvantages: "",
      history: "",
      drTop: 0,
      drMiddle: 0,
      drBottom: 0,
      slotsUsed: 0,
      maneuver1: "",
      maneuver2: "",
      maneuver3: "",
      weapon1: "",
      weapon2: "",
      weapon3: "",
      equipmentText: "",
      unlockedLevel2: false,
      unlockedLevel3: false,
      hpBonus: 0,
      fpBonus: 0,
      willBonus: 0,
      perBonus: 0,
      speedBonus: 0,
      moveBonus: 0,
      dodgeBonus: 0
    }
  };

  const MANEUVER_CATALOG = [
    { id: "m1-attack", name: "Ataque Padrão", level: 1, desc: "Golpe direto" },
    { id: "m1-all-out", name: "Ataque Total", level: 1, desc: "+4 acerto ou +2 dano" },
    { id: "m1-all-out-def", name: "Defesa Total", level: 1, desc: "+2 em todas as defesas" },
    { id: "m1-move-attack", name: "Mover e Atacar", level: 1, desc: "Penalidade -4" },
    { id: "m1-ready", name: "Preparar", level: 1, desc: "Sacar ou preparar arma" },
    { id: "m1-move", name: "Mover", level: 1, desc: "Apenas deslocamento" },
    
    { id: "m2-deceptive", name: "Ataque Deceptivo", level: 2, req: 12, desc: "-2 acerto p/ -1 defesa" },
    { id: "m2-defensive", name: "Ataque Defensivo", level: 2, req: 12, desc: "+1 defesa, -2 dano" },
    { id: "m2-committed", name: "Ataque Comprometido", level: 2, req: 12, desc: "+1 dano, sem aparar" },
    { id: "m2-evaluate", name: "Avaliar", level: 2, req: 12, desc: "+1 acerto p/ turno" },
    { id: "m2-wait", name: "Aguardar", level: 2, req: 12, desc: "Interrupção" },
    
    { id: "m3-feint", name: "Finta", level: 3, req: 14, desc: "Enganar oponente" },
    { id: "m3-beat", name: "Batida", level: 3, req: 14, desc: "Afastar arma (ST)" },
    { id: "m3-ruse", name: "Truque", level: 3, req: 14, desc: "Distração (IQ)" },
    { id: "m3-riposte", name: "Riposta", level: 3, req: 14, desc: "Contra-ataque" },
    { id: "m3-rapid", name: "Ataque Rápido", level: 3, req: 14, desc: "Dois golpes (-6)" },
    { id: "m3-cross", name: "Aparar Cruzado", level: 3, req: 14, desc: "Duas armas" }
  ];

  const [draftProfile, setDraftProfile] = useState<SessionCharacterSheetProfile>(
    character.sheetProfile || defaultProfile
  );

  const st = draftProfile.attributes.st;
  const slotsUsed = calculateTotalSlots(draftProfile);
  const encumbranceLevel = getEncumbranceLevelFromSlots(slotsUsed, st);
  const slotThresholds = getSlotThresholds(st);

  // Sincroniza o nível de carga derivado automaticamente
  useEffect(() => {
    if (draftProfile.derived.encumbranceLevel !== encumbranceLevel) {
      updateDerived("encumbranceLevel", String(encumbranceLevel));
    }
  }, [slotsUsed, st]);

  const updateAttribute = (attr: keyof typeof draftProfile.attributes, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setDraftProfile((prev: SessionCharacterSheetProfile) => {
      const nextAttrs = { ...prev.attributes, [attr]: num };
      const nextDerived = { ...prev.derived };
      const nextDefenses = { ...prev.defenses };
      
      const getRawBonus = (key: string, isFloat = false) => {
        const val = prev.raw?.[key];
        if (typeof val === "number") return val;
        return isFloat ? parseFloat(String(val || "0")) : parseInt(String(val || "0"), 10);
      };
      
      // Regras GURPS: Atributos secundários baseados nos principais + bônus manuais
      if (attr === "st") nextAttrs.hpMax = num + getRawBonus("hpBonus");
      if (attr === "ht" || attr === "dx") {
        nextDerived.basicSpeed = (nextAttrs.dx + nextAttrs.ht) / 4 + getRawBonus("speedBonus", true);
        const factor = [1, 0.8, 0.6, 0.4, 0.2][prev.derived.encumbranceLevel] || 1;
        nextDerived.move = Math.floor(nextDerived.basicSpeed * factor) + getRawBonus("moveBonus");
        nextDefenses.dodge = Math.floor(nextDerived.basicSpeed) + 3 - prev.derived.encumbranceLevel + getRawBonus("dodgeBonus");
      }
      if (attr === "ht") nextAttrs.fpMax = num + getRawBonus("fpBonus");
      if (attr === "iq") {
        nextAttrs.will = num + getRawBonus("willBonus");
        nextAttrs.per = num + getRawBonus("perBonus");
      }
      
      return {
        ...prev,
        attributes: nextAttrs,
        derived: nextDerived,
        defenses: nextDefenses
      };
    });
  };

  const updateDerived = (field: keyof typeof draftProfile.derived, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setDraftProfile((prev: SessionCharacterSheetProfile) => {
      const nextDerived = { ...prev.derived, [field]: num };
      const nextDefenses = { ...prev.defenses };
      const getRawBonus = (key: string) => parseInt(String(prev.raw?.[key] || "0"), 10);

      if (field === "encumbranceLevel") {
        const factor = [1, 0.8, 0.6, 0.4, 0.2][Math.min(4, Math.max(0, Math.floor(num)))] || 1;
        nextDerived.move = Math.max(1, Math.floor(prev.derived.basicSpeed * factor)) + getRawBonus("moveBonus");
        nextDefenses.dodge = Math.floor(prev.derived.basicSpeed) + 3 - Math.floor(num) + getRawBonus("dodgeBonus");
      }
      
      return {
        ...prev,
        derived: nextDerived,
        defenses: nextDefenses
      };
    });
  };

  const updateCombat = (field: keyof typeof draftProfile.combat, value: any) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      combat: { ...prev.combat, [field]: value }
    }));
  };

  const updateDefense = (field: keyof typeof draftProfile.defenses, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      defenses: { ...prev.defenses, [field]: num }
    }));
  };

  const addSkill = () => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      skills: [
        ...(prev.skills || []),
        { id: crypto.randomUUID(), name: "", level: 10 }
      ]
    }));
  };

  const updateSkill = (id: string, field: string, value: any) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      skills: (prev.skills || []).map((s) => (s.id === id ? { ...s, [field]: value } : s))
    }));
  };

  const removeSkill = (id: string) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s.id !== id)
    }));
  };


  const addWeapon = () => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      weapons: [
        ...prev.weapons,
        { id: crypto.randomUUID(), name: "", category: "Arma", state: "ready", modes: [] }
      ]
    }));
  };

  const updateWeapon = (id: string, field: "name" | "quality" | "rawDamage", value: string) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      weapons: prev.weapons.map((w) => {
        if (w.id === id) {
          const updated = { ...w, [field]: value };
          if (field === "rawDamage") {
            const parsed = parseDamageSpec(String(value));
            if (updated.modes.length > 0) {
              updated.modes[0] = { ...updated.modes[0], damage: parsed };
            } else {
              updated.modes = [{
                id: crypto.randomUUID(),
                label: "Principal",
                skill: "Combate",
                damage: parsed,
                reach: "1",
                parry: "0",
                tags: []
              }];
            }
          }
          return updated;
        }
        return w;
      })
    }));
  };

  const removeWeapon = (id: string) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      weapons: prev.weapons.filter((w) => w.id !== id)
    }));
  };

  const handleApplyWeapon = (item: any) => {
    const stats = item.stats || {};
    const rawDamage = stats.dano || "";
    
    // Divide modos se houver (ex: GeB+1 cort / GdP+1 perf)
    const parts = rawDamage.split("/").map((p: string) => p.trim()).filter(Boolean);
    const modes = parts.map((part: string, idx: number) => {
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
      
      const skillMap: Record<string, string> = {
        "Lâmina": "Kenjutsu",
        "Haste": "Sojutsu",
        "Esmagamento": "Kobujutsu",
        "Força Bruta": "Machado/Maça",
        "Especialista": "Armas Especiais",
        "Arco": "Kyujutsu",
        "Arremesso": "Arremesso"
      };
      
      return {
        id: crypto.randomUUID(),
        label,
        skill: skillMap[stats.tipo] || "Combate",
        damage: parseDamageSpec(part),
        reach: stats.alcance || "1",
        parry: stats.aparar || "0",
        tags: []
      };
    });

    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      weapons: [
        ...prev.weapons,
        {
          id: crypto.randomUUID(),
          name: item.name,
          category: stats.tipo || "Arma",
          quality: stats.custo || "Padrão",
          rawDamage,
          state: "ready",
          modes,
          weight: stats.peso
        }
      ]
    }));
    setShowArsenalSelector(false);
    setFeedback(`${item.name} adicionado ao arsenal!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const HIT_LOCATIONS = [
    { id: "skull", label: "Crânio" },
    { id: "face", label: "Rosto" },
    { id: "eye", label: "Olhos" },
    { id: "neck", label: "Pescoço" },
    { id: "torso", label: "Tronco" },
    { id: "vitals", label: "Vitais" },
    { id: "arm", label: "Braços" },
    { id: "hand", label: "Mãos" },
    { id: "leg", label: "Pernas" },
    { id: "foot", label: "Pés" }
  ];

  const addArmor = () => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      armor: [
        ...prev.armor,
        { id: crypto.randomUUID(), name: "", zone: ["torso"], dr: 0 }
      ]
    }));
  };

  const updateArmor = (id: string, field: string, value: any) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      armor: prev.armor.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    }));
  };

  const removeArmor = (id: string) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      armor: prev.armor.filter((a) => a.id !== id)
    }));
  };

  const handleApplyArmor = (item: any) => {
    const stats = item.stats || {};
    const rd = parseInt(stats.rd || "0", 10);
    const local = (stats.local || "torso").toLowerCase();
    
    let zones: any[] = ["torso"];
    if (local.includes("tudo") || local.includes("corpo inteiro")) {
      zones = ["skull", "face", "neck", "torso", "vitals", "arm", "hand", "leg", "foot"];
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
    } else if (local.includes("tronco") || local.includes("peito") || local.includes("corpo") || local.includes("couraça")) {
      zones = ["torso", "vitals"];
    }
    
    // Suporte para múltiplas zonas (ex: "Tronco+Braços")
    if (local.includes("+")) {
      const extraZones: any[] = [];
      if (local.includes("braços")) extraZones.push("arm");
      if (local.includes("pernas")) extraZones.push("leg");
      if (local.includes("mãos")) extraZones.push("hand");
      zones = Array.from(new Set([...zones, ...extraZones]));
    }

    setDraftProfile((prev: SessionCharacterSheetProfile) => ({
      ...prev,
      armor: [
        ...prev.armor,
        {
          id: crypto.randomUUID(),
          name: item.name,
          zone: zones,
          dr: rd,
          weight: stats.peso
        }
      ]
    }));
    setShowArsenalSelector(false);
    setFeedback(`${item.name} adicionado às defesas!`);
    setTimeout(() => setFeedback(null), 3000);
  };

  const updateRaw = (field: string, value: string | number | boolean) => {
    setDraftProfile((prev: SessionCharacterSheetProfile) => {
      const nextRaw = { ...(prev.raw || {}), [field]: value };
      const nextAttrs = { ...prev.attributes };
      const nextDerived = { ...prev.derived };
      const nextDefenses = { ...prev.defenses };
      
      const getVal = (k: string, isFloat = false) => {
        const v = nextRaw[k];
        if (typeof v === "number") return v;
        return isFloat ? parseFloat(String(v || "0")) : parseInt(String(v || "0"), 10);
      };

      // Recalcula se for um campo de bônus
      if (field.endsWith("Bonus")) {
        nextAttrs.hpMax = nextAttrs.st + getVal("hpBonus");
        nextAttrs.fpMax = nextAttrs.ht + getVal("fpBonus");
        nextAttrs.will = nextAttrs.iq + getVal("willBonus");
        nextAttrs.per = nextAttrs.iq + getVal("perBonus");
        
        nextDerived.basicSpeed = (nextAttrs.dx + nextAttrs.ht) / 4 + getVal("speedBonus", true);
        const factor = [1, 0.8, 0.6, 0.4, 0.2][nextDerived.encumbranceLevel] || 1;
        nextDerived.move = Math.floor(nextDerived.basicSpeed * factor) + getVal("moveBonus");
        nextDefenses.dodge = Math.floor(nextDerived.basicSpeed) + 3 - nextDerived.encumbranceLevel + getVal("dodgeBonus");
      }

      return {
        ...prev,
        raw: nextRaw,
        attributes: nextAttrs,
        derived: nextDerived,
        defenses: nextDefenses
      };
    });
  };

  const handleApplyArchetype = async (archetypeId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await applyBaseArchetypeAction({
        sessionCode,
        characterId: character.id,
        archetypeId
      });

      if (res.ok && res.character?.sheetProfile) {
        setDraftProfile(res.character.sheetProfile);
        setShowArchetypeSelector(false);
        setFeedback("Arquétipo aplicado com sucesso!");
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setFeedback(res.message || "Falha ao aplicar arquétipo.");
      }
    });
  };

  const handleQuickRoll = (
    formula: string,
    target: number,
    label: string,
    isSkillRoll: boolean = false,
    rollMode: TacticalRollMode = "normal",
    useInspiration = false,
    skillId?: string
  ) => {
    startTransition(async () => {
      let finalTarget = target;
      let modifierDescription = "";
      const modifiers: Array<{ label: string; value: number }> = [];
      
      if (isSkillRoll) {
        const choque = draftProfile.combat.shock || 0;
        const fadiga = draftProfile.combat.fatigue || 0;
        const dor = draftProfile.combat.pain || 0;
        
        const skillInfo = getSkillRollTarget(target, encumbranceLevel, choque, fadiga, dor);
        finalTarget = skillInfo.target;
        if (skillInfo.modifier.cargaPenalty) {
          modifiers.push({ label: "Carga", value: -skillInfo.modifier.cargaPenalty });
        }
        if (skillInfo.modifier.choquePenalty) {
          modifiers.push({ label: "Choque", value: -skillInfo.modifier.choquePenalty });
        }
        if (skillInfo.modifier.fadigaPenalty) {
          modifiers.push({ label: "Fadiga", value: -skillInfo.modifier.fadigaPenalty });
        }
        
        if (skillInfo.modifier.totalPenalty > 0) {
          modifierDescription = ` [${skillInfo.modifier.description}]`;
        }
      }
      
      const res = await rollDiceAction({
        sessionCode,
        formula,
        target: finalTarget,
        label: label + modifierDescription,
        isPrivate: isPrivateRoll,
        tokenId,
        characterId: character.id,
        skillId: skillId ?? null,
        skillName: isSkillRoll ? label : null,
        modifiers,
        rollMode,
        inspirationSpent: useInspiration
      });
      
      if (res.ok && res.message) {
        upsertMessage(res.message);
        setFeedback(`Rolagem de ${label}${modifierDescription || ""} enviada!`);
        setTimeout(() => setFeedback(null), 2000);
      }
    });
  };

  const handleSave = () => {
    if (!canManage) return;

    setFeedback(null);
    startTransition(async () => {
      const currentStyleData = styles.find((style) => style.nome === draftProfile.style.name);
      const styleTechniques = normalizeStyleTechniqueRecords({
        styleName: draftProfile.style.name,
        techniques: currentStyleData?.tecnicas || [],
        fallbackSkill: draftProfile.skills[0]?.name,
        fallbackLevel: draftProfile.skills[0]?.level
      });
      const selectedStyleTechniques = styleTechniques.filter((technique) =>
        draftProfile.combat.loadoutStyleTechniqueIds.includes(technique.id)
      );
      const profileToSave = {
        ...draftProfile,
        techniques: [
          ...draftProfile.techniques.filter((technique) => !technique.tags.includes("style")),
          ...selectedStyleTechniques
        ]
      } satisfies SessionCharacterSheetProfile;
      const result = await updateCharacterProfileAction({
        sessionCode,
        characterId: character.id,
        sheetProfile: profileToSave
      });

      if (result.ok && result.character) {
        upsertCharacter(result.character);
        onClose();
      } else {
        setFeedback(result.message || "Falha ao salvar a ficha.");
      }
    });
  };

  const getRawString = (field: string) => {
    const val = draftProfile.raw?.[field];
    if (Array.isArray(val)) return val.join("\n");
    return String(val || "");
  };

  const getRawNumber = (field: string, fallback = 0) => {
    const val = draftProfile.raw?.[field];
    return typeof val === "number" ? val : fallback;
  };

  const dmg = {
    gdp: formatDamageSpec({ base: "thrust", dice: 0, adds: 0, raw: "GdP", damageType: "cr" }, st),
    geb: formatDamageSpec({ base: "swing", dice: 0, adds: 0, raw: "GeB", damageType: "cr" }, st)
  };
  const [activeTab, setActiveTab] = useState<"bio" | "combat" | "traits">("bio");
  
  const tabs = [
    { id: "bio", label: "Guerreiro", icon: User },
    { id: "combat", label: "Arsenal", icon: Swords },
    { id: "traits", label: "Crônicas", icon: Brain }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--bg-deep)]/80 p-0 sm:p-4 backdrop-blur-md">
      <div className="relative flex h-full max-h-full w-full max-w-5xl flex-col overflow-hidden bg-[var(--bg-panel)] shadow-[0_0_100px_rgba(0,0,0,0.5)] sm:h-[90vh] sm:rounded-[32px] border border-[var(--border-panel)]">
        
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[color:var(--gold)]/10 to-transparent pointer-events-none" />
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[color:var(--gold)]/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-rose-500/5 rounded-full blur-[120px] pointer-events-none" />

        <header className="relative z-10 flex items-center justify-between border-b border-[var(--border-panel)] px-6 py-5 bg-[var(--bg-panel)]/20 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-[color:var(--mist)] border border-[color:var(--gold)]/20">
              <ScrollText className="text-[color:var(--gold)]" size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-[color:var(--text-primary)] uppercase flex items-center gap-2">
                <span className="text-[color:var(--gold)]">Registro:</span> {character.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="h-1 w-1 rounded-full bg-[color:var(--gold)]/40" />
                <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-[0.3em]">
                  Forja de Lendas — Era das Espadas
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-panel)] bg-[var(--bg-input)]">
              <button
                onClick={() => setIsPrivateRoll(!isPrivateRoll)}
                className={cn(
                  "flex items-center gap-2 text-[9px] font-black uppercase tracking-widest transition-colors",
                  isPrivateRoll ? "text-rose-500" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                )}
              >
                {isPrivateRoll ? <EyeOff size={14} /> : <Eye size={14} />}
                {isPrivateRoll ? "Rolar em Off" : "Público"}
              </button>
            </div>

            {canManage && (
              <div className="hidden md:flex flex-col items-end">
                <label className="text-[9px] font-black uppercase tracking-widest text-[color:var(--text-muted)] mb-1">Custo do Bushido</label>
                <div className="flex items-center gap-2 bg-[var(--bg-input)] rounded-xl border border-[var(--border-panel)] px-3 py-1">
                  <input
                    type="number"
                    value={getRawNumber("totalPoints", 150)}
                    onChange={(e) => updateRaw("totalPoints", parseInt(e.target.value, 10))}
                    className="w-12 bg-transparent text-center font-black text-rose-500 outline-none text-sm"
                  />
                  <span className="text-[10px] font-black text-[color:var(--text-muted)]">PTS</span>
                </div>
              </div>
            )}
            <button
              onClick={onClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-input)] text-[color:var(--text-muted)] transition hover:bg-rose-500/20 hover:text-rose-500 border border-[var(--border-panel)]"
            >
              <X size={20} className="transition-transform group-hover:rotate-90" />
            </button>
          </div>
        </header>

        <nav className="relative z-10 flex border-b border-[var(--border-panel)] bg-[var(--bg-panel)]/10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative",
                activeTab === tab.id ? "text-[color:var(--gold)]" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-secondary)]"
              )}
            >
              <tab.icon size={14} />
              <span className={cn(activeTab === tab.id ? "inline" : "hidden sm:inline")}>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 h-0.5 w-full bg-[color:var(--gold)] shadow-[0_0_10px_rgba(var(--gold-rgb),0.5)]" />
              )}
            </button>
          ))}
        </nav>

        <main className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-6">
          {feedback && (
            <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-400 uppercase tracking-wider animate-in fade-in slide-in-from-top-2">
              {feedback}
            </div>
          )}

          <div className="mx-auto max-w-4xl">
            {activeTab === "bio" && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Archetype Selector */}
                {canManage && (
                  <section className="relative">
                    <div className="mb-4 flex items-center justify-between px-2">
                      <div className="flex items-center gap-2 text-[color:var(--gold)]/60">
                        <Sparkles size={14} />
                        <h4 className="text-[10px] font-black uppercase tracking-widest">Base de Dados de Arquétipos</h4>
                      </div>
                      <button 
                        onClick={() => setShowArchetypeSelector(!showArchetypeSelector)}
                        className="flex items-center gap-2 rounded-xl bg-[var(--bg-input)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[color:var(--text-primary)]"
                      >
                        {showArchetypeSelector ? "Fechar Biblioteca" : "Explorar Arquétipos"}
                        <ChevronDown size={14} className={cn("transition-transform", showArchetypeSelector && "rotate-180")} />
                      </button>
                    </div>

                    {showArchetypeSelector && (
                      <div className="mb-8 rounded-[32px] border border-[color:var(--gold)]/20 bg-[color:var(--mist)] p-6 animate-in zoom-in-95 duration-300">
                        <div className="relative mb-6">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={18} />
                          <input 
                            type="text" 
                            value={archetypeSearch}
                            onChange={(e) => setArchetypeSearch(e.target.value)}
                            placeholder="Buscar arquétipo (ex: Samurai, Ronin, Camponês...)" 
                            className="w-full rounded-2xl bg-[var(--bg-input)] border border-[var(--border-panel)] py-4 pl-12 pr-6 text-sm text-[color:var(--text-primary)] outline-none focus:border-[color:var(--gold)]/40"
                          />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[320px] overflow-y-auto custom-scrollbar pr-2">
                          {archetypes
                            .filter((a: any) => a.name.toLowerCase().includes(archetypeSearch.toLowerCase()))
                            .map((a: any) => (
                              <button
                                key={a.id}
                                onClick={() => handleApplyArchetype(a.id)}
                                disabled={isPending}
                                className="group relative flex flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-panel)] p-4 transition hover:border-[color:var(--gold)]/40 hover:bg-[color:var(--mist)] active:scale-95 disabled:opacity-50"
                              >
                                <div className="rounded-xl bg-[var(--bg-input)] p-3 group-hover:bg-[color:var(--gold)]/20 transition-colors">
                                  <User size={20} className="text-[color:var(--text-muted)] group-hover:text-[color:var(--gold)]" />
                                </div>
                                <span className="text-[10px] font-black text-center text-[color:var(--text-muted)] group-hover:text-[color:var(--text-primary)] uppercase leading-tight">{a.name}</span>
                                {isPending && <Activity size={12} className="absolute top-2 right-2 animate-spin text-[color:var(--gold)]" />}
                              </button>
                            ))}
                        </div>
                        {archetypes.length === 0 && (
                          <div className="py-12 text-center text-[color:var(--text-muted)]/20 text-xs font-black uppercase tracking-widest">
                            Carregando Arquétipos...
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="group rounded-3xl border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-5 transition hover:border-[var(--border-panel)]/60 hover:bg-[var(--bg-panel)]/60">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)] mb-3 block">Conceito do Guerreiro</label>
                    <input
                      type="text"
                      value={getRawString("concept")}
                      onChange={(e) => updateRaw("concept", e.target.value)}
                      disabled={!canManage}
                      placeholder="Ex: Ronin Errante"
                      className="w-full bg-transparent text-lg font-black text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]/20"
                    />
                  </div>
                  <div className="group rounded-3xl border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-5 transition hover:border-[var(--border-panel)]/60 hover:bg-[var(--bg-panel)]/60">
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-[color:var(--text-muted)] mb-3 block">Clã ou Afiliação</label>
                    <input
                      type="text"
                      value={getRawString("clan")}
                      onChange={(e) => updateRaw("clan", e.target.value)}
                      disabled={!canManage}
                      placeholder="Ex: Taira / Minamoto"
                      className="w-full bg-transparent text-lg font-black text-[color:var(--gold)] outline-none placeholder:text-[color:var(--gold)]/20"
                    />
                  </div>
                </div>

                 <section>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[var(--border-panel)]" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--text-muted)]">Essência do Bushido</h3>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[var(--border-panel)]" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { key: "st", label: "ST", desc: "Força", color: "amber", cost: "10 pts/nível", help: "Dano e Carga" },
                      { key: "dx", label: "DX", desc: "Destreza", color: "sky", cost: "20 pts/nível", help: "Agilidade e Esquiva" },
                      { key: "iq", label: "IQ", desc: "Inteligência", color: "emerald", cost: "20 pts/nível", help: "Mente e Perícias" },
                      { key: "ht", label: "HT", desc: "Vigor", color: "rose", cost: "10 pts/nível", help: "Saúde e Fadiga" }
                    ].map((attr) => (
                      <div key={attr.key} className="relative group overflow-hidden rounded-3xl border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-5 text-center transition hover:border-[color:var(--gold)]/30">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--border-panel)] to-transparent" />
                        <label className="block text-[9px] font-black text-[color:var(--text-muted)] tracking-widest mb-1">{attr.desc}</label>
                        <input
                          type="number"
                          value={draftProfile.attributes[attr.key as keyof typeof draftProfile.attributes]}
                          onChange={(e) => updateAttribute(attr.key as any, e.target.value)}
                          disabled={!canManage}
                          className="w-full bg-transparent text-center text-4xl font-black text-[color:var(--text-primary)] outline-none"
                        />
                        <button
                          onClick={() => handleQuickRoll("3d6", draftProfile.attributes[attr.key as keyof typeof draftProfile.attributes], `Teste de ${attr.label}`)}
                          className="absolute top-2 right-2 p-2 rounded-lg bg-[var(--bg-input)] text-[color:var(--text-muted)] hover:bg-[color:var(--gold)]/20 hover:text-[color:var(--gold)] transition-all opacity-0 group-hover:opacity-100"
                          title={`Rolar teste de ${attr.label}`}
                        >
                          <Dices size={14} />
                        </button>
                        <div className="mt-2 flex flex-col items-center gap-1">
                          <div className="inline-block rounded-full bg-[var(--bg-card)] border border-[var(--border-panel)] px-3 py-1 text-[8px] font-black text-[color:var(--gold)] uppercase">
                            {attr.label}
                          </div>
                          <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase tracking-tighter">{attr.cost}</span>
                          <span className="text-[6px] font-medium text-[color:var(--text-muted)]/20 uppercase hidden group-hover:block">{attr.help}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <HeartPulse size={14} className="text-rose-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Vitalidade</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-4 text-center">
                        <span className="text-[8px] font-black text-rose-500/60 uppercase tracking-widest mb-1 block">Vida [PV]</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={draftProfile.attributes.hpMax} onChange={(e) => updateAttribute("hpMax", e.target.value)} disabled={!canManage} className="w-16 bg-transparent text-center text-2xl font-black text-[color:var(--text-primary)] outline-none" />
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-[color:var(--text-muted)]">±</span>
                            <input type="number" value={getRawNumber("hpBonus")} onChange={(e) => updateRaw("hpBonus", parseInt(e.target.value, 10))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-rose-500 text-center outline-none" />
                          </div>
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: ST + Bônus</span>
                      </div>
                      <div className="rounded-3xl border border-[color:var(--gold)]/20 bg-[color:var(--mist)] p-4 text-center">
                        <span className="text-[8px] font-black text-[color:var(--gold)]/60 uppercase tracking-widest mb-1 block">Fadiga [PF]</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={draftProfile.attributes.fpMax} onChange={(e) => updateAttribute("fpMax", e.target.value)} disabled={!canManage} className="w-16 bg-transparent text-center text-2xl font-black text-[color:var(--text-primary)] outline-none" />
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-[color:var(--text-muted)]">±</span>
                            <input type="number" value={getRawNumber("fpBonus")} onChange={(e) => updateRaw("fpBonus", parseInt(e.target.value, 10))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-[color:var(--gold)] text-center outline-none" />
                          </div>
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: HT + Bônus</span>
                      </div>
                      <div className="rounded-3xl border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-4 text-center">
                        <span className="text-[8px] font-black text-[color:var(--text-muted)] uppercase tracking-widest mb-1 block">Vontade</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={draftProfile.attributes.will} onChange={(e) => updateAttribute("will", e.target.value)} disabled={!canManage} className="w-12 bg-transparent text-center text-xl font-bold text-[color:var(--text-primary)] outline-none" />
                          <input type="number" value={getRawNumber("willBonus")} onChange={(e) => updateRaw("willBonus", parseInt(e.target.value, 10))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-emerald-500 text-center outline-none" />
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: IQ + Bônus</span>
                      </div>
                      <div className="rounded-3xl border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-4 text-center">
                        <span className="text-[8px] font-black text-[color:var(--text-muted)] uppercase tracking-widest mb-1 block">Percepção</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={draftProfile.attributes.per} onChange={(e) => updateAttribute("per", e.target.value)} disabled={!canManage} className="w-12 bg-transparent text-center text-xl font-bold text-[color:var(--text-primary)] outline-none" />
                          <input type="number" value={getRawNumber("perBonus")} onChange={(e) => updateRaw("perBonus", parseInt(e.target.value, 10))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-emerald-500 text-center outline-none" />
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: IQ + Bônus</span>
                      </div>
                    </div>
                  </section>

                   <section className="space-y-4">
                    <div className="flex items-center gap-2 px-2">
                      <Shield size={14} className="text-sky-500" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Defesas Ativas</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-3xl border border-[color:var(--gold)]/20 bg-[color:var(--mist)] p-4 text-center">
                        <span className="text-[8px] font-black text-[color:var(--gold)]/60 uppercase tracking-widest mb-1 block">Velocidade</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" step="0.25" value={draftProfile.derived.basicSpeed} onChange={(e) => updateDerived("basicSpeed", e.target.value)} disabled={!canManage} className="w-16 bg-transparent text-center text-2xl font-black text-[color:var(--text-primary)] outline-none" />
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-[color:var(--text-muted)]">±</span>
                            <input type="number" step="0.25" value={getRawNumber("speedBonus")} onChange={(e) => updateRaw("speedBonus", parseFloat(e.target.value))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-[color:var(--gold)] text-center outline-none" />
                          </div>
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: (DX+HT)/4</span>
                      </div>
                      <div className="rounded-3xl border border-sky-500/20 bg-sky-500/5 p-4 text-center">
                        <span className="text-[8px] font-black text-sky-500/60 uppercase tracking-widest mb-1 block">Esquiva</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={draftProfile.defenses.dodge} onChange={(e) => updateDefense("dodge", e.target.value)} disabled={!canManage} className="w-12 bg-transparent text-center text-2xl font-black text-[color:var(--text-primary)] outline-none" />
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-[color:var(--text-muted)]">±</span>
                            <input type="number" value={getRawNumber("dodgeBonus")} onChange={(e) => updateRaw("dodgeBonus", parseInt(e.target.value, 10))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-sky-500 text-center outline-none" />
                          </div>
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: Vel+3-Carga</span>
                      </div>
                      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-center">
                        <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest mb-1 block">Deslocamento</span>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" value={draftProfile.derived.move} onChange={(e) => updateDerived("move", e.target.value)} disabled={!canManage} className="w-12 bg-transparent text-center text-2xl font-black text-[color:var(--text-primary)] outline-none" />
                          <div className="flex flex-col items-center">
                            <span className="text-[7px] font-black text-[color:var(--text-muted)]">±</span>
                            <input type="number" value={getRawNumber("moveBonus")} onChange={(e) => updateRaw("moveBonus", parseInt(e.target.value, 10))} className="w-8 bg-[var(--bg-input)] rounded-md text-[10px] font-black text-emerald-500 text-center outline-none" />
                          </div>
                        </div>
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">Base: Vel * Carga</span>
                      </div>
                      <div className="rounded-3xl border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-4 text-center">
                        <span className="text-[8px] font-black text-[color:var(--text-muted)] uppercase tracking-widest mb-1 block">Aparar</span>
                        <input type="number" value={draftProfile.defenses.parry} onChange={(e) => updateDefense("parry", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-[color:var(--text-primary)] outline-none" />
                        <span className="text-[7px] font-bold text-[color:var(--text-muted)]/40 uppercase block mt-1">(Skill / 2) + 3</span>
                      </div>
                    </div>
                  </section>

                </div>
              </div>
            )}

            {activeTab === "combat" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Status em Tempo Real */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="rounded-[40px] border border-rose-500/20 bg-rose-500/5 p-8 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black text-rose-500/60 uppercase tracking-[0.2em] mb-4">Pontos de Vida Atuais</span>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <input 
                          type="number" 
                          value={draftProfile.combat.currentHp ?? 0} 
                          onChange={(e) => updateCombat("currentHp", parseInt(e.target.value, 10))}
                          className="w-24 bg-transparent text-center text-5xl font-black text-[color:var(--text-primary)] outline-none"
                        />
                        <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase mt-2">ATUAL</span>
                      </div>
                      <div className="h-12 w-px bg-[var(--border-panel)]" />
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-[color:var(--text-muted)]/40">{draftProfile.attributes.hpMax}</span>
                        <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase mt-2">MÁXIMO</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateCombat("currentHp", draftProfile.attributes.hpMax)}
                      className="text-[8px] font-black text-rose-500/40 hover:text-rose-500 uppercase tracking-widest mt-4 transition-colors"
                    >
                      Restaurar Vitalidade
                    </button>
                  </div>

                  <div className="rounded-[40px] border border-amber-500/20 bg-amber-500/5 p-8 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-black text-amber-500/60 uppercase tracking-[0.2em] mb-4">Pontos de Fadiga Atuais</span>
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <input 
                          type="number" 
                          value={draftProfile.combat.currentFp ?? 0} 
                          onChange={(e) => updateCombat("currentFp", parseInt(e.target.value, 10))}
                          className="w-24 bg-transparent text-center text-5xl font-black text-[color:var(--text-primary)] outline-none"
                        />
                        <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase mt-2">ATUAL</span>
                      </div>
                      <div className="h-12 w-px bg-[var(--border-panel)]" />
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-[color:var(--text-muted)]/40">{draftProfile.attributes.fpMax}</span>
                        <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase mt-2">MÁXIMO</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateCombat("currentFp", draftProfile.attributes.fpMax)}
                      className="text-[8px] font-black text-sky-500/40 hover:text-sky-500 uppercase tracking-widest mt-4 transition-colors"
                    >
                      Restaurar Energia
                    </button>
                  </div>

                  <div className="rounded-[32px] border border-amber-400/20 bg-amber-400/5 p-6 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <Sparkles size={18} className="text-amber-300" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-200">
                        Inspiracao
                      </span>
                    </div>
                    <input
                      type="number"
                      min={0}
                      value={draftProfile.combat.inspiration ?? 0}
                      onChange={(e) => updateCombat("inspiration", Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="mt-3 w-24 bg-transparent text-center text-4xl font-black text-amber-100 outline-none"
                    />
                    <p className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-amber-100/45">
                      rerrolagens disponiveis
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[32px] border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black text-[color:var(--text-muted)] uppercase tracking-[0.2em] mb-2">Dano de Balanço (GeB)</span>
                    <span className="text-3xl font-black text-[color:var(--gold)]">{dmg.geb}</span>
                  </div>
                  <div className="rounded-[32px] border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-6 flex flex-col items-center justify-center text-center">
                    <span className="text-[9px] font-black text-[color:var(--text-muted)] uppercase tracking-[0.2em] mb-2">Dano de Perfuração (GdP)</span>
                    <span className="text-3xl font-black text-[color:var(--gold)]">{dmg.gdp}</span>
                  </div>
                </div>


                {/* Condições Temporárias */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                        <Zap size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-[color:var(--text-primary)]">Choque & Penalidades</h4>
                        <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-tighter">Redução em testes no próximo turno</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-[var(--bg-input)] p-4 rounded-2xl border border-[var(--border-panel)]">
                      <span className="text-[10px] font-black text-[color:var(--text-muted)] uppercase">Penalidade de Choque</span>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0" max="4" step="1"
                          value={draftProfile.combat.shock ?? 0}
                          onChange={(e) => updateCombat("shock", parseInt(e.target.value, 10))}
                          className="w-32 accent-rose-500"
                        />
                        <span className="w-8 text-center text-xl font-black text-rose-500">-{draftProfile.combat.shock}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-[var(--bg-input)] p-4 rounded-2xl border border-[var(--border-panel)]">
                      <span className="text-[10px] font-black text-[color:var(--text-muted)] uppercase">Penalidade de Fadiga</span>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0" max="6" step="1"
                          value={draftProfile.combat.fatigue ?? 0}
                          onChange={(e) => updateCombat("fatigue", parseInt(e.target.value, 10))}
                          className="w-32 accent-amber-500"
                        />
                        <span className="w-8 text-center text-xl font-black text-amber-500">-{draftProfile.combat.fatigue}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between bg-[var(--bg-input)] p-4 rounded-2xl border border-[var(--border-panel)]">
                      <span className="text-[10px] font-black text-[color:var(--text-muted)] uppercase">Penalidade de Dor</span>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" min="0" max="6" step="1"
                          value={draftProfile.combat.pain ?? 0}
                          onChange={(e) => updateCombat("pain", parseInt(e.target.value, 10))}
                          className="w-32 accent-purple-500"
                        />
                        <span className="w-8 text-center text-xl font-black text-purple-500">-{draftProfile.combat.pain}</span>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                          <Package size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-[color:var(--text-primary)]">Inventário por Slots</h4>
                          <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-tighter">Capacidade Base: {st} Slots (1x ST)</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-xl font-black",
                          slotsUsed > st ? "text-rose-500" : "text-emerald-500"
                        )}>
                          {slotsUsed}
                        </span>
                        <span className="text-xs font-bold text-[color:var(--text-muted)]"> / {st}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {slotThresholds.map((t) => {
                        const isActive = encumbranceLevel === t.level;
                        const isExceeded = slotsUsed > t.limit;
                        
                        return (
                          <div 
                            key={t.level}
                            className={cn(
                              "flex items-center justify-between px-4 py-2.5 rounded-2xl border transition-all",
                              isActive 
                                ? "bg-[color:var(--gold)]/10 border-[color:var(--gold)]/40 shadow-inner" 
                                : isExceeded 
                                  ? "bg-rose-500/5 border-rose-500/10 opacity-40" 
                                  : "bg-[var(--bg-input)] border-[var(--border-panel)] opacity-60"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                isActive ? "bg-[color:var(--gold)] animate-pulse" : "bg-[color:var(--text-muted)]"
                              )} />
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest",
                                isActive ? "text-[color:var(--gold)]" : "text-[color:var(--text-muted)]"
                              )}>
                                {t.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-[9px] font-bold text-[color:var(--text-muted)]">
                                Até {t.limit} Slots
                              </span>
                              <div className="flex gap-2">
                                <span className={cn(
                                  "text-[9px] font-black px-2 py-0.5 rounded bg-black/20",
                                  isActive ? "text-[color:var(--gold)]" : "text-[color:var(--text-muted)]"
                                )}>
                                  {Math.round(t.move * 100)}% Mov
                                </span>
                                {t.dodge !== 0 && (
                                  <span className="text-[9px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-400">
                                    {t.dodge} Esq
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="mt-6 text-[9px] text-[color:var(--text-muted)] leading-relaxed italic border-t border-[var(--border-panel)] pt-4">
                      * Itens abaixo de 0.5kg não ocupam slots. Pesos são arredondados para cima (1.5kg = 2 slots).
                    </p>
                  </section>
                </div>

                {/* Memória Muscular e Manobras */}
                <section className="rounded-[40px] border border-sky-500/10 bg-sky-500/5 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 border border-sky-500/20">
                        <Brain size={20} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-widest text-[color:var(--text-primary)]">Memória Muscular</h4>
                        <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-tighter">Slots de Manobras Avançadas (Nível 2 e 3)</p>
                      </div>
                    </div>
                  </div>

                  {/* Gestão de Maestria */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer",
                      draftProfile.raw?.unlockedLevel2 ? "bg-sky-500/10 border-sky-500/20" : "bg-[var(--bg-input)] border-[var(--border-panel)]"
                    )} onClick={() => updateRaw("unlockedLevel2", !draftProfile.raw?.unlockedLevel2)}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-5 h-5 rounded-lg border flex items-center justify-center transition-all", draftProfile.raw?.unlockedLevel2 ? "bg-sky-500 border-sky-400" : "bg-[var(--bg-card)] border-[var(--border-panel)]")}>
                          {!!draftProfile.raw?.unlockedLevel2 && <Save size={12} className="text-sky-950" />}
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-[color:var(--text-primary)] uppercase tracking-widest">Nível 2: Chuden</h5>
                          <p className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase">Perícia 12+ ou 5pts Estilo</p>
                        </div>
                      </div>
                    </div>

                    <div className={cn(
                      "flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer",
                      draftProfile.raw?.unlockedLevel3 ? "bg-[color:var(--mist)] border-[color:var(--gold)]/20" : "bg-[var(--bg-input)] border-[var(--border-panel)]"
                    )} onClick={() => updateRaw("unlockedLevel3", !draftProfile.raw?.unlockedLevel3)}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-5 h-5 rounded-lg border flex items-center justify-center transition-all", draftProfile.raw?.unlockedLevel3 ? "bg-[color:var(--gold)] border-[color:var(--gold)]/40" : "bg-[var(--bg-card)] border-[var(--border-panel)]")}>
                          {!!draftProfile.raw?.unlockedLevel3 && <Save size={12} className="text-[color:var(--mist)]" />}
                        </div>
                        <div>
                          <h5 className="text-[10px] font-black text-[color:var(--text-primary)] uppercase tracking-widest">Nível 3: Okuden</h5>
                          <p className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase">Perícia 14+ e Estilo Luta</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nível 1 - Sempre Disponíveis */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Shoden (Básico)</span>
                      <div className="h-px flex-1 bg-sky-500/10" />
                      <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase">Sempre Ativas</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {MANEUVER_CATALOG.filter(m => m.level === 1).map(m => (
                        <div key={m.id} className="px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-panel)] flex items-center gap-2">
                          <span className="text-[9px] font-black text-[color:var(--text-muted)] uppercase tracking-widest">{m.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Slots para Nível 2 e 3 */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[0, 1, 2].map((slotIdx) => {
                      const selectedId = draftProfile.combat.loadoutTechniqueIds[slotIdx];
                      const isL2Unlocked = !!draftProfile.raw?.unlockedLevel2;
                      const isL3Unlocked = !!draftProfile.raw?.unlockedLevel3;
                      
                      return (
                        <div key={slotIdx} className="relative group">
                          <select 
                            value={selectedId || ""} 
                            onChange={(e) => {
                              const nextIds = [...draftProfile.combat.loadoutTechniqueIds];
                              nextIds[slotIdx] = e.target.value;
                              updateCombat("loadoutTechniqueIds", nextIds.filter(Boolean));
                            }}
                            className="w-full appearance-none rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-4 text-xs font-bold text-[color:var(--text-primary)] outline-none focus:border-sky-500/40 transition-all cursor-pointer"
                          >
                            <option value="">-- Kamae --</option>
                            <optgroup label="Nível 2: Chuden" className="bg-[var(--bg-panel)]">
                              {MANEUVER_CATALOG.filter(m => m.level === 2).map(m => {
                                const isLocked = !isL2Unlocked;
                                const isSelectedElsewhere = draftProfile.combat.loadoutTechniqueIds.includes(m.id) && selectedId !== m.id;
                                return (
                                  <option key={m.id} value={m.id} disabled={isLocked || isSelectedElsewhere}>
                                    {isLocked ? "🔒 " : ""}{m.name} {isSelectedElsewhere ? "[EM USO]" : ""}
                                  </option>
                                );
                              })}
                            </optgroup>
                            <optgroup label="Nível 3: Okuden" className="bg-[var(--bg-panel)]">
                              {MANEUVER_CATALOG.filter(m => m.level === 3).map(m => {
                                const isLocked = !isL3Unlocked;
                                const isSelectedElsewhere = draftProfile.combat.loadoutTechniqueIds.includes(m.id) && selectedId !== m.id;
                                return (
                                  <option key={m.id} value={m.id} disabled={isLocked || isSelectedElsewhere}>
                                    {isLocked ? "🔒 " : ""}{m.name} {isSelectedElsewhere ? "[EM USO]" : ""}
                                  </option>
                                );
                              })}
                            </optgroup>
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--text-muted)]">
                            <ChevronDown size={14} />
                          </div>
                          <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-[color:var(--text-muted)] text-center">
                            MUSCULAR {slotIdx + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-px bg-sky-500/10 my-8" />

                  {/* Estilo de Luta e Técnicas Exclusivas */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[10px] font-black text-[color:var(--gold)] uppercase tracking-widest">Maestria de Estilo (Budô)</span>
                      <div className="h-px flex-1 bg-[color:var(--gold)]/10" />
                      <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase">2 Técnicas de Estilo</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Seletor de Estilo */}
                      <div className="relative group sm:col-span-1">
                        <select
                          value={draftProfile.style.name}
                          onChange={(e) => {
                            setDraftProfile(prev => ({
                              ...prev,
                              style: { ...prev.style, name: e.target.value },
                              combat: { ...prev.combat, loadoutStyleTechniqueIds: [] } // Reseta técnicas ao mudar estilo
                            }));
                          }}
                          className="w-full appearance-none rounded-2xl border border-[color:var(--gold)]/20 bg-[var(--bg-input)] px-4 py-4 text-xs font-bold text-[color:var(--gold)] outline-none focus:border-[color:var(--gold)]/60 transition-all cursor-pointer"
                        >
                          <option value="Básico">-- Selecionar Estilo --</option>
                          {styles.map(s => (
                            <option key={s.id} value={s.nome}>{s.nome}</option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--gold)] pointer-events-none opacity-40" />
                        <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-[color:var(--gold)]/40 text-center">
                          ESTILO ATIVO
                        </div>
                      </div>

                      {/* Slots de Técnica do Estilo */}
                      {[0, 1].map((slotIdx) => {
                        const selectedTechId = draftProfile.combat.loadoutStyleTechniqueIds?.[slotIdx];
                        const currentStyleData = styles.find(s => s.nome === draftProfile.style.name);
                        const availableTechs = normalizeStyleTechniqueRecords({
                          styleName: draftProfile.style.name,
                          techniques: currentStyleData?.tecnicas || [],
                          fallbackSkill: draftProfile.skills[0]?.name,
                          fallbackLevel: draftProfile.skills[0]?.level
                        });

                        return (
                          <div key={slotIdx} className="relative group">
                            <select
                              value={selectedTechId || ""}
                              onChange={(e) => {
                                const nextTechs = [...(draftProfile.combat.loadoutStyleTechniqueIds || [])];
                                nextTechs[slotIdx] = e.target.value;
                                updateCombat("loadoutStyleTechniqueIds", nextTechs.filter(Boolean));
                              }}
                              disabled={!currentStyleData}
                              className="w-full appearance-none rounded-2xl border border-[var(--border-panel)] bg-[var(--bg-input)] px-4 py-4 text-xs font-bold text-[color:var(--text-primary)] outline-none focus:border-sky-500/40 transition-all cursor-pointer disabled:opacity-30"
                            >
                              <option value="">-- Técnica {slotIdx + 1} --</option>
                              {availableTechs.map((t) => {
                                const techniqueId = normalizeStyleTechniqueId(draftProfile.style.name, t.name);
                                const isSelectedElsewhere = (draftProfile.combat.loadoutStyleTechniqueIds || []).includes(techniqueId) && selectedTechId !== techniqueId;
                                return (
                                  <option key={techniqueId} value={techniqueId} disabled={isSelectedElsewhere}>
                                    {t.name} {isSelectedElsewhere ? "[EM USO]" : ""}
                                  </option>
                                );
                              })}
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)] pointer-events-none opacity-40" />
                            <div className="mt-2 text-[8px] font-black uppercase tracking-widest text-[color:var(--text-muted)] text-center">
                              TÉCNICA {slotIdx + 1}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-[color:var(--mist)] p-4 border border-[color:var(--gold)]/10">
                    <RotateCcw size={14} className="text-[color:var(--gold)]" />
                    <p className="text-[9px] font-bold text-[color:var(--gold)]/60 uppercase tracking-widest">A troca de postura mental gasta 1 turno de concentração</p>
                  </div>
                </section>

                {/* Postura e Condição */}
                <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-2xl bg-[color:var(--mist)] flex items-center justify-center text-[color:var(--gold)] border border-[color:var(--gold)]/20">
                      <Activity size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-[color:var(--text-primary)]">Postura de Combate</h4>
                      <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-tighter">Afeta defesas e ataques</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "standing", label: "Em Pé" },
                      { id: "crouching", label: "Agachado" },
                      { id: "kneeling", label: "Ajoelhado" },
                      { id: "sitting", label: "Sentado" },
                      { id: "prone", label: "Caído / Deitado" }
                    ].map((p) => (
                      <button
                        key={p.id}
                        onClick={() => updateCombat("posture", p.id)}
                        className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          draftProfile.combat.posture === p.id 
                            ? "bg-[color:var(--gold)] border-[color:var(--gold)]/40 text-[color:var(--bg-deep)] shadow-lg shadow-[color:var(--gold)]/20" 
                            : "bg-[var(--bg-input)] border-[var(--border-panel)] text-[color:var(--text-muted)] hover:bg-[var(--bg-card)]"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-[color:var(--mist)] flex items-center justify-center text-[color:var(--gold)] border border-[color:var(--gold)]/20">
                          <Swords size={20} />
                        </div>
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-[color:var(--text-primary)]">Arsenal de Combate</h4>
                          <p className="text-[10px] font-bold text-[color:var(--text-muted)] uppercase tracking-tighter">Armas e Armaduras prontas para uso</p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 w-full sm:items-center">
                        <div className="relative flex-1">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]" size={16} />
                          <input 
                            type="text" 
                            value={arsenalSearch}
                            onChange={(e) => {
                              setArsenalSearch(e.target.value);
                              if (!showArsenalSelector) setShowArsenalSelector(true);
                            }}
                            onFocus={() => setShowArsenalSelector(true)}
                            placeholder="Buscar no Codex (Katana, O-Yoroi, Shuriken...)" 
                            className="w-full rounded-2xl bg-[var(--bg-input)] border border-[var(--border-panel)] py-3 pl-12 pr-6 text-xs text-[color:var(--text-primary)] outline-none focus:border-[color:var(--gold)]/40 transition-all focus:ring-1 focus:ring-[color:var(--gold)]/20"
                          />
                        </div>

                        <div className="flex bg-[var(--bg-input)] p-1 rounded-2xl border border-[var(--border-panel)]">
                          {(["Tudo", "Armas", "Armaduras", "Equipamentos"] as const).map((cat) => (
                            <button
                              key={cat}
                              onClick={() => {
                                setArsenalCategory(cat);
                                setShowArsenalSelector(true);
                              }}
                              className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                arsenalCategory === cat 
                                  ? "bg-[color:var(--gold)] text-[color:var(--bg-panel)] shadow-lg shadow-[color:var(--gold)]/10" 
                                  : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]"
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        {showArsenalSelector && (
                          <button 
                            onClick={() => { setShowArsenalSelector(false); setArsenalSearch(""); }}
                            className="text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors px-2"
                          >
                            Fechar
                          </button>
                        )}
                      </div>
                    </div>

                    {showArsenalSelector && (
                      <div className="mb-8 rounded-[32px] border border-[color:var(--gold)]/30 bg-[color:var(--mist)] p-6 shadow-2xl shadow-black/40 animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[color:var(--gold)]/40 to-transparent" />
                        
                        <div className="flex items-center justify-between mb-4 px-2">
                          <span className="text-[10px] font-bold text-[color:var(--gold)]/60 uppercase tracking-widest">
                            {arsenalSearch ? `Resultados para "${arsenalSearch}"` : `Catálogo: ${arsenalCategory}`}
                          </span>
                          <span className="text-[10px] text-[color:var(--text-muted)]">
                            {equipment.filter((item: any) => {
                              const matchesSearch = item.name.toLowerCase().includes(arsenalSearch.toLowerCase());
                              const matchesCat = arsenalCategory === "Tudo" || item.category === arsenalCategory;
                              return matchesSearch && matchesCat;
                            }).length} itens encontrados
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto custom-scrollbar pr-2">
                          {equipment
                            .filter((item: any) => {
                              const matchesSearch = item.name.toLowerCase().includes(arsenalSearch.toLowerCase());
                              const matchesCat = arsenalCategory === "Tudo" || item.category === arsenalCategory;
                              return matchesSearch && matchesCat;
                            })
                            .map((item: any) => {
                              const isArmor = item.category === "Armaduras" || !!item.stats?.rd;
                              const isWeapon = item.category === "Armas";
                              
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    if (isWeapon) handleApplyWeapon(item);
                                    else if (isArmor) handleApplyArmor(item);
                                    else {
                                      setDraftProfile((prev: any) => ({
                                        ...prev,
                                        notes: [...(prev.notes || []), `${item.name}: ${item.stats?.efeito || item.stats?.notas || ""}`]
                                      }));
                                      setFeedback(`${item.name} adicionado às notas!`);
                                      setTimeout(() => setFeedback(null), 3000);
                                    }
                                  }}
                                  className="group relative flex flex-col items-start p-4 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-panel)] transition-all hover:border-[color:var(--gold)]/40 hover:bg-[color:var(--mist)] hover:shadow-lg text-left"
                                >
                                  <div className="flex items-center justify-between w-full mb-1">
                                    <span className="text-xs font-black text-[color:var(--text-primary)] group-hover:text-[color:var(--gold)] transition-colors">
                                      {item.name}
                                    </span>
                                    {isWeapon ? <Swords size={12} className="text-sky-400/50" /> : isArmor ? <Shield size={12} className="text-emerald-400/50" /> : <Package size={12} className="text-amber-400/50" />}
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {isWeapon && (
                                      <>
                                        <span className="text-[8px] bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded border border-sky-500/20">{item.stats?.dano}</span>
                                        <span className="text-[8px] bg-white/5 text-[color:var(--text-muted)] px-1.5 py-0.5 rounded">Alc {item.stats?.alcance}</span>
                                      </>
                                    )}
                                    {isArmor && (
                                      <>
                                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">RD {item.stats?.rd}</span>
                                        <span className="text-[8px] bg-white/5 text-[color:var(--text-muted)] px-1.5 py-0.5 rounded">{item.stats?.local}</span>
                                      </>
                                    )}
                                    <div className="flex items-center gap-3 ml-auto bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                                      <div className="flex flex-col items-end">
                                        <span className="text-[8px] text-amber-500 font-black uppercase leading-none">{item.stats?.peso || "-"}</span>
                                        <span className="text-[6px] text-amber-500/60 font-bold uppercase tracking-tighter">Peso</span>
                                      </div>
                                      <div className="w-px h-4 bg-amber-500/20" />
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] text-amber-500 font-black leading-none">{item.stats?.peso ? Math.ceil(parseFloat(item.stats.peso)) : 0}</span>
                                        <span className="text-[6px] text-amber-500/60 font-bold uppercase tracking-tighter">Slots</span>
                                      </div>
                                      <div className="w-px h-4 bg-amber-500/20" />
                                      <span className="text-[9px] text-[color:var(--text-muted)] italic opacity-60 font-black">{item.stats?.custo || "-"}</span>
                                    </div>
                                  </div>

                                  {item.stats?.notas && (
                                    <p className="text-[9px] text-[color:var(--text-muted)] mt-2 line-clamp-1 group-hover:line-clamp-none transition-all">
                                      {item.stats.notas}
                                    </p>
                                  )}

                                  <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-[color:var(--gold)]/0 group-hover:ring-[color:var(--gold)]/20 transition-all" />
                                </button>
                              );
                            })}
                        </div>
                      </div>
                    )}

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4 px-2">
                      <span className="text-[10px] font-black text-[color:var(--gold)] uppercase tracking-widest">Armas de Ataque</span>
                    </div>
                    {draftProfile.weapons.map((w) => (
                      <div key={w.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_100px_48px] items-center gap-4 rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-3 transition-all hover:bg-[var(--bg-input)] hover:border-[color:var(--gold)]/20">
                        <div className="px-2 flex items-center gap-2">
                          <Swords size={12} className="text-[color:var(--gold)]/40" />
                          <div className="flex-1">
                            <span className="text-xs font-black text-[color:var(--text-primary)] uppercase tracking-tight block">{w.name}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[7px] font-bold text-[color:var(--text-muted)] uppercase tracking-widest">Equipamento de Campanha</span>
                              <span className="text-[7px] font-black text-amber-500/60 uppercase px-1.5 py-0.5 rounded bg-amber-500/5 border border-amber-500/10">
                                {w.weight || "0 kg"} ({Math.ceil(parseFloat(String(w.weight || "0")))} SLOTS)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:contents gap-4">
                          <div>
                            <label className="block sm:hidden text-[7px] font-black text-[color:var(--text-muted)] uppercase mb-1">Qualidade</label>
                            <input 
                              value={w.quality || ""} 
                              onChange={(e) => updateWeapon(w.id, "quality", e.target.value)} 
                              disabled={!canManage} 
                              placeholder="Fina" 
                              className="w-full rounded-xl bg-[var(--bg-card)] px-3 py-2 text-[10px] font-bold text-[color:var(--text-muted)] outline-none text-center border border-[var(--border-panel)]" 
                            />
                          </div>
                          <div className="relative group/dmg">
                            <label className="block sm:hidden text-[7px] font-black text-[color:var(--text-muted)] uppercase mb-1">Dano</label>
                            <div className="w-full rounded-xl bg-[var(--bg-card)] px-3 py-2 text-[10px] font-black text-[color:var(--gold)] text-right border border-[var(--border-panel)]">
                              {w.rawDamage}
                            </div>
                            {w.rawDamage && (
                              <div className="mt-1 flex justify-end">
                                <span className="text-[9px] font-black text-[color:var(--gold)] uppercase opacity-60">
                                  Total: {formatDamageSpec(parseDamageSpec(w.rawDamage), st)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-center border-t sm:border-t-0 border-[var(--border-panel)] pt-2 sm:pt-0">
                          {canManage && (
                            <button onClick={() => removeWeapon(w.id)} className="rounded-xl p-2 text-[color:var(--text-muted)]/20 transition hover:bg-rose-500/20 hover:text-rose-400">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div className="h-px bg-[var(--border-panel)] my-6" />

                    <div className="flex items-center gap-2 mb-4 px-2">
                      <span className="text-[10px] font-black text-sky-500 uppercase tracking-widest">Armaduras e Proteção Localizada</span>
                    </div>
                    {draftProfile.armor.map((a) => (
                      <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_auto_48px] items-start gap-4 rounded-[24px] border border-[var(--border-panel)] bg-[var(--bg-input)]/40 p-3 transition-all hover:bg-[var(--bg-input)] hover:border-sky-500/20">
                        <div className="px-2 pt-1">
                          <div className="flex items-center gap-2 mb-3">
                            <Shield size={12} className="text-sky-500/40" />
                            <div className="flex-1">
                              <span className="text-xs font-black text-[color:var(--text-primary)] uppercase tracking-tight block">{a.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[7px] font-bold text-[color:var(--text-muted)] uppercase tracking-widest">Proteção Certificada</span>
                                <span className="text-[7px] font-black text-amber-500/60 uppercase px-1.5 py-0.5 rounded bg-amber-500/5 border border-amber-500/10">
                                  {a.weight || "0 kg"} ({Math.ceil(parseFloat(String(a.weight || "0")))} SLOTS)
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {HIT_LOCATIONS.map((loc) => {
                              const isCovered = Array.isArray(a.zone) ? a.zone.includes(loc.id as any) : a.zone === "all";
                              return (
                                <button
                                  key={loc.id}
                                  onClick={() => {
                                    if (!canManage) return;
                                    const currentZones = Array.isArray(a.zone) ? [...a.zone] : ["torso"];
                                    const nextZones = isCovered 
                                      ? currentZones.filter(z => z !== loc.id)
                                      : [...currentZones, loc.id];
                                    updateArmor(a.id, "zone", nextZones.length > 0 ? nextZones : ["torso"]);
                                  }}
                                  className={cn(
                                    "px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border transition-all",
                                    isCovered 
                                      ? "bg-sky-500/10 border-sky-500/30 text-sky-400" 
                                      : "bg-transparent border-[var(--border-panel)] text-[color:var(--text-muted)] hover:border-sky-500/20"
                                  )}
                                >
                                  {loc.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div className="pt-1">
                          <label className="block text-[7px] font-black text-[color:var(--text-muted)] uppercase mb-1 text-center">RD FIXA</label>
                          <div className="w-full rounded-xl bg-sky-500/10 px-3 py-2 text-sm font-black text-sky-500 text-center border border-sky-500/20">
                            {a.dr}
                          </div>
                        </div>
                        <div className="pt-2 flex justify-center">
                          <button 
                            onClick={() => updateArmor(a.id, "zone", HIT_LOCATIONS.map(l => l.id))}
                            className="text-[8px] font-black text-sky-500/40 hover:text-sky-500 uppercase tracking-widest transition-colors"
                          >
                            Tudo
                          </button>
                        </div>
                        <div className="flex justify-center pt-1">
                          {canManage && (
                            <button onClick={() => removeArmor(a.id)} className="rounded-xl p-2 text-[color:var(--text-muted)]/20 transition hover:bg-rose-500/20 hover:text-rose-400">
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {(draftProfile.weapons.length === 0 && draftProfile.armor.length === 0) && (
                      <div className="flex flex-col items-center justify-center py-12 rounded-[32px] border border-dashed border-[var(--border-panel)] bg-[var(--bg-input)]/20 text-[color:var(--text-muted)]/20">
                        <Swords size={32} strokeWidth={1} />
                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.4em]">Arsenal Vazio</p>
                      </div>
                    )}
                  </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <ShieldAlert className="text-sky-500" size={18} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Resumo da Resistência (RD)</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10">
                        <p className="text-[9px] font-bold text-sky-500 uppercase tracking-widest mb-3">Proteção Automatizada</p>
                        <div className="grid grid-cols-2 gap-2">
                          {HIT_LOCATIONS.map(loc => {
                            const totalDr = (draftProfile.armor || []).reduce((sum, a) => {
                              const isCovered = Array.isArray(a.zone) ? a.zone.includes(loc.id as any) : a.zone === "all";
                              return isCovered ? sum + a.dr : sum;
                            }, 0);
                            return (
                              <div key={loc.id} className="flex justify-between items-center px-3 py-1.5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-panel)]">
                                <span className="text-[8px] font-black text-[color:var(--text-muted)] uppercase">{loc.label}</span>
                                <span className="text-xs font-black text-sky-500">{totalDr}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="h-px bg-[var(--border-panel)] my-4" />

                      <div className="space-y-2">
                        <p className="text-[8px] font-black text-[color:var(--text-muted)] uppercase tracking-widest mb-1 px-1">Ajustes Manuais / Bônus</p>
                        {[
                          { key: "drTop", label: "Topo (Cabeça/Pescoço)" },
                          { key: "drMiddle", label: "Meio (Tronco/Vitais)" },
                          { key: "drBottom", label: "Base (Membros)" }
                        ].map(dr => (
                          <div key={dr.key} className="flex items-center justify-between rounded-xl bg-[var(--bg-input)] p-3 border border-[var(--border-panel)] transition hover:bg-[var(--bg-card)]">
                            <span className="text-[8px] font-bold text-[color:var(--text-muted)] uppercase">{dr.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-sky-500/40">+</span>
                              <input 
                                type="number" 
                                value={getRawNumber(dr.key)} 
                                onChange={(e) => updateRaw(dr.key, parseInt(e.target.value, 10))} 
                                disabled={!canManage} 
                                className="w-12 rounded-lg bg-[var(--bg-panel)] p-1 text-center text-xs font-black text-[color:var(--text-primary)] outline-none border border-[var(--border-panel)] focus:border-sky-500/40" 
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8 flex flex-col">
                    <div className="flex items-center gap-3 mb-6">
                      <Package className="text-emerald-500" size={18} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">Inventário Geral</h4>
                    </div>
                    <textarea 
                      value={getRawString("equipmentText")} 
                      onChange={(e) => updateRaw("equipmentText", e.target.value)} 
                      disabled={!canManage} 
                      className="w-full flex-1 min-h-[160px] resize-none bg-transparent text-sm text-[color:var(--text-secondary)] outline-none custom-scrollbar leading-relaxed placeholder:text-[color:var(--text-muted)]/20" 
                      placeholder="Descreva aqui seus pertences, rações e itens diversos..."
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "traits" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className="text-[color:var(--gold)]" size={18} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-primary)]">Vantagens & Qualidades</h4>
                    </div>
                    <textarea
                      value={getRawString("advantages")}
                      onChange={(e) => updateRaw("advantages", e.target.value)}
                      disabled={!canManage}
                      rows={6}
                      className="w-full resize-none bg-transparent text-sm text-[color:var(--text-secondary)] outline-none custom-scrollbar leading-relaxed"
                      placeholder="Reflexos em Combate [15], Visão Noturna..."
                    />
                  </section>
                  <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                    <div className="flex items-center gap-3 mb-6">
                      <Activity className="text-rose-500" size={18} />
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-primary)]">Desvantagens</h4>
                    </div>
                    <textarea
                      value={getRawString("disadvantages")}
                      onChange={(e) => updateRaw("disadvantages", e.target.value)}
                      disabled={!canManage}
                      rows={6}
                      className="w-full resize-none bg-transparent text-sm text-[color:var(--text-secondary)] outline-none custom-scrollbar leading-relaxed"
                      placeholder="Senso de Dever [-5], Código de Honra..."
                    />
                  </section>
                </div>

                <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/40 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <Brain className="text-sky-500" size={18} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-primary)]">Perícias & Técnicas</h4>
                    {encumbranceLevel > 0 && (
                      <span className="ml-auto text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Carga {["Nenhuma", "Leve", "Média", "Pesada", "Muito Pesada"][encumbranceLevel]}
                      </span>
                    )}
                  </div>
                  <div className="space-y-3">
                    {(draftProfile.skills || []).map((skill) => {
                      const choque = draftProfile.combat.shock || 0;
                      const fadiga = draftProfile.combat.fatigue || 0;
                      const dor = draftProfile.combat.pain || 0;
                      const penalties = calculateSkillPenalties(skill.level, encumbranceLevel, choque, fadiga, dor);
                      const effectiveLevel = Math.max(0, skill.level - penalties.totalPenalty);
                      const targetRoll = 14 + skill.level - effectiveLevel;
                      
                      return (
                        <div key={skill.id} className="group relative flex items-center gap-3 rounded-2xl bg-[var(--bg-input)] p-3 border border-[var(--border-panel)] transition-all hover:bg-[var(--bg-card)] hover:border-sky-500/30">
                          <input
                            value={skill.name}
                            onChange={(e) => updateSkill(skill.id, "name", e.target.value)}
                            disabled={!canManage}
                            placeholder="Nome da Perícia"
                            className="flex-1 bg-transparent text-sm font-bold text-[color:var(--text-primary)] outline-none placeholder:text-[color:var(--text-muted)]/20"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-[color:var(--text-muted)] uppercase tracking-tighter">NH</span>
                            <input
                              type="number"
                              value={skill.level}
                              onChange={(e) => updateSkill(skill.id, "level", parseInt(e.target.value, 10))}
                              disabled={!canManage}
                              className="w-10 rounded-lg bg-[var(--bg-panel)] p-1 text-center text-xs font-black text-sky-400 outline-none border border-[var(--border-panel)] focus:border-sky-500/40"
                            />
                          </div>
                          {penalties.totalPenalty > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20" title={penalties.description}>
                              -{penalties.totalPenalty}
                            </span>
                          )}
                          <span className="text-[9px] font-medium text-[color:var(--text-muted)]" title="Alvo 3d6">
                            3d6 ≤ {targetRoll}
                          </span>
                          <button
                            onClick={() => handleQuickRoll("3d6", skill.level, skill.name, true, "normal", false, skill.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 transition hover:bg-sky-500/20 active:scale-90"
                            title="Rolar normal"
                          >
                            <Dices size={14} />
                          </button>
                          <button
                            onClick={() => handleQuickRoll("3d6", skill.level, skill.name, true, "advantage", false, skill.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-300 transition hover:bg-emerald-500/20 active:scale-90"
                            title="Rolar com vantagem"
                          >
                            V
                          </button>
                          <button
                            onClick={() => handleQuickRoll("3d6", skill.level, skill.name, true, "disadvantage", false, skill.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20 active:scale-90"
                            title="Rolar com desvantagem"
                          >
                            D
                          </button>
                          <button
                            onClick={() => handleQuickRoll("3d6", skill.level, skill.name, true, "normal", true, skill.id)}
                            disabled={(draftProfile.combat.inspiration ?? 0) <= 0}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 transition hover:bg-amber-500/20 active:scale-90 disabled:opacity-25"
                            title="Gastar Inspiracao para rerrolar"
                          >
                            I
                          </button>
                          {canManage && (
                            <button
                              onClick={() => removeSkill(skill.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-xl text-red-500/20 transition hover:bg-red-500/10 hover:text-red-500 opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {canManage && (
                      <button
                        onClick={addSkill}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border-panel)] p-4 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-sky-500 hover:border-sky-500/30"
                      >
                        <Plus size={14} />
                        Adicionar Nova Perícia
                      </button>
                    )}
                  </div>

                  <div className="mt-8 pt-8 border-t border-[var(--border-panel)]/40">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-[8px] font-black text-[color:var(--text-muted)] uppercase tracking-widest">Editor de Texto (Massa)</span>
                      <div className="h-px flex-1 bg-[var(--border-panel)]/40" />
                    </div>
                    <textarea
                      value={getRawString("skills")}
                      onChange={(e) => updateRaw("skills", e.target.value)}
                      disabled={!canManage}
                      rows={4}
                      className="w-full resize-none bg-transparent text-[10px] text-[color:var(--text-muted)] outline-none custom-scrollbar leading-relaxed opacity-40 hover:opacity-100 transition-opacity"
                      placeholder="Katana-14, Furtividade-13, Liderança-12..."
                    />
                  </div>
                </section>

                <section className="rounded-[40px] border border-[var(--border-panel)] bg-[var(--bg-panel)]/60 p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <ScrollText className="text-[color:var(--gold)]/40" size={18} />
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)]">História & Notas</h4>
                  </div>
                  <textarea
                    value={getRawString("history")}
                    onChange={(e) => updateRaw("history", e.target.value)}
                    disabled={!canManage}
                    rows={10}
                    className="w-full resize-none bg-transparent text-sm text-[color:var(--text-secondary)] italic outline-none custom-scrollbar leading-relaxed"
                    placeholder="O passado deste guerreiro está envolto em névoas..."
                  />
                </section>
              </div>
            )}
          </div>
        </main>

        <footer className="relative z-10 border-t border-[var(--border-panel)] bg-[var(--bg-panel)]/40 backdrop-blur-xl px-6 py-5 flex items-center justify-between">
          <div className="hidden sm:block">
             <p className="text-[8px] font-black text-[color:var(--text-muted)]/10 uppercase tracking-[0.5em]">Bushido System v2.0</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 sm:flex-none rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-muted)] transition hover:bg-[var(--bg-input)] hover:text-[color:var(--text-primary)]"
            >
              Cancelar
            </button>
            {canManage && (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex-1 sm:flex-none flex items-center justify-center gap-3 rounded-2xl bg-[color:var(--gold)] px-8 py-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--bg-deep)] transition hover:opacity-90 hover:shadow-[0_0_20px_rgba(var(--gold-rgb),0.2)] active:scale-95 disabled:opacity-50"
              >
                {isPending ? <Activity size={16} className="animate-spin" /> : <Save size={16} />}
                {isPending ? "Gravando..." : "Sincronizar Bushido"}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
