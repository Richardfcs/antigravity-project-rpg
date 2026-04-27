import { ThreatLevel, EnemyStats, MonsterConcept } from "@/types/oracle";
import { generateFullName } from "./name-generator";

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

const WEAPON_STATIC: Record<string, { nome: string; dano: string; peso: number }> = {
  "Katana": { nome: "Katana", dano: "1d+2 cort", peso: 1.5 },
  "Wakizashi": { nome: "Wakizashi", dano: "1d+1 cort", peso: 1.0 },
  "Yari": { nome: "Yari", dano: "1d+2 perf", peso: 2.0 },
  "Naginata": { nome: "Naginata", dano: "1d+3 cort", peso: 3.0 },
  "Katana simples": { nome: "Katana", dano: "1d+2 cort", peso: 1.5 },
  "Yumi": { nome: "Yumi", dano: "1d+1 perf", peso: 1.5 },
  "Kusarigama": { nome: "Kusarigama", dano: "1d+1 esm", peso: 1.5 },
  "Kanabō": { nome: "Kanabō", dano: "1d+4 esm", peso: 6.0 },
  "Nodachi": { nome: "Nodachi", dano: "1d+4 cort", peso: 2.5 },
  "Bo": { nome: "Bo", dano: "1d+3 esm", peso: 2.0 },
  "Faca": { nome: "Faca", dano: "1d-2 cort", peso: 0.5 },
  "Cajado": { nome: "Cajado", dano: "1d-1 esm", peso: 1.0 },
  "Arco": { nome: "Yumi", dano: "1d+1 perf", peso: 1.5 },
  "Mãos nuas": { nome: "Mãos nuas", dano: "1d-1 esm", peso: 0 }
};

const ARMOR_STATIC: Record<string, { nome: string; rd: string; peso: number }> = {
  "Roupas": { nome: "Roupas", rd: "0", peso: 1 },
  "Kamiko": { nome: "Kamiko", rd: "1", peso: 1.5 },
  "Do de Couro": { nome: "Do de Couro", rd: "2", peso: 4 },
  "Jingasa": { nome: "Jingasa", rd: "3", peso: 1 },
  "Tatami": { nome: "Tatami", rd: "3", peso: 7 },
  "Kabuto": { nome: "Kabuto", rd: "5", peso: 3 },
  "O-Yoroi": { nome: "O-Yoroi", rd: "4", peso: 24 },
  "Tosei-Gusoku": { nome: "Tosei-Gusoku", rd: "6", peso: 18 },
  "Sem armadura": { nome: "Sem armadura", rd: "0", peso: 0 }
};

const FORMAS = [
  'Névoa Negra', 'Enxame de Insetos', 'Gigante de Ossos', 'Sombra Humanoide', 'Quimera de Animais', 
  'Mulher com Pescoço Longo (Rokurokubi)', 'Roda de Fogo (Wanyudo)', 'Esqueleto Gigante (Gashadokuro)',
  'Raposa de Várias Caudas', 'Cachorro de Pedra (Komainu)', 'Armadura Vazia', 'Pupa de Carne Pulsante',
  'Monge sem Rosto', 'Aranha com Rosto Humano', 'Corpo de Lama e Limo', 'Espelho Flutuante',
  'Pássaro de Ferro', 'Serpente Marinha', 'Boca Gigante no Chão', 'Olho Único Flutuante'
];

const ESSENCIAS = [
  'Gelo Eterno', 'Fogo Infernal', 'Veneno Ácido', 'Eletricidade Estática', 'Vácuo Espiritual',
  'Corrupção de Kegare', 'Luz Cegante', 'Ferro Frio', 'Sangue Podre', 'Vento Cortante',
  'Petrificação', 'Ilusão Hipnótica', 'Silêncio Ensurdecedor', 'Magnetismo', 'Fome Insaciável'
];

const MANIFESTACOES = [
  'Drena a vitalidade ao toque', 'Cria cópias ilusórias de si mesmo', 'Grita um lamento que paralisa',
  'Explode em mil pedaços ao ser atingido', 'Atravessa paredes e objetos sólidos',
  'Controla as sombras ao redor', 'Muda de forma para se parecer com um aliado',
  'Provoca pesadelos em quem o olha', 'Enfeitiça com uma canção melancólica',
  'Cria uma zona de gravidade alterada', 'Infecta feridas com vermes',
  'Apaga todas as fuentes de luz próximas', 'Rouba memórias recentes',
  'Transforma o chão em pântano', 'Causa envelhecimento acelerado'
];

const PRESENCAS = [
  'O ar fica subitamente gelado e o cheiro de incenso enche o local.',
  'Ouve-se o som de mil sussurros em uma língua esquecida.',
  'Todas as chamas próximas tornam-se azuis e tremulam violentamente.',
  'Uma sensação de peso insuportável recai sobre os ombros dos presentes.',
  'O chão começa a sangrar um líquido escuro e fétido.',
  'Pássaros caem mortos do céu nas proximidades.',
  'O tempo parece passar mais devagar, cada segundo dura uma eternidade.',
  'Reflexos em superfícies mostram a verdadeira forma monstruosa.',
  'Crianças e animais começam a chorar ou uivar sem motivo aparente.',
  'Uma névoa cor de ferrugem surge do nada, cobrindo o chão.',
  'Símbolos sagrados começam a rachar ou queimar.',
  'O som de tambores distantes ecoa ritmicamente com o coração.'
];

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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function calculateSlotLevel(totalWeight: number, st: number): { level: number; name: string; penalty: { move: number; dodge: number } } {
  const ratio = totalWeight / st;
  if (ratio <= 1) return { level: 0, name: "Nenhuma", penalty: { move: 0, dodge: 0 } };
  if (ratio <= 2) return { level: 1, name: "Leve", penalty: { move: -1, dodge: -1 } };
  if (ratio <= 3) return { level: 2, name: "Média", penalty: { move: -2, dodge: -2 } };
  if (ratio <= 6) return { level: 3, name: "Pesada", penalty: { move: -3, dodge: -3 } };
  return { level: 4, name: "Muito Pesada", penalty: { move: -4, dodge: -4 } };
}

function findBestMatch(query: string, data: Record<string, any>): { nome: string; dano?: string; rd?: string; peso: number } | null {
  const q = query.toLowerCase();
  for (const [key, val] of Object.entries(data)) {
    if (key.toLowerCase().includes(q) || q.includes(key.toLowerCase())) {
      return val;
    }
  }
  return null;
}

export function generateEnemy(threat: ThreatLevel = "capanga"): EnemyStats {
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
  const name = generateFullName();
  const initBase = (dx + ht) / 4;
  const esquivaBase = Math.floor(initBase) + 3;
  
  let skillBase = dx;
  if (threat === "veterano") skillBase += 1;
  if (threat === "elite") skillBase += 2;
  if (threat === "mestre") skillBase += 4;
  
  const aparar = Math.floor(skillBase / 2) + 3;
  const hasShield = Math.random() > 0.8 || threat === "elite" || threat === "mestre";
  const bloqueio = hasShield ? Math.floor(skillBase / 2) + 3 : 0;

  // Lógica de Equipamento Realista
  const isCivil = threat === "civil";
  const isCapangaPlus = !isCivil && threat !== "recruta";
  
  // Capanga para frente OBRIGATORIAMENTE tem arma
  let selectedWeapon = WEAPON_STATIC["Mãos nuas"] as { nome: string; dano: string; peso: number };
  if (isCapangaPlus || (threat === "recruta" && Math.random() > 0.3) || (isCivil && Math.random() > 0.7)) {
    const weaponTag = pick(WEAPON_TAGS[threat] || WEAPON_TAGS.capanga);
    selectedWeapon = (findBestMatch(weaponTag, WEAPON_STATIC) as any) || WEAPON_STATIC["Mãos nuas"];
  }

  // Probabilidade de Armadura cresce com o Rank
  let armorProb = 0.1; // Civil
  if (threat === "recruta") armorProb = 0.3;
  if (threat === "capanga") armorProb = 0.6;
  if (threat === "veterano") armorProb = 0.8;
  if (threat === "elite" || threat === "excepcional" || threat === "mestre") armorProb = 1.0;

  const selectedArmor = ((Math.random() <= armorProb) 
    ? (findBestMatch(pick(ARMOR_TAGS[threat] || ARMOR_TAGS.capanga), ARMOR_STATIC) as any)
    : ARMOR_STATIC["Sem armadura"]) || ARMOR_STATIC["Sem armadura"];

  const totalWeight = selectedWeapon.peso + selectedArmor.peso;
  const slotInfo = calculateSlotLevel(totalWeight, st);

  const weaponName = selectedWeapon.nome;
  const armorName = selectedArmor.nome;
  const rd = selectedArmor.rd;

  const estilo = pick(ESTILOS);
  
  // Cálculo de Custo de Pontos (GURPS)
  const attrCost = ((st - 10) * 10) + ((dx - 10) * 20) + ((iq - 10) * 20) + ((ht - 10) * 10);
  const hpCost = config.hpMod * 2;
  const adsDisads = threat === "civil" ? 0 : (threat === "recruta" ? 15 : (threat === "capanga" ? 25 : 40));
  const estimatedPoints = 75 + attrCost + hpCost + (skillBase > dx ? (skillBase - dx) * 4 : 0) + adsDisads;

  // Qualidade da Arma
  let finalDano = selectedWeapon.dano;
  let qualityNote = "";
  if (selectedWeapon.nome !== "Mãos nuas") {
    if (threat === "mestre" || threat === "excepcional") {
      finalDano = finalDano.replace(/(\d+)d([+-]\d+)?/, (m, d, a) => {
        const adds = parseInt(a || "0") + 2;
        return `${d}d${adds >= 0 ? "+" : ""}${adds}`;
      });
      qualityNote = " (Muito Fina +2)";
    } else if (threat === "elite" || threat === "veterano") {
      finalDano = finalDano.replace(/(\d+)d([+-]\d+)?/, (m, d, a) => {
        const adds = parseInt(a || "0") + 1;
        return `${d}d${adds >= 0 ? "+" : ""}${adds}`;
      });
      qualityNote = " (Fina +1)";
    }
  }

  let notas = `${estilo}`;
  if (selectedWeapon.dano && selectedWeapon.nome !== "Mãos nuas") notas += ` | Arma: ${weaponName}${qualityNote} (${finalDano})`;
  notas += ` | Armadura: ${armorName} (RD ${rd})`;
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
    isNPC: true,
    loadoutTechniqueIds: isCapangaPlus 
      ? ["m2-contest", ...(threat === "veterano" || threat === "elite" || threat === "excepcional" || threat === "mestre" ? ["m3-iai"] : [])] 
      : []
  };
}

export function generateMonsterConcept(): MonsterConcept {
  return {
    forma: pick(FORMAS),
    essencia: pick(ESSENCIAS),
    manifestacao: pick(MANIFESTACOES),
    presenca: pick(PRESENCAS)
  };
}