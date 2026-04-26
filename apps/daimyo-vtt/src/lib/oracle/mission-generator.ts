/**
 * Gerador de Missões Procedurais — Daimyo VTT
 * Gera até 3 missões simultaneamente com parâmetros que influenciam
 * recompensa, perigo e chance de encontros sobrenaturais.
 */

import { generateName } from './name-generator';
import { Estacao } from '@/types/oracle';

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Ambiente = 'urbano' | 'rural' | 'naval' | 'selvagem' | 'subterraneo';
export type Tensao = 'calmaria' | 'tensao' | 'guerra';

export interface MissionParams {
  ambiente: Ambiente;
  estacao: Estacao;
  tensao: Tensao;
  kegarePresente: boolean;
  nivelPerigo: number; // 1-5
}

export interface MissionReward {
  koku: number;
  mon: number;
  extras: string[];
}

export interface Mission {
  titulo: string;
  tipo: string;
  descricao: string;
  objetivo: string;
  complicacao: string;
  recompensa: MissionReward;
  encontroSobrenatural?: string;
  npcContato: string;
  localizacao: string;
  perigo: number; // 1-5
  duracao: string;
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Tabelas ─────────────────────────────────────────────────────────────────

const TIPOS_MISSAO = [
  'Escolta', 'Assassinato', 'Investigação', 'Resgate', 'Sabotagem', 'Diplomacia',
  'Patrulha', 'Coleta', 'Defesa', 'Caçada', 'Espionagem', 'Entrega Secreta',
  'Torneio', 'Cerco', 'Exploração', 'Exorcismo', 'Contrabando', 'Julgamento'
];

const OBJETIVOS: Record<Ambiente, string[]> = {
  urbano: [
    'Encontrar um traidor dentro da guarda do castelo.',
    'Escoltar um mercador valioso através do distrito dos ladrões.',
    'Recuperar um documento roubado de um oficial corrupto.',
    'Investigar desaparecimentos em um bairro específico.',
    'Proteger um nobre durante um festival público.',
    'Interceptar um mensageiro inimigo antes que chegue ao castelo.',
    'Localizar e destruir um esconderijo de contrabandistas.',
    'Mediar uma disputa entre dois comerciantes rivais.',
    'Capturar um assassino que opera nas sombras da cidade.'
  ],
  rural: [
    'Eliminar um bando de bandidos que ataca aldeias.',
    'Escoltar camponeses durante a colheita até um mercado distante.',
    'Investigar o desaparecimento de gado em fazendas remotas.',
    'Proteger um templo isolado contra saqueadores.',
    'Encontrar a fonte de um envenenamento nos poços de uma vila.',
    'Ajudar a reconstruir uma ponte destruída por enchente.',
    'Negociar um tratado de paz entre duas vilas em conflito.',
    'Rastrear um desertor que fugiu para as montanhas.',
    'Encontrar um herbalista perdido na floresta densa.'
  ],
  naval: [
    'Escoltar um navio mercante através de águas infestadas de piratas.',
    'Investigar um navio fantasma avistado perto da costa.',
    'Resgatar prisioneiros de uma ilha de piratas Wakō.',
    'Transportar um carregamento secreto para outra província por mar.',
    'Caçar um monstro marinho que atormenta pescadores locais.',
    'Interceptar um carregamento de armas contrabandeadas.',
    'Navegar até uma ilha sagrada para recuperar um artefato.',
    'Estabelecer uma rota comercial segura com uma ilha aliada.',
    'Destruir um farol falso que guia navios para naufrágio.'
  ],
  selvagem: [
    'Mapear uma rota segura através de território hostil.',
    'Caçar uma fera gigante que aterroriza viajantes.',
    'Encontrar um santuário perdido mencionado em lendas.',
    'Sobreviver a uma travessia de território de Yokai.',
    'Coletar ervas raras que crescem apenas em picos nevados.',
    'Resgatar um batedor perdido em território inimigo.',
    'Estabelecer um acampamento avançado em terra selvagem.',
    'Investigar anomalias espirituais em uma floresta antiga.',
    'Encontrar a nascente de um rio que secou misteriosamente.'
  ],
  subterraneo: [
    'Explorar uma mina abandonada em busca de recursos.',
    'Encontrar e selar uma fenda da Mácula em cavernas profundas.',
    'Resgatar mineiros presos em um desabamento.',
    'Investigar sons estranhos vindos de túneis antigos.',
    'Localizar uma câmara secreta de um clã extinto.',
    'Mapear um sistema de túneis usado por contrabandistas.',
    'Purificar uma fonte subterrânea corrompida.',
    'Recuperar relíquias de uma tumba ancestral.',
    'Enfrentar o que habita nas profundezas de um poço amaldiçoado.'
  ]
};

const COMPLICACOES = [
  'Um aliado tem motivos ocultos e pode trair o grupo.',
  'O alvo da missão é parente de um personagem jogador.',
  'A informação inicial era falsa — o verdadeiro objetivo é outro.',
  'Um terceiro grupo compete pela mesma missão.',
  'O tempo é muito curto: há apenas 24 horas para completar.',
  'A missão exige infiltração disfarçada em território inimigo.',
  'O contratante morreu, mas o pagamento já foi adiantado.',
  'Há uma testemunha inocente que pode ser prejudicada.',
  'Um dos NPCs aliados é na verdade um espião.',
  'As condições climáticas mudam drasticamente durante a missão.',
  'A recompensa prometida não existe, o contratante é um desesperado.',
  'Um Daimyō poderoso se opõe à missão abertamente.',
  'A missão envolve matar alguém que ajudou os PJs no passado.',
  'Um rival dos PJs também aceitou a mesma missão.',
  'O local da missão é sagrado e violência lá traz consequências.',
  'O grupo descobre que o verdadeiro contratante é o próprio alvo.',
  'Uma peste ou doença assola a região, complicando movimentação.',
  'O grupo é confundido com criminosos procurados pela guarda local.',
  'O alvo possui reféns que serão executados se a missão falhar.',
  'Completar a missão violaria um juramento sagrado de um PJ.',
  'A área está infestada de armadilhas deixadas por um clã extinto.',
  'O objetivo está protegido por um muro de silencio — nenhuma magia funciona lá.',
  'Há uma criança envolvida que muda completamente a moral da missão.',
  'O grupo descobre que a missão é um teste de caráter de um senhor feudal.',
  'O local da missão muda de posição a cada noite (sobrenatural).'
];

const ENCONTROS_SOBRENATURAIS = [
  'Uma neblina antinatural envolve o grupo, revelando sombras de mortos.',
  'O grupo encontra um Kodama (espírito de árvore) que oferece orientação em troca de algo.',
  'Um Kitsune disfarçado tenta enganar o grupo para desviá-lo do caminho.',
  'Vozes de mortos são ouvidas ao anoitecer, repetindo eventos do passado.',
  'Um Tengu observa o grupo de uma árvore alta e intervém se importunado.',
  'O campo de batalha do passado se manifesta como miragem, com guerreiros espectrais.',
  'Uma Yuki-onna aparece durante uma tempestade de neve, oferecendo abrigo mortal.',
  'Um Tsukumogami (objeto animado) ataca o grupo à noite.',
  'O grupo encontra um portal temporário para o Jigoku (inferno) na terra.',
  'Uma criança fantasma guia o grupo até um tesouro protegido por uma maldição.',
  'Os sonhos de todos os membros do grupo convergem para o mesmo pesadelo.',
  'Um Oni menor cobra pedágio em uma ponte, exigindo um duelo de charadas.',
  'A água de um rio próximo flui para cima brevemente ao entardecer.',
  'Estátuas de pedra no caminho mudam de posição quando ninguém está olhando.',
  'Um Jorou-gumo (mulher-aranha) se faz passar por donzela em perigo.',
  'Um Kappa emerge de um lago e desafia o grupo para um duelo de sumô.',
  'As sombras dos membros do grupo ganham vida própria por alguns minutos.',
  'Um Ubume (fantasma de mãe) pede que carreguem seu bebê — que fica cada vez mais pesado.',
  'Fuji no Kamikaze: vento divino sopra impedindo avanço, como se a terra recusasse o grupo.',
  'Um Tanuki pregador de peças transforma pedras em moedas falsas.',
  'O grupo encontra uma árvore milenar que sussurra segredos sobre o futuro.',
  'Uma procissão de fantasmas (Hyakki Yagýō) cruza o caminho silenciosamente.',
  'O chão abre revelando uma escadaria que leva a um templo subterrâneo esquecido.',
  'Um Bakeneko (gato sobrenatural) fala com voz humana e oferece um acordo.'
];

const DURACOES = [
  '1 dia', '2-3 dias', 'Uma semana', 'Duas semanas', '1 mês', 'Indefinido'
];

const EXTRAS_RECOMPENSA = [
  'Um favor político de um Senhor local.',
  'Acesso a uma área restrita do castelo.',
  'Uma arma forjada sob encomenda.',
  'Um terreno ou propriedade pequena.',
  'Informações sobre o paradeiro de um inimigo.',
  'Proteção oficial contra um clã rival.',
  'Um mapa de uma rota comercial secreta.',
  'Um selo de livre passagem entre províncias.',
  'Um cavalo de guerra treinado.',
  'Treinamento gratuito com um mestre espadachim.',
  'Perdão oficial por um crime passado.',
  'Uma aliança com um comerciante influente.',
  'Convite para jantar com o Daimyō — oportunidade política.',
  'Um espírito guardiião vinculado a um item.',
  'Título honorário dentro de uma província.',
  'Localização de uma forja lendária.',
  'Uma dose de elíxir raro (efeito único a critiro do mestre).',
  'Posição de conselheiro em uma vila.',
  'Um falcão de caça treinado.',
  'Acesso a uma biblioteca secreta de pergaminhos antigos.'
];

// ─── Motor de Geração ────────────────────────────────────────────────────────

function calcSobrenaturalChance(params: MissionParams): number {
  let chance = 10; // Base 10%
  if (params.kegarePresente) chance += 35;
  if (params.tensao === 'guerra') chance += 15;
  if (params.ambiente === 'selvagem' || params.ambiente === 'subterraneo') chance += 20;
  if (params.estacao === 'Inverno') chance += 10;
  if (params.estacao === 'Outono') chance += 5;
  if (params.nivelPerigo >= 4) chance += 10;
  return Math.min(chance, 95);
}

function calcRewardMultiplier(params: MissionParams): number {
  let mult = 1.0;
  if (params.tensao === 'guerra') mult += 0.5;
  if (params.tensao === 'calmaria') mult -= 0.2;
  if (params.nivelPerigo >= 4) mult += 0.4;
  if (params.nivelPerigo >= 3) mult += 0.2;
  if (params.ambiente === 'naval') mult += 0.3;
  if (params.kegarePresente) mult += 0.3;
  return mult;
}

function generateSingleMission(params: MissionParams): Mission {
  const tipo = pick(TIPOS_MISSAO);
  const objetivo = pick(OBJETIVOS[params.ambiente]);
  const complicacao = pick(COMPLICACOES);
  const npcContato = generateName('person');
  const localizacao = generateName('place');

  const rewardMult = calcRewardMultiplier(params);
  const baseKoku = rand(3, 15) * params.nivelPerigo;
  const baseMon = rand(50, 300) * params.nivelPerigo;

  const recompensa: MissionReward = {
    koku: Math.round(baseKoku * rewardMult),
    mon: Math.round(baseMon * rewardMult),
    extras: Math.random() > 0.5 ? [pick(EXTRAS_RECOMPENSA)] : []
  };
  if (params.nivelPerigo >= 4 && Math.random() > 0.4) {
    recompensa.extras.push(pick(EXTRAS_RECOMPENSA));
  }

  const sobrenaturalChance = calcSobrenaturalChance(params);
  const encontroSobrenatural = (Math.random() * 100) < sobrenaturalChance
    ? pick(ENCONTROS_SOBRENATURAIS)
    : undefined;

  // Gerar título temático
  const verbos = [
    'A Sombra sobre', 'O Dever em', 'Sangue em', 'O Segredo de', 'A Queda de',
    'O Cerco a', 'Redenção em', 'Chamas sobre', 'A Lâmina de', 'Espectros em',
    'Juízo em', 'A Traição de', 'Cinzas de', 'O Último Suspiro de', 'A Honra de',
    'Lágrimas sobre', 'O Silencio de', 'A Emboscada em', 'O Fantasma de', 'A Promessa de'
  ];
  const titulo = `${pick(verbos)} ${localizacao.split(' ').slice(-2).join(' ')}`;

  return {
    titulo,
    tipo,
    descricao: objetivo,
    objetivo,
    complicacao,
    recompensa,
    encontroSobrenatural,
    npcContato,
    localizacao,
    perigo: params.nivelPerigo,
    duracao: pick(DURACOES)
  };
}

// ─── API Pública ─────────────────────────────────────────────────────────────

export function generateMissions(params: MissionParams, count = 3): Mission[] {
  const missions: Mission[] = [];
  const usedObjectives = new Set<string>();

  for (let i = 0; i < count; i++) {
    let mission: Mission;
    let attempts = 0;
    do {
      mission = generateSingleMission(params);
      attempts++;
    } while (usedObjectives.has(mission.objetivo) && attempts < 10);

    usedObjectives.add(mission.objetivo);
    missions.push(mission);
  }

  return missions;
}

export const AMBIENTE_LABELS: Record<Ambiente, string> = {
  urbano: 'Urbano',
  rural: 'Rural',
  naval: 'Naval',
  selvagem: 'Selvagem',
  subterraneo: 'Subterrâneo'
};

export const TENSAO_LABELS: Record<Tensao, string> = {
  calmaria: 'Calmaria',
  tensao: 'Tensão',
  guerra: 'Guerra'
};

export const PERIGO_LABELS = ['—', 'Baixo', 'Moderado', 'Alto', 'Perigoso', 'Suicida'];
