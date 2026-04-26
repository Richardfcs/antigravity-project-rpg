/**
 * Gerador Monogatari — Daimyo VTT
 * 
 * Inspirado no conceito de que o sobrenatural é um reflexo da psique humana.
 * As aberrações não são "reais" no sentido absoluto — são manifestações
 * de traumas, desejos reprimidos, culpas e obsessões.
 * O que se vê é filtrado pela mente do observador.
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Aberracao {
  nome: string;
  aparencia: string;
  natureza: string;         // O que "parece" ser
}

export interface OrigemPsicologica {
  emocao: string;           // Emoção raiz
  trauma: string;           // Evento que causou
  portador: string;         // Quem está manifestando
}

export interface ManifestacaoMonogatari {
  como: string;             // Como aparece no mundo
  onde: string;             // Contexto/local de aparição
  quando: string;           // Gatilho temporal
}

export interface VerdadeOculta {
  revelacao: string;        // A verdade por trás da aberração
  pista: string;            // Pista que o mestre pode dar
}

export interface SintomaAfetado {
  fisico: string;
  mental: string;
  social: string;
}

export interface Resolucao {
  metodo: string;           // Como resolver
  dificuldade: string;      // Fácil, Moderado, Difícil, Quase Impossível
  consequencia: string;     // O que acontece se não resolver
}

export interface MonogatariEvent {
  aberracao: Aberracao;
  origem: OrigemPsicologica;
  manifestacao: ManifestacaoMonogatari;
  verdade: VerdadeOculta;
  sintomas: SintomaAfetado;
  resolucao: Resolucao;
  intensidade: number;      // 1-5
  frase: string;            // Frase temática/poética
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Tabelas ─────────────────────────────────────────────────────────────────

const NOMES_ABERRACAO = [
  'O Peso Invisível', 'A Sombra que Segue', 'O Eco do Grito', 'A Ferida que Fala',
  'O Reflexo Errado', 'A Máscara Viva', 'O Fio Vermelho Partido', 'A Promessa Podre',
  'O Silêncio que Morde', 'A Lembrança que Sangra', 'O Nó no Estômago', 'A Voz do Poço',
  'O Riso nas Paredes', 'A Cicatriz Ambulante', 'O Sonho Acordado', 'O Olhar Sem Dono',
  'A Solidão que Respira', 'O Arrependimento Vivo', 'A Culpa Encarnada', 'O Amor Petrificado',
  'A Memória Devoradora', 'O Medo que Habita', 'A Raiva Cristalizada', 'O Luto Errante'
];

const APARENCIAS = [
  'Uma mulher de cabelos extremamente longos que cobrem o rosto, sempre de costas.',
  'Um homem feito de sombras que aparece apenas na visão periférica.',
  'Uma criança que repete a mesma frase em loop, com voz distorcida.',
  'Um animal impossível — metade corvo, metade gato — que observa fixamente.',
  'Uma figura translúcida que imita os movimentos do portador com atraso.',
  'Mãos que brotam das paredes ou do chão, sempre tentando agarrar algo.',
  'Uma máscara Nō flutuando no ar, mudando de expressão conforme a emoção do portador.',
  'Um reflexo nos espelhos e poças que mostra uma versão decadente e doente do portador.',
  'Uma neblina com forma humanoide que cheira a incenso e sangue.',
  'Borboletas negras que surgem do nada e pousam nos ombros do portador.',
  'Um boneco de palha que aparece em lugares inesperados, sempre olhando.',
  'Uma voz que canta uma canção de ninar que só o portador ouve.',
  'Pegadas molhadas que surgem no chão sem ninguém pisando.',
  'Um gato preto com três caudas que aparece antes de cada crise.',
  'Uma árvore morta que cresce de um dia para o outro perto do portador.',
  'Insetos luminescentes que formam palavras no escuro.'
];

const NATUREZAS = [
  'Parece ser um Yokai ancestral preso a um local maldito.',
  'Assemelha-se a um espírito vingativo (Onryō) buscando justiça.',
  'Tem a aparência de um Tsukumogami — um objeto que ganhou vida.',
  'Parece uma maldição hereditária transmitida pelo sangue.',
  'Comporta-se como um guardião de fronteira espiritual.',
  'Imita um demônio faminto (Gaki) que se alimenta de emoções.',
  'Age como um Shinigami pessoal que coleta dívidas espirituais.',
  'Parece ser um eco temporal — um fragmento do passado preso no presente.'
];

// ─── Origem Psicológica ──────────────────────────────────────────────────────

const EMOCOES_RAIZ = [
  'Culpa não processada', 'Luto não vivido', 'Raiva reprimida', 'Medo paralisante',
  'Vergonha profunda', 'Solidão crônica', 'Ciúme obsessivo', 'Remorso silencioso',
  'Desejo proibido', 'Amor não correspondido', 'Orgulho ferido', 'Abandono infantil',
  'Impotência diante de injustiça', 'Obsessão com controle', 'Negação da morte',
  'Inveja destrutiva', 'Dependência emocional', 'Perda de identidade'
];

const TRAUMAS = [
  'Assistiu à morte de alguém próximo e não pôde fazer nada.',
  'Foi traído por quem mais confiava em um momento crucial.',
  'Matou alguém em legítima defesa, mas não consegue aceitar o ato.',
  'Perdeu um filho ou irmão durante uma guerra e nunca chorou.',
  'Foi forçado a abandonar sua terra natal e nunca voltou.',
  'Cometeu um ato desonroso que ninguém sabe, mas que o consome.',
  'Viu algo sobrenatural de verdade e ninguém acreditou.',
  'Foi humilhado publicamente e jurou vingança, mas nunca agiu.',
  'Salvou sua própria vida às custas de outra pessoa.',
  'Recebeu uma promessa que nunca foi cumprida por alguém amado.',
  'Foi separado à força de alguém por razões políticas.',
  'Cresceu sendo comparado a um irmão "superior" e nunca se sentiu suficiente.',
  'Descobriu uma verdade horrível sobre sua família e a enterrou.',
  'Foi amaldiçoado por alguém que morreu antes de poder desfazer.',
  'Presenciou uma atrocidade durante uma missão e participou por omissão.'
];

const PORTADORES = [
  'Um samurai veterano que esconde seu passado sob disciplina rígida.',
  'Uma jovem curandeira que absorve a dor dos outros sem perceber.',
  'Um comerciante próspero cuja riqueza foi construída sobre uma mentira.',
  'Uma viúva que se recusa a aceitar a morte do marido.',
  'Um monge que perdeu a fé mas continua os rituais por hábito.',
  'Um guerreiro aposentado que revive batalhas nos sonhos.',
  'Uma criança que viu algo que nenhuma criança deveria ver.',
  'Um artesão obsessivo cuja obra-prima nunca está "boa o suficiente".',
  'Um espião que não lembra mais qual é sua verdadeira identidade.',
  'Um nobre que vive uma vida de luxo para fugir do vazio interno.',
  'Uma sacerdotisa que ouve vozes que ela confunde com os deuses.',
  'Um ronin que carrega a espada do mestre que ele falhou em proteger.'
];

// ─── Manifestação ────────────────────────────────────────────────────────────

const COMO_MANIFESTA = [
  'Aparece sempre que o portador mente ou esconde algo.',
  'Surge durante o sono do portador como um pesadelo tangível.',
  'Intensifica-se quando o portador sente a emoção raiz.',
  'Manifesta-se fisicamente quando o portador está sozinho.',
  'Torna-se visível para outros quando o portador está em perigo.',
  'Distorce a realidade ao redor — sons, cheiros, temperaturas mudam.',
  'Faz objetos do passado do portador aparecerem do nada.',
  'Cria ilusões que apenas o portador pode ver, mas outros sentem o mal-estar.',
  'Sussurra verdades que o portador não quer ouvir.',
  'Causa fenômenos reais (objetos movem, velas apagam) como efeito colateral.',
  'Atrai outros seres sombrios para perto, como um farol de Kegare.',
  'Cria uma zona de realidade alterada onde o tempo parece diferente.'
];

const ONDE_APARECE = [
  'Em quartos escuros, especialmente ao amanhecer.',
  'Perto de espelhos, superfícies reflexivas e água parada.',
  'Em locais com história de morte ou sofrimento.',
  'Dentro de templos e santuários, ironicamente.',
  'Na presença de crianças ou inocentes.',
  'Em encruzilhadas e pontes, locais de transição.',
  'Sempre no mesmo lugar — um cômodo, uma árvore, uma pedra.',
  'Segue o portador para qualquer lugar, mas só aparece à noite.'
];

const GATILHOS = [
  'Ao ouvir uma música ou som específico que remete ao trauma.',
  'Quando alguém menciona o nome do morto ou o evento.',
  'Durante datas significativas (aniversário, estação, lua cheia).',
  'Sempre que o portador tenta ser feliz ou relaxar.',
  'Quando o portador encontra alguém parecido com a pessoa perdida.',
  'Ao segurar ou ver um objeto conectado ao trauma.',
  'Quando o portador dorme em um lugar novo.',
  'Após consumir saquê ou substâncias que baixam as defesas mentais.',
  'Quando o portador tenta contar a alguém sobre a aberração.'
];

// ─── Verdade Oculta ──────────────────────────────────────────────────────────

const REVELACOES = [
  'A aberração é o próprio portador — uma parte dissociada de sua mente.',
  'O "monstro" é uma memória reprimida tentando ser processada.',
  'A entidade protege o portador de si mesmo, impedindo-o de agir destrutivamente.',
  'O fenômeno é contagioso — a emoção do portador infecta quem convive com ele.',
  'A aberração é na verdade um aviso do subconsciente sobre um perigo real.',
  'O portador está projetando sua culpa em uma forma visível para lidar com ela.',
  'A "maldição" cessará no momento em que o portador aceitar o que aconteceu.',
  'O portador criou a aberração como companhia para sua solidão extrema.',
  'A entidade existe porque o portador se recusa a esquecer — ela é uma âncora.',
  'A aberração é real, mas só existe porque alguém a alimenta com medo.',
  'O fenômeno é compartilhado — outros afetados pela mesma emoção também o veem.',
  'A aberração é um reflexo de algo que o portador ainda vai fazer, não do que já fez.'
];

const PISTAS = [
  'A aberração nunca ataca diretamente — apenas observa e espera.',
  'Outros portadores do mesmo trauma relataram fenômenos similares.',
  'Um Onmyoji experiente reconhece os sinais como "doença da alma".',
  'A aberração desaparece momentaneamente quando o portador chora de verdade.',
  'Rituais de exorcismo não funcionam — na verdade, pioram os sintomas.',
  'A aberração replica comportamentos do próprio portador com 24 horas de atraso.',
  'Quando confrontada diretamente, a aberração repete palavras que o portador disse.',
  'A forma da aberração muda conforme o estado emocional do portador.',
  'Crianças conseguem ver a aberração com mais clareza que adultos.',
  'Animais reagem ao portador, não à aberração em si.'
];

// ─── Sintomas ────────────────────────────────────────────────────────────────

const SINTOMAS_FISICOS = [
  'Insônia crônica — o portador não consegue dormir mais que 2 horas.',
  'Perda de apetite seguida de compulsão alimentar.',
  'Dores de cabeça que aumentam na presença da aberração.',
  'Marcas inexplicáveis na pele que aparecem e desaparecem.',
  'Temperatura corporal anormalmente baixa.',
  'Cabelos embranquecendo prematuramente.',
  'Tremores nas mãos durante momentos de estresse.',
  'Sangramentos nasais espontâneos perto de locais espirituais.'
];

const SINTOMAS_MENTAIS = [
  'Paranóia crescente — sente que está sendo observado constantemente.',
  'Flashbacks vívidos do evento traumático em momentos aleatórios.',
  'Dissociação — momentos em que "sai do corpo" e observa de fora.',
  'Pensamentos intrusivos repetitivos que não consegue controlar.',
  'Perda de memórias recentes, mas lembranças do trauma ficam nítidas.',
  'Apego obsessivo a objetos, rotinas ou pessoas específicas.',
  'Medo irracional de algo ordinário (fogo, água, silêncio).',
  'Sensação constante de que algo terrível vai acontecer.'
];

const SINTOMAS_SOCIAIS = [
  'Isolamento progressivo — afasta amigos e aliados sem perceber.',
  'Agressividade repentina com pessoas que tentam ajudar.',
  'Mentiras compulsivas para esconder o estado real.',
  'Dependência emocional extrema de uma única pessoa.',
  'Frieza emocional que aliena todos ao redor.',
  'Necessidade de controlar tudo e todos ao seu redor.',
  'Incapacidade de confiar em qualquer pessoa nova.',
  'Sabotagem inconsciente de relacionamentos positivos.'
];

// ─── Resolução ───────────────────────────────────────────────────────────────

const METODOS = [
  'O portador precisa confrontar a verdade do trauma verbalizando-a para alguém.',
  'Um ritual de purificação emocional, não espiritual — confissão genuína.',
  'O portador deve retornar ao local do trauma e enfrentá-lo conscientemente.',
  'Alguém precisa demonstrar ao portador que ele não está sozinho nessa dor.',
  'O portador deve perdoar — a si mesmo ou a outra pessoa — de forma sincera.',
  'A aberração cessará quando o portador realizar o ato que evitou por medo.',
  'É necessário que o portador chore, grite ou expresse o que reprimiu.',
  'O portador precisa criar algo (arte, carta, monumento) para externalizar a dor.',
  'Alguém deve recriar a situação traumática com um desfecho diferente.',
  'O portador deve aceitar a perda e literalmente soltar algo simbólico (queimar, enterrar).',
  'Uma conversa com alguém que passou pela mesma experiência pode quebrar o ciclo.',
  'O portador precisa dormir voluntariamente no local mais assombrado e enfrentar o sonho.'
];

const DIFICULDADES = ['Simples', 'Moderado', 'Difícil', 'Quase Impossível'];

const CONSEQUENCIAS = [
  'A aberração se torna permanente — parte da identidade do portador.',
  'O portador perde gradualmente a conexão com a realidade.',
  'A aberração se espalha para pessoas próximas ao portador.',
  'O corpo do portador começa a deteriorar (perda de 1 HP/dia).',
  'A aberração se torna autônoma e começa a agir por conta própria.',
  'O portador desenvolve uma segunda personalidade moldada pela aberração.',
  'Outros Yokais e seres sombrios são atraídos pela aberração descontrolada.',
  'O portador se torna incapaz de distinguir a aberração da realidade.',
  'A região ao redor do portador começa a ser afetada (plantas morrem, animais fogem).',
  'O Kegare do portador aumenta 1 ponto por semana até atingir o limite.'
];

// ─── Frases Temáticas ────────────────────────────────────────────────────────

const FRASES = [
  '"O monstro que você vê é o monstro que você criou."',
  '"Nem tudo que assombra está morto. Algumas coisas nunca estiveram vivas."',
  '"A espada não resolve o que nasceu dentro de você."',
  '"Você não pode matar uma emoção. Pode apenas aprender a conviver."',
  '"O Yokai mais perigoso é aquele que tem o seu rosto."',
  '"Exorcizar é fácil. Curar é que é difícil."',
  '"A aberração não veio de fora. Ela sempre esteve aqui."',
  '"Matar o monstro não desfaz o trauma. Apenas o enterra mais fundo."',
  '"O que você chama de maldição, eu chamo de grito."',
  '"Há feridas que nenhum curandeiro pode tocar."',
  '"A criatura não quer te destruir. Ela quer ser ouvida."',
  '"Quando a mente sangra, o mundo ao redor se deforma."',
  '"Toda aberração é uma história que alguém se recusou a contar."',
  '"O verdadeiro exorcismo é a empatia."',
  '"A escuridão mais densa está dentro de quem se recusa a olhar."'
];

// ─── Motor de Geração ────────────────────────────────────────────────────────

export function generateMonogatariEvent(): MonogatariEvent {
  const intensidade = rand(1, 5);
  const dificIdx = intensidade <= 2 ? 0 : intensidade <= 3 ? 1 : intensidade <= 4 ? 2 : 3;

  return {
    aberracao: {
      nome: pick(NOMES_ABERRACAO),
      aparencia: pick(APARENCIAS),
      natureza: pick(NATUREZAS)
    },
    origem: {
      emocao: pick(EMOCOES_RAIZ),
      trauma: pick(TRAUMAS),
      portador: pick(PORTADORES)
    },
    manifestacao: {
      como: pick(COMO_MANIFESTA),
      onde: pick(ONDE_APARECE),
      quando: pick(GATILHOS)
    },
    verdade: {
      revelacao: pick(REVELACOES),
      pista: pick(PISTAS)
    },
    sintomas: {
      fisico: pick(SINTOMAS_FISICOS),
      mental: pick(SINTOMAS_MENTAIS),
      social: pick(SINTOMAS_SOCIAIS)
    },
    resolucao: {
      metodo: pick(METODOS),
      dificuldade: DIFICULDADES[dificIdx],
      consequencia: pick(CONSEQUENCIAS)
    },
    intensidade,
    frase: pick(FRASES)
  };
}

// Cores por intensidade
export const INTENSIDADE_COLORS = ['', 'text-sky-400', 'text-emerald-400', 'text-amber-400', 'text-orange-400', 'text-rose-400'];
export const INTENSIDADE_BG = ['', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500'];
export const INTENSIDADE_LABELS = ['', 'Sutil', 'Perceptível', 'Perturbador', 'Aterrador', 'Devastador'];
