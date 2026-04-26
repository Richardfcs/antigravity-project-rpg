/**
 * Motor Linguístico de Nomes - Japão Medieval / Era das Espadas Quebradas
 */

const SYLLABLES = ['ku', 'ma', 'ri', 'to', 'shi', 'ka', 'ne', 'zu', 'yo', 'hi', 'na', 'mi', 'su', 'ke', 'ro', 'ga', 'ba', 'ji', 're', 'ya', 'fu', 'ji', 'sa', 'wa', 'mo', 'ta', 'ko', 'u', 'e', 'o'];

const CLAN_PREFIXES = [
  'Yama', 'Kawa', 'Mori', 'Ishi', 'Taka', 'Fuji', 'Kuro', 'Shiro', 'Umi', 'Hagi', 'Tsuru', 'Hoshi',
  'Matsui', 'Date', 'Saito', 'Honda', 'Maeda', 'Ito', 'Kato', 'Shimada', 'Uesugi', 'Asai', 'Shiba', 'Toyo',
  'Oda', 'Tokugawa', 'Akechi', 'Takeda', 'Mori', 'Hojo', 'Sanada', 'Imagawa', 'Otomo', 'Shimazu', 'Chosokabe'
];

const CLAN_SUFFIXES = [
  'mura', 'da', 'guchi', 'sawa', 'moto', 'zaki', 'shima', 'hara', 'oka', 'no', 'ta', 'be',
  'gawa', 'yama', 'mori', 'tsu', 'miya', 'hashi', 'maru', 'ro', 'ichi', 'kura', 'hama', 'shita'
];

const GIVEN_NAMES_M = [
  'Kenji', 'Takeshi', 'Nobunaga', 'Goro', 'Masanori', 'Jiro', 'Saburo', 'Hayato', 'Ren', 'Shiro', 'Ichiro', 'Kenta',
  'Ryota', 'Hideo', 'Tadashi', 'Shinji', 'Katsu', 'Daisuke', 'Nobuo', 'Masao', 'Tetsuya', 'Sho', 'Kazuki',
  'Musashi', 'Kojiro', 'Soji', 'Toshizo', 'Hajime', 'Isami', 'Keisuke', 'Heisuke', 'Sanosuke', 'Shinpachi'
];

const GIVEN_NAMES_F = [
  'Hana', 'Akemi', 'Chiyo', 'Ran', 'Midori', 'Rin', 'Izumi', 'Megumi', 'Hotaru', 'Aya', 'Tomoe', 'Yuki',
  'Yumi', 'Kaori', 'Emi', 'Keiko', 'Nanami', 'Mei', 'Koharu', 'Hinata', 'Sakura', 'Aoi', 'Misaki',
  'Oichi', 'Komachi', 'Shizuka', 'Murasaki', 'Sei', 'Kasuga', 'Nene', 'Yodo', 'Matsuri', 'Tsubaki'
];

const PLACE_MODIFIERS = [
  'Ponte do', 'Floresta de', 'Vale do', 'Caminho de', 'Portão de', 'Templo de', 'Castelo de', 'Vila de',
  'Pântano de', 'Montanha do', 'Santuário de', 'Abismo de', 'Ruínas de', 'Pico do', 'Desfiladeiro de',
  'Gruta do', 'Lago da', 'Planalto de', 'Dunas de', 'Vilarejo do'
];

const PLACE_THEMES = [
  'Dragão Adormecido', 'Lobo de Prata', 'Vento Eterno', 'Cinzas', 'Espíritos Sorridentes', 'Sangue Antigo',
  'Neve Perpétua', 'Flores de Cerejeira', 'Sombra do Daimyo', 'Mil Lâminas', 'Garra do Tigre', 'Lua Vermelha',
  'Névoa Matinal', 'Silêncio Sagrado', 'Lótus Branca', 'Garça Real', 'Bambu Verde', 'Carpa de Ouro',
  'Vagalumes Mortos', 'Oni Faminto', 'Corvo de Três Olhos', 'Espada Quebrada'
];

const ESTABELECIMENTOS_PREFIX = ['Casa de Chá', 'Estalagem', 'Taberna', 'Refúgio', 'Pavilhão', 'Jardim'];
const ESTABELECIMENTOS_SUFIX = ['do Macaco Bêbado', 'da Lua de Outono', 'da Montanha Azul', 'da Carpa Dourada', 'dos Três Caminhos', 'da Sombra do Salgueiro', 'da Raposa Sorridente'];

const SHINOBI_ELEMENTS = ['Sombra', 'Cinzas', 'Relâmpago', 'Vento', 'Névoa', 'Espinhos', 'Sangue', 'Aço', 'Veneno', 'Gelo', 'Escuridão', 'Vácuo'];
const SHINOBI_BEASTS = ['Corvo', 'Serpente', 'Lobo', 'Aranha', 'Falcão', 'Rato', 'Raposa', 'Sapo', 'Morcego', 'Tigre', 'Camafeu', 'Escorpião'];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Gera um nome de clã combinando prefixo e sufixo.
 */
export function generateClanName() {
  return pick(CLAN_PREFIXES) + pick(CLAN_SUFFIXES);
}

/**
 * Gera um nome completo (Clã + Nome Próprio).
 */
export function generateFullName(gender?: 'm' | 'f') {
  const g = gender || (Math.random() > 0.5 ? 'm' : 'f');
  const clan = generateClanName();
  const given = pick(g === 'm' ? GIVEN_NAMES_M : GIVEN_NAMES_F);
  return `${clan} ${given}`;
}

/**
 * Gera um lugar poético/narrativo.
 */
export function generatePlaceName() {
  if (Math.random() > 0.5) {
    return pick(PLACE_MODIFIERS) + ' ' + pick(PLACE_THEMES);
  } else {
    return generateClanName() + ' ' + pick(['mura', 'zaka', 'yama', 'gawa']);
  }
}

/**
 * Gera um criptônimo Shinobi.
 */
export function generateShinobiName() {
  return `${pick(SHINOBI_ELEMENTS)} de ${pick(SHINOBI_BEASTS)}`;
}

/**
 * Gera um nome aleatório baseado em sílabas para máxima variedade.
 */
export function generateRandomName(syllablesCount = 3) {
  let name = '';
  for (let i = 0; i < syllablesCount; i++) {
    name += pick(SYLLABLES);
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * Gera um nome de estabelecimento (Taberna, etc).
 */
export function generateEstablishmentName() {
  return pick(ESTABELECIMENTOS_PREFIX) + ' ' + pick(ESTABELECIMENTOS_SUFIX);
}

/**
 * Função unificada para despacho do motor do Oráculo.
 */
export function generateName(kind: 'clan' | 'person' | 'place' | 'shinobi' | 'establishment') {
  switch (kind) {
    case 'clan': return generateClanName();
    case 'person': return generateFullName();
    case 'place': return generatePlaceName();
    case 'shinobi': return generateShinobiName();
    case 'establishment': return generateEstablishmentName();
    default: return generateRandomName();
  }
}
