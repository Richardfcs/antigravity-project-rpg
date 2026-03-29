/**
 * ⚔ GERADOR PROCEDURAL DE INIMIGOS — Escudo do Daimyo
 * Integração: Arsenal (weapons-data), Arquétipos (library-data) e Oráculos.
 */

const EnemyGenerator = (function() {

    // --- TABELAS DE NOMES (Surnames + Names) ---
    const SURNAMES = [
        "Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", 
        "Miyamoto", "Shimazu", "Takeda", "Oda", "Hattori", "Uesugi", "Shimada", "Kusunoki", "Mori", "Asakura", 
        "Honda", "Imagawa", "Ishida", "Kuroda", "Maeda", "Nabeshima", "Okubo", "Sanada", "Shibata", "Toyotomi"
    ];
    const NAMES = [
        "Kenji", "Hiroshi", "Takashi", "Akira", "Yuki", "Hideo", "Tadashi", "Shinji", "Katsu", "Aoi", 
        "Sakura", "Ren", "Sora", "Hayato", "Kazuki", "Daisuke", "Nobuo", "Masao", "Tetsuya", "Ryota", 
        "Sho", "Yumi", "Kaori", "Emi", "Keiko", "Nanami", "Mei", "Koharu", "Hinata", "Mitsurugi"
    ];

    // --- CONFIGURAÇÃO DE ATRIBUTOS POR NÍVEL ---
    const THREAT_CONFIG = {
        "civil":       { st: [8, 10],  dx: [9, 10],  iq: [9, 10],  ht: [9, 10],  hpMod: 0 },
        "recruta":     { st: [10, 10], dx: [10, 10], iq: [10, 10], ht: [10, 10], hpMod: 0 },
        "capanga":     { st: [10, 11], dx: [10, 11], iq: [9, 10],  ht: [10, 11], hpMod: 0 },
        "veterano":    { st: [11, 12], dx: [11, 12], iq: [10, 11], ht: [11, 12], hpMod: 2 },
        "elite":       { st: [12, 13], dx: [12, 13], iq: [10, 11], ht: [11, 13], hpMod: 5 },
        "excepcional": { st: [13, 14], dx: [13, 13], iq: [11, 12], ht: [12, 13], hpMod: 8 },
        "mestre":      { st: [14, 16], dx: [14, 15], iq: [12, 14], ht: [13, 15], hpMod: 12 }
    };


    // --- HELPER: Random range ---
    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // --- HELPER: Random item from array ---
    function pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * Gera um inimigo completo baseado no nível de ameaça.
     * Implementa realismo GURPS: Atributos muito altos em uma área tendem a reduzir outras.
     */
    function generate(threatKey = "capanga") {
        const config = THREAT_CONFIG[threatKey] || THREAT_CONFIG.capanga;
        
        // 1. Atributos Base
        let st = rand(config.st[0], config.st[1]);
        let dx = rand(config.dx[0], config.dx[1]);
        let iq = rand(config.iq[0], config.iq[1]);
        let ht = rand(config.ht[0], config.ht[1]);

        // --- REALISMO GURPS: EQUILÍBRIO DE PONTOS ---
        // Se ST e DX forem ambos altos, reduzimos IQ ou HT (Especialista em Combate Físico)
        if (st >= 13 && dx >= 13) {
            if (Math.random() > 0.4) iq = rand(8, 10); 
            if (Math.random() > 0.6) ht = Math.max(10, ht - 1);
        } 
        // Se IQ for alto (Místico/Estrategista), ST tende a ser menor
        else if (iq >= 13) {
            if (Math.random() > 0.5) st = rand(8, 10);
        }
        // Se ST for massivo (Bruto), DX tende a ser menor
        else if (st >= 15) {
            if (Math.random() > 0.5) dx = rand(9, 11);
        }

        const hp = st + (config.hpMod || 0);

        // 2. Identidade
        const name = `${pick(SURNAMES)} ${pick(NAMES)}`;
        
        // 3. Arquétipo
        let archetype = "Combatente";
        if (typeof window.LibraryManager !== 'undefined') {
            const archetypes = window.LibraryManager.getItems().filter(d => d.cat === "Arquétipo");
            if (archetypes.length > 0) archetype = pick(archetypes).nome;
        }

        // 4. Equipamento Inteligente (Arsenal)
        let weapons = [];
        if (typeof weaponsDB !== 'undefined') {
            const pool = weaponsDB.filter(w => parseInt(w.forca) <= st + 2);
            if (pool.length > 0) {
                weapons.push(pick(pool).nome);
                if (Math.random() > 0.7) weapons.push(pick(pool).nome);
            }
        } else {
            weapons = ["Katana"];
        }

        // 5. Oráculo
        const traits = ["Honrado", "Cruel", "Ambicioso", "Leal", "Místico", "Sobrevivente", "Fanático", "Mercenário"];
        const motivations = ["Pela glória do Clã", "Por vingança pessoal", "Por moedas de prata", "Protegendo segredo", "Sob influência de Yokai", "Seguindo o Bushido"];
        const description = `[${archetype}] ${pick(traits)}. Motivo: ${pick(motivations)}.`;

        // 6. Iniciativa Base (GURPS: (DX + HT) / 4)
        const initBase = (dx + ht) / 4;

        // 7. Defesas Ativas (Refinado)
        // Esquiva: floor(Velocidade Básica) + 3
        const esquiva = Math.floor(initBase) + 3;
        
        // Aparar: (Skill/2) + 3. Usamos DX base + bônus de ameaça
        let skillBase = dx;
        if (threatKey === "veterano") skillBase += 1;
        if (threatKey === "elite") skillBase += 2;
        if (threatKey === "mestre") skillBase += 4;
        const aparar = Math.floor(skillBase / 2) + 3;

        // Bloqueio: Ocorre se tiver "Escudo" nas notas ou se for Ashigaru/Samurai
        let bloqueio = 0;
        const hasShield = (Math.random() > 0.8) || (threatKey === "elite") || (threatKey === "mestre");
        if (hasShield) {
            bloqueio = Math.floor(skillBase / 2) + 3;
        }

        return {
            name: `${name} (${threatKey.toUpperCase()})`,
            st, dx, iq, ht,
            vont: iq + (Math.random() > 0.8 ? 1 : 0), // Will baseada em IQ
            hp: hp,
            hpMax: hp,
            pf: ht,
            pfMax: ht,
            iniciativa: initBase,
            velocidade: initBase,
            defesa: esquiva, // Mantido para compatibilidade legado (se usado)
            esquiva: esquiva,
            aparar: aparar,
            bloqueio: bloqueio,
            armas: weapons.join(", "),
            notas: description + (hasShield ? " [Equipado com Escudo]" : ""),
            isNPC: true
        };
    }

    const generatorInstance = { generate };
    window.EnemyGenerator = generatorInstance;
    return generatorInstance;
})();

