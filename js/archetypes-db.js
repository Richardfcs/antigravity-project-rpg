if (typeof archetypesDB === 'undefined') {
    var archetypesDB = [
    {
        "name": "SAMURAI NOBRE (LÍDER)",
        "concept": "O rosto diplomático e tático do Clã. Focado em comando e etiqueta.",
        "clan": "Kiku-Hana (Kyoto)",
        "status": 3,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 12,
            "iq": 13,
            "ht": 10,
            "hp": 11,
            "fp": 10,
            "will": 13,
            "per": 13
        },
        "advantages": [
            "Status 3 (Membro de Clã Maior) [15]",
            "Reivindicação de Linhagem (Imperial) [5]",
            "Riqueza (Confortável) [10]",
            "Carisma 1 [5]"
        ],
        "disadvantages": [
            "Código de Honra (Bushido) [-15]",
            "Dever (Ao Daimyo; 12 ou menos) [-10]",
            "Senso de Dever (Clã) [-10]",
            "Peculiaridade: Obsessão por manter a Face (Mentsu) [-1]",
            "Peculiaridade: Formalismo excessivo [-1]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 14 [8]",
            "Liderança (IQ/M) - NH: 14  [2] (Inclui +1 do Carisma)",
            "Savoir-Faire (Corte) (IQ/E) - NH: 15 [4]",
            "Diplomacia (IQ/D) - NH: 12 [2]",
            "Política (IQ/D) - NH: 12 [2]",
            "Estratégia (Guerra) (IQ/D) - NH: 12 [2]",
            "Finta Avançada (Disponível p/ NH 14+): Finta (DX), Batida (ST) e Truque (IQ)."
        ],
        "equipment": "   Arma Principal: Katana de Qualidade Fina | Dano: 1d+3 cort / 1d+1 perf | Alcance: 1 | Aparar: 11 |    Armadura: Peitoral Lamelar (Samurai) | RD: 5 | Peso: 12 kg (Tronco) |    Carga (Slots): 16 / 11 (Carga Leve: -1 na Esquiva e NH máximo de Movimento 80%)",
        "history": "[Espaço para o jogador descrever como este nobre planeja restaurar a glória de sua linhagem em meio ao vácuo de poder do Trono.]",
        "basicSpeed": 5.5
    },
    {
        "name": "DUELISTA DE IAIJUTSU",
        "concept": "Especialista em velocidade reativa. O combate termina no momento em que a lâmina deixa a bainha.",
        "clan": "Tsuru-Mai (Kansai)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 14,
            "iq": 10,
            "ht": 13,
            "hp": 11,
            "fp": 13,
            "will": 10,
            "per": 11
        },
        "advantages": [
            "Reflexos em Combate [15]",
            "Estilo de Luta: Iaijutsu [1]",
            "Boa Forma [5]",
            "Sacar Rápido na Bainha (Perk) [1]"
        ],
        "disadvantages": [
            "Excesso de Confiança [-5]",
            "Código de Honra (Bushido) [-15]",
            "Dever (Daimyo; 12 ou menos) [-10]",
            "Peculiaridade: Limpa a lâmina obsessivamente [-1]",
            "Peculiaridade: Fala apenas em haikus curtos [-1]"
        ],
        "skills": [
            "Espada de Duas Mãos (DX/A) - NH: 17 [12]",
            "Sacar Rápido (Katana) (DX/E) - NH: 17  [4] (Inclui +1 de Reflexos)",
            "Acrobacia (DX/D) - NH: 14 [4]",
            "Ataque Surpresa (Técnica/Iaijutsu) - NH: 17 [3]",
            "Savoir-Faire (Dojo) (IQ/E) - NH: 11 [2]"
        ],
        "equipment": "   Arma Principal: Katana de Qualidade Fina | Dano: 1d+3 cort / 1d+1 perf | Alcance: 1, 2 | Aparar: 11 |    Armadura: Kamiko (Papel Laqueado) | RD: 1 | Peso: 1.5 kg |    Carga (Slots): 4 / 11 (Carga Nula: Sem penalidade em Esquiva ou Movimento)",
        "history": "[Espaço para o jogador descrever o dojo de origem e por que o caminho da espada curta e rápida é superior à força bruta.]",
        "basicSpeed": 6.75
    },
    {
        "name": "GUERREIRO DE ARMADURA (TANQUE)",
        "concept": "O baluarte do exército. Treinado para manter a posição, absorver choques e esmagar oponentes.",
        "clan": "Hagane-Ryu (Bizen)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 14,
            "dx": 12,
            "iq": 10,
            "ht": 13,
            "hp": 16,
            "fp": 13,
            "will": 12,
            "per": 10
        },
        "advantages": [
            "Hipoalgia (Ignora Choque) [10]",
            "RD Extra 2 (Pele de Ferro - Ki; Custo 1 PF) [6]",
            "Reflexos em Combate [15]",
            "Postura da Montanha (Perk) [1]"
        ],
        "disadvantages": [
            "Honradez [-10]",
            "Código de Honra (Bushido) [-15]",
            "Dever (Daimyo; 15 ou menos) [-15]",
            "Peculiaridade: Nunca retira o Kabuto (elmo) em público [-1]",
            "Peculiaridade: Despreza quem não usa armadura pesada [-1]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [12]",
            "Lança (Yari) (DX/M) - NH: 14 [8]",
            "Briga (DX/E) - NH: 14 [4]",
            "Intimidação (Vont/M) - NH: 14 [4]",
            "Savoir-Faire (Militar) (IQ/E) - NH: 11 [2]"
        ],
        "equipment": "   Arma Principal: Katana (Qualidade Boa) | Dano: 2d cort / 1d+1 perf | Alcance: 1 | Aparar: 11 |    Armadura: O-Yoroi (Conjunto Completo) | RD: 5 (Tudo) | Peso: 24 kg |    Carga (Slots): 28 / 14 (Carga Média: Movimento 60%, Esquiva -2)",
        "history": "[Espaço para o jogador descrever as batalhas em que sua armadura foi batizada pelo sangue e o juramento de nunca recuar.]",
        "basicSpeed": 6.25
    },
    {
        "name": "O MERCADOR-GUERREIRO (WAKO)",
        "concept": "O pragmático rico. Vê a guerra como um negócio e o mar como seu território.",
        "clan": "Uminari (Otsuko)",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 12,
            "iq": 12,
            "ht": 11,
            "hp": 11,
            "fp": 11,
            "will": 12,
            "per": 12
        },
        "advantages": [
            "Riqueza (Rico - 5x inicial) [20]",
            "Noção do Perigo (Mar) [5]",
            "Treinamento Naval (Sea-Legs) [1]"
        ],
        "disadvantages": [
            "Cobiça (12 ou menos) [-15]",
            "Inimigo (Piratas rivais; 6 ou menos) [-5]",
            "Senso de Dever (Tripulação) [-10]",
            "Peculiaridade: Morde uma moeda de ouro para checar a veracidade [-1]",
            "Peculiaridade: Só usa seda de Otsuko [-1]"
        ],
        "skills": [
            "Espada de Duas Mãos (Nagamaki) (DX/A) - NH: 14 [8]",
            "Mercador (IQ/M) - NH: 13 [4]",
            "Navegação (Mar) (IQ/M) - NH: 12 [2]",
            "Natação (HT/F) - NH: 12 [2]"
        ],
        "equipment": "",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "name": "ARQUEIRO MONTADO (YABUSAME)",
        "concept": "Atirador de elite com alta mobilidade, capaz de atingir pontos vitais em galope.",
        "clan": "Inazuma (Kanto)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 14,
            "iq": 10,
            "ht": 12,
            "hp": 11,
            "fp": 12,
            "will": 10,
            "per": 13
        },
        "advantages": [
            "Visão Aguçada 2 [4]",
            "Aliado (Cavalo de Guerra; 100 pts; 12 ou menos) [10]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Dever (Daimyo; 12 ou menos) [-10]",
            "Voto (Nunca lutar desarmado) [-10]",
            "Código de Honra (Bushido) [-15]",
            "Peculiaridade: Prefere dormir nos estábulos com o cavalo [-1]",
            "Peculiaridade: Despreza o combate corpo a corpo [-1]"
        ],
        "skills": [
            "Arco (DX/D) - NH: 16 [12]",
            "Cavalgar (DX/A) - NH: 15 [4]",
            "Tática (IQ/D) - NH: 10 [4]",
            "Tiro Montado (Técnica/Arco) - NH: 16 [4]"
        ],
        "equipment": "   Arma Principal: Yumi (Arco Longo) | Dano: 1d+1 perf | Alcance: 165/220 | Precisão: 3 |    Arma Secundária: Katana | Dano: 1d+2 cort / 1d+1 perf | Alcance: 1 | Aparar: 10 |    Armadura: Jingasa e Do de Couro | RD: 3 (Crânio/Tronco) | Peso: 5 kg |    Carga (Slots): 11 / 11 (Carga Nula: Sem penalidades)",
        "history": "[Espaço para o jogador descrever o nome de sua montaria e a linhagem de arqueiros da qual descende.]",
        "basicSpeed": 6.5
    },
    {
        "name": "GUERREIRA DE NAGINATA (ONNA-BUGEISHA)",
        "concept": "Especialista em manter a distância e defender o lar. Mestra em aparar golpes.",
        "clan": "Tsuru-Mai (Dança do Grou)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 13,
            "iq": 12,
            "ht": 10,
            "hp": 11,
            "fp": 10,
            "will": 12,
            "per": 12
        },
        "advantages": [
            "Defesa Ampliada (Aparar Naginata) [5]",
            "Equilíbrio Perfeito [15]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Senso de Dever (Família/Clã) [-10]",
            "Código de Honra (Bushido) [-15]",
            "Pacificismo (Autodefesa Apenas) [-15]",
            "Peculiaridade: Extremamente educada mesmo sob ameaça [-1]",
            "Peculiaridade: Coleciona lenços de seda [-1]"
        ],
        "skills": [
            "Arma de Haste (Naginata) (DX/M) - NH: 16 [12]",
            "Savoir-Faire (Corte) (IQ/E) - NH: 13 [2]",
            "Primeiros Socorros (IQ/F) - NH: 14 [4]",
            "Diplomacia (IQ/D) - NH: 12 [4]",
            "Varredura (Técnica/Naginata) - NH: 16 [3]"
        ],
        "equipment": "   Arma Principal: Naginata | Dano: 1d+3 cort / 1d+1 perf | Alcance: 1, 2 | Aparar: 12 (13 com Retirada) |    Armadura: Kamiko e Ombreiras (Sode) | RD: 2 (Tronco/Braços) | Peso: 5.5 kg |    Carga (Slots): 10 / 11 (Carga Nula: Sem penalidades)",
        "history": "[Espaço para o jogador descrever o juramento de proteção feito aos seus antepassados.]",
        "basicSpeed": 5.75
    },
    {
        "name": "NINJA DE INFILTRAÇÃO (SOMBRA)",
        "concept": "O espião invisível. Mestre em acessar locais impossíveis e colher informações.",
        "clan": "Kuro-Neko (Gato Preto)",
        "status": -3,
        "points": 135,
        "attributes": {
            "st": 10,
            "dx": 15,
            "iq": 11,
            "ht": 10,
            "hp": 10,
            "fp": 10,
            "will": 11,
            "per": 13
        },
        "advantages": [
            "Silêncio 2 [10]",
            "Flexibilidade (+3 em Escalada/Fugas) [5]",
            "Identidade Alternativa (Mercador) [5]"
        ],
        "disadvantages": [
            "Segredo (É um Shinobi) [-20]",
            "Dever (Clã Ninja; 15 ou menos) [-15]",
            "Estigma Social (Pária) [-15]",
            "Peculiaridade: Nunca olha diretamente nos olhos [-1]",
            "Peculiaridade: Usa moedas falsas para testar reações [-1]"
        ],
        "skills": [
            "Furtividade (DX/A) - NH: 17  [2] (NH 19 para ficar parado)",
            "Escalada (DX/A) - NH: 18  [2] (Inclui +3 da Flexibilidade)",
            "Arrombamento (IQ/M) - NH: 14 [12]",
            "Acrobacia (DX/D) - NH: 14 [2]",
            "Adestramento de Animais (Cães) (IQ/M) - NH: 12 [4]",
            "Disfarce (IQ/M) - NH: 12 [4]",
            "Espada Curta (Ninjato) (DX/M) - NH: 15 [2]"
        ],
        "equipment": "   Arma Principal: Ninjato (Espada Curta) | Dano: 1d cort / 1d-1 perf | Alcance: 1 | Aparar: 10 |    Equipamento: Kaginawa (Gancho/Corda) [+2 Escalada] | Kit de Arrombamento | Metsubishi (Pó Cegante) |    Armadura: Traje de Ninja (Tecido Reforçado) | RD: 1 | Peso: 3 kg |    Carga (Slots): 6 / 10 (Carga Nula: Sem penalidades)",
        "history": "[Espaço para o jogador descrever sua missão atual e qual segredo de estado ele carrega no pergaminho preso às costas.]",
        "basicSpeed": 6.25
    },
    {
        "name": "ASSASSINO VENENOSO (SHINOBI)",
        "concept": "O executor silencioso. Especialista em toxinas e morte sem rastro.",
        "clan": "Akai-Hasu (Lótus Rubra)",
        "status": -3,
        "points": 135,
        "attributes": {
            "st": 10,
            "dx": 13,
            "iq": 13,
            "ht": 10,
            "hp": 10,
            "fp": 10,
            "will": 13,
            "per": 13
        },
        "advantages": [
            "Mente Oculta (Shield) [10]",
            "Resistência a Veneno (+3) [5]",
            "Olhar do Anatomista (Perk) [1]"
        ],
        "disadvantages": [
            "Sanguinolência [-10]",
            "Frieza (Sem Empatia) [-15]",
            "Segredo (Assassino do Clã) [-20]",
            "Peculiaridade: Sempre testa o gosto da própria comida [-1]",
            "Peculiaridade: Coleciona frascos vazios [-1]"
        ],
        "skills": [
            "Venenos (IQ/D) - NH: 15 [8]",
            "Faca (DX/F) - NH: 14 [2]",
            "Zarabatana (DX/E) - NH: 15 [4]",
            "Alquimia (Campo) (IQ/M) - NH: 12 [1]"
        ],
        "equipment": "   Arma Principal: Tanto (Envenenado) | Dano: 1d-2 cort / 1d-1 perf | Alcance: C, 1 | Aparar: 9 |    Arma à Distância: Fukiya (Zarabatana) | Dano: 1d-3 pi- | Alcance: 4 | Precisão: 1 |    Armadura: Traje de Ninja (Reforçado) | RD: 1 | Peso: 3 kg |    Carga (Slots): 5 / 10 (Carga Nula)",
        "history": "[Espaço para o jogador descrever qual veneno é sua assinatura e por que ele parou de sentir remorso.]",
        "basicSpeed": 5.75
    },
    {
        "name": "ESPIÃ SOCIAL (GUEIXA)",
        "concept": "A mestre da manipulação. Extrai segredos através da arte e da sedução.",
        "clan": "Kagami (Espelho)",
        "status": -1,
        "points": 135,
        "attributes": {
            "st": 9,
            "dx": 12,
            "iq": 14,
            "ht": 10,
            "hp": 9,
            "fp": 10,
            "will": 14,
            "per": 14
        },
        "advantages": [
            "Carisma 1 [5]",
            "Voz Melodiosa [10]",
            "Aparência (Bela) [12]",
            "Empatia com Espíritos [10]"
        ],
        "disadvantages": [
            "Lealdade (Ao Clã/Patrono) [-10]",
            "Inimigo Político (Daimyo rival; 6 ou menos) [-10]",
            "Dever (Espionagem; 12 ou menos) [-10]",
            "Segredo (Espiã) [-20]",
            "Peculiaridade: Perfume de Jasmim onipresente [-1]",
            "Peculiaridade: Esconde uma agulha no cabelo [-1]"
        ],
        "skills": [
            "Atuação (IQ/M) - NH: 15 [4]",
            "Lábia (IQ/M) - NH: 16  [4] (+1 Voz / +1 Carisma)",
            "Sex Appeal (HT/M) - NH: 16  [2] (+2 Bela / +2 Voz)",
            "Instrumento Musical (Shamisen) (IQ/D) - NH: 13 [2]",
            "Savoir-Faire (Corte) (IQ/E) - NH: 15 [0] (Baseado em IQ)"
        ],
        "equipment": "   Arma Principal: Leque de Guerra (Tessen) | Dano: 1d-1 esm | Alcance: C | Aparar: 9 |    Arma Oculta: Agulhas Envenenadas (Faca) | Dano: 1d-4 perf | Alcance: C | Aparar: N/A |    Armadura: Kimono de Seda Fina | RD: 0 | Peso: 1 kg |    Carga (Slots): 3 / 09 (Carga Nula)",
        "history": "[Espaço para o jogador descrever qual segredo proibido ela ouviu atrás das divisórias de papel shoji.]",
        "basicSpeed": 5.5
    },
    {
        "name": "NINJA SABOTADOR (ENGENHEIRO)",
        "concept": "O mestre do caos estrutural. Especialista em explosivos e armadilhas.",
        "clan": "Tsuchigumo (Aranha da Terra)",
        "status": -3,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 12,
            "iq": 14,
            "ht": 10,
            "hp": 11,
            "fp": 10,
            "will": 14,
            "per": 14
        },
        "advantages": [
            "Talento (Artífice 1) [10]",
            "Versátil [5]",
            "Acessório (Kit de Ignição) [1]"
        ],
        "disadvantages": [
            "Curiosidade [-5]",
            "Obsessão (Destruir Fortificações) [-5]",
            "Dever (Clã Ninja; 15 ou menos) [-15]",
            "Segredo (Sabotador) [-5]",
            "Peculiaridade: Cheira constantemente a enxofre [-1]",
            "Peculiaridade: Risca fósforos quando está nervoso [-1]"
        ],
        "skills": [
            "Armadilhas (IQ/M) - NH: 16  [4] (Inclui +1 Artífice)",
            "Explosivos (Pólvora Negra) (IQ/M) - NH: 15 [4]",
            "Engenharia (NT3 - Mineração) (IQ/D) - NH: 14  [2] (Inclui +1 Artífice)",
            "Arquitetura (IQ/M) - NH: 15 [4]",
            "Kusarigama (DX/D) - NH: 12 [4]",
            "Espada Curta (DX/M) - NH: 12 [1]"
        ],
        "equipment": "   Arma Principal: Kusarigama (Foice com corrente) | Dano: 1d+1 cort (Foice) | Alcance: 1, 4 | Aparar: 9U |    Equipamento: 3 Bombas de Fumaça | Potes de Pólvora | Óleo Inflamável |    Armadura: Traje de Ninja e Luvas de Couro | RD: 1 | Peso: 4 kg |    Carga (Slots): 11 / 11 (Carga Nula)",
        "history": "[Espaço para o jogador descrever qual castelo \"impenetrável\" ele sonha em ver transformado em cinzas.]",
        "basicSpeed": 5.5
    },
    {
        "name": "MONGE SOHEI (GUERREIRO SAGRADO)",
        "concept": "Protetor de templos que mescla disciplina marcial com fúria religiosa.",
        "clan": "Yamabiko (Eco da Montanha)",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 14,
            "dx": 11,
            "iq": 11,
            "ht": 13,
            "hp": 14,
            "fp": 13,
            "will": 13,
            "per": 11
        },
        "advantages": [
            "Fé Verdadeira (Kiai Espiritual) [12]",
            "Destemor 2 [4]",
            "Investidura Clerical 1 [5]"
        ],
        "disadvantages": [
            "Disciplina da Fé (Ritualismo) [-5]",
            "Voto (Pobreza) [-10]",
            "Intolerância (Yokais e Hereges) [-10]",
            "Dever (Templo; 12 ou menos) [-10]",
            "Peculiaridade: Raspa a cabeça diariamente [-1]",
            "Peculiaridade: Recita sutras em voz alta durante o combate [-1]"
        ],
        "skills": [
            "Arma de Haste (Naginata) (DX/M) - NH: 15 [16]",
            "Teologia (Budismo) (IQ/D) - NH: 12 [4]",
            "Exorcismo (Vont/D) - NH: 14 [8]",
            "Kiai (HT/D) - NH: 13 [4]"
        ],
        "equipment": "   Arma Principal: Naginata | Dano: 1d+5 cort / 1d+1 perf | Alcance: 1, 2 | Aparar: 11 |    Armadura: Armadura de Ashigaru (Peitoral/Jingasa) | RD: 3 | Peso: 8 kg |    Carga (Slots): 11 / 14 (Carga Nula)",
        "history": "[Espaço para o jogador descrever qual monastério jurou proteger e qual heresia o motiva a empunhar o aço.]",
        "basicSpeed": 6.0
    },
    {
        "name": "YAMABUSHI (ASCETA DA MONTANHA)",
        "concept": "Eremita que domina o Ki para transcender os limites da carne.",
        "clan": "Nenhum (Ronin/Eremita)",
        "status": -1,
        "points": 135,
        "attributes": {
            "st": 12,
            "dx": 12,
            "iq": 11,
            "ht": 14,
            "hp": 12,
            "fp": 14,
            "will": 15,
            "per": 11
        },
        "advantages": [
            "Golpe Poderoso (Ki/Power Blow) [8]",
            "Metabolismo Controlado [5]",
            "Hipoalgia [10]"
        ],
        "disadvantages": [
            "Solitário [-5]",
            "Estigma Social (Eremita) [-5]",
            "Voto (Não comer carne) [-5]",
            "Dever (Manter o equilíbrio espiritual; 9 ou menos) [-5]",
            "Peculiaridade: Cheira a pinheiro e orvalho [-1]",
            "Peculiaridade: Nunca usa sapatos, mesmo na neve [-1]"
        ],
        "skills": [
            "Meditação (Vont/D) - NH: 15 [4]",
            "Sobrevivência (Montanhas) (Per/M) - NH: 12 [4]",
            "Bastão (Bo) (DX/M) - NH: 14 [8]",
            "Golpe Poderoso (Técnica/Ki) - NH: 15 [4]"
        ],
        "equipment": "   Arma Principal: Bastão de Carvalho (Bo) | Dano: 1d+4 esm / 1d+2 esm | Alcance: 1, 2 | Aparar: 11 |    Ki: Ao usar Golpe Poderoso (1 PF), a ST dobra para o dano (ST 24 = 2d+5 esm). |    Armadura: Roupas de Asceta Grosseiras | RD: 0 | Peso: 1 kg |    Carga (Slots): 3 / 12 (Carga Nula)",
        "history": "[Espaço para o jogador descrever em qual pico isolado alcançou a iluminação e por que desceu para o mundo dos homens.]",
        "basicSpeed": 6.5
    },
    {
        "name": "MIKO / VIDENTE (PURIFICADORA)",
        "concept": "Sensitiva que detecta o invisível e purifica a mácula antes que ela se espalhe.",
        "clan": "Izumo (Amago)",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 9,
            "dx": 10,
            "iq": 14,
            "ht": 11,
            "hp": 9,
            "fp": 11,
            "will": 14,
            "per": 16
        },
        "advantages": [
            "Ver o Invisível (Espíritos) [15]",
            "Empatia com Espíritos [10]",
            "Toque da Memória (Grimório p. 5) [10]"
        ],
        "disadvantages": [
            "Sono Leve [-5]",
            "Frágil [-15]",
            "Caridosa (12 ou menos) [-15]",
            "Dever (Santuário/Kami; 12 ou menos) [-10]",
            "Peculiaridade: Sempre carrega uma bolsa de sal puro [-1]",
            "Peculiaridade: Curva-se diante de cada estátua Jizo [-1]"
        ],
        "skills": [
            "Saber Oculto (Espíritos/Yokai) (IQ/M) - NH: 16 [8]",
            "Rituais de Exorcismo (Ofuda) (IQ/D) - NH: 15 [8]",
            "Diagnóstico (IQ/D) - NH: 13 [2]",
            "Diplomacia (IQ/D) - NH: 13 [2]",
            "Faca (DX/F) - NH: 11 [2]",
            "Observação Especial: NH 14 em Truque (IQ) para evitar combates."
        ],
        "equipment": "   Arma Principal: Tanto (Adaga) | Dano: 1d-3 cort / 1d-2 perf | Alcance: C, 1 | Aparar: 8 |    Equipamento Sagrado: Espelho de Bronze (Kagami) | Selos Ofuda (+1 Exorcismo) | Sal de Proteção |    Armadura: Kimono Cerimonial Branco e Vermelho | RD: 0 | Peso: 1 kg |    Carga (Slots): 4 / 9 (Carga Nula)",
        "history": "[Espaço para o jogador descrever qual Kami fala em seus sonhos e qual Yokai ela jurou banir.]",
        "basicSpeed": 5.25
    },
    {
        "name": "RONIN VAGABUNDO (YOJIMBO)",
        "concept": "Guerreiro sem mestre que vende sua lâmina pela próxima refeição. Pragmático e experiente.",
        "clan": "Nenhum (Ronin)",
        "status": -2,
        "points": 135,
        "attributes": {
            "st": 12,
            "dx": 13,
            "iq": 11,
            "ht": 12,
            "hp": 12,
            "fp": 12,
            "will": 11,
            "per": 12
        },
        "advantages": [
            "Duro de Matar 2 [4]",
            "Reflexos em Combate [15]",
            "Contatos (Mercadores/Submundo; NH 12; 9 ou menos) [2]"
        ],
        "disadvantages": [
            "Estigma Social (Ronin) [-10]",
            "Pobreza (Lutando) [-10]",
            "Código de Honra (Bushido \"Flexível\") [-5]",
            "Inimigo (Antigo Clã; 6 ou menos) [-5]",
            "Peculiaridade: Sempre palita os dentes com um graveto [-1]",
            "Peculiaridade: Dorme com uma das mãos na espada [-1]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [8]",
            "Intimidação (Vont/M) - NH: 13 [4]",
            "Manha (IQ/M) - NH: 12 [4]",
            "Observação (Per/A) - NH: 12 [2]",
            "Briga (DX/E) - NH: 14 [2]",
            "Jogo (Dados) (IQ/F) - NH: 12 [2]"
        ],
        "equipment": "   Arma Principal: Katana Barata (Antiga) | Dano: 1d+2 cort / 1d+1 perf | Alcance: 1 | Aparar: 10 |    Armadura: Do de Couro e Chapéu de Palha | RD: 2 | Peso: 4 kg |    Carga (Slots): 6 / 12 (Carga Nula)",
        "history": "[Espaço para o jogador descrever por que seu mestre caiu e o que ele busca nas estradas de cinzas.]",
        "basicSpeed": 6.25
    },
    {
        "name": "MÉDICO DE CAMPO (CIRURGIÃO)",
        "concept": "O suporte vital do grupo. Especialista em trauma físico e ervas medicinais.",
        "clan": "Shiro-Hebi (Serpente Branca)",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 10,
            "dx": 12,
            "iq": 14,
            "ht": 10,
            "hp": 10,
            "fp": 10,
            "will": 14,
            "per": 14
        },
        "advantages": [
            "Empatia 1 [5]",
            "Estômago Forte [1]",
            "Voz Melodiosa [10]"
        ],
        "disadvantages": [
            "Pacifismo (Relutante em Matar) [-5]",
            "Senso de Dever (Pacientes) [-10]",
            "Código de Honra (Médico) [-5]",
            "Peculiaridade: Lava as mãos obsessivamente [-1]",
            "Peculiaridade: Descreve ferimentos em termos técnicos e frios [-1]"
        ],
        "skills": [
            "Primeiros Socorros (IQ/F) - NH: 17  [4] (Inclui +1 Empatia)",
            "Cirurgia (IQ/D) - NH: 15 [8]",
            "Farmácia (Herbanário) (IQ/D) - NH: 14 [4]",
            "Diagnóstico (IQ/D) - NH: 14 [1]",
            "Faca (DX/F) - NH: 12 [1]"
        ],
        "equipment": "   Arma Principal: Tanto (Bisturi improvisado) | Dano: 1d-3 cort / 1d-2 perf | Alcance: C, 1 | Aparar: 9 |    Equipamento: Kit Cirúrgico | Bolsa de Ervas | Ligaduras de Seda |    Armadura: Roupas de Viagem Reforçadas | RD: 0 | Peso: 2 kg |    Carga (Slots): 10 / 10 (Carga Nula - no limite!)",
        "history": "[Espaço para o jogador descrever por que prefere salvar vidas a tirá-las em uma era de guerra total.]",
        "basicSpeed": 5.5
    },
    {
        "name": "FERREIRO DE ALMAS (ARTESÃO)",
        "concept": "Criador de aço lendário. Conhece os segredos do metal e como restaurar armas danificadas.",
        "clan": "Iwabito (Povo da Rocha)",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 13,
            "dx": 11,
            "iq": 13,
            "ht": 11,
            "hp": 13,
            "fp": 11,
            "will": 13,
            "per": 13
        },
        "advantages": [
            "Talento (Artífice 2) [20]",
            "Riqueza (Confortável) [10]",
            "Limpar a Mácula (Gadgeteer Limitado) [10]"
        ],
        "disadvantages": [
            "Teimosia [-5]",
            "Cobiça (12 ou menos) [-15]",
            "Dever (Oficina/Clã; 12 ou menos) [-10]",
            "Excesso de Peso [-5]",
            "Peculiaridade: Fala com as armas que forja [-1]",
            "Peculiaridade: Despreza armas estrangeiras [-1]"
        ],
        "skills": [
            "Armaria (Armas Brancas) (IQ/M) - NH: 17  [4] (Inclui +2 Artífice)",
            "Ferreiro (IQ/M) - NH: 17  [4] (Inclui +2 Artífice)",
            "Briga (DX/E) - NH: 13 [4]",
            "Comércio (IQ/M) - NH: 13 [1]",
            "Observação: NH 13 em Batida (ST 16) usando o Martelo."
        ],
        "equipment": "   Arma Principal: Martelo de Forja (Maça) | Dano: 2d-1 esm | Alcance: 1 | Aparar: 8U |    Equipamento: Kit de Reparos Portátil | Pedra de Afiar | Amostras de Tamahagane |    Armadura: Avental de Couro Grosso (Tronco) | RD: 2 | Peso: 3 kg |    Carga (Slots): 11 / 13 (Carga Nula)",
        "history": "[Espaço para o jogador descrever sua busca pelo segredo das armas Muramasa ou do aço perfeito.]",
        "basicSpeed": 5.5
    },
    {
        "name": "MAGISTRADO INVESTIGADOR (DETETIVE)",
        "concept": "O oficial da lei. Especialista em encontrar traidores e resolver crimes sob o código do aço.",
        "clan": "Settsu (Muralha do Leste)",
        "status": 2,
        "points": 134,
        "attributes": {
            "st": 10,
            "dx": 12,
            "iq": 13,
            "ht": 11,
            "hp": 10,
            "fp": 11,
            "will": 13,
            "per": 15
        },
        "advantages": [
            "Poderes Legais [5]",
            "Respeito Social 1 [5]",
            "Status 2 [10]",
            "Cara de Honesto [1]",
            "Empatia 1 [5]"
        ],
        "disadvantages": [
            "Honestidade (12 ou menos) [-10]",
            "Inimigo (Guilda do Lótus Negro; 6 ou menos) [-10]",
            "Dever (Ao Daimyo/Justiça; 12 ou menos) [-10]",
            "Peculiaridade: Sempre inspeciona as unhas das pessoas [-1]",
            "Peculiaridade: Possui um caderno de anotações meticuloso [-1]"
        ],
        "skills": [
            "Criminologia (IQ/A) - NH: 15 [8]",
            "Interrogatório (IQ/A) - NH: 14 [4]",
            "Observação (Per/A) - NH: 16 [4]",
            "Savoir-Faire (Polícia) (IQ/E) - NH: 14 [2]",
            "Espada Curta (Wakizashi) (DX/M) - NH: 13 [4]",
            "Taihojutsu (Estilo de Prisão) - NH: 13 [2]"
        ],
        "equipment": "   Arma Principal: Jitte (Bastão de Ferro) | Dano: 1d esm | Alcance: 1 | Aparar: 9 |    Arma de Casta: Wakizashi (Fina) | Dano: 1d+1 cort / 1d perf | Alcance: 1 | Aparar: 9 |    Equipamento: Cordas de Prisão | Lanterna de Papel | Selo Oficial de Magistrado |    Armadura: Do de Couro Reforçado | RD: 2 | Peso: 4 kg |    Carga (Slots): 8 / 10 (Carga Nula)",
        "history": "[Espaço para o jogador descrever o crime que nunca conseguiu resolver e por que sua lealdade à lei supera sua lealdade aos homens.]",
        "basicSpeed": 5.75
    },
    {
        "name": "LUTADOR DE SUMÔ (GRAPPLER)",
        "concept": "O colosso. Especialista em imobilização, controle de área e resistência física extrema.",
        "clan": "Kawashi (Reino Dividido)",
        "status": 1,
        "points": 134,
        "attributes": {
            "st": 16,
            "dx": 11,
            "iq": 10,
            "ht": 14,
            "hp": 18,
            "fp": 14,
            "will": 12,
            "per": 10
        },
        "advantages": [
            "Hipoalgia [10]",
            "RD 1 (Gordura/Músculo) [5]",
            "Destemor 2 [4]"
        ],
        "disadvantages": [
            "SM+1 [0]",
            "Excesso de Peso [-10]",
            "Voto (Lutar com Honra/Desarmado) [-10]",
            "Código de Honra (Lutador/Sumô) [-10]",
            "Estigma Social (Grandalhão/Assustador) [-5]",
            "Peculiaridade: Joga sal no chão antes de qualquer esforço [-1]",
            "Peculiaridade: Come o triplo de um homem comum [-1]"
        ],
        "skills": [
            "Sumô (DX/A) - NH: 15 [16]",
            "Luta Livre (DX/A) - NH: 13 [8]",
            "Intimidação (Vont/M) - NH: 14 [8]",
            "Briga (DX/E) - NH: 12 [2]",
            "Primeiros Socorros (IQ/F) - NH: 11 [2]"
        ],
        "equipment": "   Arma Principal: Mãos Nuas (Agarre) | Dano: 1d+1 esm | Alcance: C | Aparar: 10 |    Manobra Especial: Slam (Atropelar) | Dano: 2d esm (Baseado em ST e SM) |    Armadura: Mawashi Cerimonial (Grosso) | RD: 0 | Peso: 1 kg |    Carga (Slots): 1 / 16 (Carga Nula - O limite é a própria força!)",
        "history": "[Espaço para o jogador descrever sua jornada de busca por um oponente que consiga movê-lo de sua base.]",
        "basicSpeed": 6.25
    },
    {
        "name": "LÂMINA GÊMEA (SŌKON)",
        "concept": "Guerreiro vinculado a um parceiro. Compartilha mente e dor, lutando em sincronia perfeita.",
        "clan": "Tsukikage (Sombra da Lua)",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 13,
            "iq": 11,
            "ht": 11,
            "hp": 11,
            "fp": 11,
            "will": 12,
            "per": 12
        },
        "advantages": [
            "Elo Mental (Parceiro) [5]",
            "Rapport Especial (Sōkon - Dor/Mente) [10]",
            "Reflexos em Combate [15]",
            "Empatia com Espíritos [10]",
            "(Nota Mecânica do Sōkon: Se o parceiro morrer, o jogador entra em Fúria/Berserk automática, ganha +2 de ST e Hipoalgia temporária, mas sofre -2 em IQ/Per. Ao fim da luta, perde todos os PF e ganha a desvantagem permanente \"Vozes Fantasmagóricas\")."
        ],
        "disadvantages": [
            "Dever (Ao Parceiro; Inseparável) [-15]",
            "Código de Honra (Bushido) [-15]",
            "Mácula (1-10 pts: Manchado) [-5]",
            "Peculiaridade: Termina as frases do parceiro [-1]",
            "Peculiaridade: Sente frio quando o parceiro está longe [-1]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [8]",
            "Acrobacia (DX/D) - NH: 13 [4]",
            "Savoir-Faire (Dojo) (IQ/E) - NH: 12 [2]",
            "Furtividade (DX/A) - NH: 14 [4]",
            "Técnica Especial: Luta Sincronizada (Ataque Duplo) - NH: 13 [2]"
        ],
        "equipment": "   Arma Principal: Katana | Dano: 1d+2 cort / 1d+1 perf | Alcance: 1 | Aparar: 11 |    Armadura: Kamiko e Luvas de Couro | RD: 1 | Peso: 2 kg |    Carga (Slots): 4 / 11 (Carga Nula)",
        "history": "[Espaço para o jogador descrever o trauma que uniu sua alma à de seu parceiro e o que acontece se o vínculo for quebrado.]",
        "basicSpeed": 6.0
    },
    {
        "name": "PORTADOR DE MALDIÇÃO (HOSPEDEIRO)",
        "concept": "O Tsukimono-Suji. Um humano que aceitou um Yokai no corpo em troca de poder bestial.",
        "clan": "Oni-Bara (Rosa Demoníaca)",
        "status": -2,
        "points": 135,
        "attributes": {
            "st": 12,
            "dx": 14,
            "iq": 9,
            "ht": 12,
            "hp": 14,
            "fp": 12,
            "will": 11,
            "per": 11
        },
        "advantages": [
            "A Besta Interior (Yokai) [20]",
            "Garras (Cortantes) [5]",
            "Visão Noturna 5 [5]",
            "(Nota Mecânica da Besta Interior: Gasta 1 turno. Custa 1 PV e 1 PF por turno ativo. O corpo incha, ganhando +2 em Força de Golpe/Dano e Hipoalgia. O usuário ganha a desvantagem Berserk. Se não houver inimigos, testa Vontade-4 ou ataca aliados)."
        ],
        "disadvantages": [
            "Mácula (Assombrado: 11-20 pts) [-15]",
            "Voz do Outro (Yokai fala através dele) [-10]",
            "Personalidade Dividida (Yokai assume em estresse) [-10]",
            "Peculiaridade: Rosna involuntariamente quando sente medo [-1]",
            "Peculiaridade: Odor de raposa/animal selvagem [-1]"
        ],
        "skills": [
            "Briga (DX/E) - NH: 16 [4]",
            "Furtividade (DX/A) - NH: 15 [4]",
            "Rastreamento (Per/A) - NH: 13 [8]",
            "Intimidação (Vont/M) - NH: 12 [4]",
            "Habilidade Especial (Kegare): Gasta 2 PV para ganhar +4 de ST por 1 minuto."
        ],
        "equipment": "   Arma Principal: Garras/Mãos Nuas | Dano: 1d+1 cort | Alcance: C | Aparar: 11 |    Arma Secundária: Garras/Mãos Nuas (Com Besta Ativa) | Dano: 1d+3 cort | Alcance: C | Aparar: 11 |    Armadura: Trapos e Peles | RD: 1 | Peso: 3 kg |    Carga (Slots): 5 / 12 (Carga Nula)",
        "history": "[Espaço para o jogador descrever o pacto feito com o espírito e qual fome insaciável o Yokai desperta em suas noites de sono.]",
        "basicSpeed": 6.5
    },
    {
        "name": "CAÇADOR DE SOMBRAS (KAGE-GARI)",
        "concept": "O pragmático do oculto. Usa ciência, venenos e rituais para matar o que não pode ser ferido.",
        "clan": "Tsukikage ou Ronin",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 11,
            "dx": 12,
            "iq": 13,
            "ht": 11,
            "hp": 11,
            "fp": 11,
            "will": 13,
            "per": 14
        },
        "advantages": [
            "Propósito Superior (Matar Yokai) [5]",
            "Destemor 2 [4]",
            "Olhos da Verdade (Ver o Invisível - Ki; 2 PF, causa Enxaqueca) [15]",
            "Estômago Forte [1]"
        ],
        "disadvantages": [
            "Paranoia (Oculto) [-10]",
            "Insônia (Pesadelos) [-10]",
            "Dever (Caçador; 12 ou menos) [-10]",
            "Peculiaridade: Carrega sal em todos os bolsos [-1]",
            "Peculiaridade: Murmura orações de proteção o tempo todo [-1]"
        ],
        "skills": [
            "Saber Oculto (Espíritos/Yokai) (IQ/M) - NH: 15 [8]",
            "Armas de Arremesso (Hai-Dama/Bombas) (DX/F) - NH: 14 [4]",
            "Alquimia de Campo (Óleos/Cinzas) (IQ/M) - NH: 12 [1]",
            "Armaria (Oculta - Tratamento de Aço) (IQ/M) - NH: 13 [2]",
            "Fisiologia (Yokai) (IQ/D) - NH: 12 [2]"
        ],
        "equipment": "   Arma Principal: Katana com Óleo de Glicínia | Dano: 1d+2 cort | Alcance: 1 | Aparar: 9 |    Arsenal: 2 Bombas de Cinzas | Bolsa de Sal Puro | Ofudas de Paralisia |    Armadura: Do de Couro e Capa com Símbolos | RD: 2 | Peso: 5 kg |    Carga (Slots): 11 / 11 (Carga Nula)",
        "history": "[Espaço para o jogador descrever qual tragédia pessoal o fez dedicar a vida a caçar deonis e por que ele nunca dorme sem um círculo de sal.]",
        "basicSpeed": 5.75
    }
];
}
