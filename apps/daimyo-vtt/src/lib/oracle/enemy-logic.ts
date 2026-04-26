import { ThreatLevel, EnemyStats, MonsterConcept } from "@/types/oracle";
import { generateFullName } from "./name-generator";

const THREAT_CONFIG: Record<ThreatLevel, any> = {
  "civil":       { st: [8, 10],  dx: [9, 10],  iq: [9, 10],  ht: [9, 10],  hpMod: 0 },
  "recruta":     { st: [10, 10], dx: [10, 10], iq: [10, 10], ht: [10, 10], hpMod: 0 },
  "capanga":     { st: [10, 11], dx: [10, 11], iq: [9, 10],  ht: [10, 11], hpMod: 0 },
  "veterano":    { st: [11, 12], dx: [11, 12], iq: [10, 11], ht: [11, 12], hpMod: 2 },
  "elite":       { st: [12, 13], dx: [12, 13], iq: [10, 11], ht: [11, 13], hpMod: 5 },
  "excepcional": { st: [13, 14], dx: [13, 13], iq: [11, 12], ht: [12, 13], hpMod: 8 },
  "mestre":      { st: [14, 16], dx: [14, 15], iq: [12, 14], ht: [13, 15], hpMod: 12 }
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
  'Apaga todas as fontes de luz próximas', 'Rouba memórias recentes',
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

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Gera um inimigo completo baseado no nível de ameaça (Lógica GURPS).
 */
export function generateEnemy(threat: ThreatLevel = "capanga"): EnemyStats {
  const config = THREAT_CONFIG[threat];
  
  let st = rand(config.st[0], config.st[1]);
  let dx = rand(config.dx[0], config.dx[1]);
  let iq = rand(config.iq[0], config.iq[1]);
  let ht = rand(config.ht[0], config.ht[1]);

  // Equilíbrio GURPS
  if (st >= 13 && dx >= 13) {
    if (Math.random() > 0.4) iq = rand(8, 10); 
    if (Math.random() > 0.6) ht = Math.max(10, ht - 1);
  } else if (iq >= 13) {
    if (Math.random() > 0.5) st = rand(8, 10);
  } else if (st >= 15) {
    if (Math.random() > 0.5) dx = rand(9, 11);
  }

  const hp = st + (config.hpMod || 0);
  const name = generateFullName();
  const initBase = (dx + ht) / 4;
  const esquiva = Math.floor(initBase) + 3;
  
  let skillBase = dx;
  if (threat === "veterano") skillBase += 1;
  if (threat === "elite") skillBase += 2;
  if (threat === "mestre") skillBase += 4;
  
  const aparar = Math.floor(skillBase / 2) + 3;
  const hasShield = Math.random() > 0.8 || threat === "elite" || threat === "mestre";
  const bloqueio = hasShield ? Math.floor(skillBase / 2) + 3 : 0;

  const ARMAS_POR_NIVEL: Record<string, string[]> = {
    civil: ['Faca', 'Cajado', 'Foice', 'Machado de lenha', 'Pedras', 'Mãos nuas'],
    recruta: ['Yari (lança)', 'Tantō', 'Arco curto', 'Naginata simples', 'Bō'],
    capanga: ['Katana simples', 'Yari', 'Arco curto', 'Kusarigama', 'Naginata', 'Kanabō'],
    veterano: ['Katana forjada', 'Wakizashi + Tantō', 'Yumi (arco longo)', 'Naginata polida', 'Nodachi'],
    elite: ['Katana de mestre', 'Ōdachi', 'Arco composto Dai-kyū', 'Kusari + Sai duplo', 'Nagamaki'],
    excepcional: ['Katana ancestral', 'Par de espadas (Daisho)', 'Arco longo de osso', 'Tessen de ferro + Wakizashi'],
    mestre: ['Lâmina lendária', 'Daisho + Tessen', 'Arma de escolha (mestre)', 'Arma selada (espiritual)']
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

  const arma = pick(ARMAS_POR_NIVEL[threat] || ARMAS_POR_NIVEL.capanga);
  const estilo = pick(ESTILOS);

  return {
    name: `${name} (${threat.toUpperCase()})`,
    st, dx, iq, ht,
    vont: iq + (Math.random() > 0.8 ? 1 : 0),
    hp: hp,
    hpMax: hp,
    pf: ht,
    pfMax: ht,
    iniciativa: initBase,
    velocidade: initBase,
    esquiva,
    aparar,
    bloqueio,
    armas: arma,
    notas: `${estilo}${hasShield ? ' [Escudo Equipado]' : ''}`,
    isNPC: true
  };
}

/**
 * Gera um monstro conceitual/sobrenatural.
 */
export function generateMonsterConcept(): MonsterConcept {
  return {
    forma: pick(FORMAS),
    essencia: pick(ESSENCIAS),
    manifestacao: pick(MANIFESTACOES),
    presenca: pick(PRESENCAS)
  };
}
