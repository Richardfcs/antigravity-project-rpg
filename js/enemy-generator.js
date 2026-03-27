/**
 * ⚔ GERADOR PROCEDURAL DE INIMIGOS — Escudo do Daimyo
 * Integração: Arsenal (weapons-data), Arquétipos (library-data) e Oráculos.
 */

const EnemyGenerator = (function() {

    // --- TABELAS DE NOMES (Surnames + Names) ---
    const SURNAMES = ["Sato", "Suzuki", "Takahashi", "Tanaka", "Watanabe", "Ito", "Yamamoto", "Nakamura", "Kobayashi", "Kato", "Miyamoto", "Shimazu", "Takeda", "Oda", "Hattori", "Uesugi"];
    const NAMES = ["Kenji", "Hiroshi", "Takashi", "Akira", "Yuki", "Hideo", "Tadashi", "Shinji", "Katsu", "Aoi", "Sakura", "Ren", "Sora", "Hayato", "Kazuki", "Daisuke"];

    // --- CONFIGURAÇÃO DE ATRIBUTOS POR NÍVEL ---
    const THREAT_CONFIG = {
        "capanga": { st: [9, 11], dx: [10, 11], iq: [9, 10], ht: [10, 11], hpMod: 0 },
        "elite":   { st: [12, 14], dx: [12, 13], iq: [10, 11], ht: [11, 13], hpMod: 5 },
        "mestre":  { st: [14, 18], dx: [14, 16], iq: [12, 14], ht: [13, 15], hpMod: 15 }
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
     */
    function generate(threatKey = "capanga") {
        const config = THREAT_CONFIG[threatKey] || THREAT_CONFIG.capanga;
        
        // 1. Atributos
        const st = rand(config.st[0], config.st[1]);
        const dx = rand(config.dx[0], config.dx[1]);
        const iq = rand(config.iq[0], config.iq[1]);
        const ht = rand(config.ht[0], config.ht[1]);
        const hp = st + (config.hpMod || 0);

        // 2. Identidade
        const name = `${pick(SURNAMES)} ${pick(NAMES)}`;
        
        // 3. Arquétipo (Apenas para base visual/descritiva)
        let archetype = "Combatente";
        if (typeof libraryData !== 'undefined') {
            const archetypes = libraryData.filter(d => d.cat === "Arquétipo");
            if (archetypes.length > 0) archetype = pick(archetypes).nome;
        }

        // 4. Equipamento Inteligente (Arsenal)
        let weapons = [];
        if (typeof weaponsDB !== 'undefined') {
            // Sorteia 1-2 armas
            const pool = weaponsDB.filter(w => parseInt(w.forca) <= st + 2);
            if (pool.length > 0) {
                weapons.push(pick(pool).nome);
                if (Math.random() > 0.7) weapons.push(pick(pool).nome);
            }
        } else {
            weapons = ["Katana"];
        }

        // 5. Oráculo (Personalidade e Motivação)
        // Simulando tabelas do Oráculo se não houver objeto global
        const traits = ["Honrado", "Cruel", "Ambicioso", "Leal", "Místico", "Sobrevivente", "Fanático", "Mercenário"];
        const motivations = ["Pela glória do Clã", "Por vingança pessoal", "Por moedas de prata", "Protegendo segredo", "Sob influência de Yokai", "Seguindo o Bushido"];
        
        const description = `[${archetype}] ${pick(traits)}. Motivo: ${pick(motivations)}.`;

        // 6. Iniciativa Base (GURPS: (DX + HT) / 4)
        const initBase = (dx + ht) / 4;

        return {
            name: `${name} (${threatKey.toUpperCase()})`,
            st, dx, iq, ht,
            hp: hp,
            hpMax: hp,
            pf: ht,
            pfMax: ht,
            iniciativa: initBase,
            velocidade: initBase,
            defesa: Math.floor(initBase) + 3, // Esquiva base
            armas: weapons.join(", "),
            notas: description,
            isNPC: true
        };
    }

    return {
        generate
    };


    window.EnemyGenerator = EnemyGenerator;
})();
