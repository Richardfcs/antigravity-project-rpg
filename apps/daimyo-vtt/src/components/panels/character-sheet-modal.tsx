"use client";

import { useState, useTransition } from "react";
import {
  X,
  Save,
  Shield,
  HeartPulse,
  MoonStar,
  Zap,
  Swords,
  Brain,
  BicepsFlexed,
  Activity,
  User,
  Package,
  ScrollText,
  Dumbbell
} from "lucide-react";

import type { SessionCharacterRecord } from "@/types/character";
import type { SessionCharacterSheetProfile } from "@/types/combat";
import { updateCharacterProfileAction } from "@/app/actions/character-actions";
import { useCharacterStore } from "@/stores/character-store";
import { cn } from "@/lib/utils";

interface CharacterSheetModalProps {
  sessionCode: string;
  character: SessionCharacterRecord;
  onClose: () => void;
  canManage: boolean;
}

export function CharacterSheetModal({
  sessionCode,
  character,
  onClose,
  canManage
}: CharacterSheetModalProps) {
  const upsertCharacter = useCharacterStore((state) => state.upsertCharacter);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

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
      activeWeaponId: null,
      activeWeaponModeId: null,
      loadoutTechniqueIds: [],
      posture: "standing",
      shock: 0,
      bleeding: 0,
      evaluateBonus: 0
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
      equipmentText: ""
    }
  };

  const [draftProfile, setDraftProfile] = useState<SessionCharacterSheetProfile>(
    character.sheetProfile || defaultProfile
  );

  const updateAttribute = (attr: keyof typeof draftProfile.attributes, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setDraftProfile((prev) => ({
      ...prev,
      attributes: { ...prev.attributes, [attr]: num }
    }));
  };

  const updateDerived = (field: keyof typeof draftProfile.derived, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    setDraftProfile((prev) => ({
      ...prev,
      derived: { ...prev.derived, [field]: num }
    }));
  };

  const updateDefense = (field: keyof typeof draftProfile.defenses, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setDraftProfile((prev) => ({
      ...prev,
      defenses: { ...prev.defenses, [field]: num }
    }));
  };

  const addWeapon = () => {
    setDraftProfile((prev) => ({
      ...prev,
      weapons: [
        ...prev.weapons,
        { id: crypto.randomUUID(), name: "", category: "Arma", state: "ready", modes: [] }
      ]
    }));
  };

  const updateWeapon = (id: string, field: "name" | "quality" | "rawDamage", value: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      weapons: prev.weapons.map(w => w.id === id ? { ...w, [field]: value } : w)
    }));
  };

  const removeWeapon = (id: string) => {
    setDraftProfile((prev) => ({
      ...prev,
      weapons: prev.weapons.filter(w => w.id !== id)
    }));
  };

  const updateRaw = (field: string, value: string | number) => {
    setDraftProfile((prev) => ({
      ...prev,
      raw: {
        ...(prev.raw || {}),
        [field]: value
      }
    }));
  };

  const handleSave = () => {
    if (!canManage) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await updateCharacterProfileAction({
        sessionCode,
        characterId: character.id,
        sheetProfile: draftProfile
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

  const getGURPSDamage = (stVal: number) => {
    const table: Record<number, [string, string]> = {
      1: ['1d-6', '1d-5'], 2: ['1d-6', '1d-5'], 3: ['1d-5', '1d-4'], 4: ['1d-5', '1d-4'],
      5: ['1d-4', '1d-3'], 6: ['1d-4', '1d-3'], 7: ['1d-3', '1d-2'], 8: ['1d-3', '1d-2'],
      9: ['1d-2', '1d-1'], 10: ['1d-2', '1d'], 11: ['1d-1', '1d+1'], 12: ['1d-1', '1d+2'],
      13: ['1d', '2d-1'], 14: ['1d', '2d'], 15: ['1d+1', '2d+1'], 16: ['1d+1', '2d+2'],
      17: ['1d+2', '3d-1'], 18: ['1d+2', '3d'], 19: ['2d-1', '3d+1'], 20: ['2d-1', '3d+2']
    };
    if (stVal < 1) return { geb: '1d-6', gdp: '1d-5' };
    if (stVal > 20) {
      const dice = Math.floor(stVal / 10);
      return { geb: `${dice}d`, gdp: `${dice + 2}d` }; 
    }
    return { geb: table[stVal][0], gdp: table[stVal][1] };
  };

  // derived calculations for display
  const st = draftProfile.attributes.st || 10;
  const maxSlots = st * 10;
  const slotsUsed = getRawNumber("slotsUsed", 0);
  const dmg = getGURPSDamage(st);

  const thresholds = [
    { label: 'Nenhuma', mult: 1, mov: '100%', esq: '0', color: 'text-white/50' },
    { label: 'Leve', mult: 2, mov: '80%', esq: '-1', color: 'text-amber-500' },
    { label: 'Média', mult: 3, mov: '60%', esq: '-2', color: 'text-orange-400' },
    { label: 'Pesada', mult: 6, mov: '40%', esq: '-3', color: 'text-orange-600' },
    { label: 'Muito P.', mult: 10, mov: '20%', esq: '-4', color: 'text-rose-500' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-full max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[color:var(--bg-panel)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-amber-500 uppercase">
              Registro de Bushido - {character.name}
            </h2>
            <p className="text-xs font-semibold text-[color:var(--ink-3)] uppercase tracking-widest mt-1">
              Forja de Lendas — Era das Espadas Quebradas
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <label className="text-[9px] font-bold uppercase tracking-widest text-amber-300/60 mb-1">Custo Total</label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  value={getRawNumber("totalPoints", 150)}
                  onChange={(e) => updateRaw("totalPoints", parseInt(e.target.value, 10))}
                  disabled={!canManage}
                  className="w-20 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center font-bold text-rose-500 outline-none focus:border-amber-500"
                />
                <span className="text-[10px] font-bold text-white/50">PTS</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-2 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {feedback && (
            <div className="mb-6 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-300">
              {feedback}
            </div>
          )}

          <div className="grid gap-x-8 gap-y-10 lg:grid-cols-2">
            
            {/* LEFT COLUMN: IDENTITY, ATTRIBUTES, VITALS, DEFENSES */}
            <div className="space-y-8">
              
              {/* Identity */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-indigo-200">
                  <User size={18} />
                  <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Identidade do Guerreiro</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
                    <label className="section-label">Conceito / Papel</label>
                    <input
                      type="text"
                      value={getRawString("concept")}
                      onChange={(e) => updateRaw("concept", e.target.value)}
                      disabled={!canManage}
                      placeholder="Ex: Ronin Errante"
                      className="mt-1 w-full bg-transparent text-sm text-white outline-none disabled:opacity-50"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3">
                    <label className="section-label">Clã / Afiliação</label>
                    <input
                      type="text"
                      value={getRawString("clan")}
                      onChange={(e) => updateRaw("clan", e.target.value)}
                      disabled={!canManage}
                      placeholder="Ex: Taira"
                      className="mt-1 w-full bg-transparent text-sm text-white outline-none disabled:opacity-50"
                    />
                  </div>
                </div>
              </section>

              {/* Core Attributes */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-amber-200">
                  <BicepsFlexed size={18} />
                  <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Atributos Básicos</h3>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {/* Fixed the overlap by removing the parenthesis in the label */}
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center transition hover:border-amber-500/50">
                    <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">ST</label>
                    <input type="number" value={draftProfile.attributes.st} onChange={(e) => updateAttribute("st", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none disabled:opacity-50" />
                    <span className="block text-[8px] text-amber-500/70 mt-1 uppercase">10 pts/+1</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center transition hover:border-amber-500/50">
                    <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">DX</label>
                    <input type="number" value={draftProfile.attributes.dx} onChange={(e) => updateAttribute("dx", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none disabled:opacity-50" />
                    <span className="block text-[8px] text-amber-500/70 mt-1 uppercase">20 pts/+1</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center transition hover:border-amber-500/50">
                    <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">IQ</label>
                    <input type="number" value={draftProfile.attributes.iq} onChange={(e) => updateAttribute("iq", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none disabled:opacity-50" />
                    <span className="block text-[8px] text-amber-500/70 mt-1 uppercase">20 pts/+1</span>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center transition hover:border-amber-500/50">
                    <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">HT</label>
                    <input type="number" value={draftProfile.attributes.ht} onChange={(e) => updateAttribute("ht", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-2xl font-black text-white outline-none disabled:opacity-50" />
                    <span className="block text-[8px] text-amber-500/70 mt-1 uppercase">10 pts/+1</span>
                  </div>
                </div>
              </section>

              {/* Vitals */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-rose-200">
                  <Activity size={18} />
                  <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Estatísticas Vitais</h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-center">
                    <label className="block text-[10px] font-bold text-rose-200 tracking-widest mb-1">PV [ST]</label>
                    <input type="number" value={draftProfile.attributes.hpMax} onChange={(e) => updateAttribute("hpMax", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                  </div>
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3 text-center">
                    <label className="block text-[10px] font-bold text-amber-200 tracking-widest mb-1">PF [HT]</label>
                    <input type="number" value={draftProfile.attributes.fpMax} onChange={(e) => updateAttribute("fpMax", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center">
                    <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">VON [IQ]</label>
                    <input type="number" value={draftProfile.attributes.will} onChange={(e) => updateAttribute("will", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center">
                    <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">PER [IQ]</label>
                    <input type="number" value={draftProfile.attributes.per} onChange={(e) => updateAttribute("per", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                  </div>
                </div>
              </section>

              {/* Defenses and Move */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-sky-200">
                    <Shield size={18} />
                    <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Defesas Ativas</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                      <label className="block text-[10px] font-bold text-amber-400 tracking-widest mb-1">VEL. BÁSICA</label>
                      <input type="number" step="0.25" value={draftProfile.derived.basicSpeed} onChange={(e) => updateDerived("basicSpeed", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                    </div>
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-center">
                      <label className="block text-[10px] font-bold text-rose-300 tracking-widest mb-1">ESQUIVA</label>
                      <input type="number" value={draftProfile.defenses.dodge} onChange={(e) => updateDefense("dodge", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center">
                      <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">APARAR</label>
                      <input type="number" value={draftProfile.defenses.parry} onChange={(e) => updateDefense("parry", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-3 text-center">
                      <label className="block text-[10px] font-bold text-white/50 tracking-widest mb-1">BLOQUEIO</label>
                      <input type="number" value={draftProfile.defenses.block} onChange={(e) => updateDefense("block", e.target.value)} disabled={!canManage} className="w-full bg-transparent text-center text-xl font-bold text-white outline-none disabled:opacity-50" />
                    </div>
                  </div>
                </section>

              {/* Encumbrance Table & Slots - Full Only */}
              {character.tier === 'full' && (
                <section>
                  <div className="mb-4 flex items-center gap-2 text-emerald-200">
                    <Package size={18} />
                    <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Capacidade de Carga e Slots</h3>
                  </div>
                  <p className="text-[11px] text-[color:var(--ink-3)] mb-4">
                    Sua capacidade de Slots é igual a sua <strong>ST</strong>. Cada 1kg = 1 Slot.
                  </p>
                  <div className="grid grid-cols-3 gap-4 items-start">
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                      <label className="block text-[10px] font-bold text-amber-400 tracking-widest mb-2">SLOTS OCUPADOS</label>
                      <input type="number" value={slotsUsed} onChange={(e) => updateRaw("slotsUsed", parseInt(e.target.value, 10))} disabled={!canManage} className="w-full bg-transparent text-center text-3xl font-black text-white outline-none disabled:opacity-50" />
                      <span className="block text-[10px] text-amber-500/70 mt-2 font-bold uppercase">Limite Max: {maxSlots}</span>
                    </div>
                    
                    <div className="col-span-2 rounded-2xl border border-white/10 bg-black/18 p-3">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="text-amber-500 border-b border-white/10">
                            <th className="pb-2">Nível</th>
                            <th className="pb-2">Limite</th>
                            <th className="pb-2">Mov</th>
                            <th className="pb-2">Esq</th>
                          </tr>
                        </thead>
                        <tbody>
                          {thresholds.map((t, i) => {
                            const limit = t.mult * st;
                            const prevLimit = i === 0 ? -1 : thresholds[i - 1].mult * st;
                            const active = slotsUsed <= limit && slotsUsed > prevLimit;
                            
                            return (
                              <tr key={t.label} className={cn("border-b border-white/5 last:border-0", active ? `bg-amber-500/10 font-bold ${t.color}` : "text-[color:var(--ink-3)]")}>
                                <td className="py-1.5">{t.label}</td>
                                <td className="py-1.5">Até {limit}</td>
                                <td className="py-1.5">{t.mov}</td>
                                <td className="py-1.5">{t.esq}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {/* Memory / Postures - Full and Medium */}
              {character.tier !== 'summary' && (
                <section>
                  <div className="mb-4 flex items-center gap-2 text-fuchsia-300">
                    <Dumbbell size={18} />
                    <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Memória Muscular (Posturas)</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] text-[color:var(--ink-3)] font-bold uppercase mb-2">Básicas (ON)</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {['Ataque', 'Total', 'Defesa', 'Mover'].map(p => (
                          <span key={p} className="rounded border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] text-[color:var(--ink-2)]">{p}</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] text-amber-500 font-bold uppercase mb-2">Postura (Mão de 3)</h4>
                      <div className="flex flex-col gap-1.5">
                        <input type="text" value={getRawString("maneuver1")} onChange={(e) => updateRaw("maneuver1", e.target.value)} disabled={!canManage} placeholder="Manobra 1" className="rounded-lg border border-white/10 bg-black/18 px-3 py-1.5 text-[11px] text-white outline-none" />
                        <input type="text" value={getRawString("maneuver2")} onChange={(e) => updateRaw("maneuver2", e.target.value)} disabled={!canManage} placeholder="Manobra 2" className="rounded-lg border border-white/10 bg-black/18 px-3 py-1.5 text-[11px] text-white outline-none" />
                        <input type="text" value={getRawString("maneuver3")} onChange={(e) => updateRaw("maneuver3", e.target.value)} disabled={!canManage} placeholder="Manobra 3" className="rounded-lg border border-white/10 bg-black/18 px-3 py-1.5 text-[11px] text-white outline-none" />
                      </div>
                    </div>
                  </div>
                </section>
              )}

            </div>

              {/* RIGHT COLUMN: TRAITS, SKILLS, HISTORY, WEAPONS */}
            <div className="space-y-8">

              {character.tier !== 'summary' && (
                <section>
                  <div className="mb-4 flex items-center gap-2 text-emerald-200">
                    <Swords size={18} />
                    <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Arsenal e Equipamento</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-3 text-center">
                      <label className="block text-[10px] font-bold text-rose-300 tracking-widest mb-1">GdP (Perfuração)</label>
                      <input type="text" value={dmg.gdp} readOnly disabled className="w-full bg-transparent text-center text-lg font-bold text-white outline-none cursor-default" />
                    </div>
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3 text-center">
                      <label className="block text-[10px] font-bold text-amber-400 tracking-widest mb-1">GeB (Balanço)</label>
                      <input type="text" value={dmg.geb} readOnly disabled className="w-full bg-transparent text-center text-lg font-bold text-white outline-none cursor-default" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-4 flex flex-col">
                      <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                        <label className="section-label">Armas Registradas</label>
                        {canManage && (
                          <button onClick={addWeapon} className="text-[9px] text-amber-400 font-bold px-2 py-1 rounded bg-amber-400/10 hover:bg-amber-400/20 uppercase tracking-wider">
                            + Adicionar
                          </button>
                        )}
                      </div>
                      <div className="space-y-2 flex-1 custom-scrollbar overflow-y-auto">
                        {draftProfile.weapons.map(w => (
                          <div key={w.id} className="flex gap-2 items-center border-b border-white/5 pb-2 last:border-0 last:pb-0">
                            <input value={w.name} onChange={(e) => updateWeapon(w.id, "name", e.target.value)} disabled={!canManage} placeholder="Nome (ex: Katana)" className="flex-1 min-w-0 bg-transparent text-[11px] font-bold text-white outline-none disabled:opacity-50" />
                            <input value={w.quality || ""} onChange={(e) => updateWeapon(w.id, "quality", e.target.value)} disabled={!canManage} placeholder="Qualid." className="w-16 bg-transparent text-[10px] text-[color:var(--ink-2)] outline-none disabled:opacity-50 uppercase" />
                            <input value={w.rawDamage || ""} onChange={(e) => updateWeapon(w.id, "rawDamage", e.target.value)} disabled={!canManage} placeholder="Dano" className="w-20 bg-transparent text-[11px] text-amber-400 font-bold outline-none disabled:opacity-50 text-right" />
                            {canManage && (
                              <button onClick={() => removeWeapon(w.id)} className="text-white/30 hover:text-rose-500 transition-colors ml-1">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                        {draftProfile.weapons.length === 0 && (
                          <p className="text-[10px] text-white/30 italic text-center mt-4">Nenhuma arma cadastrada.</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="section-label mb-2 block">Resistência (RD)</label>
                        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-black/18 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold text-white/50 uppercase">Cabeça/Ombro</span>
                            <input type="number" value={getRawNumber("drTop")} onChange={(e) => updateRaw("drTop", parseInt(e.target.value, 10))} disabled={!canManage} className="w-12 rounded bg-white/5 p-1 text-center text-sm font-bold text-white outline-none" />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold text-white/50 uppercase">Tronco/Braços</span>
                            <input type="number" value={getRawNumber("drMiddle")} onChange={(e) => updateRaw("drMiddle", parseInt(e.target.value, 10))} disabled={!canManage} className="w-12 rounded bg-white/5 p-1 text-center text-sm font-bold text-white outline-none" />
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-bold text-white/50 uppercase">Pernas/Pés</span>
                            <input type="number" value={getRawNumber("drBottom")} onChange={(e) => updateRaw("drBottom", parseInt(e.target.value, 10))} disabled={!canManage} className="w-12 rounded bg-white/5 p-1 text-center text-sm font-bold text-white outline-none" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 rounded-2xl border border-white/10 bg-black/18 p-4">
                        <label className="section-label mb-2 block">Inventário e Suprimentos</label>
                        <textarea value={getRawString("equipmentText")} onChange={(e) => updateRaw("equipmentText", e.target.value)} disabled={!canManage} rows={4} placeholder="Armadura de Bambu, Rações..." className="w-full h-full resize-none bg-transparent text-sm text-white outline-none custom-scrollbar" />
                      </div>
                    </div>
                  </div>
                </section>
              )}
              
              {/* Traits & Skills */}
              <section>
                <div className="mb-4 flex items-center gap-2 text-indigo-200">
                  <Brain size={18} />
                  <h3 className="font-semibold text-white uppercase tracking-wider text-sm">Crônicas e Traços</h3>
                </div>
                
                {character.tier === 'full' ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                      <label className="section-label mb-2 block">Vantagens e Qualidades</label>
                      <textarea
                        value={getRawString("advantages")}
                        onChange={(e) => updateRaw("advantages", e.target.value)}
                        disabled={!canManage}
                        rows={3}
                        placeholder="Reflexos em Combate [15], Sentidos Aguçados..."
                        className="w-full resize-none bg-transparent text-sm text-white outline-none disabled:opacity-50 custom-scrollbar"
                      />
                    </div>
                    
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                      <label className="section-label mb-2 block">Desvantagens e Peculiaridades</label>
                      <textarea
                        value={getRawString("disadvantages")}
                        onChange={(e) => updateRaw("disadvantages", e.target.value)}
                        disabled={!canManage}
                        rows={3}
                        placeholder="Senso de Dever [-5], Sede de Sangue [-10]..."
                        className="w-full resize-none bg-transparent text-sm text-white outline-none disabled:opacity-50 custom-scrollbar"
                      />
                    </div>
                    
                    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                      <label className="section-label mb-2 block">Perícias e Técnicas</label>
                      <textarea
                        value={getRawString("skills")}
                        onChange={(e) => updateRaw("skills", e.target.value)}
                        disabled={!canManage}
                        rows={4}
                        placeholder="Katana-14, Acrobacia-12, Furtividade-13..."
                        className="w-full resize-none bg-transparent text-sm text-white outline-none disabled:opacity-50 custom-scrollbar"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ScrollText size={14} className="text-white/50" />
                        <label className="section-label block">História e Anotações do Mestre</label>
                      </div>
                      <textarea
                        value={getRawString("history")}
                        onChange={(e) => updateRaw("history", e.target.value)}
                        disabled={!canManage}
                        rows={4}
                        placeholder="Descreva o passado e segredos do samurai..."
                        className="w-full resize-none bg-transparent text-sm text-white outline-none disabled:opacity-50 custom-scrollbar"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                    <label className="section-label mb-2 block">Resumo de Traços e Perícias</label>
                    <textarea
                      value={getRawString("summaryTraits")}
                      onChange={(e) => updateRaw("summaryTraits", e.target.value)}
                      disabled={!canManage}
                      rows={8}
                      placeholder="Anote aqui as principais vantagens, desvantagens e perícias deste NPC..."
                      className="w-full resize-none bg-transparent text-sm text-white outline-none disabled:opacity-50 custom-scrollbar leading-relaxed"
                    />
                  </div>
                )}
              </section>

            </div>
          </div>
        </div>

        {/* Footer */}
        {canManage && (
          <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-black/20 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 rounded-full bg-amber-500 px-6 py-2.5 text-sm font-bold text-amber-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              <Save size={16} />
              {isPending ? "Salvando..." : "Salvar Ficha"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
