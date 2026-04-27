/**
 * ════════════ ESTILOS DE LUTA - ESCUDO DO DAIMYO ════════════
 * Banco de dados centralizado de Estilos de Combate (Budo) e suas técnicas únicas.
 */

const stylesDB = [
  {
    id: "s1",
    nome: "Kenjutsu",
    sub: "Espada",
    desc: "Arte da espada. Foco em cortes diretos e posicionamentos ofensivos.",
    filosofia: "O corte perfeito nasce da unidade entre mente, corpo e lâmina.",
    manobras: ["Ataque de Arco", "Corte Vertical", "Corte Horizontal", "Estocada"],
    tecnicas: [
      { nome: "Shoha", desc: "Corte único de alta velocidade. Despreza a defesa para maximizar dano." },
      { nome: "Kiri-otoshi", desc: "Corte descendente sobre a cabeça do oponente." }
    ],
    tags: ["Espada", "Lâmina", "Bushido"],
    custo: "1 pt (Estilo)",
    emoji: "🩸"
  },
  {
    id: "s2",
    nome: "Iaijutsu",
    sub: "Saque",
    desc: "Arte do saque rápido. O combate começa e termina no instante que a lâmina deixa a bainha.",
    filosofia: "Quem saca primeiro, vence. A antecipação é a melhor defesa.",
    manobras: ["Sacar e Atacar", "Sacar e Defender", "Revezamento Rápido"],
    tecnicas: [
      { nome: "Miai-nage", desc: "Saque que simultaneamente corta e lança o oponente." },
      { nome: "Kasumi-giri", desc: "Corte horizontal em zagueiro, cortando múltiplos alvos." }
    ],
    tags: ["Espada", "Saque", "Velocidade"],
    custo: "1 pt (Estilo)",
    emoji: "🗡️"
  },
  {
    id: "s3",
    nome: "Nito Ryu",
    sub: "Espada Dupla",
    desc: "Estilo de duas espadas. Equilíbrio entre ataque e defesa simultâneos.",
    filosofia: "Uma lâmina ataca enquanto a outra defende. O ideal é a defesa perfeita.",
    manobras: ["Ataque Cruzado", "Defesa Cruzada", "Golpe Duplo"],
    tecnicas: [
      { nome: "Niten-ichi", desc: "Corte em cruz: primeiro um golpe ascendente, depois descendente." },
      { nome: "Ryo-wa", desc: "Defesa perfeita com ambas as lâminas formando barreira." }
    ],
    tags: ["Espada", "Duas Mãos", "Defesa"],
    custo: "2 pt (Estilo)",
    emoji: "⚔️"
  },
  {
    id: "s4",
    nome: "Kyujutsu",
    sub: "Arco",
    desc: "Arte do arco. Precisão à distância com o Yumi.",
    filosofia: "O arqueiro que dispara primeiro, domina o campo.",
    manobras: ["Tiro Rápido", "Mira Estendida", "Tiro em Movimento"],
    tecnicas: [
      { nome: "Hayai-uchi", desc: "Disparo ultra-rápido com mira mínima. -2 no acerto, +2 no próximo turno." },
      { nome: "Kawazu-gake", desc: "Tiro que ricocheteia no chão antes de atingir o alvo." }
    ],
    tags: ["Arco", "Distância", "Precisão"],
    custo: "1 pt (Estilo)",
    emoji: "🏹"
  },
  {
    id: "s5",
    nome: "Sojutsu",
    sub: "Lança",
    desc: "Arte da lança Yari. Controle de espaço e distância.",
    filosofia: "O comprimento da lança é a extensão do braço. Dominando o alcance, domina-se o campo.",
    manobras: ["Estocada Longa", "Varredura", "Corte com Lança"],
    tecnicas: [
      { nome: "Mizo-uchi", desc: "Estocada que visa o abdômen em movimento ascendente." },
      { nome: "Hiki-otoshi", desc: "Puxa o oponente com a lança enquanto corta suas pernas." }
    ],
    tags: ["Lança", "Alcance", "Controle"],
    custo: "1 pt (Estilo)",
    emoji: "🛡️"
  },
  {
    id: "s6",
    nome: "Naginatajutsu",
    sub: "Haste",
    desc: "Arte da naginata. Lâmina em haste para controle de área.",
    filosofia: "A lâmina longa mantém inimigos à distância. Um único corte reach pode mudar o destino.",
    manobras: ["Corte em Arco", "Golpe Descendente", "Varredura Horizontal"],
    tecnicas: [
      { nome: "Uchiotoshi", desc: "Corte descendente que quebra guarda." },
      { nome: "Shikowu", desc: "Varredura que afasta múltiplos inimigos." }
    ],
    tags: ["Haste", "Área", "Defesa"],
    custo: "1 pt (Estilo)",
    emoji: "🪓"
  },
  {
    id: "s7",
    nome: "Jujutsu",
    sub: "Desarmado",
    desc: "Arte do combate desarmado. Técnicas de agarrar, derrubar e joint locks.",
    filosofia: "O corpo é a arma suprema. A força do oponente é usada contra ele mesmo.",
    manobras: ["Agarre", "Derrubada", "Joint Lock", "Estrangulamento"],
    tecnicas: [
      { nome: "Kansetsu-waza", desc: "Técnica de travamento articular. Imobiliza sem matar." },
      { nome: "Shime-waza", desc: "Estrangulamento por trás. Render ou inconsciência." }
    ],
    tags: ["Desarmado", "Controle", "Captura"],
    custo: "1 pt (Estilo)",
    emoji: "🦴"
  },
  {
    id: "s8",
    nome: "Taijutsu",
    sub: "Desarmado",
    desc: "Artes corporais brutais. Foco em golpes de impacto e esquiva.",
    filosofia: "A carne é frágil, mas a vontade de sobreviver é forte.",
    manobras: ["Soco", "Chute", "Cotovelada", "Joelhada"],
    tecnicas: [
      { nome: "Atemi-waza", desc: "Golpes precisos em pontos vitais. Funciona mesmo contra armadura." },
      { nome: "Ukemi", desc: "Queda controlada. Minimiza dano ao cair." }
    ],
    tags: ["Desarmado", "Impacto", "Sobrevivência"],
    custo: "1 pt (Estilo)",
    emoji: "💀"
  },
  {
    id: "s9",
    nome: "Kusarijutsu",
    sub: "Corrente",
    desc: "Arte da corrente com pesos. Controle à distância e desarmamento.",
    filosofia: "A corrente é uma extensão do corpo. Sem limites de alcance.",
    manobras: ["Golpe com Peso", "Enrolar", "Trancar"],
    tecnicas: [
      { nome: "Kasarigama-giri", desc: "Laço que prende o pescoço ou membros." },
      { nome: "Kusshigai", desc: "Descarga que atravessa qualquer guarda." }
    ],
    tags: ["Corrente", "Controle", "Desarmamento"],
    custo: "1 pt (Estilo)",
    emoji: "⛓️"
  },
  {
    id: "s10",
    nome: "Shurikenjutsu",
    sub: "Arremesso",
    desc: "Arte das armas de arremesso. Suporte à distância e distração.",
    filosofia: "Cada shuriken carrega um propósito. Alvo não é matar, é distrair.",
    manobras: ["Arremesso Rápido", "Arremesso Múltiplo", "Mira Precisa"],
    tecnicas: [
      { nome: "Kogai", desc: "Arremesso duplo: shuriken nos olhos, agulha no pescoço." },
      { nome: "Hiken", desc: "Shuriken envenenado para morte lenta." }
    ],
    tags: ["Arremesso", "Distância", "Veneno"],
    custo: "1 pt (Estilo)",
    emoji: "✴️"
  },
  {
    id: "s11",
    nome: "Bojutsu",
    sub: "Bastão",
    desc: "Arte do bastão longo. Cobertura, equilíbrio e força.",
    filosofia: "O bastão é a origem de todas as armas. Simples, mas devastador.",
    manobras: ["Golpe Alto", "Golpe Baixo", "Aparar com Bastão", "Varredura"],
    tecnicas: [
      { nome: "Mizugumo", desc: "Rotação do bastão sobre a cabeça para defesa multi-angular." },
      { nome: "Torappugae", desc: "Mudança de empunhadura instantânea." }
    ],
    tags: ["Bastão", "Defesa", "Versatilidade"],
    custo: "1 pt (Estilo)",
    emoji: "🔨"
  },
  {
    id: "s12",
    nome: "Kobujutsu",
    sub: "Ferramenta",
    desc: "Arte das ferramentas de combate. Kusarigama, Tessen, etc.",
    filosofia: "Tudo pode ser uma arma nas mãos certas.",
    manobras: ["Uso Tático", "Desarmamento", "Ataque Surpresa"],
    tecnicas: [
      { nome: "Tessen-waza", desc: "Combate com o leque de ferro. Deflexão e golpe simultâneos." },
      { nome: "Jitte-giri", desc: "Quebra de lâminas inimigas com Jitte." }
    ],
    tags: ["Ferramenta", "Improviso", "Surpresa"],
    custo: "1 pt (Estilo)",
    emoji: "🌾"
  },
  {
    id: "s13",
    nome: "Taihojutsu",
    sub: "Captura",
    desc: "Arte da prisão e captura. Foco em imobilizar sem matar.",
    filosofia: "O guerreiro perfecto sabe que nem toda batalha precisa terminar em morte.",
    manobras: ["Prender", "Conduzir", "Imobilizar", "Rendar"],
    tecnicas: [
      { nome: "Kappo", desc: "Técnica de desarmamento muscular. Dói mas não machuca." },
      { nome: "Yudachi", desc: "Prisão completa: mãos, pés e cabeça imobilizados." }
    ],
    tags: ["Captura", "Controle", "Polícia"],
    custo: "1 pt (Estilo)",
    emoji: "捕"
  }
];

window.stylesDB = stylesDB;