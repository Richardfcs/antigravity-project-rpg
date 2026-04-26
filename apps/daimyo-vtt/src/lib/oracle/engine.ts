import { OracleTable, WeatherEffect, KegareMutation, NpcProfile, JourneyEvent, Estacao } from "@/types/oracle";
import { generateName } from "./name-generator";

export const ACTION_TABLE: OracleTable = {
  '11': 'Atacar', '12': 'Defender', '13': 'Viajar', '14': 'Fugir', '15': 'Esperar', '16': 'Destruir',
  '21': 'Proteger', '22': 'Servir', '23': 'Vingar', '24': 'Jurar', '25': 'Desafiar', '26': 'Render-se',
  '31': 'Investigar', '32': 'Esconder', '33': 'Buscar', '34': 'Encontrar', '35': 'Negociar', '36': 'Trair',
  '41': 'Conquistar', '42': 'Sacrificar', '43': 'Purificar', '44': 'Corromper', '45': 'Revelar', '46': 'Ocultar',
  '51': 'Libertar', '52': 'Aprisionar', '53': 'Honrar', '54': 'Desonrar', '55': 'Unir', '56': 'Dividir',
  '61': 'Roubar', '62': 'Oferecer', '63': 'Observar', '64': 'Ignorar', '65': 'Suplicar', '66': 'Comandar',
  '10': 'Sabotar', '20': 'Infiltrar', '30': 'Escapar', '40': 'Persuadir', '50': 'Interrogar', '60': 'Recrutar'
};

export const THEME_TABLE: OracleTable = {
  '11': 'Sangue', '12': 'Honra', '13': 'Dever', '14': 'Clã', '15': 'Guerra', '16': 'Paz',
  '21': 'Aço', '22': 'Fogo', '23': 'Amor', '24': 'Ódio', '25': 'Vida', '26': 'Morte',
  '31': 'Segredo', '32': 'Verdade', '33': 'Mentira', '34': 'Passado', '35': 'Futuro', '36': 'Destino',
  '41': 'Ouro', '42': 'Terra', '43': 'Mar', '44': 'Montanha', '45': 'Floresta', '46': 'Rio',
  '51': 'Espírito', '52': 'Maldição', '53': 'Lâmina', '54': 'Veneno', '55': 'Sombra', '56': 'Luz',
  '61': 'Traição', '62': 'Lealdade', '63': 'Sacrifício', '64': 'Ambição', '65': 'Loucura', '66': 'Profecia',
  '10': 'Vingança', '20': 'Justiça', '30': 'Conhecimento', '40': 'Poder', '50': 'Natureza', '60': 'Sonhos'
};

export const TABELA_PLOT_D66 = Object.keys(ACTION_TABLE).reduce((acc, key) => {
  acc[key] = { acao: ACTION_TABLE[key], tema: THEME_TABLE[key] };
  return acc;
}, {} as Record<string, { acao: string, tema: string }>);

export const TWISTS = [
  'O Cliente está mentindo sobre o motivo',
  'O Alvo é inocente ou honrado',
  'Um terceiro grupo também quer o objetivo',
  'O local é assombrado ou tem um Yokai',
  'A missão é um teste de lealdade suicida',
  'A recompensa é falsa ou roubada',
  'O verdadeiro alvo é o próprio grupo — é uma armadilha',
  'O contratante já está morto e ninguém sabe',
  'Um dos aliados do grupo é o verdadeiro vilão',
  'A missão é ilegal e a guarda está investigando',
  'O objeto/pessoa buscado já foi destruído/morto',
  'Há um refém que mudaria tudo se fosse libertado',
  'O inimigo possui informações valiosas que morreriam com ele',
  'A vila inteira está envolvida na conspiração',
  'O caminho mais seguro passa por território de um clã neutro que odeia ambos os lados',
  'A missão é na verdade um ritual disfarçado para invocar algo',
  'O alvo possui proteção divina/espiritual legítima',
  'Completar a missão desencadearia uma guerra entre clãs'
];

export const REACTION_TABLE = [
  { min: -Infinity, max: 0, level: 'Desastroso', desc: 'Ódio mortal. Ataca ou trai na primeira chance.', color: '#DC2626' },
  { min: 1, max: 3, level: 'Muito Ruim', desc: 'Antipatia forte. Prejudicará os PJs ativamente.', color: '#EF4444' },
  { min: 4, max: 6, level: 'Ruim', desc: 'Hostil. Nega ajuda, chama guardas.', color: '#F59E0B' },
  { min: 7, max: 9, level: 'Fraco', desc: 'Desconfiado. Ajuda só se muito bem pago.', color: '#D97706' },
  { min: 10, max: 12, level: 'Neutro', desc: 'Indiferente. Ignora se puder.', color: '#9CA3AF' },
  { min: 13, max: 15, level: 'Bom', desc: 'Prestativo. Aceita negociar.', color: '#34D399' },
  { min: 16, max: 18, level: 'Muito Bom', desc: 'Amigável. Oferece abrigo e ajuda.', color: '#22C55E' },
  { min: 19, max: Infinity, level: 'Excelente', desc: 'Fã/Leal. Arrisca a vida para ajudar.', color: '#D4A846' }
];

export function getSocialReaction(total: number) {
  const res = REACTION_TABLE.find(t => total >= t.min && total <= t.max) || REACTION_TABLE[4];
  return { tier: res.level, text: res.desc };
}

export const CLIMA_EFEITOS: Record<Estacao, string[]> = {
  'Primavera': [
    'Sol radiante entre as cerejeiras: +1 em testes de Visão.',
    'Chuva de pétalas constante: -1 em Rastreio.',
    'Névoa matinal densa: Visibilidade reduzida a 10 metros.',
    'Vento suave e perfumado: Recuperação de Fadiga acelerada (+1 PF/hora).',
    'Tempestade passageira: Terreno fica lamacento, Move -1.',
    'Garoa fina persistente: Arcos sofrem -1 por umidade na corda.',
    'Arco-íris duplo: Moral alta, +1 em testes de Vontade por 1 hora.',
    'Pólen intenso: Teste de HT ou espirros (-1 Furtividade).'
  ],
  'Verão': [
    'Calor opressor: Testes de HT a cada 2 horas ou sofre 1 ponto de Fadiga.',
    'Céu límpido e estrelado: +2 em Navegação Noturna.',
    'Tempestade de verão súbita: Inundação de caminhos, exige teste de Sobrevivência.',
    'Umidade sufocante: Penalidade de -1 em testes de Destreza física.',
    'Cigarras ensurdecedoras: -2 em testes de Audição.',
    'Seca prolongada: Poços secam, água vale ouro.',
    'Noites tropicais: Impossível dormir com armadura, -2 PF ao amanhecer.',
    'Raios de calor: Miragens distorcem distâncias, -1 em ataques à distância.'
  ],
  'Outono': [
    'Vento cortante: -1 em testes de combate à distância.',
    'Chuva persistente e fria: Risco de resfriado (teste de HT).',
    'Folhas secas no chão: -2 em testes de Furtividade.',
    'Céu nublado e cinzento: Melancolia profunda, -1 em Vontade.',
    'Crepúsculo precoce: Luz do dia dura 2 horas a menos.',
    'Neblina baixa ao entardecer: Visibilidade cai para 15m após as 16h.',
    'Ventos uivantes: Sons distantes são impossíveis de discernir.',
    'Chuva de granizo: 1 ponto de dano por turno sem cobertura.'
  ],
  'Inverno': [
    'Neve pesada: Movimentação reduzida à metade.',
    'Gelo nas superfícies: Testes de DX para não escorregar ao correr.',
    'Nevasca cega: Visibilidade zero, impossível viajar sem abrigo.',
    'Frio mortal: Sem agasalho, perde 1 HP a cada hora exposto.',
    'Silêncio absoluto: +2 em testes de Audição.',
    'Geada negra: Plantas e alimentos congelam, forrageamento impossível.',
    'Aurora boreal anômala: Fenômeno raro, +2 em rituais espirituais.',
    'Lago congelado: Atalho perigoso — teste de DX ou cai na água gelada.'
  ]
};

export const ENCONTROS_TABELA: Record<Estacao, string[]> = {
  'Primavera': [
    'Um monge itinerante pedindo esmola e contando boatos.',
    'Filhotes de animais silvestres cruzando o caminho.',
    'Um grupo de samurais em peregrinação a um templo de flores.',
    'Um festival local em uma aldeia próxima.',
    'Um Ronin desafiando viajantes para duelos de treino.',
    'Ruínas antigas cobertas por trepadeiras floridas.',
    'Um mercador de sementes raras e ervas medicinais.',
    'Uma noiva fugitiva implorando por proteção.',
    'Cerejeiras florescendo fora de época — sinal espiritual.',
    'Um pintor capturando a paisagem, oferece informações locais.'
  ],
  'Verão': [
    'Um bando de bandidos aproveitando o calor para emboscadas.',
    'Um riacho seco revelando algo brilhante no fundo.',
    'Camponeses trabalhando arduamente nos arrozais.',
    'Um mensageiro exausto correndo em direção à capital.',
    'Uma casa de chá isolada oferecendo abrigo do sol.',
    'Incêndio florestal ao longe, fumaça no horizonte.',
    'Crianças brincando em uma cachoeira sagrada.',
    'Uma caravana de refugiados fugindo de uma província em guerra.',
    'Um ferreiro itinerante oferecendo reparos a preço justo.',
    'Um duelo formal entre dois samurais na estrada — bloqueando o caminho.'
  ],
  'Outono': [
    'Colheita em andamento, aldeias festivas mas vigilantes.',
    'Um samurai solitário meditando sob o bordo vermelho.',
    'Um bando de corvos seguindo o grupo, sinal de mau agouro.',
    'Mercadores transportando o excesso da colheita.',
    'Um caçador perseguindo um javali enfurecido.',
    'Vila abandonada devido a uma suposta maldição.',
    'Um santuário esquecido com oferendas recentes.',
    'Um funeral sendo realizado à beira da estrada — quem morreu?',
    'Um grupo de atores Kabuki montando palco em uma clareira.',
    'Uma raposa solitária que parece guiar o grupo em uma direção.'
  ],
  'Inverno': [
    'Um andarilho quase congelado implorando por fogo.',
    'Lobos famintos rodeando o acampamento à noite.',
    'Um vilarejo isolado pela neve, desconfiado de estranhos.',
    'Pegadas gigantes na neve que desaparecem subitamente.',
    'Um lago congelado que parece esconder algo sob o gelo.',
    'Uma patrulha de fronteira rigorosa devido à escassez.',
    'Um monastério de montanha oferecendo sopa quente e abrigo.',
    'Um samurai morto na neve, segurando uma carta não enviada.',
    'Fumaça subindo de um vale — acampamento amigo ou inimigo?',
    'Uma ponte de gelo natural sobre um desfiladeiro — arriscada mas rápida.'
  ]
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateJourney(estacao: Estacao): JourneyEvent {
  const efeitos = CLIMA_EFEITOS[estacao];
  const climaStr = pick(efeitos);
  const visibilidade = climaStr.includes('Névoa') || climaStr.includes('Nevasca') || climaStr.includes('Tempestade') ? 'Baixa' : 'Normal';
  const encontro = pick(ENCONTROS_TABELA[estacao]);
  
  return {
    clima: climaStr,
    visibilidade,
    encontro
  };
}

export function generateNPC(): NpcProfile {
  const clan = generateName('clan');
  const person = generateName('person');
  
  const especialidades = [
    'Espadachim', 'Espião', 'Camponês', 'Daimyo', 'Ronin', 'Monge', 'Artesão', 'Cortesã', 'Shinobi',
    'Onmyoji (Mago)', 'Mercador', 'Ferreiro', 'Caçador', 'Pescador', 'Sumô', 'Poeta', 'Médico',
    'Pirata (Wako)', 'Guarda de Portão', 'Servo do Castelo', 'Assassino de Aluguel', 'Mensageiro',
    'Yamabushi (asceta de montanha)', 'Miko (sacerdotisa)', 'Falcoeiro', 'Carpinteiro naval',
    'Boticário', 'Tatuador ritual', 'Coletor de impostos', 'Ator de Kabuki', 'Coveiro',
    'Escriba oficial', 'Diplomata estrangeiro', 'Treinador de cavalos'
  ];
  const tracos = [
    'Uma cicatriz profunda atravessando o olho esquerdo.',
    'Fala sussurrando, como se sempre estivesse contando um segredo.',
    'Usa um quimono de seda impecável e caro demais para sua posição.',
    'Cheira a saquê barato e fumo de cachimbo.',
    'Tem mãos calejadas de guerreiro e olhar cansado.',
    'Gesticula excessivamente com as mãos ao falar.',
    'Sempre carrega um pequeno amuleto de madeira na mão esquerda.',
    'Possui uma tosse seca e constante.',
    'Tem olhos de cores diferentes (heterocromia).',
    'Usa uma máscara de porcelana que nunca remove.',
    'Veste-se inteiramente de preto, mesmo durante o dia.',
    'Exala um perfume floral extremamente forte.',
    'Manca levemente da perna direita — ferimento antigo.',
    'Tem uma tatuagem de dragão que sobe pelo pescoço.',
    'Ri nervosamente em situações de tensão.',
    'Carrega um leque que nunca abre.',
    'Tem dedos faltando na mão esquerda (Yubitsume).',
    'Olha por cima do ombro constantemente, como se fosse seguido.',
    'Fala usando provérbios antigos para tudo.',
    'Possui uma voz extremamente grave para seu tamanho.'
  ];
  const segredos = [
    'É um espião de um clã rival infiltrado na província.',
    'Possui uma dívida de honra impagável com um bando de bandidos.',
    'Busca vingança pela morte de sua família há dez anos.',
    'Está secretamente apaixonado pela filha do Senhor local.',
    'Possui um mapa que leva a um tesouro enterrado na floresta.',
    'Teve um encontro com um Yokai e desde então ouve vozes.',
    'É o herdeiro legítimo de um clã destruído, vivendo no anonimato.',
    'Pratica rituais proibidos para prolongar a vida.',
    'Matou seu mestre em um duelo desonroso e fugiu.',
    'Está sob uma maldição que o transforma lentamente em pedra.',
    'É um transformista (Kitsune ou Tanuki) disfarçado.',
    'Roubou um pergaminho sagrado de um templo remoto.',
    'Trabalha como informante para duas facções ao mesmo tempo.',
    'Possui Kegare avançado mas esconde os sintomas com ervas.',
    'Sabe a localização de uma entrada para o Jigoku.',
    'Está envenenando lentamente alguém sem que ninguém perceba.',
    'Presenciou o nascimento de uma aberração e nunca contou.',
    'Guarda um segredo que poderia derrubar o Daimyō local.',
    'É imortal — já viveu mais de 200 anos sem envelhecer.',
    'Fez um pacto com um Oni em troca de poder temporário.'
  ];

  return {
    cla: clan,
    nome: person,
    especialidade: pick(especialidades),
    traco: pick(tracos),
    segredo: pick(segredos)
  };
}

export const MUTACOES_KEGARE: KegareMutation[] = [
  { titulo: 'Pele Escamosa', desc: 'A pele torna-se rígida e cinzenta. +1 RD, mas -2 em Aparência.' },
  { titulo: 'Olhos Abissais', desc: 'Pupilas desaparecem, vazio negro. Enxerga no escuro, -2 Visão sob sol.' },
  { titulo: 'Voz da Tumba', desc: 'Voz metálica inumana. +2 Intimidação, falha em Diplomacia.' },
  { titulo: 'Sussurros do Umbral', desc: 'Ouve vozes constantes. -1 PF/dia, mas recebe alertas de perigo.' },
  { titulo: 'Sede de Sangue', desc: 'Necessidade de carne crua. Teste de Vontade ao ver sangue.' },
  { titulo: 'Mãos de Sombra', desc: 'Mãos translúcidas e geladas. +2 Furtividade, não segura objetos sagrados.' },
  { titulo: 'Rastro de Corrupção', desc: 'Plantas murcham por onde passa. Impossível ocultar rastro.' },
  { titulo: 'Língua de Serpente', desc: 'Língua bífida. Detecta calor, fala sibilante e suspeita.' },
  { titulo: 'Ossos Proeminentes', desc: 'Espinhos ósseos nos cotovelos. Investida causa +1d perfuração.' },
  { titulo: 'Sangue Negro', desc: 'Sangue espesso como piche. Contato exige teste de HT.' },
  { titulo: 'Olhar do Predador', desc: 'Olhos brilham no escuro. Animais fogem ou atacam.' },
  { titulo: 'Coração de Pedra', desc: 'Emoções distantes. +2 contra Medo, -2 Empatia.' },
  { titulo: 'Reflexo Atrasado', desc: 'Sua sombra se move com 1 segundo de atraso. Outros percebem.' },
  { titulo: 'Fome Espectral', desc: 'Comida perde o sabor. Só sente gosto de cinzas e ferro.' },
  { titulo: 'Cabelo Vivo', desc: 'Cabelos movem-se sozinhos como tentáculos. +1 Percepção tátil.' },
  { titulo: 'Eco Morto', desc: 'Sua voz não produz eco em nenhum ambiente. Perturbador.' },
  { titulo: 'Cheiro de Incenso', desc: 'Exala cheiro de funeral. Cães uivam, pessoas sentem mal-estar.' },
  { titulo: 'Pele de Cinza', desc: 'Pele torna-se acinzentada e fria. RD +1, mas aparência cadavérica.' },
  { titulo: 'Memória Parasita', desc: 'Absorve fragmentos de memória de quem toca. Caótico e involuntário.' },
  { titulo: 'Marca do Umbral', desc: 'Um kanji negro aparece na testa. Brilha na presença de outros corrompidos.' }
];

export const MONSTER_CONCEPTS = {
  formas: ['Sombra Amorfa', 'Nuvem de Insetos', 'Gigante Grotesco', 'Entidade Espectral', 'Besta Quimérica', 'Parasita Mental'],
  essencias: ['Fogo Fátuo', 'Gelo do Jigoku', 'Vento de Lâminas', 'Terra Pútrida', 'Vácuo Corrupto', 'Trovão Negro'],
  manifestacoes: ['Drena Vitalidade', 'Emana Terror Absoluto', 'Gela o Sangue', 'Provoca Alucinações', 'Corrói o Aço', 'Selado por Ofuda'],
  presencas: ['Campo de Batalha Antigo', 'Santuário Abandonado', 'Sonho de um Louco', 'Fenda da Mácula', 'Espelho Maldito']
};

export interface ItemAchado {
  nome: string;
  detalhe: string;
  valor: string;
}

export function generateLoot(): ItemAchado {
  const adjetivos = ['Velho', 'Quebrado', 'Brilhante', 'Ensangüentado', 'Sagrado', 'Misterioso', 'Empoeirado', 'Rachado'];
  const itens = ['Amuleto', 'Pergaminho', 'Cachimbo', 'Saco de Moedas', 'Pedaço de Seda', 'Estatueta', 'Adaga', 'Máscara'];
  const detalhes = [
    'Com inscrições em uma língua morta.',
    'Parece vibrar levemente ao toque.',
    'Pertenceu a um samurai famoso há muito tempo.',
    'Exala um cheiro persistente de flores de pessegueiro.',
    'Contém uma mancha de sangue que nunca sai.',
    'Esconde um compartimento secreto vazio.',
    'Está coberto de runas de proteção contra Yokais.',
    'Parece estar incompleto, faltando uma peça.'
  ];
  const valores = ['Inestimável', 'Alguns Cobres', 'Muito Valioso', 'Valor Sentimental', 'Lixo para a maioria'];

  return {
    nome: `${pick(adjetivos)} ${pick(itens)}`,
    detalhe: pick(detalhes),
    valor: pick(valores)
  };
}
