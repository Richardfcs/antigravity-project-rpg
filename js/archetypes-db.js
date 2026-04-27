if (typeof archetypesDB === 'undefined') {
    var archetypesDB = [
    {
        "id": "samurai-nobre",
        "name": "SAMURAI NOBRE (LÍDER)",
        "concept": "O rosto diplomático e tático do Clã. Focado em comando e etiqueta.",
        "clan": "Kiku-Hana (Kyoto)",
        "status": 3,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 12, "iq": 13, "ht": 10,
            "hp": 11, "fp": 10, "will": 13, "per": 13
        },
        "advantages": [
            "Status 3 [15]",
            "Reivindicação de Linhagem [5]",
            "Riqueza (Confortável) [10]",
            "Carisma 1 [5]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Código de Honra (Bushido) [-15]",
            "Dever (Ao Daimyo; 12 ou menos) [-10]",
            "Senso de Dever (Clã) [-10]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [12]",
            "Liderança (IQ/M) - NH: 14 [2]",
            "Savoir-Faire (Corte) (IQ/E) - NH: 15 [4]",
            "Diplomacia (IQ/D) - NH: 12 [2]"
        ],
        "equipment": "Arma Principal: Katana de Qualidade Fina | Armadura: Peitoral Lamelar (Samurai) | Peso: 12 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "duelista-iaijutsu",
        "name": "DUELISTA DE IAIJUTSU",
        "concept": "Especialista em velocidade reativa. O combate termina no momento em que a lâmina deixa a bainha.",
        "clan": "Tsuru-Mai (Kansai)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 14, "iq": 10, "ht": 13,
            "hp": 11, "fp": 13, "will": 10, "per": 11
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
            "Dever (Daimyo; 12 ou menos) [-10]"
        ],
        "skills": [
            "Espada de Duas Mãos (DX/A) - NH: 17 [12]",
            "Sacar Rápido (Katana) (DX/E) - NH: 17 [4]",
            "Acrobacia (DX/D) - NH: 14 [4]"
        ],
        "equipment": "Arma Principal: Katana de Qualidade Fina | Armadura: Kamiko | Peso: 1.5 kg",
        "history": "",
        "basicSpeed": 6.75
    },
    {
        "id": "guerreiro-tanque",
        "name": "GUERREIRO DE ARMADURA (TANQUE)",
        "concept": "O baluarte do exército. Treinado para manter a posição e absorver choques.",
        "clan": "Hagane-Ryu (Bizen)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 14, "dx": 12, "iq": 10, "ht": 13,
            "hp": 16, "fp": 13, "will": 12, "per": 10
        },
        "advantages": [
            "Hipoalgia [10]",
            "RD Extra 2 (Ki) [6]",
            "Reflexos em Combate [15]",
            "Postura da Montanha (Perk) [1]"
        ],
        "disadvantages": [
            "Honradez [-10]",
            "Código de Honra (Bushido) [-15]",
            "Dever (Daimyo; 15 ou menos) [-15]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [12]",
            "Lança (Yari) (DX/M) - NH: 14 [8]",
            "Intimidação (Vont/M) - NH: 14 [4]"
        ],
        "equipment": "Arma Principal: Katana | Armadura: O-Yoroi (Conjunto Completo) | Peso: 24 kg",
        "history": "",
        "basicSpeed": 6.25
    },
    {
        "id": "mercador-wako",
        "name": "O MERCADOR-GUERREIRO (WAKO)",
        "concept": "O pragmático rico. Vê a guerra como um negócio e o mar como seu território.",
        "clan": "Uminari (Otsuko)",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 12, "iq": 12, "ht": 11,
            "hp": 11, "fp": 11, "will": 12, "per": 12
        },
        "advantages": [
            "Riqueza (Rico) [20]",
            "Noção do Perigo (Mar) [5]",
            "Treinamento Naval [1]"
        ],
        "disadvantages": [
            "Cobiça [-15]",
            "Inimigo (Piratas) [-5]",
            "Senso de Dever (Tripulação) [-10]"
        ],
        "skills": [
            "Espada de Duas Mãos (Nagamaki) (DX/A) - NH: 14 [8]",
            "Mercador (IQ/M) - NH: 13 [4]",
            "Navegação (IQ/M) - NH: 12 [2]"
        ],
        "equipment": "Arma Principal: Nagamaki | Armadura: Colete de Couro | Peso: 5 kg",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "id": "arqueiro-montado",
        "name": "ARQUEIRO MONTADO (YABUSAME)",
        "concept": "Atirador de elite com alta mobilidade.",
        "clan": "Inazuma (Kanto)",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 14, "iq": 10, "ht": 12,
            "hp": 11, "fp": 12, "will": 10, "per": 13
        },
        "advantages": [
            "Visão Aguçada 2 [4]",
            "Aliado (Cavalo) [10]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Dever (Daimyo) [-10]",
            "Código de Honra (Bushido) [-15]"
        ],
        "skills": [
            "Arco (DX/D) - NH: 16 [12]",
            "Cavalgar (DX/A) - NH: 15 [4]"
        ],
        "equipment": "Arma Principal: Yumi (Arco Longo) | Arma Secundária: Katana | Armadura: Do de Couro | Peso: 5 kg",
        "history": "",
        "basicSpeed": 6.5
    },
    {
        "id": "guerreira-naginata",
        "name": "GUERREIRA DE NAGINATA (ONNA-BUGEISHA)",
        "concept": "Especialista em manter a distância e defender o lar.",
        "clan": "Tsuru-Mai",
        "status": 2,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 13, "iq": 12, "ht": 10,
            "hp": 11, "fp": 10, "will": 12, "per": 12
        },
        "advantages": [
            "Defesa Ampliada (Aparar) [5]",
            "Equilíbrio Perfeito [15]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Senso de Dever (Família) [-10]",
            "Código de Honra (Bushido) [-15]"
        ],
        "skills": [
            "Arma de Haste (Naginata) (DX/M) - NH: 16 [12]",
            "Primeiros Socorros (IQ/F) - NH: 14 [4]"
        ],
        "equipment": "Arma Principal: Naginata | Armadura: Kamiko | Peso: 3.5 kg",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "id": "campones-rebelde",
        "name": "CAMPONÊS REBELDE (RONIN DE ENXADA)",
        "concept": "O trabalhador que cansou de ser oprimido e pegou em armas.",
        "clan": "Nenhum",
        "status": 0,
        "points": 100,
        "attributes": {
            "st": 12, "dx": 11, "iq": 10, "ht": 11,
            "hp": 12, "fp": 11, "will": 10, "per": 10
        },
        "advantages": [
            "Duro de Matar 1 [2]"
        ],
        "disadvantages": [
            "Estigma Social (Camponês) [-5]",
            "Pobreza (Pobretão) [-10]"
        ],
        "skills": [
            "Machado/Maça (DX/M) - NH: 12 [8]",
            "Briga (DX/E) - NH: 11 [2]"
        ],
        "equipment": "Arma Principal: Masakari (Machado) | Armadura: Kamiko | Peso: 3.5 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "ronin-errante",
        "name": "RONIN ERRANTE (ESPADA DE ALUGUEL)",
        "concept": "Sobrevivente endurecido. Sem mestre, sem honra oficial.",
        "clan": "Nenhum",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 12, "dx": 13, "iq": 10, "ht": 12,
            "hp": 12, "fp": 12, "will": 11, "per": 12
        },
        "advantages": [
            "Reflexos em Combate [15]",
            "Noção do Perigo [15]"
        ],
        "disadvantages": [
            "Estigma Social (Ronin) [-5]",
            "Pobreza (Pobretão) [-10]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [12]",
            "Briga (DX/E) - NH: 15 [4]"
        ],
        "equipment": "Arma Principal: Katana | Armadura: Do de Couro | Peso: 5.5 kg",
        "history": "",
        "basicSpeed": 6.25
    },
    {
        "id": "ninja-sombras",
        "name": "NINJA DO CLÃ DAS SOMBRAS",
        "concept": "Infiltrador e assassino silencioso.",
        "clan": "Tsukikage",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 10, "dx": 14, "iq": 11, "ht": 11,
            "hp": 10, "fp": 11, "will": 11, "per": 13
        },
        "advantages": [
            "Visão Noturna 5 [5]",
            "Flexibilidade [5]",
            "Silêncio 1 [5]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Dever (Extremo) [-15]",
            "Identidade Secreta [-15]"
        ],
        "skills": [
            "Furtividade (DX/A) - NH: 16 [4]",
            "Kusarigamajutsu (DX/D) - NH: 15 [8]",
            "Escalada (DX/A) - NH: 15 [2]"
        ],
        "equipment": "Arma Principal: Kusarigama | Arsenal: 2 Bombas de Fumaça | Armadura: Traje de Ninja | Peso: 3 kg",
        "history": "",
        "basicSpeed": 6.25
    },
    {
        "id": "monge-guerreiro",
        "name": "MONGE GUERREIRO (SOHEI)",
        "concept": "Defensor fanático de seu templo.",
        "clan": "Hiei-Zan",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 13, "dx": 11, "iq": 11, "ht": 13,
            "hp": 13, "fp": 13, "will": 14, "per": 11
        },
        "advantages": [
            "Inabalável [5]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Fanatismo [-15]",
            "Voto [-10]"
        ],
        "skills": [
            "Arma de Haste (Naginata) (DX/M) - NH: 14 [12]",
            "Teologia (Budismo) (IQ/D) - NH: 12 [8]"
        ],
        "equipment": "Arma Principal: Naginata | Armadura: Kesa (Manto Sagrado) | Peso: 3.5 kg",
        "history": "",
        "basicSpeed": 6.0
    },
    {
        "id": "ninja-sombra",
        "name": "NINJA DE INFILTRAÇÃO (SOMBRA)",
        "concept": "O espião invisível.",
        "clan": "Kuro-Neko",
        "status": -3,
        "points": 135,
        "attributes": {
            "st": 10, "dx": 15, "iq": 12, "ht": 10,
            "hp": 10, "fp": 10, "will": 12, "per": 14
        },
        "advantages": [
            "Reflexos em Combate [15]",
            "Visão Noturna 5 [5]",
            "Silêncio 2 [10]",
            "Flexibilidade [5]"
        ],
        "disadvantages": [
            "Dever (Extremo) [-12]",
            "Identidade Secreta [-15]"
        ],
        "skills": [
            "Furtividade (DX/A) - NH: 18 [8]",
            "Escalada (DX/A) - NH: 16 [2]"
        ],
        "equipment": "Arma Principal: Tanto | Armadura: Traje de Ninja | Peso: 3 kg",
        "history": "",
        "basicSpeed": 6.25
    },
    {
        "id": "assassino-shinobi",
        "name": "ASSASSINO VENENOSO (SHINOBI)",
        "concept": "O executor silencioso. Especialista em toxinas.",
        "clan": "Akai-Hasu",
        "status": -3,
        "points": 135,
        "attributes": {
            "st": 10, "dx": 13, "iq": 13, "ht": 10,
            "hp": 10, "fp": 10, "will": 13, "per": 13
        },
        "advantages": [
            "Resistência a Veneno [5]",
            "Olhar do Anatomista [1]"
        ],
        "disadvantages": [
            "Sanguinolência [-10]",
            "Segredo [-20]"
        ],
        "skills": [
            "Venenos (IQ/D) - NH: 15 [8]",
            "Zarabatana (DX/E) - NH: 15 [4]"
        ],
        "equipment": "Arma Principal: Tanto | Arma Secundária: Zarabatana | Armadura: Traje de Ninja | Peso: 3 kg",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "id": "espia-gueixa",
        "name": "ESPIÃ SOCIAL (GUEIXA)",
        "concept": "A mestre da manipulação.",
        "clan": "Kagami",
        "status": -1,
        "points": 135,
        "attributes": {
            "st": 9, "dx": 12, "iq": 14, "ht": 10,
            "hp": 9, "fp": 10, "will": 14, "per": 14
        },
        "advantages": [
            "Carisma 1 [5]",
            "Voz Melodiosa [10]",
            "Aparência (Bela) [12]"
        ],
        "disadvantages": [
            "Segredo (Espiã) [-20]",
            "Dever [-10]"
        ],
        "skills": [
            "Atuação (IQ/M) - NH: 15 [4]",
            "Lábia (IQ/M) - NH: 16 [4]"
        ],
        "equipment": "Arma Principal: Leque de Guerra (Tessen) | Armadura: Kimono de Seda | Peso: 1 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "ninja-sabotador",
        "name": "NINJA SABOTADOR (ENGENHEIRO)",
        "concept": "O mestre do caos estrutural.",
        "clan": "Tsuchigumo",
        "status": -3,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 12, "iq": 14, "ht": 10,
            "hp": 11, "fp": 10, "will": 14, "per": 14
        },
        "advantages": [
            "Artífice 1 [10]",
            "Versátil [5]"
        ],
        "disadvantages": [
            "Curiosidade [-5]",
            "Obsessão [-5]"
        ],
        "skills": [
            "Armadilhas (IQ/M) - NH: 16 [4]",
            "Explosivos (IQ/M) - NH: 15 [4]"
        ],
        "equipment": "Arma Principal: Kusarigama | Armadura: Traje de Ninja | Peso: 4 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "monge-sohei-sagrado",
        "name": "MONGE SOHEI (GUERREIRO SAGRADO)",
        "concept": "Protetor de templos que mescla disciplina marcial com fúria religiosa.",
        "clan": "Yamabiko",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 14, "dx": 11, "iq": 11, "ht": 13,
            "hp": 14, "fp": 13, "will": 13, "per": 11
        },
        "advantages": [
            "Fé Verdadeira [12]",
            "Destemor 2 [4]"
        ],
        "disadvantages": [
            "Intolerância [-10]",
            "Dever [-10]"
        ],
        "skills": [
            "Arma de Haste (Naginata) (DX/M) - NH: 15 [16]",
            "Exorcismo (Vont/D) - NH: 14 [8]"
        ],
        "equipment": "Arma Principal: Naginata | Armadura: Armadura de Ashigaru | Peso: 8 kg",
        "history": "",
        "basicSpeed": 6.0
    },
    {
        "id": "yamabushi-asceta",
        "name": "YAMABUSHI (ASCETA DA MONTANHA)",
        "concept": "Eremita que domina o Ki.",
        "clan": "Nenhum",
        "status": -1,
        "points": 135,
        "attributes": {
            "st": 12, "dx": 12, "iq": 11, "ht": 14,
            "hp": 12, "fp": 14, "will": 15, "per": 11
        },
        "advantages": [
            "Golpe Poderoso [8]",
            "Hipoalgia [10]"
        ],
        "disadvantages": [
            "Solitário [-5]",
            "Estigma Social [-5]"
        ],
        "skills": [
            "Meditação (Vont/D) - NH: 15 [4]",
            "Bastão (Bo) (DX/M) - NH: 14 [8]"
        ],
        "equipment": "Arma Principal: Bastão (Bo) | Armadura: Roupas de Asceta | Peso: 1 kg",
        "history": "",
        "basicSpeed": 6.5
    },
    {
        "id": "miko-purificadora",
        "name": "MIKO / VIDENTE (PURIFICADORA)",
        "concept": "Sensitiva que detecta o invisível.",
        "clan": "Izumo",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 9, "dx": 10, "iq": 13, "ht": 11,
            "hp": 9, "fp": 11, "will": 14, "per": 14
        },
        "advantages": [
            "Detectar Espíritos [10]",
            "Empatia com Espíritos [10]"
        ],
        "disadvantages": [
            "Voto [-10]",
            "Senso de Dever [-15]"
        ],
        "skills": [
            "Exorcismo (Vont/D) - NH: 15 [8]",
            "Saber Oculto (IQ/M) - NH: 15 [8]"
        ],
        "equipment": "Arma Principal: Ofuda (Selos Sagrados) | Armadura: Kimono de Miko | Peso: 1.5 kg",
        "history": "",
        "basicSpeed": 5.25
    },
    {
        "id": "monge-mendicante",
        "name": "MONGE MENDICANTE (KOMUSO)",
        "concept": "Viajante que usa a flauta Shakuhachi como ferramenta de meditação.",
        "clan": "Sita-No-Me",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 10, "dx": 12, "iq": 13, "ht": 11,
            "hp": 10, "fp": 11, "will": 13, "per": 13
        },
        "advantages": [
            "Audição Aguçada 3 [6]",
            "Equilíbrio Perfeito [15]",
            "Noção do Perigo [15]"
        ],
        "disadvantages": [
            "Voto [-5]",
            "Pobreza [-10]"
        ],
        "skills": [
            "Flauta Shakuhachi (IQ/D) - NH: 14 [4]",
            "Bastão (DX/M) - NH: 14 [8]"
        ],
        "equipment": "Arma Principal: Flauta Shakuhachi (Bastão Curto) | Armadura: Manto de Viagem | Peso: 2 kg",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "id": "onibi-amaldicoado",
        "name": "ONIBI-NO-KO (PORTADOR DA MALDIÇÃO)",
        "concept": "Alguém que sobreviveu ao toque de um Yokai.",
        "clan": "Nenhum",
        "status": -2,
        "points": 135,
        "attributes": {
            "st": 13, "dx": 12, "iq": 10, "ht": 13,
            "hp": 13, "fp": 13, "will": 12, "per": 10
        },
        "advantages": [
            "Regeneração [10]",
            "RD Extra 1 [3]",
            "Ataque Natural [15]"
        ],
        "disadvantages": [
            "Aparência (Monstruosa) [-20]",
            "Fome Insaciável [-10]"
        ],
        "skills": [
            "Briga (DX/E) - NH: 16 [12]",
            "Intimidação (Vont/M) - NH: 14 [8]"
        ],
        "equipment": "Arma Principal: Garras Naturais | Armadura: Trapos Reforçados | Peso: 2 kg",
        "history": "",
        "basicSpeed": 6.5
    },
    {
        "id": "cacador-sombras",
        "name": "CAÇADOR DE SOMBRAS (KAGE-GARI)",
        "concept": "O pragmático do oculto.",
        "clan": "Tsukikage",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 12, "iq": 13, "ht": 11,
            "hp": 11, "fp": 11, "will": 13, "per": 14
        },
        "advantages": [
            "Propósito Superior [5]",
            "Olhos da Verdade [15]"
        ],
        "disadvantages": [
            "Paranoia [-10]",
            "Insônia [-10]"
        ],
        "skills": [
            "Saber Oculto (IQ/M) - NH: 15 [8]",
            "Armas de Arremesso (DX/F) - NH: 14 [4]"
        ],
        "equipment": "Arma Principal: Katana | Arsenal: Bombas de Cinzas | Armadura: Do de Couro | Peso: 5 kg",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "id": "mestre-duelista-lenda",
        "name": "MESTRE DUELISTA (LENDA)",
        "concept": "O auge da esgrima japonesa.",
        "clan": "Qualquer",
        "status": 3,
        "points": 200,
        "attributes": {
            "st": 12, "dx": 15, "iq": 12, "ht": 14,
            "hp": 13, "fp": 14, "will": 15, "per": 14
        },
        "advantages": [
            "Reflexos em Combate [15]",
            "Hipoalgia [10]",
            "Defesa Ampliada [5]",
            "Ataque Ampliado [25]",
            "Boa Forma [5]"
        ],
        "disadvantages": [
            "Código de Honra (Bushido) [-15]",
            "Dever [-15]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 20 [24]",
            "Iaijutsu (DX/D) - NH: 18 [12]"
        ],
        "equipment": "Arma Principal: Katana de Qualidade Muito Fina | Armadura: Tosei-Gusoku | Peso: 18 kg",
        "history": "",
        "basicSpeed": 7.25
    },
    {
        "id": "civil-comum-campones",
        "name": "CIVIL COMUM (CAMPONÊS)",
        "concept": "Um cidadão trabalhador.",
        "clan": "Nenhum",
        "status": 0,
        "points": 75,
        "attributes": {
            "st": 10, "dx": 10, "iq": 10, "ht": 10,
            "hp": 10, "fp": 10, "will": 10, "per": 10
        },
        "advantages": [
            "Senso Comum [5]"
        ],
        "disadvantages": [
            "Pobreza (Pobre) [-15]",
            "Estigma Social [-5]"
        ],
        "skills": [
            "Agricultura (IQ/M) - NH: 12 [8]"
        ],
        "equipment": "Roupas Comuns",
        "history": "",
        "basicSpeed": 5.0
    },
    {
        "id": "ashigaru-soldado-raso",
        "name": "ASHIGARU (SOLDADO RASO)",
        "concept": "Infantaria básica.",
        "clan": "Qualquer",
        "status": 0,
        "points": 100,
        "attributes": {
            "st": 11, "dx": 11, "iq": 10, "ht": 11,
            "hp": 11, "fp": 11, "will": 10, "per": 11
        },
        "advantages": [
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Dever [-15]"
        ],
        "skills": [
            "Lança (Yari) (DX/M) - NH: 13 [8]",
            "Briga (DX/E) - NH: 12 [2]"
        ],
        "equipment": "Arma Principal: Yari | Armadura: Jingasa e Do de Couro | Peso: 5 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "ronin-yojimbo",
        "name": "RONIN VAGABUNDO (YOJIMBO)",
        "concept": "Guerreiro sem mestre que vende sua lâmina.",
        "clan": "Nenhum",
        "status": -2,
        "points": 135,
        "attributes": {
            "st": 12, "dx": 13, "iq": 11, "ht": 12,
            "hp": 12, "fp": 12, "will": 11, "per": 12
        },
        "advantages": [
            "Reflexos em Combate [15]",
            "Duro de Matar 2 [4]"
        ],
        "disadvantages": [
            "Estigma Social [-10]",
            "Pobreza [-10]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [8]",
            "Intimidação (Vont/M) - NH: 13 [4]"
        ],
        "equipment": "Arma Principal: Katana Barata | Armadura: Do de Couro | Peso: 4 kg",
        "history": "",
        "basicSpeed": 6.25
    },
    {
        "id": "medico-cirurgiao",
        "name": "MÉDICO DE CAMPO (CIRURGIÃO)",
        "concept": "O suporte vital do grupo.",
        "clan": "Shiro-Hebi",
        "status": 0,
        "points": 135,
        "attributes": {
            "st": 10, "dx": 12, "iq": 14, "ht": 10,
            "hp": 10, "fp": 10, "will": 14, "per": 14
        },
        "advantages": [
            "Empatia 1 [5]",
            "Voz Melodiosa [10]"
        ],
        "disadvantages": [
            "Pacifismo [-5]",
            "Senso de Dever [-10]"
        ],
        "skills": [
            "Primeiros Socorros (IQ/F) - NH: 17 [4]",
            "Cirurgia (IQ/D) - NH: 15 [8]"
        ],
        "equipment": "Arma Principal: Tanto | Arsenal: Kit Cirúrgico | Armadura: Roupas de Viagem | Peso: 2 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "ferreiro-artesao",
        "name": "FERREIRO DE ALMAS (ARTESÃO)",
        "concept": "Criador de aço lendário.",
        "clan": "Iwabito",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 13, "dx": 11, "iq": 13, "ht": 11,
            "hp": 13, "fp": 11, "will": 13, "per": 13
        },
        "advantages": [
            "Artífice 2 [20]",
            "Riqueza (Confortável) [10]"
        ],
        "disadvantages": [
            "Teimosia [-5]",
            "Cobiça [-15]"
        ],
        "skills": [
            "Armaria (IQ/M) - NH: 17 [4]",
            "Ferreiro (IQ/M) - NH: 17 [4]"
        ],
        "equipment": "Arma Principal: Martelo de Forja | Arsenal: Kit de Reparos | Armadura: Avental de Couro | Peso: 3 kg",
        "history": "",
        "basicSpeed": 5.5
    },
    {
        "id": "magistrado-detetive",
        "name": "MAGISTRADO INVESTIGADOR (DETETIVE)",
        "concept": "O oficial da lei.",
        "clan": "Settsu",
        "status": 2,
        "points": 134,
        "attributes": {
            "st": 10, "dx": 12, "iq": 13, "ht": 11,
            "hp": 10, "fp": 11, "will": 13, "per": 15
        },
        "advantages": [
            "Poderes Legais [5]",
            "Status 2 [10]",
            "Empatia 1 [5]"
        ],
        "disadvantages": [
            "Honestidade [-10]",
            "Dever [-10]"
        ],
        "skills": [
            "Criminologia (IQ/A) - NH: 15 [8]",
            "Interrogatório (IQ/A) - NH: 14 [4]",
            "Observação (Per/A) - NH: 16 [4]"
        ],
        "equipment": "Arma Principal: Jitte | Arma Secundária: Wakizashi de Qualidade Fina | Armadura: Do de Couro | Peso: 4 kg",
        "history": "",
        "basicSpeed": 5.75
    },
    {
        "id": "lutador-sumo",
        "name": "LUTADOR DE SUMÔ (GRAPPLER)",
        "concept": "O colosso.",
        "clan": "Kawashi",
        "status": 1,
        "points": 134,
        "attributes": {
            "st": 16, "dx": 11, "iq": 10, "ht": 14,
            "hp": 18, "fp": 14, "will": 12, "per": 10
        },
        "advantages": [
            "Hipoalgia [10]",
            "RD Extra 1 [5]",
            "Destemor 2 [4]"
        ],
        "disadvantages": [
            "Excesso de Peso [-10]",
            "Código de Honra [-10]"
        ],
        "skills": [
            "Sumô (DX/A) - NH: 15 [16]",
            "Luta Livre (DX/A) - NH: 13 [8]"
        ],
        "equipment": "Arma Principal: Mãos Nuas | Armadura: Mawashi | Peso: 1 kg",
        "history": "",
        "basicSpeed": 6.25
    },
    {
        "id": "lamina-gemea",
        "name": "LÂMINA GÊMEA (SŌKON)",
        "concept": "Guerreiro vinculado a um parceiro.",
        "clan": "Tsukikage",
        "status": 1,
        "points": 135,
        "attributes": {
            "st": 11, "dx": 13, "iq": 11, "ht": 11,
            "hp": 11, "fp": 11, "will": 12, "per": 12
        },
        "advantages": [
            "Elo Mental [5]",
            "Rapport Especial [10]",
            "Reflexos em Combate [15]"
        ],
        "disadvantages": [
            "Dever (Inseparável) [-15]",
            "Código de Honra (Bushido) [-15]"
        ],
        "skills": [
            "Espada de Lâmina Larga (DX/M) - NH: 15 [8]",
            "Acrobacia (DX/D) - NH: 13 [4]"
        ],
        "equipment": "Arma Principal: Katana | Armadura: Kamiko | Peso: 2 kg",
        "history": "",
        "basicSpeed": 6.0
    }
];
}
if (typeof module !== 'undefined') {
    module.exports = archetypesDB;
}