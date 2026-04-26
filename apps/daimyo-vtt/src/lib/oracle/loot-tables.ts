/**
 * Sistema Completo de Loot — Daimyo VTT
 * Geração procedural de espólios para grupos e indivíduos.
 * Moedas, armas, armaduras, itens mundanos, itens raros e itens de roleplay.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type LootMode = 'grupo' | 'solo';
export type ItemRarity = 'comum' | 'incomum' | 'raro' | 'lendario';
export type ItemCategory = 'moeda' | 'arma' | 'armadura' | 'consumivel' | 'material' | 'roleplay' | 'reliquias';

export interface LootItem {
  nome: string;
  categoria: ItemCategory;
  raridade: ItemRarity;
  descricao: string;
  estado?: string;        // "Novo", "Usado", "Quebrado", "Enferrujado"
  valorKoku?: number;     // Valor em Kokus (moeda padrão)
  valorMon?: number;      // Valor em Mon (moeda de cobre)
  bonus?: string;         // Bônus mecânico opcional
}

export interface LootResult {
  modo: LootMode;
  moedas: { koku: number; mon: number };
  itens: LootItem[];
  encontroEspecial?: string;
}

// ─── Utilitário ──────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollRarity(rareBonus = 0): ItemRarity {
  const r = Math.random() * 100 + rareBonus;
  if (r >= 97) return 'lendario';
  if (r >= 85) return 'raro';
  if (r >= 60) return 'incomum';
  return 'comum';
}

// ─── Tabelas de Dados ────────────────────────────────────────────────────────

const ESTADOS = ['Novo', 'Usado', 'Desgastado', 'Quebrado', 'Enferrujado', 'Reparado', 'Manchado de Sangue'];

const ARMAS: Record<ItemRarity, string[]> = {
  comum: [
    'Tantō (adaga curta)', 'Yari (lança simples)', 'Bō (cajado)', 'Kusarigama (foice com corrente)',
    'Naginata enferrujada', 'Arco Curto (Hankyu)', 'Kanabō de madeira', 'Sai de ferro',
    'Flechas (12 unidades)', 'Shuriken (6 unidades)', 'Machadinha de lenhador', 'Faca de cozinha afiada'
  ],
  incomum: [
    'Wakizashi forjada', 'Yumi (arco longo)', 'Naginata polida', 'Tessen (leque de ferro)',
    'Nagamaki com empunhadura de couro', 'Kunai envenenado', 'Manrikigusari (corrente ponderada)',
    'Tonfa reforçada', 'Lança de cavalaria (Uma-yari)', 'Ōdachi (espada longa) usada'
  ],
  raro: [
    'Katana forjada por mestre ferreiro', 'Nodachi de lâmina curvada', 'Kusarigama de aço negro',
    'Arco composto Dai-kyū', 'Par de Sai de jade', 'Yari com ponta de obsidiana',
    'Shuko (garras de escalada) encantadas', 'Fukiya (zarabatana) com dardos venenosos'
  ],
  lendario: [
    'Katana Ancestral do Clã — lâmina que nunca perde o fio',
    'Espada Demoníaca (Yōtō) — sussurra em combate',
    'Arco do Trovão — projéteis ecoam com relâmpago',
    'Kusanagi-no-Tsurugi (réplica sagrada)',
    'Lâmina da Mácula — causa Kegare a cada golpe'
  ]
};

const ARMADURAS: Record<ItemRarity, string[]> = {
  comum: [
    'Jingasa (chapéu de guerra)', 'Kote (braçal de couro)', 'Suneate (caneleira simples)',
    'Haidate (proteção de coxa)', 'Mempo (máscara facial) rachada', 'Escudo de madeira improvisado',
    'Manto de palha reforçado', 'Faixa acolchoada para o torso'
  ],
  incomum: [
    'Dō de couro endurecido', 'Kabuto (elmo) sem crista', 'Kote de ferro laqueado',
    'Kusari Katabira (cota de malha)', 'Suneate de ferro com amarras',
    'Sode (ombreiras) de bambu laqueado', 'Menpo demoníaco de ferro'
  ],
  raro: [
    'Dō-maru (armadura de placas)', 'Kabuto com crista de dragão',
    'Ō-Yoroi parcial (peitoral + ombreiras)', 'Kusari com placas de aço negro',
    'Menpo de Oni com viseira articulada', 'Jinbaori (sobreveste) do General caído'
  ],
  lendario: [
    'Ō-Yoroi completa do Daimyō — RD 7, ornamentada com ouro',
    'Armadura Espectral — é translúcida sob a luz da lua',
    'Yoroi Selada — possui um espírito protetor preso dentro',
    'Manto do Vento — RD 2, mas concede +2 em Esquiva'
  ]
};

const CONSUMIVEIS: string[] = [
  'Poção de ervas curativas (recupera 1d HP)', 'Saquê medicinal (recupera 1d PF)',
  'Veneno de cobra (aplica em lâmina)', 'Bola de fumaça (Metsubushi)', 'Óleo de lanterna (3 usos)',
  'Bandagens de seda medicinal', 'Chá revigorante de ginseng', 'Incenso purificador (reduz Kegare)',
  'Pólvora em pote (3 cargas)', 'Unguento contra frio extremo', 'Antídoto básico',
  'Tinta invisível para mensagens secretas', 'Cera de abelha para selar feridas',
  'Sake abençoado por monge (cura 1 ponto de Kegare)',
  'Pasta de wasabi medicinal (remove parasitas)', 'Linimento de cânfora (alivia dores)',
  'Pó de dormir (soprar no rosto do alvo)', 'Erva-de-sangue (estanca hemorragias)',
  'Cataplasma de argila vulcânica (regenera queimaduras)', 'Rã venenosa em frasco (uso único)',
  'Agua bênta de cachoeira sagrada', 'Pílulas de viagem (sustento por 3 dias)',
  'Óleo de camélia (mantém lâminas afiadas)', 'Corda de seda envenenada (garrote)'
];

const MATERIAIS: string[] = [
  'Lingote de ferro', 'Couro curtido de cervo', 'Seda crua (1 rolo)', 'Bambu seco (feixe)',
  'Carvão de alta qualidade', 'Pedras preciosas brutas (ágata)', 'Sal refinado (saco)',
  'Tinta nanquim (3 potes)', 'Pergaminho virgem (5 folhas)', 'Corda de cânhamo (15m)',
  'Penas de corvo (rituais)', 'Cristal de rocha polido', 'Ferramentas de ferreiro básicas',
  'Argila especial para cerâmica', 'Madeira de cipreste (pranchas)'
];

const ROLEPLAY_ITEMS: string[] = [
  'Carta de amor não entregue, endereçada a alguém desconhecido.',
  'Mapa rasgado mostrando metade de uma rota até uma mina abandonada.',
  'Diário pessoal de um soldado com relatos perturbadores da última batalha.',
  'Dente de ouro arrancado à força, ainda com marcas de sangue.',
  'Ofuda (talismã) com o nome de uma pessoa riscado violentamente.',
  'Boneco de palha com agulhas espetadas (maldição ativa?).',
  'Distintivo de um clã extinto — alguém pode reconhecê-lo.',
  'Flauta de bambu que toca uma melodia triste quando o vento sopra.',
  'Fragmento de espelho que reflete um rosto que não é o seu.',
  'Colar de contas de oração com uma conta feita de osso humano.',
  'Contrato de assassinato com o selo do Senhor local.',
  'Pente de madeira entalhado com uma cena de batalha.',
  'Lenço de seda manchado de lágrimas e perfume de cerejeira.',
  'Pedaço de vela derretida com cheiro de incenso fúnebre.',
  'Chave de ferro que não abre nenhuma fechadura conhecida.'
];

const RELIQUIAS: string[] = [
  'Máscara Nō que permite ver espíritos por 1 minuto.',
  'Pedra Lunar que brilha na presença de Kegare.',
  'Pergaminho do Imperador Perdido — vale uma fortuna política.',
  'Estatueta de Buda feita de jade negro — pesa mais do que deveria.',
  'Espelho de Amaterasu (fragmento) — reflete a verdade dos coração.',
  'Sino de Templo em miniatura — afasta Yokais menores quando tocado.',
  'Pluma de Garça Celestial — pode ser usada como componente de ritual.',
  'Crânio pintado de vermelho — pertenceu a um Onmyoji famoso.',
  'Pena de Tengu — concede +1 em testes de Salto e Acrobacia por 1 hora.',
  'Bacia de bronze ritual — água colocada nela detecta veneno.',
  'Mala de rezas com contas de obsidiana — cada conta contém um kanji selado.',
  'Espada partida ao meio — quando as duas metades se juntam, algo acontece.',
  'Lança votiva cravada de ofudas — causa dano extra contra seres corruptos.',
  'Caixa de música chinesa — quem ouve a melodia completa ganha um víslumbre do futuro.',
  'Cristália de gelo eterno — nunca derrete, emana frio sobrenatural.'
];

const ENCONTROS_LOOT: string[] = [
  'Entre os espólios, encontram uma carta lacrada com um selo que ninguém reconhece.',
  'Um dos itens está amaldiçoado — o portador sente um calafrio ao tocá-lo.',
  'Há um compartimento secreto no fundo de um baú, revelando algo inesperado.',
  'Um dos cadáveres carrega uma tatuagem de um clã supostamente extinto.',
  'O loot inclui um mapa parcial que, combinado com outro, revelaria um tesouro.',
  'Uma das armas tem gravado o nome de um herói lendário.',
  'Junto ao ouro há um bilhete: "Isto não pertence a vocês. Devolvam."',
  'Um dos itens sangra quando cortado, como se fosse orgânico.',
  'Há uma gaiola vazia com marcas de garras por dentro — o que escapou?',
  'Um diário criptografado que parece conter informações sobre movimentações militares.',
  'Um dos sacos de moedas contém moedas de um país que não existe mais.',
  'Uma boneca de porcelana perfeita que pisca quando ninguém está olhando.',
  'Há pegadas de sangue saindo do baú em direção à floresta.',
  'Um dos itens emite um zumbido baixo constante que ninguém consegue localizar.'
];

// ─── Motor de Geração ────────────────────────────────────────────────────────

function generateCoinLoot(mode: LootMode): { koku: number; mon: number } {
  if (mode === 'grupo') {
    return {
      koku: rand(1, 12) + rand(0, 6),
      mon: rand(10, 200)
    };
  }
  return {
    koku: rand(0, 4),
    mon: rand(5, 80)
  };
}

function generateWeaponItem(rareBonus: number): LootItem {
  const raridade = rollRarity(rareBonus);
  const nome = pick(ARMAS[raridade]);
  const estado = raridade === 'lendario' ? 'Impecável' : pick(ESTADOS);
  const valorBase = raridade === 'comum' ? rand(1, 5) : raridade === 'incomum' ? rand(5, 15) : raridade === 'raro' ? rand(15, 50) : rand(50, 200);

  return {
    nome,
    categoria: 'arma',
    raridade,
    descricao: `${estado}. ${nome}.`,
    estado,
    valorKoku: valorBase,
    bonus: raridade === 'raro' || raridade === 'lendario' ? '+1 Dano ou habilidade especial.' : undefined
  };
}

function generateArmorItem(rareBonus: number): LootItem {
  const raridade = rollRarity(rareBonus);
  const nome = pick(ARMADURAS[raridade]);
  const estado = raridade === 'lendario' ? 'Impecável' : pick(ESTADOS);
  const valorBase = raridade === 'comum' ? rand(2, 8) : raridade === 'incomum' ? rand(8, 20) : raridade === 'raro' ? rand(20, 60) : rand(60, 250);

  return {
    nome,
    categoria: 'armadura',
    raridade,
    descricao: `${estado}. ${nome}.`,
    estado,
    valorKoku: valorBase,
    bonus: raridade === 'raro' || raridade === 'lendario' ? '+1 RD ou habilidade especial.' : undefined
  };
}

function generateConsumableItem(): LootItem {
  const nome = pick(CONSUMIVEIS);
  return {
    nome,
    categoria: 'consumivel',
    raridade: 'comum',
    descricao: nome,
    valorMon: rand(10, 60)
  };
}

function generateMaterialItem(): LootItem {
  const nome = pick(MATERIAIS);
  return {
    nome,
    categoria: 'material',
    raridade: 'comum',
    descricao: nome,
    valorMon: rand(20, 100)
  };
}

function generateRoleplayItem(): LootItem {
  const desc = pick(ROLEPLAY_ITEMS);
  return {
    nome: desc.split(',')[0].split('—')[0].trim(),
    categoria: 'roleplay',
    raridade: Math.random() > 0.7 ? 'incomum' : 'comum',
    descricao: desc
  };
}

function generateRelicItem(): LootItem {
  const desc = pick(RELIQUIAS);
  return {
    nome: desc.split('—')[0].split('que')[0].trim(),
    categoria: 'reliquias',
    raridade: Math.random() > 0.5 ? 'lendario' : 'raro',
    descricao: desc,
    valorKoku: rand(50, 500)
  };
}

// ─── API Pública ─────────────────────────────────────────────────────────────

export function generateFullLoot(mode: LootMode): LootResult {
  const moedas = generateCoinLoot(mode);
  const itens: LootItem[] = [];
  const rareBonus = mode === 'solo' ? 10 : 0; // Solo tem chance maior de raridade

  if (mode === 'grupo') {
    // Grupo: mais itens, menos raros, mais quantidade bruta
    const numItens = rand(3, 7);
    for (let i = 0; i < numItens; i++) {
      const roll = Math.random();
      if (roll < 0.25) itens.push(generateWeaponItem(rareBonus));
      else if (roll < 0.40) itens.push(generateArmorItem(rareBonus));
      else if (roll < 0.60) itens.push(generateConsumableItem());
      else if (roll < 0.75) itens.push(generateMaterialItem());
      else if (roll < 0.90) itens.push(generateRoleplayItem());
      else itens.push(generateRelicItem());
    }
  } else {
    // Solo: menos itens, mais chance de itens raros e de roleplay
    const numItens = rand(1, 3);
    for (let i = 0; i < numItens; i++) {
      const roll = Math.random();
      if (roll < 0.20) itens.push(generateWeaponItem(rareBonus));
      else if (roll < 0.30) itens.push(generateArmorItem(rareBonus));
      else if (roll < 0.45) itens.push(generateConsumableItem());
      else if (roll < 0.55) itens.push(generateMaterialItem());
      else if (roll < 0.80) itens.push(generateRoleplayItem());
      else itens.push(generateRelicItem());
    }
  }

  const encontroEspecial = Math.random() > 0.7 ? pick(ENCONTROS_LOOT) : undefined;

  return { modo: mode, moedas, itens, encontroEspecial };
}

// Helpers de exibição
export const RARITY_COLORS: Record<ItemRarity, string> = {
  comum: 'text-zinc-400',
  incomum: 'text-emerald-400',
  raro: 'text-sky-400',
  lendario: 'text-amber-400'
};

export const RARITY_BG: Record<ItemRarity, string> = {
  comum: 'bg-zinc-800/50 border-zinc-700',
  incomum: 'bg-emerald-950/30 border-emerald-800/40',
  raro: 'bg-sky-950/30 border-sky-800/40',
  lendario: 'bg-amber-950/30 border-amber-800/40'
};

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  moeda: 'Moeda',
  arma: 'Arma',
  armadura: 'Armadura',
  consumivel: 'Consumível',
  material: 'Material',
  roleplay: 'Roleplay',
  reliquias: 'Relíquia'
};
