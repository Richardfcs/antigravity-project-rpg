/**
 * ════════════ ARSENAL DE DADOS GURPS 4E - ESCUDO DO DAIMYO ════════════
 * Banco de dados centralizado de Equipamentos, Armas e Armaduras.
 */

const weaponsDB = [
  // Lâminas (Kenjutsu)
  { id: "w1", nome: "Katana (1 mão)", tipo: "Lâmina", dano: "GeB+1 cort / GdP+1 perf", alcance: "1", aparar: "0", custo: "$600", peso: "1.5 kg", forca: "10", notas: "Uso com uma mão. A espada padrão do samurai." },
  { id: "w2", nome: "Katana (2 mãos)", tipo: "Lâmina", dano: "GeB+2 cort / GdP+1 perf", alcance: "1 a 2", aparar: "0", custo: "-", peso: "-", forca: "9†", notas: "Requer duas mãos. Maior dano e alcance." },
  { id: "w3", nome: "Wakizashi", tipo: "Lâmina", dano: "GeB cort / GdP perf", alcance: "1", aparar: "0", custo: "$400", peso: "1 kg", forca: "8", notas: "Espada curta de acompanhamento. Funciona em combate próximo (C)." },
  { id: "w4", nome: "Nodachi (Grande)", tipo: "Lâmina", dano: "GeB+3 cort / GdP+2 perf", alcance: "1 a 2", aparar: "0U", custo: "$800", peso: "2.5 kg", forca: "12†", notas: "Grande espada. Desequilibrada — não apara se atacar." },
  { id: "w5", nome: "Tanto (Faca)", tipo: "Lâmina", dano: "GeB-2 cort / GdP perf", alcance: "C, 1", aparar: "-1", custo: "$40", peso: "0.5 kg", forca: "6", notas: "Faca de samurai. Funciona em agarramento." },
  
  // Hastes e Esmagamento (Sojutsu/Kobujutsu)
  { id: "w6", nome: "Yari (Lança 1 mão)", tipo: "Haste", dano: "GdP+2 perf", alcance: "2", aparar: "0", custo: "$60", peso: "2 kg", forca: "9", notas: "Lança de uma mão. Rainha do campo de batalha." },
  { id: "w7", nome: "Yari (Lança 2 mãos)", tipo: "Haste", dano: "GdP+3 perf", alcance: "2 a 3", aparar: "0", custo: "-", peso: "-", forca: "9†", notas: "Lança longa com duas mãos. Controle de distância." },
  { id: "w8", nome: "Naginata", tipo: "Haste", dano: "GeB+2 cort / GdP+2 perf", alcance: "2 a 3", aparar: "0U", custo: "$100", peso: "3 kg", forca: "10†", notas: "Alabarda japonesa. Desequilibrada. Comum entre Sohei e mulheres samurais." },
  { id: "w9", nome: "Bo (Bastão)", tipo: "Haste", dano: "GeB+2 esm / GdP+1 esm", alcance: "1 a 2", aparar: "2", custo: "$10", peso: "2 kg", forca: "7†", notas: "Bastão longo. Bom aparar (+2). Não letal, mas quebra ossos." },
  { id: "w10", nome: "Tetsubo (Maça)", tipo: "Esmagamento", dano: "GeB+4 esm", alcance: "1 a 2", aparar: "0U", custo: "$120", peso: "5 kg", forca: "13†", notas: "Maça de ferro brutal. Desequilibrada." },
  
  // Especialistas (Ninja/Polícia)
  { id: "w11", nome: "Kusarigama (Foice)", tipo: "Especialista", dano: "GeB+2 esm / GeB cort", alcance: "1 a 4", aparar: "0U", custo: "$75", peso: "1.5 kg", forca: "8†", notas: "Foice com corrente (Ninja). Difícil de bloquear." },
  { id: "w12", nome: "Jitte (Bastão Ferro)", tipo: "Especialista", dano: "GeB esm", alcance: "1", aparar: "0", custo: "$20", peso: "0.5 kg", forca: "6", notas: "Bastão de ferro policial. Usado para desarmar." },
  { id: "w13", nome: "Kunai (Faca)", tipo: "Especialista", dano: "GeB-1 cort / GdP-1 perf", alcance: "C, 1", aparar: "-1", custo: "$15", peso: "0.5 kg", forca: "6", notas: "Faca ninja multiuso." },
  
  // ARMAS DE FORÇA BRUTA (ONO & OTSUCHI)
  { id: "w14", nome: "Masakari (Machado)", tipo: "Força Bruta", dano: "GeB+2 cort", alcance: "1", aparar: "0U", custo: "$50", peso: "2 kg", forca: "11", notas: "Machado de uma mão." },
  { id: "w15", nome: "Ono (Machado Grande)", tipo: "Força Bruta", dano: "GeB+3 cort", alcance: "1 a 2", aparar: "0U", custo: "$100", peso: "4 kg", forca: "12†", notas: "Machado grande. Requer duas mãos." },
  { id: "w16", nome: "Otsuchi (Martelo)", tipo: "Força Bruta", dano: "GeB+4 esm", alcance: "1 a 2", aparar: "0U", custo: "$100", peso: "4 kg", forca: "12†", notas: "Martelo de guerra. Requer duas mãos." },
  
  // Armas de Ataque à Distância
  { id: "w17", nome: "Yumi (Arco Longo)", tipo: "Arco", dano: "GdP+2 perf", alcance: "x15 / x20", aparar: "—", custo: "$200", peso: "1.5 kg", forca: "11†", notas: "Arco longo japonês. Precisão 3." },
  { id: "w18", nome: "Fukiya (Zarabatana)", tipo: "Especialista", dano: "1d-3 pi-", alcance: "x4 / ??", aparar: "—", custo: "$30", peso: "0.5 kg", forca: "—", notas: "Zarabatana, Precisão 1. Entregam veneno no sangue." },

  // Armas de Arremesso (Pequenas)
  { id: "w19", nome: "Shuriken (Estrela)", tipo: "Arremesso", dano: "GdP-1 cort", alcance: "x0.5 / x1.0", aparar: "—", custo: "$3", peso: "0.05 kg", forca: "4", notas: "Estrela de arremesso. Precisão 1. Pode ser envenenada." },
  { id: "w20", nome: "Bo-Shuriken (Dardo)", tipo: "Arremesso", dano: "GdP-1 perf", alcance: "x0.5 / x1.0", aparar: "—", custo: "$3", peso: "0.05 kg", forca: "4", notas: "Dardo. Penetra melhor roupas grossas." },
  { id: "w21", nome: "Tsubute (Pedra Polida)", tipo: "Arremesso", dano: "GdP esm", alcance: "x1.0 / x2.0", aparar: "—", custo: "-", peso: "-", forca: "4", notas: "Pedras de rio usadas para atordoar." },
  { id: "w22", nome: "Kunai (Arremesso)", tipo: "Arremesso", dano: "GdP-1 perf", alcance: "x0.8 / x1.5", aparar: "—", custo: "$15", peso: "0.5 kg", forca: "6", notas: "Pesada. Pode ser usada em combate corpo a corpo (Faca)." },
  { id: "w23", nome: "Kanabo (Clava Gigante)", tipo: "Esmagamento", dano: "GeB+5 esm", alcance: "1 a 2", aparar: "0U", custo: "$150", peso: "6 kg", forca: "14†", notas: "Clava de madeira com pregos de ferro. Brutal." },
  { id: "w24", nome: "Nagamaki (Lâmina Longa)", tipo: "Lâmina", dano: "GeB+3 cort / GdP+2 perf", alcance: "1 a 2", aparar: "0", custo: "$700", peso: "2.2 kg", forca: "11†", notas: "Cabo longo e lâmina de katana. Ótima alavancagem." },
  { id: "w25", nome: "Daikyu (Arco Pesado)", tipo: "Arco", dano: "GdP+3 perf", alcance: "x20 / x25", aparar: "—", custo: "$500", peso: "2 kg", forca: "12†", notas: "Arco assimétrico de elite. Requer muita força e alcance." },
  { id: "w26", nome: "Hankyu (Arco Curto)", tipo: "Arco", dano: "GdP+1 perf", alcance: "x10 / x15", aparar: "—", custo: "$100", peso: "1 kg", forca: "8†", notas: "Arco compacto. Pode ser usado em ambientes fechados ou a cavalo." },
  { id: "w27", nome: "Manriki-Gusari (Corrente)", tipo: "Especialista", dano: "GeB esm", alcance: "1 a 3", aparar: "0", custo: "$35", peso: "1.5 kg", forca: "7†", notas: "Corrente com pesos. Ótima para desarmar e enredar membros." },
  { id: "w28", nome: "Sodegarami (Gancho Policial)", tipo: "Haste", dano: "GeB-1 perf", alcance: "2", aparar: "0", custo: "$40", peso: "2.5 kg", forca: "10†", notas: "Cabo com espinhos para prender roupas. Usado para captura viva." },
  { id: "w29", nome: "Tonfa (Cacete de Madeira)", tipo: "Esmagamento", dano: "GeB esm", alcance: "1", aparar: "1", custo: "$20", peso: "1 kg", forca: "7", notas: "Bastão com cabo lateral. Oferece bônus de +1 para aparar." },
  { id: "w30", nome: "Sai (Tridente de Ferro)", tipo: "Especialista", dano: "GeB-1 esm / GdP perf", alcance: "1", aparar: "1", custo: "$40", peso: "1 kg", forca: "7", notas: "Especial para prender e desarmar lâminas inimigas." },
  { id: "w31", nome: "Kama (Foice de Mão)", tipo: "Lâmina", dano: "GeB+1 cort", alcance: "1", aparar: "-1", custo: "$20", peso: "1 kg", forca: "8", notas: "Foice curta agrícola. Muito perigosa em mãos treinadas." },
  { id: "w32", nome: "Nunchaku (Bastões)", tipo: "Esmagamento", dano: "GeB+1 esm", alcance: "1", aparar: "0", custo: "$15", peso: "1 kg", forca: "7", notas: "Bastões ligados por corrente. Difícil de aparar (-2 defesa inimiga)." },
  { id: "w33", nome: "Uchi-ne (Dardo Gigante)", tipo: "Arremesso", dano: "GdP+1 perf", alcance: "x1 / x2", aparar: "-1", custo: "$30", peso: "1 kg", forca: "7", notas: "Dardo pesado de penas curtas. Pode ser usado como adaga." },
  { id: "w34", nome: "Chigiriki (Mangual)", tipo: "Haste", dano: "GeB+2 esm", alcance: "1 a 2", aparar: "0U", custo: "$50", peso: "2.5 kg", forca: "10†", notas: "Bastão com corrente e bola de ferro. Ignora bônus de escudos." },
  { id: "w35", nome: "Tetsumaru (Esfera de Ferro)", tipo: "Arremesso", dano: "GdP+1 esm", alcance: "x1 / x1.5", aparar: "—", custo: "$10", peso: "1 kg", forca: "10", notas: "Esferas de metal arremessadas para quebrar ossos." }
];

const armorDB = [
  // Armaduras Leves e Comuns
  { id: "a1", nome: "Roupas Comuns", local: "Corpo Inteiro", rd: "0", peso: "1 kg", custo: "Varia", notas: "Status define o preço." },
  { id: "a2", nome: "Kamiko (Papel Laqueado)", local: "Tronco+Braços", rd: "1", peso: "1.5 kg", custo: "$50", notas: "Muito barata e leve." },
  { id: "a3", nome: "Traje de Ninja (Tec. Reforçado)", local: "Corpo Inteiro", rd: "1*", peso: "3 kg", custo: "$150", notas: "+1 em Furtividade (Escuro)." },
  { id: "a4", nome: "Cota de Malha (Kusari)", local: "Tronco (Oculta)", rd: "3/1*", peso: "4 kg", custo: "$260", notas: "Pode usar por baixo da roupa." },
  { id: "a27", nome: "Kesa (Manto Sagrado)", local: "Tronco", rd: "1*", peso: "0.5 kg", custo: "$30", notas: "Manto de monge com camadas reforçadas." },
  { id: "a28", nome: "Kyudo-Gi (Traje de Tiro)", local: "Tronco+Braços", rd: "1", peso: "1 kg", custo: "$60", notas: "Reforçado no ombro esquerdo para o uso do arco." },
  { id: "a29", nome: "Shitabachi (Capa de Malha)", local: "Pescoço", rd: "2", peso: "1 kg", custo: "$50", notas: "Proteção de malha para o pescoço e nuca." },
  { id: "a30", nome: "Suneate de Bambu (Leve)", local: "Pernas", rd: "1", peso: "0.5 kg", custo: "$15", notas: "Proteção rústica e barata para as canelas." },
  { id: "a31", nome: "Yoroi-Hitatare (Acolchoado)", local: "Tronco+Braços+Pernas", rd: "1", peso: "2.5 kg", custo: "$80", notas: "Roupas grossas usadas sob a armadura." },
  { id: "a32", nome: "Jin-baori (Sobretudo)", local: "Tronco", rd: "1*", peso: "1 kg", custo: "$100", notas: "Capa cerimonial que pode ter forro de couro." },
  { id: "a33", nome: "Kyahan (Polainas de Couro)", local: "Pernas", rd: "1", peso: "0.5 kg", custo: "$25", notas: "Proteção de canela usada por viajantes." },
  { id: "a34", nome: "Kote de Seda (Mangas)", local: "Braços", rd: "1*", peso: "0.5 kg", custo: "$30", notas: "Mangas reforçadas para combate leve." },
  { id: "a35", nome: "Fusuma-Do (Papel Laqueado Fino)", local: "Tronco", rd: "2", peso: "2 kg", custo: "$70", notas: "Versão de luxo da armadura de papel." },
  
  // Peças de Armadura (Couro e Placas)
  { id: "a5", nome: "Jingasa (Chapéu de Ferro)", local: "Crânio", rd: "3", peso: "1 kg", custo: "$30", notas: "Protege de cima." },
  { id: "a6", nome: "Do (Couraça de Couro)", local: "Tronco", rd: "2", peso: "4 kg", custo: "$100", notas: "Couro fervido/laqueado." },
  { id: "a7", nome: "Tatami (Malha e Placas)", local: "Tronco", rd: "3", peso: "7 kg", custo: "$350", notas: "Dobrável e portátil." },
  { id: "a8", nome: "Tate (Escudo de Chão)", local: "Cobertura", rd: "5", peso: "15 kg", custo: "$60", notas: "Fornece Cobertura Total se você se agachar atrás dele. PV 40." },
  
  // Armadura de Samurai (O-Yoroi)
  { id: "a9", nome: "Kabuto (Elmo)", local: "Cabeça", rd: "5", peso: "3 kg", custo: "$150", notas: "Inclui máscara (Mempo)." },
  { id: "a10", nome: "Do (Peitoral Lamelar)", local: "Tronco", rd: "5", peso: "12 kg", custo: "$700", notas: "Pesado e resistente." },
  { id: "a11", nome: "Sode/Kote (Ombreiras/Braços)", local: "Braços", rd: "4", peso: "4 kg", custo: "$220", notas: "Protege ombros/braços." },
  { id: "a12", nome: "Haidate (Coxotes)", local: "Pernas", rd: "4", peso: "5 kg", custo: "$250", notas: "Protege coxas e canelas." },
  { id: "a13", nome: "O-Yoroi (Conjunto Completo)", local: "Tudo", rd: "4 a 5", peso: "24 kg", custo: "$1.320", notas: "Carga Média ou Pesada!" },
  { id: "a14", nome: "Haramaki (Faixa Abdominal)", local: "Tronco", rd: "2*", peso: "1 kg", custo: "$120", notas: "Proteção de seda e malha oculta." },
  { id: "a15", nome: "Tosei-Gusoku (Placas Modernas)", local: "Tudo", rd: "6", peso: "18 kg", custo: "$1.800", notas: "Placas inteiriças. Resistente a disparos de mosquete." },
  { id: "a16", nome: "Kote de Ferro (Manoplas)", local: "Mãos", rd: "4", peso: "1 kg", custo: "$80", notas: "Protege as mãos contra cortes." },
  { id: "a17", nome: "Mempo (Máscara de Guerra)", local: "Rosto", rd: "3", peso: "0.5 kg", custo: "$100", notas: "Aterrorizante. +1 Intimidação." },
  { id: "a18", nome: "Zukin (Capuz Reforçado)", local: "Crânio", rd: "1", peso: "0.5 kg", custo: "$20", notas: "Capuz de tecido grosso usado por ninjas." },
  { id: "a19", nome: "Kote de Couro (Protetores)", local: "Braços", rd: "2", peso: "1.5 kg", custo: "$60", notas: "Protetores de braço em couro laqueado." },
  { id: "a20", nome: "Suneate (Grevas de Ferro)", local: "Pernas", rd: "3", peso: "2 kg", custo: "$90", notas: "Proteção para as canelas." },
  { id: "a21", nome: "Yugake (Luvas de Arqueiro)", local: "Mãos", rd: "1", peso: "-", custo: "$15", notas: "Luvas de couro para proteger os dedos." },
  { id: "a22", nome: "Manchira (Colete de Malha)", local: "Tronco", rd: "3/1*", peso: "2.5 kg", custo: "$200", notas: "Capa de malha oculta sob a roupa." },
  { id: "a23", nome: "Hachigane (Bandana de Aço)", local: "Crânio", rd: "2", peso: "0.2 kg", custo: "$15", notas: "Placa metálica em uma bandana." },
  { id: "a24", nome: "Do-Maru (Armadura de Escamas)", local: "Tronco+Pernas", rd: "4", peso: "12 kg", custo: "$500", notas: "Escamas amarradas, ideal para infantaria ágil." },
  { id: "a25", nome: "Karamono-Gusoku (Lendária)", local: "Tudo", rd: "7", peso: "32 kg", custo: "$2.500", notas: "Armadura imperial pesadíssima. Quase impenetrável." },
  { id: "a26", nome: "Yukata de Seda Reforçada", local: "Tronco", rd: "1", peso: "1 kg", custo: "$45", notas: "Roupas civis de alta qualidade com forro de couro." }
];

const gearDB = [
  // 🥷 Ferramentas de Invasão (Ninja) / Táticos
  { id: "g1", nome: "Bomba de Fumaça (Kemuridama)", efeito: "Nuvem 3m. -5 Visão. Furtividade +4.", subtipo: "ninja", peso: "-", custo: "$20", alcance: "Arremesso", notas: "Usada para fugas." },
  { id: "g2", nome: "Pó Cegante (Metsubishi)", efeito: "Cegueira temporária se o alvo falhar em HT.", subtipo: "ninja", peso: "Uso único", custo: "$10", alcance: "Alcance 1 (DX-4)", notas: "Jogue nos olhos." },
  { id: "g3", nome: "Kaginawa (Gancho e Corda)", efeito: "+2 em Escalada.", subtipo: "ninja", peso: "2.5 kg", custo: "$20", alcance: "-", notas: "" },
  { id: "g4", nome: "Shuko/Ashiko (Garras de Mão/Pé)", efeito: "+1 em Escalada, Dano +1 corte em Briga.", subtipo: "ninja", peso: "0.5 kg", custo: "$50", alcance: "C", notas: "" },
  { id: "g5", nome: "Kit de Arrombamento (Gazuas)", efeito: "Necessário para abrir trancas.", subtipo: "ninja", peso: "0.2 kg", custo: "$50", alcance: "-", notas: "" },
  { id: "g6", nome: "Tetsubishi (Estrepes)", efeito: "Quem pisar sofre 1 de dano e para de andar.", subtipo: "ninja", peso: "0.5 kg", custo: "$20", alcance: "-", notas: "" },
  
  // 🎒 Sobrevivência e Viagem
  { id: "g7", nome: "Waraji (Sandálias de Palha)", efeito: "+1 Furtividade", subtipo: "viagem", peso: "-", custo: "$25", alcance: "-", notas: "Silenciosas, mas gastam rápido." },
  { id: "g8", nome: "Geta (Sandálias de Madeira)", efeito: "-1 Furtividade (em piso duro).", subtipo: "viagem", peso: "-", custo: "$20", alcance: "-", notas: "Mantêm os pés secos na lama." },
  { id: "g9", nome: "Kasa (Chapéu de Palha)", efeito: "Protege da chuva/sol. Pode esconder o rosto (Disfarce).", subtipo: "viagem", peso: "-", custo: "$10", alcance: "-", notas: "" },
  { id: "g10", nome: "Ração de Viagem (Bento Seco)", efeito: "Arroz seco, peixe, ameixa. Dura 1 semana.", subtipo: "viagem", peso: "0.25 kg", custo: "$2", alcance: "-", notas: "" },
  { id: "g11", nome: "Cantil (Cabaça/Bambu)", efeito: "Capacidade 1 Litro.", subtipo: "viagem", peso: "0.5 kg cheio", custo: "$10", alcance: "-", notas: "" },
  { id: "g12", nome: "Mochila Pequena", efeito: "Transporte de itens leves.", subtipo: "viagem", peso: "1.5 kg", custo: "$60", alcance: "-", notas: "" },
  { id: "g13", nome: "Saco de Dormir (Futon de palha)", efeito: "Descanso adequado ao ar livre.", subtipo: "viagem", peso: "2 kg", custo: "$25", alcance: "-", notas: "" },
  { id: "g14", nome: "Lanterna de Papel (Chochin)", efeito: "Ilumina 2m por 2 horas.", subtipo: "viagem", peso: "0.5 kg", custo: "$20", alcance: "-", notas: "Protege a vela do vento." },
  { id: "g15", nome: "Tocha", efeito: "Ilumina 2m por 1 hora.", subtipo: "viagem", peso: "0.5 kg", custo: "$3", alcance: "-", notas: "Fumaça revela posição." },
  { id: "g16", nome: "Pederneira (Fogo)", efeito: "Acende fogo em 5 segundos.", subtipo: "viagem", peso: "-", custo: "$5", alcance: "-", notas: "" },
  { id: "g17", nome: "Corda de Seda (10m)", efeito: "Suspende pesos maiores, silenciosa.", subtipo: "viagem", peso: "1.5 kg", custo: "$20", alcance: "-", notas: "Mais forte, leve e silenciosa que cânhamo." },
  
  // 💊 Medicinas e Venenos
  { id: "g18", nome: "Kit de Primeiros Socorros", efeito: "+1 em Primeiros Socorros.", subtipo: "medicina", peso: "1 kg", custo: "$50", alcance: "-", notas: "Bandagens e ervas." },
  { id: "g19", nome: "Kit Cirúrgico (Primitivo)", efeito: "Necessário para Cirurgia.", subtipo: "medicina", peso: "2.5 kg", custo: "$300", alcance: "-", notas: "Amputações, extrair flechas." },
  { id: "g20", nome: "Veneno Digestivo (Acônito)", efeito: "Dano 2d tóxico após 1 hora.", subtipo: "medicina", peso: "1 dose", custo: "$100", alcance: "Ingerido", notas: "" },
  { id: "g21", nome: "Veneno de Lâmina (Víbora)", efeito: "Dano 1d fadiga + Dor.", subtipo: "medicina", peso: "1 dose", custo: "$50", alcance: "Sangue", notas: "" },
  { id: "g22", nome: "Flechas / Munição (10 un)", efeito: "Perfuram armaduras leves.", subtipo: "medicina", peso: "0.5 kg", custo: "$25", alcance: "-", notas: "$2 cada." },
  { id: "g23", nome: "Flecha Watakushi (Corte/10 un)", efeito: "Dano vira corte. Ruim vs armadura (RDx2), terror vs carne limpa (x1.5).", subtipo: "medicina", peso: "0.5 kg", custo: "$50?", alcance: "-", notas: "" },

  // 🎭 Cultura e Diversão
  { id: "g24", nome: "Kit de Caligrafia", efeito: "Pincéis, sumi e papel.", subtipo: "cultura", peso: "1 kg", custo: "$50", alcance: "-", notas: "" },
  { id: "g25", nome: "Leque de Guerra (Tessen)", efeito: "+1 em Liderança visual. Pode ser usado para aparar.", subtipo: "cultura", peso: "0.5 kg", custo: "$40", alcance: "-", notas: "" },
  { id: "g26", nome: "Símbolo Sagrado (Omamori)", efeito: "Amuleto de proteção.", subtipo: "cultura", peso: "-", custo: "$5", alcance: "-", notas: "" },
  
  // 🐎 Montarias
  { id: "g27", nome: "Cavalo de Guerra", efeito: "Treinado para não fugir em combate.", subtipo: "montaria", peso: "ST 22", custo: "$2.000+", alcance: "-", notas: "" },
  { id: "g28", nome: "Cavalo de Carga (Pônei)", efeito: "Teimoso em combate.", subtipo: "montaria", peso: "-", custo: "$1.000", alcance: "-", notas: "" },
  { id: "g29", nome: "Sela de Combate", efeito: "Dá estabilidade para usar arco e espada montado.", subtipo: "montaria", peso: "7 kg", custo: "$150", alcance: "-", notas: "" },

  // 🧪 Alquimia e Ocultismo (Arsênico, Magia, Caçador)
  { id: "g30", nome: "Sinos de Purificação (Suzu)", efeito: "Toca som dissonante se cruzado por Yokai (mesmo invisível).", subtipo: "oculto", peso: "-", custo: "$50", alcance: "Perímetro", notas: "Alarme." },
  { id: "g31", nome: "Pílula de Vitalidade (Hyou-Gan)", efeito: "Recupera 1d-2 PF. Causa 'Crash' ou dano.", subtipo: "alquimia", peso: "1 un", custo: "$50~100", alcance: "Ingerido", notas: "Teste HT-2: falha = Náusea." },
  { id: "g32", nome: "Cinzas de Cremação", efeito: "Yokai falha em HT-2 = Cegos/Dor por 1d6s. Humanos tossem.", subtipo: "oculto", peso: "1 uso", custo: "Coleta Roleplay", alcance: "Alc 1-2", notas: "Jogue nos olhos." },
  { id: "g33", nome: "Sal Puro (Mori-Shio)", efeito: "Dano x2 (Queimadura) em Yurei/Oni. Trava Regeneração 1min.", subtipo: "oculto", peso: "-", custo: "-", alcance: "-", notas: "Impede fantasmas de cruzar." },
  { id: "g34", nome: "Óleo de Glicínia (Fuji-Abura)", efeito: "Se ferir Oni/Henge, HT-3 ou perde Regeneração/Metamorfose 1d min.", subtipo: "alquimia", peso: "1 uso", custo: "$150", alcance: "-", notas: "Aplica em Arma (1 min)." },
  { id: "g35", nome: "Ofuda (Selo Sagrado) / Pergaminho", efeito: "+1 em Rituais/Proteção.", subtipo: "oculto", peso: "-", custo: "$5", alcance: "-", notas: "" },
  { id: "g36", nome: "Bomba de Cinzas (Hai-Dama)", efeito: "Yokai na área sofrem Cegueira/Tosse (DX/IQ -4).", subtipo: "alquimia", peso: "1 uso", custo: "$30", alcance: "Área 2m", notas: "" },
  { id: "g37", nome: "Água Sagrada (Saquê Puro)", efeito: "Ignora até -4 penalidade fadiga/dor. Permite cuspir p/ acertar Insubstancial.", subtipo: "alquimia", peso: "1 Garrafa", custo: "$50", alcance: "Consumível", notas: "Crash: Náusea e perda dupla de PF." },
  { id: "g38", nome: "Espelho de Bronze (Kagami)", efeito: "Revela Henge/Yurei invisível. Luz refletida: 1d dano Yurei.", subtipo: "oculto", peso: "-", custo: "$200", alcance: "Visão/Reflexo", notas: "Concentração exigida." },
  { id: "g39", nome: "Madeira de Pessegueiro", efeito: "A única madeira que fere espíritos intangíveis a 100%.", subtipo: "oculto", peso: "Varia", custo: "Raro", alcance: "Arma Base", notas: "Dano base baixo, utilidade total." },
  { id: "g40", nome: "Fogo Sagrado", efeito: "Dano x1.5 e causa Pânico em bestas.", subtipo: "oculto", peso: "-", custo: "Rituais", alcance: "-", notas: "Aceso com preces de templos." }
];

const qualityWeaponDB = [
  { nome: "Barata", custo: "x0.4 (40%)", efeito: "+2 na chance de quebrar ao aparar.", notas: "Ferramentas agrícolas ou espadas enferrujadas." },
  { nome: "Boa", custo: "x1 (100%)", efeito: "Padrão.", notas: "Maioria das armas militares." },
  { nome: "Fina", custo: "x4 (400%)", efeito: "+1 Dano (Corte/Perf). -1 na chance de quebrar.", notas: "Lâminas de samurais ricos." },
  { nome: "Muito Fina", custo: "x20 (2000%)", efeito: "+2 Dano (Corte/Perf). -2 na chance de quebrar.", notas: "Tesouros de clã. O fio nunca perde afiação." }
];

const qualityArmorDB = [
  { nome: "Barata", custo: "x0.6 (60%)", efeito: "RD -1 (Mín. 1) OU Peso +50% (Desajeitada).", notas: "" },
  { nome: "Boa", custo: "x1 (100%)", efeito: "Padrão das tabelas.", notas: "" },
  { nome: "Fina", custo: "x4 (400%)", efeito: "Peso -10% ou RD +1 (Aço superior).", notas: "Ajuste perfeito." },
  { nome: "Obra-Prima", custo: "x20 (2000%)", efeito: "RD +2 e Peso -20%.", notas: "Quase indestrutível." }
];

const materialDB = [
  { nome: "Aço Frio", afeta: "Humanos, Henge, Oni", efeito: "Dano normal. Monstros com Regeneração curam rapidamente." },
  { nome: "Sal Puro", afeta: "Yurei, Oni, Kaii", efeito: "Dano x2 (Fogo). Interrompe Regeneração 1 min. Bloqueia linha de fantasmas." },
  { nome: "Glicínia (Fuji)", afeta: "Oni, Henge", efeito: "Veneno. Causa paralisia muscular ou anula transformação." },
  { nome: "Pessegueiro", afeta: "Yurei, Possessões", efeito: "Fere espíritos intangíveis. Dano base baixo, acerta sempre." },
  { nome: "Fogo Sagrado", afeta: "Todos (menos Dragões)", efeito: "Dano x1.5. Causa Pânico em bestas brutas." }
];

const slotRuleDB = [
  { nivel: "Nenhuma (0)", limites: "Até 1x ST", movimento: "100%", esquiva: "Normal" },
  { nivel: "Leve (1)", limites: "Até 2x ST", movimento: "80%", esquiva: "-1" },
  { nivel: "Média (2)", limites: "Até 3x ST", movimento: "60%", esquiva: "-2" },
  { nivel: "Pesada (3)", limites: "Até 6x ST", movimento: "40%", esquiva: "-3" },
  { nivel: "Muito Pesada (4)", limites: "Até 10x ST", movimento: "20%", esquiva: "-4" }
];

// Helper to get weapon stats by name or ID
function findWeapon(query) {
  return weaponsDB.find(w => w.id === query || w.nome === query);
}

window.weaponsDB = weaponsDB;
window.armorDB = armorDB;
window.gearDB = gearDB;
window.qualityWeaponDB = qualityWeaponDB;
window.qualityArmorDB = qualityArmorDB;
window.materialDB = materialDB;
window.slotRuleDB = slotRuleDB;
window.findWeapon = findWeapon;
