/**
 * 📚 DIRETÓRIO TÉCNICO & BIBLIOTECA — Escudo do Daimyo
 * Banco de dados completo migrado de Organizando-Todas-Opções.md
 * Gerencia persistência local, categorias customizadas, subcategorias e tags.
 */

const LibraryManager = (function() {
    const DATA_VERSION = 2;

    const defaultCategories = [
        { id: 'cat_van', name: 'Vantagem', icon: '🌟', tags: ['Combate', 'Social', 'Mental', 'Extra', 'Política', 'Mestria', 'Vida'], order: 0 },
        { id: 'cat_des', name: 'Desvantagem', icon: '⛓️', tags: ['Código de Honra', 'Social', 'Pessoal', 'Extra', 'Física', 'Mental'], order: 1 },
        { id: 'cat_per', name: 'Perícia', icon: '🥋', tags: ['Combate', 'Furtividade', 'Social', 'Sobrevivência', 'Intelectual', 'Artesão', 'Espião', 'Natureza', 'Esotérica', 'Artes', 'Conhecimento'], order: 2 },
        { id: 'cat_qua', name: 'Qualidade', icon: '🎭', tags: ['Combate', 'Social', 'Equip', 'Estilo de Vida'], order: 3 },
        { id: 'cat_pec', name: 'Peculiaridade', icon: '🔹', tags: ['Crença', 'Aversão', 'Traço', 'Código', 'Mania'], order: 4 },
        { id: 'cat_bud', name: 'Budo', icon: '⚔️', tags: ['Espada', 'Arco', 'Lança', 'Desarmado', 'Saque', 'Corrente', 'Arremesso', 'Haste', 'Bastão', 'Ferramenta', 'Captura'], order: 5 },
        { id: 'cat_reg', name: 'Regra', icon: '📜', tags: ['Referência', 'Mecânica'], order: 6 },
        { id: 'cat_arq', name: 'Arquétipo', icon: '👥', tags: ['Nobre', 'Ronin', 'Místico', 'Ninja'], order: 7 },
        { id: 'cat_yok', name: 'Yokai', icon: '👻', tags: ['Espírito', 'Físico', 'Terror', 'Calamidade'], order: 8 },
        { id: 'cat_alq', name: 'Alquimia', icon: '🧪', tags: ['Veneno', 'Poção', 'Explosivo'], order: 9 },
        { id: 'cat_atl', name: 'Atlas', icon: '🗺️', tags: ['Província', 'Cidade', 'Santuário'], order: 10 }
    ];

    const initialData = [
        // ═══════════════════════════════════════════════════════════
        // VANTAGENS (28 itens)
        // ═══════════════════════════════════════════════════════════

        // -- Combate (6) --
        { id: 'lib_v01', nome: "Reflexos em Combate", cat: "Vantagem", sub: "Combate", cust: "15 pts", fonte: "[MB 82]", desc: "+1 em todas as defesas, +1 na iniciativa, nunca trava por surpresa. Recomendado para todos os Samurais.", tags: ["Combate", "Essencial"] },
        { id: 'lib_v02', nome: "Hipoalgia (High Pain Threshold)", cat: "Vantagem", sub: "Combate", cust: "10 pts", fonte: "[MB 63]", desc: "Você ignora a penalidade de choque por ferimentos. Essencial para continuar lutando sangrando.", tags: ["Combate", "Essencial"] },
        { id: 'lib_v03', nome: "Boa Forma (Fit)", cat: "Vantagem", sub: "Combate", cust: "5 ou 15 pts", fonte: "[MB 45]", desc: "Recupera Fadiga (PF) mais rápido e resiste melhor a doenças/venenos.", tags: ["Combate", "Física"] },
        { id: 'lib_v04', nome: "Ambidestria", cat: "Vantagem", sub: "Combate", cust: "5 pts", fonte: "[MB 38]", desc: "Luta com a mão esquerda sem penalidade de -4.", tags: ["Combate"] },
        { id: 'lib_v05', nome: "Arma de Assinatura", cat: "Vantagem", sub: "Combate", cust: "Variável", fonte: "[MB 36]", desc: "Você possui uma arma lendária (espada ancestral) que é parte da sua história. Se perdê-la, Mestre registra uma Cicatriz de Perda (escolha 1): Dívida de Sangue, Desonra Pública, Obsessão, Marca Física. Recuperar é jogo — e custa.", tags: ["Combate", "Roleplay"] },
        { id: 'lib_v06', nome: "Treinamento de Espadachim", cat: "Vantagem", sub: "Combate", cust: "20 pts", fonte: "[AM 221]", desc: "Substitui Mestre de Armas. Permite usar técnicas cinematográficas e reduz penalidades de ataque rápido, mas não dobra o dano. Apenas com permissão.", tags: ["Combate", "Artes Marciais"] },

        // -- Social (5) --
        { id: 'lib_v07', nome: "Status", cat: "Vantagem", sub: "Social", cust: "5 pts/nível", fonte: "[MB 28]", desc: "Nível 1 (Chefe de Família/Ronin respeitado) a 4 (Daimyo).", tags: ["Social", "Hierarquia"] },
        { id: 'lib_v08', nome: "Riqueza", cat: "Vantagem", sub: "Social", cust: "Variável", fonte: "[MB 25]", desc: "Define seu dinheiro inicial e salário.\n• Confortável (10 pts): 2x dinheiro inicial.\n• Rico (20 pts): 5x dinheiro inicial.", tags: ["Social", "Economia"] },
        { id: 'lib_v09', nome: "Aliado", cat: "Vantagem", sub: "Social", cust: "Variável", fonte: "[MB 31]", desc: "Um servo leal, um escudeiro ou um guarda-costas que viaja com você.", tags: ["Social"] },
        { id: 'lib_v10', nome: "Patrono", cat: "Vantagem", sub: "Social", cust: "Variável", fonte: "[MB 72]", desc: "Um Senhor Feudal ou Clã Ninja que te dá ordens, mas fornece equipamento caro e proteção política.", tags: ["Social", "Política"] },
        { id: 'lib_v11', nome: "Reivindicar Hospitalidade", cat: "Vantagem", sub: "Social", cust: "5 a 10 pts", fonte: "[MB 82]", desc: "Direito de exigir abrigo e comida em templos ou casas de samurais do seu clã.", tags: ["Social"] },

        // -- Mental (6) --
        { id: 'lib_v12', nome: "Carisma", cat: "Vantagem", sub: "Mental", cust: "5 pts/nível", fonte: "[MB 47]", desc: "Líder nato. +1 em Liderança e Oratória por nível.", tags: ["Social", "Mental"] },
        { id: 'lib_v13', nome: "Empatia", cat: "Vantagem", sub: "Mental", cust: "15 pts", fonte: "[MB 57]", desc: "Sente as emoções e intenções dos outros. Ótimo para cortesãos.", tags: ["Mental", "Social"] },
        { id: 'lib_v14', nome: "Empatia com Espíritos", cat: "Vantagem", sub: "Mental", cust: "10 pts", fonte: "[MB 57]", desc: "[Chi] Você sente a presença de Yokai, Yurei (fantasmas) e Kami quando estão próximos.", tags: ["Mental", "Chi", "Esotérico"] },
        { id: 'lib_v15', nome: "Noção do Perigo (Paranoia Útil)", cat: "Vantagem", sub: "Mental", cust: "15 pts", fonte: "[MB 73]", desc: "O Mestre pode dar um aviso apenas quando existirem sinais sutis que alguém atento poderia perceber.\n• Custo: 1 PF por aviso.\n• Efeito colateral: teste de Vontade; falha = Hipervigilância (-2 em interações sociais por 1 hora) e falsos positivos.", tags: ["Mental", "Combate"] },
        { id: 'lib_v16', nome: "Equilíbrio Perfeito", cat: "Vantagem", sub: "Mental", cust: "15 pts", fonte: "[MB 58]", desc: "[Chi] +1 em Acrobacia e Escalada. Você pode lutar em cordas bambas ou galhos finos sem cair. Essencial para Ninjas.", tags: ["Mental", "Chi", "Ninja"] },
        { id: 'lib_v17', nome: "Sorte", cat: "Vantagem", sub: "Mental", cust: "15 pts", fonte: "[MB 86]", desc: "Uma vez por hora real, role novamente um dado ruim. Os Kami sorriem para você.", tags: ["Mental"] },

        // -- Extra (3) --
        { id: 'lib_v18', nome: "Voz (Voice)", cat: "Vantagem", sub: "Extra", cust: "10 pts", fonte: "[MB 97]", desc: "Bônus natural de +2 em Diplomacia, Lábia, Atuação e Canto. Essencial para cortesãos, bardos e líderes.", tags: ["Social", "Extra"] },
        { id: 'lib_v19', nome: "Destemor (Fearlessness)", cat: "Vantagem", sub: "Extra", cust: "2 pts/nível", fonte: "[MB 55]", desc: "Bônus em testes de Vontade contra medo. Vital para caçadores de Yokai.", tags: ["Mental", "Extra"] },
        { id: 'lib_v20', nome: "Duro de Matar (Hard to Kill)", cat: "Vantagem", sub: "Extra", cust: "2 pts/nível", fonte: "[MB 58]", desc: "Bônus apenas nos testes de HT para não morrer. Você cai, sangra, mas não morre.", tags: ["Física", "Extra"] },

        // -- Política (3) --
        { id: 'lib_v21', nome: "Imunidade Diplomática", cat: "Vantagem", sub: "Política", cust: "5 a 20 pts", fonte: "[MB 65]", desc: "Você é um emissário sagrado ou enviado do Imperador. Ferir você é declarar guerra a uma entidade maior.", tags: ["Social", "Política"] },
        { id: 'lib_v22', nome: "Favor", cat: "Vantagem", sub: "Política", cust: "Variável", fonte: "[MB 55]", desc: "Um NPC poderoso lhe deve um favor único. Pode ser usado para obter um equipamento raro ou salvo-conduto.", tags: ["Social", "Política"] },
        { id: 'lib_v23', nome: "Contatos", cat: "Vantagem", sub: "Política", cust: "Variável", fonte: "[MB 44]", desc: "Informantes. Ex: \"Mercador do Porto (Perícia-15, 9 ou menos)\". Essencial para obter rumores.", tags: ["Social", "Intriga"] },

        // -- Mestria (3) --
        { id: 'lib_v24', nome: "Arma de Escolha (Weapon Bond)", cat: "Vantagem", sub: "Mestria", cust: "1 pt (Perk)", fonte: "[MB]", desc: "Vital para quem tem uma arma favorita. +1 no NH com uma arma específica.", tags: ["Combate", "Mestria"] },
        { id: 'lib_v25', nome: "Recuperação de Espanto (Recovery)", cat: "Vantagem", sub: "Mestria", cust: "10 pts", fonte: "[MB 80]", desc: "Você se recupera de atordoamento muito mais rápido. Ótimo para líderes que não podem hesitar.", tags: ["Combate", "Mestria"] },
        { id: 'lib_v26', nome: "Visão Periférica", cat: "Vantagem", sub: "Mestria", cust: "15 pts", fonte: "[MB 74]", desc: "Você enxerga pelos lados. Inimigos não ganham bônus de ataque pelas costas (flancos).", tags: ["Combate", "Mestria"] },

        // -- Vida (2) --
        { id: 'lib_v27', nome: "Metabolismo Controlado", cat: "Vantagem", sub: "Vida", cust: "5 a 10 pts", fonte: "[MB 43]", desc: "[Chi] Você pode entrar em transe para fingir de morto ou sobreviver com pouco ar/comida.", tags: ["Chi", "Sobrevivência"] },
        { id: 'lib_v28', nome: "Resistência a Doenças", cat: "Vantagem", sub: "Vida", cust: "3 ou 5 pts", fonte: "[MB 83]", desc: "Vital em um mundo sem antibióticos e com pântanos venenosos.", tags: ["Física", "Sobrevivência"] },

        // ═══════════════════════════════════════════════════════════
        // DESVANTAGENS (24 itens)
        // ═══════════════════════════════════════════════════════════

        // -- Código de Honra (2) --
        { id: 'lib_d01', nome: "Bushido (Samurai)", cat: "Desvantagem", sub: "Código de Honra", cust: "-15 pts", fonte: "[MB]", desc: "• Obedeça seu senhor (mesmo se for suicídio).\n• Vingue insultos à sua família ou clã.\n• Nunca mostre medo ou dor em público.\n• A morte é preferível à desonra pública.", tags: ["Social", "Honra"] },
        { id: 'lib_d02', nome: "Código do Ninja (Shinobi)", cat: "Desvantagem", sub: "Código de Honra", cust: "-10 pts", fonte: "[MB]", desc: "• A missão está acima de tudo (inclusive da sua vida).\n• Nunca revele os segredos do clã.\n• Se for capturado, mate-se para não falar.\n• Não há \"honra\" em combate justo, apenas em vitória.", tags: ["Social", "Ninja"] },

        // -- Social (4) --
        { id: 'lib_d03', nome: "Dever (Duty)", cat: "Desvantagem", sub: "Social", cust: "-10 a -20 pts", fonte: "[MB 133]", desc: "Obrigação militar. Se o Daimyo chamar, você vai. (Frequência: 9, 12 ou 15 ou menos).", tags: ["Social", "Obrigação"] },
        { id: 'lib_d04', nome: "Estigma Social: Ronin", cat: "Desvantagem", sub: "Social", cust: "-10 pts", fonte: "[MB]", desc: "Samurai sem mestre. Visto como bandido em potencial. -2 em reações.", tags: ["Social"] },
        { id: 'lib_d05', nome: "Estigma Social: Hinin/Pária", cat: "Desvantagem", sub: "Social", cust: "-15 pts", fonte: "[MB]", desc: "Ninja público, coveiro, açougueiro. \"Impuro\". Cidadãos evitam você.", tags: ["Social"] },
        { id: 'lib_d06', nome: "Segredo (Identidade)", cat: "Desvantagem", sub: "Social", cust: "-20 pts", fonte: "[MB]", desc: "Você é um Ninja ou criminoso vivendo disfarçado. Se descobrirem, você morre.", tags: ["Social", "Ninja"] },

        // -- Pessoal (5) --
        { id: 'lib_d07', nome: "Excesso de Confiança", cat: "Desvantagem", sub: "Pessoal", cust: "-5 pts", fonte: "[MB]", desc: "Acredita que é invencível. Aceita desafios estúpidos.", tags: ["Mental"] },
        { id: 'lib_d08', nome: "Sanguinolência", cat: "Desvantagem", sub: "Pessoal", cust: "-10 pts", fonte: "[MB]", desc: "Em batalha, sempre quer matar. Nunca aceita rendição a menos que seja vantajoso.", tags: ["Mental", "Combate"] },
        { id: 'lib_d09', nome: "Fúria (Bad Temper)", cat: "Desvantagem", sub: "Pessoal", cust: "-10 pts", fonte: "[MB]", desc: "Perde a cabeça com insultos. Perigoso na corte.", tags: ["Mental"] },
        { id: 'lib_d10', nome: "Voto (Vow)", cat: "Desvantagem", sub: "Pessoal", cust: "-5 a -15 pts", fonte: "[MB]", desc: "Juramento religioso ou pessoal (ex: \"Nunca beber álcool\", \"Nunca recusar um duelo\", \"Matar o assassino do meu pai\").", tags: ["Mental", "Roleplay"] },
        { id: 'lib_d11', nome: "Honestidade", cat: "Desvantagem", sub: "Pessoal", cust: "-10 pts", fonte: "[MB]", desc: "Obedece às leis locais e odeia trapacear.", tags: ["Mental"] },

        // -- Extra (3) --
        { id: 'lib_d12', nome: "Pacifismo (Autodefesa Apenas)", cat: "Desvantagem", sub: "Extra", cust: "-15 pts", fonte: "[MB 148]", desc: "Nunca inicia lutas. Comum para monges e médicos.", tags: ["Mental", "Pacífico"] },
        { id: 'lib_d13', nome: "Pacifismo (Não Pode Matar)", cat: "Desvantagem", sub: "Extra", cust: "-15 pts", fonte: "[MB 148]", desc: "Luta, mas nunca dá o golpe final. Usa armas não letais (bastão, jitte).", tags: ["Mental", "Pacífico"] },
        { id: 'lib_d14', nome: "Teimosia", cat: "Desvantagem", sub: "Extra", cust: "-5 pts", fonte: "[MB 154]", desc: "Uma vez que toma uma decisão, -1 para mudar de ideia. Comum em samurais velhos.", tags: ["Mental"] },

        // -- Física (4) --
        { id: 'lib_d15', nome: "Zarolho (Caolho)", cat: "Desvantagem", sub: "Física", cust: "-15 pts", fonte: "[MB 160]", desc: "Penalidade em combate e ataque à distância.", tags: ["Física", "Cicatriz"] },
        { id: 'lib_d16', nome: "Maneta / Sem uma Mão", cat: "Desvantagem", sub: "Física", cust: "-15 a -20 pts", fonte: "[MB 147]", desc: "O preço de um duelo perdido.", tags: ["Física", "Cicatriz"] },
        { id: 'lib_d17', nome: "Sono Leve", cat: "Desvantagem", sub: "Física", cust: "-5 pts", fonte: "[MB 152]", desc: "Acorda com qualquer barulho. Bom para sobrevivência, ruim para descanso.", tags: ["Física"] },
        { id: 'lib_d18', nome: "Feiura", cat: "Desvantagem", sub: "Física", cust: "-4 a -20 pts", fonte: "[MB 22]", desc: "Cicatrizes de varíola ou queimaduras.", tags: ["Física", "Social"] },

        // -- Mental (5) --
        { id: 'lib_d19', nome: "Avareza", cat: "Desvantagem", sub: "Mental", cust: "-10 pts", fonte: "[MB 124]", desc: "Você ama dinheiro. Perigoso para mercadores.", tags: ["Mental"] },
        { id: 'lib_d20', nome: "Gula", cat: "Desvantagem", sub: "Mental", cust: "-5 pts", fonte: "[MB 141]", desc: "Gasta dinheiro extra com comida e bebida.", tags: ["Mental"] },
        { id: 'lib_d21', nome: "Insone", cat: "Desvantagem", sub: "Mental", cust: "-10 pts", fonte: "[MB 145]", desc: "Dorme mal, recupera PF mais devagar.", tags: ["Mental", "Física"] },
        { id: 'lib_d22', nome: "Piromania", cat: "Desvantagem", sub: "Mental", cust: "-5 pts", fonte: "[MB 151]", desc: "Fascinação por fogo. Perigoso em cidades de madeira e papel.", tags: ["Mental"] },
        { id: 'lib_d23', nome: "Timidez", cat: "Desvantagem", sub: "Mental", cust: "-5 a -20 pts", fonte: "[MB 157]", desc: "Penalidade em situações sociais.", tags: ["Mental", "Social"] },

        // -- Social Extra (2) --
        { id: 'lib_d24', nome: "Dívida", cat: "Desvantagem", sub: "Social", cust: "Variável", fonte: "[MB 26]", desc: "Você deve dinheiro a um agiota ou clã.", tags: ["Social", "Economia"] },
        { id: 'lib_d25', nome: "Inimigo", cat: "Desvantagem", sub: "Social", cust: "Variável", fonte: "[MB 135]", desc: "Um ninja rival, um oficial corrupto ou um espírito vingativo que te caça.", tags: ["Social", "Perigo"] },
        { id: 'lib_d26', nome: "Curiosidade", cat: "Desvantagem", sub: "Extra", cust: "-5 pts", fonte: "[MB 129]", desc: "Você tem que investigar mistérios. Perigoso em jogos de horror.", tags: ["Mental"] },

        // ═══════════════════════════════════════════════════════════
        // PERÍCIAS (60 itens)
        // ═══════════════════════════════════════════════════════════

        // -- Combate (11) --
        { id: 'lib_p01', nome: "Espada de Lâmina Larga", cat: "Perícia", sub: "Combate", cust: "DX/Média", fonte: "[MB]", desc: "Usar Katana/Ninjato com uma mão.", tags: ["Combate", "Bushi"] },
        { id: 'lib_p02', nome: "Espada de Duas Mãos", cat: "Perícia", sub: "Combate", cust: "DX/Média", fonte: "[MB]", desc: "Usar Katana/Nodachi com duas mãos (Dano maior).", tags: ["Combate", "Bushi"] },
        { id: 'lib_p03', nome: "Espada Curta", cat: "Perícia", sub: "Combate", cust: "DX/Média", fonte: "[MB]", desc: "Usar Wakizashi ou Kodachi.", tags: ["Combate", "Bushi"] },
        { id: 'lib_p04', nome: "Faca", cat: "Perícia", sub: "Combate", cust: "DX/Fácil", fonte: "[MB]", desc: "Usar Tanto ou Kunai.", tags: ["Combate"] },
        { id: 'lib_p05', nome: "Lança", cat: "Perícia", sub: "Combate", cust: "DX/Média", fonte: "[MB]", desc: "Usar Yari.", tags: ["Combate", "Ashigaru"] },
        { id: 'lib_p06', nome: "Arma de Haste", cat: "Perícia", sub: "Combate", cust: "DX/Média", fonte: "[MB]", desc: "Usar Naginata.", tags: ["Combate", "Sohei"] },
        { id: 'lib_p07', nome: "Arco", cat: "Perícia", sub: "Combate", cust: "DX/Média", fonte: "[MB]", desc: "Usar Yumi.", tags: ["Combate", "À Distância"] },
        { id: 'lib_p08', nome: "Kusarigama", cat: "Perícia", sub: "Combate", cust: "DX/Difícil", fonte: "[MB]", desc: "Foice com corrente. Perícia complexa de Ninja.", tags: ["Combate", "Ninja"] },
        { id: 'lib_p09', nome: "Briga", cat: "Perícia", sub: "Combate", cust: "DX/Fácil", fonte: "[MB]", desc: "Soco e chute básico.", tags: ["Combate", "Desarmado"] },
        { id: 'lib_p10', nome: "Judô", cat: "Perícia", sub: "Combate", cust: "DX/Difícil", fonte: "[MB]", desc: "Arremessos e imobilizações (Jujutsu).", tags: ["Combate", "Desarmado"] },
        { id: 'lib_p11', nome: "Caratê", cat: "Perícia", sub: "Combate", cust: "DX/Difícil", fonte: "[MB]", desc: "Golpes precisos de mão e pé (Taijutsu ofensivo).", tags: ["Combate", "Desarmado"] },

        // -- Furtividade (6) --
        { id: 'lib_p12', nome: "Furtividade", cat: "Perícia", sub: "Furtividade", cust: "DX/Média", fonte: "[MB]", desc: "Mover-se em silêncio.", tags: ["Infiltração", "Ninja"] },
        { id: 'lib_p13', nome: "Escalada", cat: "Perícia", sub: "Furtividade", cust: "DX/Média", fonte: "[MB]", desc: "Subir muros.", tags: ["Infiltração", "Ninja"] },
        { id: 'lib_p14', nome: "Acrobacia", cat: "Perícia", sub: "Furtividade", cust: "DX/Difícil", fonte: "[MB]", desc: "Pular, cair sem se machucar. Vital para Ninjas.", tags: ["Física", "Ninja"] },
        { id: 'lib_p15', nome: "Arrombamento", cat: "Perícia", sub: "Furtividade", cust: "IQ/Média", fonte: "[MB]", desc: "Abrir portas.", tags: ["Infiltração"] },
        { id: 'lib_p16', nome: "Venenos", cat: "Perícia", sub: "Furtividade", cust: "IQ/Difícil", fonte: "[MB]", desc: "Preparar e aplicar toxinas.", tags: ["Infiltração", "Alquimia"] },
        { id: 'lib_p17', nome: "Disfarce", cat: "Perícia", sub: "Furtividade", cust: "IQ/Média", fonte: "[MB]", desc: "Mudar aparência.", tags: ["Infiltração", "Espião"] },

        // -- Social (7) --
        { id: 'lib_p18', nome: "Trato Social (Savoir-Faire)", cat: "Perícia", sub: "Social", cust: "IQ/Fácil", fonte: "[MB]", desc: "Escolha Corte, Dojo ou Militar. Essencial para não ofender superiores.", tags: ["Social", "Corte"] },
        { id: 'lib_p19', nome: "Diplomacia", cat: "Perícia", sub: "Social", cust: "IQ/Difícil", fonte: "[MB]", desc: "Negociar e acalmar ânimos.", tags: ["Social"] },
        { id: 'lib_p20', nome: "Intimidação", cat: "Perícia", sub: "Social", cust: "Von/Média", fonte: "[MB]", desc: "Assustar para obter obediência.", tags: ["Social", "Combate"] },
        { id: 'lib_p21', nome: "Liderança", cat: "Perícia", sub: "Social", cust: "IQ/Média", fonte: "[MB]", desc: "Comandar tropas em batalha.", tags: ["Social", "Comando"] },
        { id: 'lib_p22', nome: "Caligrafia", cat: "Perícia", sub: "Social", cust: "DX/Média", fonte: "[MB]", desc: "Escrever belamente. Sinal de cultura.", tags: ["Social", "Arte"] },
        { id: 'lib_p23', nome: "Cerimônia do Chá", cat: "Perícia", sub: "Social", cust: "IQ/Média", fonte: "[MB]", desc: "Ritual social meditativo. Recupera PF mental e impressiona nobres.", tags: ["Social", "Cultura"] },
        { id: 'lib_p24', nome: "Poesia", cat: "Perícia", sub: "Social", cust: "IQ/Média", fonte: "[MB]", desc: "Criar Haikus. Valorizado por samurais cultos.", tags: ["Social", "Arte"] },

        // -- Sobrevivência (4) --
        { id: 'lib_p25', nome: "Cavalgar", cat: "Perícia", sub: "Sobrevivência", cust: "DX/Média", fonte: "[MB]", desc: "Cavalo.", tags: ["Sobrevivência", "Montaria"] },
        { id: 'lib_p26', nome: "Primeiros Socorros", cat: "Perícia", sub: "Sobrevivência", cust: "IQ/Fácil", fonte: "[MB]", desc: "Estancar sangramentos (NT3).", tags: ["Médico", "Essencial"] },
        { id: 'lib_p27', nome: "Sobrevivência", cat: "Perícia", sub: "Sobrevivência", cust: "IQ/Média", fonte: "[MB]", desc: "Florestas ou Montanhas. Caçar e achar água.", tags: ["Sobrevivência", "Natureza"] },
        { id: 'lib_p28', nome: "Armaria", cat: "Perícia", sub: "Sobrevivência", cust: "IQ/Média", fonte: "[MB]", desc: "Consertar espadas e armaduras.", tags: ["Artesão", "Equipamento"] },

        // ═══════════════════════════════════════════════════════════
        // PERÍCIAS EXTRAS (32 itens)
        // ═══════════════════════════════════════════════════════════

        // -- Intelectual (6) --
        { id: 'lib_p29', nome: "Administração", cat: "Perícia", sub: "Intelectual", cust: "IQ/Média", fonte: "[MB]", desc: "Gerenciar um feudo ou logística de exército.", tags: ["Intelectual", "Nobre"] },
        { id: 'lib_p30', nome: "Jogos", cat: "Perícia", sub: "Intelectual", cust: "IQ/Fácil", fonte: "[MB]", desc: "Go, Shogi ou Dados. Para apostas e estratégia.", tags: ["Intelectual", "Social"] },
        { id: 'lib_p31', nome: "História", cat: "Perícia", sub: "Intelectual", cust: "IQ/Difícil", fonte: "[MB]", desc: "Conhecimento sobre clãs antigos e batalhas passadas.", tags: ["Intelectual", "Lore"] },
        { id: 'lib_p32', nome: "Teologia", cat: "Perícia", sub: "Intelectual", cust: "IQ/Difícil", fonte: "[MB]", desc: "Conhecimento sobre os Budas e Sutras.", tags: ["Intelectual", "Esotérico"] },
        { id: 'lib_p33', nome: "Literatura", cat: "Perícia", sub: "Intelectual", cust: "IQ/Difícil", fonte: "[MB]", desc: "Conhecimento de clássicos chineses e japoneses.", tags: ["Intelectual", "Cultura"] },
        { id: 'lib_p34', nome: "Instrumento Musical", cat: "Perícia", sub: "Intelectual", cust: "IQ/Difícil", fonte: "[MB]", desc: "Biwa, Flauta (Shakuhachi), Tambor (Taiko).", tags: ["Intelectual", "Arte"] },

        // -- Artesão (6) --
        { id: 'lib_p35', nome: "Carpintaria", cat: "Perícia", sub: "Artesão", cust: "IQ/Fácil", fonte: "[MB]", desc: "Construir casas e consertar barcos.", tags: ["Artesão"] },
        { id: 'lib_p36', nome: "Ferreiro", cat: "Perícia", sub: "Artesão", cust: "IQ/Média", fonte: "[MB]", desc: "Forjar ferramentas (precisa de especialização).", tags: ["Artesão", "Equipamento"] },
        { id: 'lib_p37', nome: "Culinária", cat: "Perícia", sub: "Artesão", cust: "IQ/Fácil", fonte: "[MB]", desc: "Preparar comida segura e saborosa (inclusive peixe Fugu).", tags: ["Artesão", "Sobrevivência"] },
        { id: 'lib_p38', nome: "Comércio", cat: "Perícia", sub: "Artesão", cust: "IQ/Média", fonte: "[MB]", desc: "Barganhar preços. Vital para quem vende espólios.", tags: ["Social", "Economia"] },
        { id: 'lib_p39', nome: "Navegação", cat: "Perícia", sub: "Artesão", cust: "IQ/Média", fonte: "[MB]", desc: "Orientar-se no mar ou terra (estrelas).", tags: ["Sobrevivência", "Exploração"] },
        { id: 'lib_p40', nome: "Agricultura/Agronomia", cat: "Perícia", sub: "Artesão", cust: "IQ/Média", fonte: "[MB]", desc: "Saber plantar e prever colheitas.", tags: ["Artesão", "Natureza"] },

        // -- Espião (6) --
        { id: 'lib_p41', nome: "Manha (Streetwise)", cat: "Perícia", sub: "Espião", cust: "IQ/Média", fonte: "[MB]", desc: "Sobreviver na cidade, achar mercado negro, ouvir boatos.", tags: ["Espião", "Social"] },
        { id: 'lib_p42', nome: "Punga", cat: "Perícia", sub: "Espião", cust: "DX/Difícil", fonte: "[MB]", desc: "Roubar bolsas.", tags: ["Espião", "Crime"] },
        { id: 'lib_p43', nome: "Falsificação", cat: "Perícia", sub: "Espião", cust: "IQ/Difícil", fonte: "[MB]", desc: "Criar passes de viagem falsos.", tags: ["Espião", "Crime"] },
        { id: 'lib_p44', nome: "Nós e Amarras (Hojojutsu)", cat: "Perícia", sub: "Espião", cust: "DX/Fácil", fonte: "[MB]", desc: "Arte japonesa de amarrar prisioneiros com corda. Vital para caçadores de recompensa e policiais.", tags: ["Espião", "Combate"] },
        { id: 'lib_p45', nome: "Leitura Labial", cat: "Perícia", sub: "Espião", cust: "Per/Média", fonte: "[MB]", desc: "Espionar conversas à distância.", tags: ["Espião", "Percepção"] },
        { id: 'lib_p46', nome: "Arremedo (Mimicry)", cat: "Perícia", sub: "Espião", cust: "IQ/Difícil", fonte: "[MB]", desc: "Imitar sons de animais (sinais ninjas) ou vozes.", tags: ["Espião", "Ninja"] },

        // -- Natureza (5) --
        { id: 'lib_p47', nome: "Rastreamento", cat: "Perícia", sub: "Natureza", cust: "Per/Média", fonte: "[MB]", desc: "Seguir pegadas.", tags: ["Natureza", "Caçador"] },
        { id: 'lib_p48', nome: "Pesca", cat: "Perícia", sub: "Natureza", cust: "Per/Fácil", fonte: "[MB]", desc: "Conseguir comida em rios.", tags: ["Natureza", "Sobrevivência"] },
        { id: 'lib_p49', nome: "Adestramento de Animais", cat: "Perícia", sub: "Natureza", cust: "IQ/Média", fonte: "[MB]", desc: "Falcoaria (nobre) ou Cães.", tags: ["Natureza", "Nobre"] },
        { id: 'lib_p50', nome: "Natação", cat: "Perícia", sub: "Natureza", cust: "HT/Fácil", fonte: "[MB]", desc: "Não morrer afogado.", tags: ["Natureza", "Física"] },
        { id: 'lib_p51', nome: "Meteorologia", cat: "Perícia", sub: "Natureza", cust: "IQ/Média", fonte: "[MB]", desc: "Prever o tempo (tempestades, nevascas).", tags: ["Natureza", "Sobrevivência"] },

        // -- Esotérica (3) --
        { id: 'lib_p52', nome: "Controle da Respiração", cat: "Perícia", sub: "Esotérica", cust: "HT/Difícil", fonte: "[MB]", desc: "Recuperar fadiga mais rápido. Meditação.", tags: ["Esotérico", "Chi"] },
        { id: 'lib_p53', nome: "Hipnotismo", cat: "Perícia", sub: "Esotérica", cust: "IQ/Difícil", fonte: "[MB]", desc: "Induzir transe.", tags: ["Esotérico", "Mental"] },
        { id: 'lib_p54', nome: "Controle Mental (Mind Control)", cat: "Perícia", sub: "Esotérica", cust: "IQ/Difícil", fonte: "[MB]", desc: "Resistir a tortura e medo.", tags: ["Esotérico", "Mental"] },

        // -- Artes (3) --
        { id: 'lib_p55', nome: "Alvenaria", cat: "Perícia", sub: "Artes", cust: "IQ/Fácil", fonte: "[MB]", desc: "Construir muros de pedra e fortificações.", tags: ["Artesão", "Construção"] },
        { id: 'lib_p56', nome: "Couro", cat: "Perícia", sub: "Artes", cust: "DX/Fácil", fonte: "[MB]", desc: "Reparar armaduras de couro e selas.", tags: ["Artesão", "Equipamento"] },
        { id: 'lib_p57', nome: "Tecelagem", cat: "Perícia", sub: "Artes", cust: "DX/Fácil", fonte: "[MB]", desc: "Fazer tecidos (e cordas de seda para ninjas).", tags: ["Artesão", "Ninja"] },

        // -- Conhecimento (3) --
        { id: 'lib_p58', nome: "Conhecimento Oculto (Yokai)", cat: "Perícia", sub: "Conhecimento", cust: "IQ/Média", fonte: "[MB]", desc: "Saber as fraquezas de monstros específicos.", tags: ["Lore", "Yokai"] },
        { id: 'lib_p59', nome: "Heráldica", cat: "Perícia", sub: "Conhecimento", cust: "IQ/Fácil", fonte: "[MB]", desc: "Identificar clãs pelos seus Mon (brasões). Vital para não atacar aliados.", tags: ["Lore", "Social"] },
        { id: 'lib_p60', nome: "Geografia (Regional)", cat: "Perícia", sub: "Conhecimento", cust: "IQ/Difícil", fonte: "[MB]", desc: "Conhecer atalhos e terreno de uma província específica.", tags: ["Lore", "Exploração"] },

        // ═══════════════════════════════════════════════════════════
        // QUALIDADES — Perks (17 itens, 1 pt cada)
        // ═══════════════════════════════════════════════════════════

        // -- Combate (6) --
        { id: 'lib_q01', nome: "Vínculo com Arma", cat: "Qualidade", sub: "Combate", cust: "1 pt", fonte: "[MB]", desc: "+1 de NH com uma arma específica (ex: a katana do seu avô).", tags: ["Combate"] },
        { id: 'lib_q02', nome: "Pé Firme", cat: "Qualidade", sub: "Combate", cust: "1 pt", fonte: "[MB]", desc: "-2 de penalidade em testes para não cair ou ser empurrado. Ótimo para lanceiros.", tags: ["Combate"] },
        { id: 'lib_q03', nome: "Estilo de Luta", cat: "Qualidade", sub: "Combate", cust: "1 pt", fonte: "[AM]", desc: "Desbloqueia acesso a Técnicas e remove penalidades culturais do estilo.", tags: ["Combate", "Budô"] },
        { id: 'lib_q04', nome: "Treinamento Naval", cat: "Qualidade", sub: "Combate", cust: "1 pt", fonte: "[MB]", desc: "Não sofre penalidade de -2 por lutar em barcos balançando ou terreno instável.", tags: ["Combate", "Naval"] },
        { id: 'lib_q05', nome: "Sacar Rápido na Bainha", cat: "Qualidade", sub: "Combate", cust: "1 pt", fonte: "[MB]", desc: "+1 em testes para embainhar a arma rapidamente sem olhar.", tags: ["Combate"] },
        { id: 'lib_q06', nome: "Truque de Mestre (Shtick)", cat: "Qualidade", sub: "Combate", cust: "1 pt", fonte: "[MB]", desc: "Uma ação de \"estilo\" sem penalidade. Ex: Limpar o sangue da espada (Chiburi) ou girar a arma na mão.", tags: ["Combate", "Roleplay"] },

        // -- Social (5) --
        { id: 'lib_q07', nome: "Cara de Honesto", cat: "Qualidade", sub: "Social", cust: "1 pt", fonte: "[MB]", desc: "+1 em testes de reação se estiver mentindo (porque você parece inocente).", tags: ["Social"] },
        { id: 'lib_q08', nome: "Tolerância ao Álcool", cat: "Qualidade", sub: "Social", cust: "1 pt", fonte: "[MB]", desc: "+2 em testes de HT para não ficar bêbado.", tags: ["Social", "Física"] },
        { id: 'lib_q09', nome: "Sono Pesado", cat: "Qualidade", sub: "Social", cust: "1 pt", fonte: "[MB]", desc: "Pode dormir em qualquer lugar (chão duro, chuva) e acordar descansado.", tags: ["Social", "Sobrevivência"] },
        { id: 'lib_q10', nome: "Sem Ressaca", cat: "Qualidade", sub: "Social", cust: "1 pt", fonte: "[MB]", desc: "Nunca sofre penalidades no dia seguinte após beber.", tags: ["Social"] },
        { id: 'lib_q11', nome: "Voz Penetrante", cat: "Qualidade", sub: "Social", cust: "1 pt", fonte: "[MB]", desc: "Sua voz é ouvida claramente no meio de uma batalha barulhenta (+1 em Liderança/Intimidação em combate).", tags: ["Social", "Combate"] },

        // -- Equip (2) --
        { id: 'lib_q12', nome: "Acessório", cat: "Qualidade", sub: "Equip", cust: "1 pt", fonte: "[MB]", desc: "Você tem um item \"embutido\" ou minúsculo sempre acessível. Ex: Kit de gazuas no cabelo, isqueiro de pederneira.", tags: ["Equipamento", "Ninja"] },
        { id: 'lib_q13', nome: "Roupa Sob Medida", cat: "Qualidade", sub: "Equip", cust: "1 pt", fonte: "[MB]", desc: "Ignora -1 de penalidade por usar armadura por baixo da roupa comum (para Ninjas/Yojimbos).", tags: ["Equipamento", "Ninja"] },

        // -- Estilo de Vida (4) --
        { id: 'lib_q14', nome: "Barbeiro", cat: "Qualidade", sub: "Estilo de Vida", cust: "1 pt", fonte: "[MB]", desc: "Você sabe fazer o corte de cabelo samurai (Chonmage) ou raspar cabeças de monges. Útil para disfarces.", tags: ["Social", "Disfarce"] },
        { id: 'lib_q15', nome: "Bebedor Social", cat: "Qualidade", sub: "Estilo de Vida", cust: "1 pt", fonte: "[MB]", desc: "Você nunca faz \"papelão\" quando bêbado, mantendo a dignidade.", tags: ["Social"] },
        { id: 'lib_q16', nome: "Sotaque Local", cat: "Qualidade", sub: "Estilo de Vida", cust: "1 pt", fonte: "[MB]", desc: "Você consegue imitar o sotaque de outra região perfeitamente (bom para espiões).", tags: ["Social", "Espião"] },
        { id: 'lib_q17', nome: "Limpeza (Sanitária)", cat: "Qualidade", sub: "Estilo de Vida", cust: "1 pt", fonte: "[MB]", desc: "Você consegue se manter limpo e apresentável mesmo na estrada (bônus de reação inicial).", tags: ["Social"] },

        // ═══════════════════════════════════════════════════════════
        // PECULIARIDADES — Quirks (23 itens, -1 pt cada)
        // ═══════════════════════════════════════════════════════════

        // -- Crença (5) --
        { id: 'lib_k01', nome: "Prece aos Ancestrais", cat: "Peculiaridade", sub: "Crença", cust: "-1 pt", fonte: "[MB]", desc: "Sempre faz uma prece aos ancestrais antes de comer.", tags: ["Crença", "Roleplay"] },
        { id: 'lib_k02', nome: "Limpeza Obsessiva da Espada", cat: "Peculiaridade", sub: "Crença", cust: "-1 pt", fonte: "[MB]", desc: "Limpa a espada obsessivamente a cada combate.", tags: ["Crença", "Combate"] },
        { id: 'lib_k03', nome: "Recusa Sentar no Chão", cat: "Peculiaridade", sub: "Crença", cust: "-1 pt", fonte: "[MB]", desc: "Recusa-se a sentar diretamente no chão (carrega um pano).", tags: ["Crença", "Hábito"] },
        { id: 'lib_k04', nome: "Fala em Haikus", cat: "Peculiaridade", sub: "Crença", cust: "-1 pt", fonte: "[MB]", desc: "Fala em haikus ou provérbios quando tenta ser sábio.", tags: ["Crença", "Roleplay"] },
        { id: 'lib_k05', nome: "Colecionador Inútil", cat: "Peculiaridade", sub: "Crença", cust: "-1 pt", fonte: "[MB]", desc: "Coleciona algo inútil (pedras bonitas, leques quebrados).", tags: ["Crença", "Hábito"] },

        // -- Aversão (5) --
        { id: 'lib_k06', nome: "Despreza Armas de Fogo", cat: "Peculiaridade", sub: "Aversão", cust: "-1 pt", fonte: "[MB]", desc: "Despreza armas de fogo ou pólvora (covardia).", tags: ["Aversão"] },
        { id: 'lib_k07', nome: "Desconfia de Beldades", cat: "Peculiaridade", sub: "Aversão", cust: "-1 pt", fonte: "[MB]", desc: "Não confia em mulheres bonitas (ou homens bonitos).", tags: ["Aversão", "Social"] },
        { id: 'lib_k08', nome: "Detesta Comida Apimentada", cat: "Peculiaridade", sub: "Aversão", cust: "-1 pt", fonte: "[MB]", desc: "Detesta comida apimentada.", tags: ["Aversão"] },
        { id: 'lib_k09', nome: "Nojo de Sangue", cat: "Peculiaridade", sub: "Aversão", cust: "-1 pt", fonte: "[MB]", desc: "Tem nojo de sangue (mas luta mesmo assim).", tags: ["Aversão", "Combate"] },
        { id: 'lib_k10', nome: "Desconforto no Silêncio", cat: "Peculiaridade", sub: "Aversão", cust: "-1 pt", fonte: "[MB]", desc: "Desconfortável em silêncio absoluto.", tags: ["Aversão"] },

        // -- Traço (5) --
        { id: 'lib_k11', nome: "Cicatriz Visível", cat: "Peculiaridade", sub: "Traço", cust: "-1 pt", fonte: "[MB]", desc: "Cicatriz visível no rosto (não hedionda, apenas marcante).", tags: ["Traço", "Visual"] },
        { id: 'lib_k12', nome: "Ri em Momentos Inapropriados", cat: "Peculiaridade", sub: "Traço", cust: "-1 pt", fonte: "[MB]", desc: "Ri em momentos inapropriados quando nervoso.", tags: ["Traço", "Social"] },
        { id: 'lib_k13', nome: "Ronca Muito Alto", cat: "Peculiaridade", sub: "Traço", cust: "-1 pt", fonte: "[MB]", desc: "Ronca muito alto.", tags: ["Traço"] },
        { id: 'lib_k14', nome: "Volume de Voz Inadequado", cat: "Peculiaridade", sub: "Traço", cust: "-1 pt", fonte: "[MB]", desc: "Fala muito alto (ou muito baixo).", tags: ["Traço", "Social"] },
        { id: 'lib_k15', nome: "Fala com a Espada", cat: "Peculiaridade", sub: "Traço", cust: "-1 pt", fonte: "[MB]", desc: "Trata sua espada como se fosse uma pessoa (fala com ela).", tags: ["Traço", "Roleplay"] },

        // -- Código (4) --
        { id: 'lib_k16', nome: "Nunca Ataca Mulheres", cat: "Peculiaridade", sub: "Código", cust: "-1 pt", fonte: "[MB]", desc: "Nunca ataca mulheres (ou monges, ou animais).", tags: ["Código", "Combate"] },
        { id: 'lib_k17', nome: "Recusa Lutar na Chuva", cat: "Peculiaridade", sub: "Código", cust: "-1 pt", fonte: "[MB]", desc: "Recusa-se a lutar na chuva (estraga a armadura).", tags: ["Código"] },
        { id: 'lib_k18', nome: "Moeda sobre os Mortos", cat: "Peculiaridade", sub: "Código", cust: "-1 pt", fonte: "[MB]", desc: "Sempre deixa uma moeda sobre os olhos dos mortos.", tags: ["Código", "Roleplay"] },
        { id: 'lib_k19', nome: "Recusa Cura Mágica", cat: "Peculiaridade", sub: "Código", cust: "-1 pt", fonte: "[MB]", desc: "Não aceita curar ferimentos com magia ou remédios \"estranhos\".", tags: ["Código"] },

        // -- Mania (4) --
        { id: 'lib_k20', nome: "Nostalgia", cat: "Peculiaridade", sub: "Mania", cust: "-1 pt", fonte: "[MB]", desc: "Sempre compara tudo com \"a minha terra natal\".", tags: ["Mania", "Social"] },
        { id: 'lib_k21', nome: "Supersticioso", cat: "Peculiaridade", sub: "Mania", cust: "-1 pt", fonte: "[MB]", desc: "Evita gatos pretos, números azarados (4) ou cemitérios à noite.", tags: ["Mania"] },
        { id: 'lib_k22', nome: "Vaidoso", cat: "Peculiaridade", sub: "Mania", cust: "-1 pt", fonte: "[MB]", desc: "Gasta tempo demais arrumando o cabelo ou a armadura.", tags: ["Mania", "Social"] },
        { id: 'lib_k23', nome: "Cético", cat: "Peculiaridade", sub: "Mania", cust: "-1 pt", fonte: "[MB]", desc: "Não acredita em Yokai até ver um comendo sua perna.", tags: ["Mania"] },

        // ═══════════════════════════════════════════════════════════
        // REGRAS E TABELAS (2 itens)
        // ═══════════════════════════════════════════════════════════
        { id: 'lib_r01', nome: "Tabela de Custo de Perícias", cat: "Regra", sub: "Referência", cust: "Referência", fonte: "[MB]", desc: "NH Final | Fácil (E) | Média (A) | Difícil (H) | M.Difícil (VH)\nAtributo -3 | — | — | — | 1 pt\nAtributo -2 | — | — | 1 pt | 2 pts\nAtributo -1 | — | 1 pt | 2 pts | 4 pts\nAtributo +0 | 1 pt | 2 pts | 4 pts | 8 pts\nAtributo +1 | 2 pts | 4 pts | 8 pts | 12 pts\nAtributo +2 | 4 pts | 8 pts | 12 pts | 16 pts\nAtributo +3 | 8 pts | 12 pts | 16 pts | 20 pts\nNível Extra (+1) | +4 pts | +4 pts | +4 pts | +4 pts", tags: ["Referência", "Tabela"] },
        { id: 'lib_r02', nome: "Tabela de Custo de Técnicas", cat: "Regra", sub: "Referência", cust: "Referência", fonte: "[MB]", desc: "Nível Desejado | Custo Média | Custo Difícil\nBase +1 (Reduz penalidade em 1) | 1 pt | 2 pts\nBase +2 (Reduz penalidade em 2) | 2 pts | 3 pts\nBase +3 (Reduz penalidade em 3) | 3 pts | 4 pts\nBase +4 (Reduz penalidade em 4) | 4 pts | 5 pts", tags: ["Referência", "Tabela"] },

        // ═══════════════════════════════════════════════════════════
        // ESTILOS DE LUTA — BUDÔ (13 estilos)
        // ═══════════════════════════════════════════════════════════

        { id: 'lib_budo_kenjutsu', nome: "Kenjutsu", cat: "Budo", sub: "Espada", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🩸",
          conceito: "Agressivo e letal, este estilo prioriza o uso da katana com as duas mãos para abrir o inimigo com um golpe único.",
          pericias_realistas: ["Espada de Duas Mãos", "Espadas de Lâmina Larga", "Sacar Rápido (Espada)", "Faca"],
          tecnicas: [
            { nome: "Ataque Direcionado: Pescoço/Braço/Crânio/Vitais", dificuldade: "Difícil", base: "-5/-2/-7/-3", desc: "Treino para mirar nas frestas da armadura e encerrar a luta num corte." },
            { nome: "Contra-Ataque", dificuldade: "Difícil", base: "-5", desc: "Após Aparar, acertar impõe -2 na defesa do alvo." },
            { nome: "Fintar", dificuldade: "Difícil", base: "NH, até NH+4", desc: "Finge um golpe; margem de vitória reduz defesa inimiga." },
            { nome: "Golpe para Trás", dificuldade: "Difícil", base: "-2", desc: "Fatiar inimigo que flanqueou sem gastar movimento para virar." },
            { nome: "Inverter Empunhadura", dificuldade: "Média", base: "-4/-6", desc: "Pegada de picador de gelo para estocadas em luta agarrada." },
            { nome: "Luta Baixa", dificuldade: "Difícil", base: "-2", desc: "Elimina penalidades por atacar/defender ajoelhado ou agachado." }
          ],
          qualidades_estilo: [
            { nome: "Domínio da Empunhadura (Katana)", desc: "Soltar/voltar mãos na espada como ação livre." },
            { nome: "Guardar Rápido (Espada)", desc: "Embainhar instantaneamente com empunhadura invertida." },
            { nome: "Estilo (Chiburi)", desc: "Sacudir sangue da lâmina: +4 em Intimidação." },
            { nome: "Vínculo com Arma", desc: "+1 permanente no NH com uma espada específica." }
          ],
          desc: "A Arte da Katana. Agressivo e letal, prioriza o uso da katana com as duas mãos para abrir o inimigo com um golpe único.", tags: ["Katana", "Agressivo", "Letal"] },

        { id: 'lib_budo_kyujutsu', nome: "Kyujutsu", cat: "Budo", sub: "Arco", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🏹",
          conceito: "O uso militar do yumi (arco longo assimétrico), focado na precisão letal a pé ou a cavalo.",
          pericias_realistas: ["Arco", "Cavalgar (Cavalo)", "Sacar Rápido (Flecha)", "Adestramento de Animais", "Meditação"],
          tecnicas: [
            { nome: "Ataque Direcionado: Rosto", dificuldade: "Difícil", base: "-5, até NH-2", desc: "Enfiar a flecha na cara do inimigo, parte menos protegida." },
            { nome: "Arquearia Montada", dificuldade: "Difícil", base: "-4", desc: "Compensa instabilidade de atirar do lombo de um cavalo." },
            { nome: "Cavalgar com Mãos Livres", dificuldade: "Difícil", base: "-3", desc: "Controla o cavalo com joelhos, mãos livres para o arco." },
            { nome: "Cavalgar em Combate", dificuldade: "Difícil", base: "NH, até NH+4", desc: "Guiar a montaria no caos do campo de batalha." }
          ],
          qualidades_estilo: [
            { nome: "Arco Forte", desc: "Atirar com arco de ST superior à sua, +1-2 dano." },
            { nome: "Adaptação de Técnica (At. Direcionado)", desc: "Aplicar treino de Rosto para outras armas à distância." },
            { nome: "Vínculo com Arma", desc: "+1 NH ao usar seu próprio arco de guerra." }
          ],
          desc: "A Arte do Arco Japonês. Precisão letal a pé ou a cavalo, mirando onde a armadura não cobre.", tags: ["Arco", "Montado", "Precisão"] },

        { id: 'lib_budo_sojutsu', nome: "Sojutsu", cat: "Budo", sub: "Lança", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🛡️",
          conceito: "A verdadeira rainha do campo de batalha. Usa a lança (yari) ofensivamente para estocadas de longo alcance.",
          pericias_realistas: ["Lança", "Bastão", "Arma de Arremesso (Lança)"],
          tecnicas: [
            { nome: "Ataque Direcionado: Rosto/Pescoço/Vitais", dificuldade: "Difícil", base: "-5/-5/-3", desc: "Estocadas que furam direto as partes letais." },
            { nome: "Conservar a Arma", dificuldade: "Difícil", base: "NH, até NH+5", desc: "Disputa Rápida para não perder a arma ao ser agarrado." },
            { nome: "Desarmar", dificuldade: "Difícil", base: "NH, até NH+5", desc: "Usa alavanca da haste para torcer a arma inimiga." },
            { nome: "Fintar", dificuldade: "Difícil", base: "NH, até NH+4", desc: "Finge estocada no peito e muda para o rosto." },
            { nome: "Rasteira", dificuldade: "Difícil", base: "-3", desc: "Balança a haste contra as pernas, derrubando." },
            { nome: "Agarrar Armado / Enganchar", dificuldade: "Difícil", base: "-2 a -5", desc: "Fisga pescoço ou pernas com lança de gancho." }
          ],
          qualidades_estilo: [
            { nome: "Domínio da Forma (Lança)", desc: "Alternar entre Lança (estocar) e Bastão (+2 Aparar) livremente." },
            { nome: "Domínio da Empunhadura (Lança)", desc: "Deslizar mãos na haste como ação livre para mudar alcance." },
            { nome: "Treino Mão Inábil (Lança)", desc: "Sem penalidade -4 se braço for mutilado." }
          ],
          desc: "A Arte da Lança Japonesa. Rainha do campo de batalha com estocadas de longo alcance e bloqueio com haste.", tags: ["Lança", "Alcance", "Formação"] },

        { id: 'lib_budo_jujutsu', nome: "Jujutsu", cat: "Budo", sub: "Desarmado", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🦴",
          conceito: "Desenvolvido para o campo de batalha quando o samurai perde a espada. Foca em esmagar articulações e derrubar inimigos blindados.",
          pericias_realistas: ["Judô", "Caratê", "Faca"],
          tecnicas: [
            { nome: "Agarrar Perna", dificuldade: "Difícil", base: "NH", desc: "Intercepta chute, +4 na Disputa Rápida para derrubar." },
            { nome: "Ataque Direcionado: Rosto/Pescoço/Perna", dificuldade: "Difícil", base: "-5/-5/-2", desc: "Socos treinados para ossos e juntas expostos." },
            { nome: "Chave de Braço", dificuldade: "Média", base: "NH, até NH+4", desc: "Desloca ou quebra articulação após aparar." },
            { nome: "Desarmar", dificuldade: "Difícil", base: "NH, até NH+5", desc: "Torce pulso para arrancar arma da mão inimiga." },
            { nome: "Luta Baixa / Luta no Solo", dificuldade: "Difícil", base: "-2/-4", desc: "Zera penalidades de atacar/defender no chão." }
          ],
          qualidades_estilo: [
            { nome: "Agarrar Poderoso", desc: "Basear agarrar/imobilizar na ST bruta." },
            { nome: "Familiaridade com a Armadura (Judô)", desc: "Zera penalidade de carga da armadura para defesas." },
            { nome: "Pés Firmes: Irregular", desc: "Ignora -2 em terreno acidentado." }
          ],
          desc: "A Arte da Luta Agarrada Samurai. Para quando se perde a espada: esmagar articulações e criar aberturas.", tags: ["Desarmado", "Agarrar", "Solo"] },

        { id: 'lib_budo_iaijutsu', nome: "Iaijutsu", cat: "Budo", sub: "Saque", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🗡️",
          conceito: "A técnica paranoica de matar num piscar de olhos. Desembainhar cortando a carne no mesmo movimento.",
          pericias_realistas: ["Sacar Rápido (Espada)", "Espada de Duas Mãos", "Espadas de Lâmina Larga"],
          tecnicas: [
            { nome: "Ataque Direcionado: Pescoço/Vitais", dificuldade: "Difícil", base: "-5/-3, até NH-2", desc: "Golpe surpresa que separa a cabeça." },
            { nome: "Luta Baixa", dificuldade: "Difícil", base: "-2", desc: "Saque veloz mesmo sentado (seiza) ou ajoelhado." },
            { nome: "Inverter Empunhadura", dificuldade: "Média", base: "-4/-6", desc: "Muda pegada para apunhalar ou embainhamento rápido." }
          ],
          qualidades_estilo: [
            { nome: "Guardar Rápido (Espada)", desc: "Com espada invertida, embainha num segundo." },
            { nome: "Estilo (Chiburi)", desc: "+4 em Intimidação nos sobreviventes." },
            { nome: "Domínio da Empunhadura (Katana)", desc: "Transição de uma para duas mãos instantaneamente." }
          ],
          desc: "A Arte do Saque Mortal. Desembainhar cortando no mesmo movimento, vital para emboscadas.", tags: ["Saque", "Velocidade", "Mortal"] },

        { id: 'lib_budo_nitoryu', nome: "Nito Ryu", cat: "Budo", sub: "Espada", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "⚔️",
          conceito: "Criado por Musashi, agressão implacável com katana e wakizashi simultaneamente.",
          pericias_realistas: ["Espadas de Lâmina Larga", "Espadas Curtas"],
          tecnicas: [
            { nome: "Contra-Ataque", dificuldade: "Difícil", base: "-5", desc: "Apara com curta e decepa com longa, -2 na defesa." },
            { nome: "Fintar", dificuldade: "Difícil", base: "NH, até NH+4", desc: "Curta avança para cegar, longa corta sem resistência." },
            { nome: "Ataque Direcionado: Braço/Pescoço/Rosto", dificuldade: "Difícil", base: "-2/-5/-5", desc: "Inutilizar braço armado ou fatiar o rosto." }
          ],
          qualidades_estilo: [
            { nome: "Treino Mão Inábil (Espadas Curtas)", desc: "Remove -4 da mão fraca com a curta." },
            { nome: "Treinamento Incomum (Duas Armas)", desc: "Fatiar com ambas contra o mesmo adversário." },
            { nome: "Vínculo com Arma", desc: "+1 NH ao usar o par daisho específico." }
          ],
          desc: "O Estilo das Duas Espadas. Agressão implacável com katana e wakizashi em dois ângulos mortais.", tags: ["Duas Espadas", "Musashi", "Agressivo"] },

        { id: 'lib_budo_taijutsu', nome: "Taijutsu", cat: "Budo", sub: "Desarmado", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "💀",
          conceito: "A arte de lutar desarmado quando sua vida depende disso. Eficiência brutal, não honra.",
          pericias_realistas: ["Judô", "Caratê", "Acrobacia", "Furtividade"],
          tecnicas: [
            { nome: "Ataque Direcionado: Olhos/Pescoço/Virilha", dificuldade: "Difícil", base: "-9/-5/-5", desc: "Golpes sujos que cegam, sufocam ou incapacitam." },
            { nome: "Chave de Braço", dificuldade: "Média", base: "NH, até NH+4", desc: "Torce articulação para inutilizar a mão da espada." },
            { nome: "Luta no Solo", dificuldade: "Difícil", base: "-4", desc: "Eficiência em lama ou beco estreito." },
            { nome: "Rasteira", dificuldade: "Difícil", base: "-3", desc: "Derruba adversário com armadura." },
            { nome: "Queda", dificuldade: "Média", base: "NH, até NH+5", desc: "Reduz dano de quedas de telhados e muros." }
          ],
          qualidades_estilo: [
            { nome: "Pés Firmes (Irregular)", desc: "Ignora -2 em telhados escorregadios ou campo lamacento." },
            { nome: "Treinamento Incomum (Duas Armas desarmado)", desc: "Dois golpes rápidos em um turno." }
          ],
          desc: "A Arte Corporal da Sombra. Desequilibrar, quebrar juntas e criar aberturas para fuga.", tags: ["Desarmado", "Ninja", "Brutal"] },

        // ═══════════════════════════════════════════════════════════
        // BUDÔ parte 2 (6 estilos restantes)
        // ═══════════════════════════════════════════════════════════

        { id: 'lib_budo_kusarijutsu', nome: "Kusarijutsu", cat: "Budo", sub: "Corrente", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "⛓️",
          conceito: "Arte de combate de nicho com corrente e pesos para manter distância, enredar membros e desferir golpes esmagadores.",
          pericias_realistas: ["Kusari"],
          tecnicas: [
            { nome: "Envolver", dificuldade: "Difícil", base: "-4", desc: "Laça braço, perna ou arma do inimigo para prendê-lo." },
            { nome: "Golpe de Retorno", dificuldade: "Difícil", base: "-5", desc: "Golpe que acerta as costas na volta, ignorando defesa frontal." },
            { nome: "Ataque Direcionado: Rosto/Mão", dificuldade: "Difícil", base: "-5/-4, até NH-2", desc: "Esmagar maxilar ou quebrar dedos da mão da espada." },
            { nome: "Chave de Braço com Kusari", dificuldade: "Difícil", base: "-2", desc: "Após Envolver, aplica chave de articulação à distância." }
          ],
          qualidades_estilo: [
            { nome: "Vínculo com Arma", desc: "+1 NH ao usar sua própria corrente." },
            { nome: "Domínio da Empunhadura (Kusarigama)", desc: "Alternar entre kama (cortar) e corrente (envolver) como ação livre." }
          ],
          desc: "A Arte da Corrente. Controle e surpresa com corrente e pesos, enredando membros de ângulos inesperados.", tags: ["Corrente", "Controle", "Nicho"] },

        { id: 'lib_budo_shurikenjutsu', nome: "Shurikenjutsu", cat: "Budo", sub: "Arremesso", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "✴️",
          conceito: "Não é uma arte de matar, mas de distração e oportunidade com lâminas arremessáveis.",
          pericias_realistas: ["Arma de Arremesso (Shuriken)", "Sacar Rápido (Shuriken)", "Ocultamento"],
          tecnicas: [
            { nome: "Ataque Direcionado: Olho/Mão", dificuldade: "Difícil", base: "-9/-4, até NH-2", desc: "Forçar largar arma ou cegar com golpe de sorte." },
            { nome: "Tiro Engenhoso (Preditivo)", dificuldade: "Opcional", base: "-2 NH", desc: "Lê a esquiva e joga onde o oponente vai estar, -1 na Esquiva." }
          ],
          qualidades_estilo: [
            { nome: "Trocar Rápido (Shuriken)", desc: "Manipular várias lâminas na mão para arremessos sucessivos." },
            { nome: "Treino Mão Inábil (Shuriken)", desc: "Zera -4 por arremessar com mão fraca." },
            { nome: "Treinamento Incomum (Duas Armas)", desc: "Arremessar com cada mão ao mesmo tempo." }
          ],
          desc: "A Arte da Lâmina Oculta. Distração e oportunidade com shuriken para criar hesitação no inimigo.", tags: ["Arremesso", "Ninja", "Distração"] },

        { id: 'lib_budo_naginatajutsu', nome: "Naginatajutsu", cat: "Budo", sub: "Haste", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🪓",
          conceito: "A arte de controle de campo com a naginata. Arma de eleição do monge guerreiro e da onna-bugeisha.",
          pericias_realistas: ["Armas de Haste", "Bastão"],
          tecnicas: [
            { nome: "Ataque Direcionado: Perna", dificuldade: "Difícil", base: "-2, até NH-1", desc: "Mutilar tendões ou derrubar cavalos." },
            { nome: "Rasteira com a Haste", dificuldade: "Difícil", base: "-3", desc: "Balança parte inferior contra tornozelos." },
            { nome: "Enganchar", dificuldade: "Difícil", base: "-5", desc: "Prende escudo, braço ou pescoço com a curvatura da lâmina." }
          ],
          qualidades_estilo: [
            { nome: "Domínio da Forma (Naginata)", desc: "Alternar entre Armas de Haste (cortar) e Bastão (+2 Aparar)." },
            { nome: "Pés Firmes (Irregular)", desc: "Ignora -2 em lamaçais ou campos de corpos." }
          ],
          desc: "A Arte da Alabarda. Controle de campo com a naginata, cortando tendões e puxando cavaleiros.", tags: ["Alabarda", "Sohei", "Controle"] },

        { id: 'lib_budo_bojutsu', nome: "Bojutsu", cat: "Budo", sub: "Bastão", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🔨",
          conceito: "Subestimado e mortal. Bastão de madeira dura de quase dois metros que esmaga juntas e quebra ossos.",
          pericias_realistas: ["Bastão"],
          tecnicas: [
            { nome: "Ataque Direcionado: Mão/Braço", dificuldade: "Difícil", base: "-4/-2, até NH-1", desc: "Quebrar mão da espada ou braço do inimigo." },
            { nome: "Desarmar", dificuldade: "Difícil", base: "NH, até NH+5", desc: "Alavanca com a haste para prender e torcer a arma inimiga." },
            { nome: "Rasteira", dificuldade: "Difícil", base: "-3", desc: "Golpe baixo para derrubar e esmagar no chão." }
          ],
          qualidades_estilo: [
            { nome: "Domínio da Empunhadura (Bastão)", desc: "Deslizar mãos na haste como ação livre entre pegada longa e curta." },
            { nome: "Especialização em Arma (Bastão de Ferro)", desc: "Zera penalidade por usar tetsubo metálico." }
          ],
          desc: "A Arte do Bastão Longo. Subestimado e mortal, esmaga juntas e controla inimigos com alavancagem.", tags: ["Bastão", "Monge", "Controle"] },

        { id: 'lib_budo_kobujutsu', nome: "Kobujutsu", cat: "Budo", sub: "Ferramenta", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "🌾",
          conceito: "A arte marcial do oprimido nascida em Okinawa. Ferramentas de trabalho transformadas em armas letais.",
          pericias_realistas: ["Bastão", "Jitte/Sai", "Maça/Machado", "Mangual", "Tonfa"],
          tecnicas: [
            { nome: "Ataque Direcionado (Mão) com Sai", dificuldade: "Difícil", base: "-4, até NH-1", desc: "Esmagar ossos da mão para forçar largar arma." },
            { nome: "Reter Arma com Sai", dificuldade: "Difícil", base: "-3", desc: "Ganchos do sai prendem a lâmina da katana inimiga." },
            { nome: "Enganchar com Kama", dificuldade: "Difícil", base: "-5", desc: "Lâmina curva puxa perna, pescoço ou braço armado." },
            { nome: "Inverter Empunhadura com Tonfa", dificuldade: "Média", base: "NH, até NH+4", desc: "Transição fluida entre bloqueio e golpe contundente." }
          ],
          qualidades_estilo: [
            { nome: "Armas Improvisadas", desc: "Usar ferramenta similar sem penalidade de improviso." },
            { nome: "Treino Mão Inábil (Qualquer arma)", desc: "Remove -4 para lutar com armas em pares." }
          ],
          desc: "A Arte das Ferramentas da Rebelião. Pragmático e brutal, perfeito para emboscar samurais arrogantes.", tags: ["Ferramenta", "Okinawa", "Improviso"] },

        { id: 'lib_budo_taihojutsu', nome: "Taihojutsu", cat: "Budo", sub: "Captura", cust: "1 pt (Estilo)", fonte: "[AM]", emoji: "捕",
          conceito: "A arte marcial da polícia do Xogunato. Sistema brutal para subjugar, desarmar e capturar criminosos armados.",
          pericias_realistas: ["Judô", "Jitte/Sai", "Bastão", "Kusari", "Habilidade com Nós"],
          tecnicas: [
            { nome: "Reter Arma com Jitte/Sai", dificuldade: "Difícil", base: "-3", desc: "Ganchos do jutte prendem a katana, criando abertura para aliados." },
            { nome: "Chave de Braço", dificuldade: "Média", base: "NH, até NH+4", desc: "Desloca ou quebra articulações para forçar largar arma." },
            { nome: "Desarmar", dificuldade: "Difícil", base: "NH, até NH+5", desc: "Arrancar arma usando alavancagem, torção e dor." },
            { nome: "Envolver com Kusari", dificuldade: "Difícil", base: "-4", desc: "Laça membro ou arma com corrente para controlar." },
            { nome: "Ataque Direcionado: Mão/Perna", dificuldade: "Difícil", base: "-4/-2", desc: "Incapacitar sem matar, para captura viva." },
            { nome: "Mata-Leão", dificuldade: "Difícil", base: "-2 (Judô)", desc: "Estrangular até inconsciência para captura silenciosa." }
          ],
          qualidades_estilo: [
            { nome: "Trabalho em Equipe", desc: "Sacrificar Aparada para proteger aliado adjacente." },
            { nome: "Treino Mão Inábil (Jitte/Sai)", desc: "Remove -4 para usar jutte com mão fraca enquanto segura corda." },
            { nome: "Domínio da Empunhadura (Kusarijutte)", desc: "Alternar entre jutte (aparar) e corrente (envolver) sem perder ritmo." }
          ],
          desc: "A Arte da Captura e Submissão. Polícia do Xogunato para subjugar criminosos armados, vivos ou mortos.", tags: ["Captura", "Polícia", "Equipe"] },
    ];

    const STORE = 'vault';
    const DATA_KEY = 'library_data';
    const CAT_KEY = 'library_categories';
    const VERSION_KEY = 'library_data_version';

    let data = [...initialData];
    let categories = [...defaultCategories];
    let isInitialized = false;

    async function init() {
        // Wait for Vault
        while (!window.DaimyoDB) {
            await new Promise(r => setTimeout(r, 100));
        }
        
        // 1. Ensure any legacy data is migrated if we land here first
        await window.DaimyoDB.migrateFromLocalStorage();
        
        try {
            const savedVersion = await window.DaimyoDB.get(STORE, VERSION_KEY) || 0;
            
            if (savedVersion < DATA_VERSION) {
                console.log(`📚 Library: Atualizando para versão ${DATA_VERSION}...`);
                // Reset to fresh initial data on version bump, but merge custom users item
                const usersItems = data.filter(item => !item.id.startsWith('lib_')); // Temporary filter

                // Merge user items from previous DB or localStorage
                const oldData = await window.DaimyoDB.get(STORE, DATA_KEY);
                if (oldData) {
                    const userItems = oldData.filter(item => !item.id.startsWith('lib_v') && !item.id.startsWith('lib_d') && !item.id.startsWith('lib_p') && !item.id.startsWith('lib_q') && !item.id.startsWith('lib_k') && !item.id.startsWith('lib_budo') && !item.id.startsWith('lib_r'));
                    data = [...data, ...userItems];
                }

                await window.DaimyoDB.put(STORE, VERSION_KEY, DATA_VERSION);
                await saveData();
                await saveCategories();
            } else {
                const savedCats = await window.DaimyoDB.get(STORE, CAT_KEY);
                categories = savedCats ? savedCats : [...defaultCategories];

                const savedData = await window.DaimyoDB.get(STORE, DATA_KEY);
                data = savedData ? savedData : [...initialData];
            }
            
            isInitialized = true;
            console.log(`📚 Library: ${data.length} itens carregados do Cofre.`);
            window.dispatchEvent(new CustomEvent('daimyoLibraryReady'));
        } catch (e) {
            console.error("Erro ao inicializar biblioteca no Cofre:", e);
            data = [...initialData];
            categories = [...defaultCategories];
        }
    }

    async function saveData() { 
        if (window.DaimyoDB) await window.DaimyoDB.put(STORE, DATA_KEY, data); 
    }
    
    async function saveCategories() {
        categories.sort((a,b) => a.order - b.order);
        if (window.DaimyoDB) await window.DaimyoDB.put(STORE, CAT_KEY, categories);
    }

    // --- CRUD ITENS ---
    function addItem(item) {
        if (!item.id) item.id = 'lib_' + Date.now();
        if (!item.tags) item.tags = [];
        data.push(item);
        saveData();
        return item;
    }

    function editItem(id, updates) {
        const idx = data.findIndex(i => i.id === id);
        if (idx === -1) return false;
        data[idx] = { ...data[idx], ...updates };
        saveData();
        return true;
    }

    function removeItem(id) {
        data = data.filter(i => i.id !== id);
        saveData();
    }

    // --- CRUD CATEGORIAS ---
    function addCategory(cat) {
        if (!cat.id) cat.id = 'cat_' + Date.now();
        cat.order = categories.length;
        categories.push(cat);
        saveCategories();
    }

    function editCategory(id, updates) {
        const idx = categories.findIndex(c => c.id === id);
        if (idx === -1) return false;
        categories[idx] = { ...categories[idx], ...updates };
        saveCategories();
        return true;
    }

    function removeCategory(id) {
        categories = categories.filter(c => c.id !== id);
        saveCategories();
    }

    function reorderCategory(id, direction) {
        const idx = categories.findIndex(c => c.id === id);
        if (idx === -1) return;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= categories.length) return;
        const temp = categories[idx].order;
        categories[idx].order = categories[newIdx].order;
        categories[newIdx].order = temp;
        saveCategories();
    }

    // Auto-init connection attempt
    window.addEventListener('load', () => {
      if (window.DaimyoDB) init();
      else setTimeout(init, 250);
    });

    return {
        getItems: () => data,
        getCategories: () => categories,
        addItem, editItem, removeItem,
        addCategory, editCategory, removeCategory, reorderCategory,
        isReady: () => isInitialized
    };
})();

window.LibraryManager = LibraryManager;
Object.defineProperty(window, 'libraryData', { get: () => LibraryManager.getItems() });
