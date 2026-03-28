/**
 * 📚 DIRETÓRIO TÉCNICO & BIBLIOTECA — Escudo do Daimyo
 * Gerencia persistência local, categorias customizadas e tags.
 */

const LibraryManager = (function() {
    const STORAGE_KEY = 'daimyo_library_data';
    const CAT_STORAGE_KEY = 'daimyo_library_categories';

    const defaultCategories = [
        { id: 'cat_van', name: 'Vantagem', icon: '🌟', tags: ['Poder', 'Social', 'Mental', 'Combate'], order: 0 },
        { id: 'cat_des', name: 'Desvantagem', icon: '⛓️', tags: ['Física', 'Social', 'Mental', 'Defeito'], order: 1 },
        { id: 'cat_qua', name: 'Qualidade', icon: '🎭', tags: ['Estilo', 'Efeito', 'Social'], order: 2 },
        { id: 'cat_pec', name: 'Peculiaridade', icon: '🔹', tags: ['Hábito', 'Crença', 'Visual'], order: 3 },
        { id: 'cat_per', name: 'Perícia', icon: '🥋', tags: ['DX', 'IQ', 'HT', 'Vont', 'Per'], order: 4 },
        { id: 'cat_bud', name: 'Budo', icon: '⚔️', tags: ['Kenjutsu', 'Arquearia', 'Desarmado'], order: 5 },
        { id: 'cat_arq', name: 'Arquétipo', icon: '👥', tags: ['Nobre', 'Ronin', 'Místico', 'Ninja'], order: 6 },
        { id: 'cat_yok', name: 'Yokai', icon: '👻', tags: ['Espírito', 'Fisíco', 'Terror', 'Calamidade'], order: 7 },
        { id: 'cat_alq', name: 'Alquimia', icon: '🧪', tags: ['Veneno', 'Poção', 'Explosivo'], order: 8 },
        { id: 'cat_atl', name: 'Atlas', icon: '🗺️', tags: ['Província', 'Cidade', 'Santuário'], order: 9 },
        { id: 'cat_reg', name: 'Regra', icon: '📜', tags: ['Mecânica', 'Cultura', 'Lore'], order: 10 }
    ];

    const initialData = [
        // --- VANTAGENS ---
        { id: 'lib_v1', nome: "Reflexos em Combate", cat: "Vantagem", cust: "15 pts", desc: "+1 em todas as Defesas Ativas; +2 em testes de Pânico; nunca fica paralisado por surpresa.", tags: ["Combate"] },
        { id: 'lib_v2', nome: "Hipoalgia", cat: "Vantagem", cust: "10 pts", desc: "Ignora penalidades de choque por dano e recebe +3 em testes para resistir à dor ou tortura.", tags: ["Física", "Combate"] },
        { id: 'lib_v3', nome: "Sorte", cat: "Vantagem", cust: "15 pts", desc: "Role novamente um teste a cada 1 hora de jogo real. Fica com o melhor resultado.", tags: ["Mental"] },
        { id: 'lib_v4', nome: "Ambidestria", cat: "Vantagem", cust: "5 pts", desc: "Elimina a penalidade de -4 por usar a mão inábil em combate.", tags: ["Combate"] },
        { id: 'lib_v5', nome: "Boa Forma (Fit)", cat: "Vantagem", cust: "5 pts", desc: "Recupera Fadiga (PF) duas vezes mais rápido. +1 em testes de HT.", tags: ["Física"] },
        { id: 'lib_v6', nome: "Carisma 1", cat: "Vantagem", cust: "5 pts", desc: "+1 em testes de Reação e em perícias como Liderança ou Oratória.", tags: ["Social"] },
        { id: 'lib_v7', nome: "Noção do Perigo", cat: "Vantagem", cust: "15 pts", desc: "O mestre rola em segredo se você estiver prestes a ser emboscado.", tags: ["Mental"] },
        { id: 'lib_v8', nome: "Equilíbrio Perfeito", cat: "Vantagem", cust: "15 pts", desc: "+1 em Acrobacia e Escalada. Pode lutar em superfícies estreitas sem testes.", tags: ["Física"] },
        { id: 'lib_v9', nome: "Duro de Matar 2", cat: "Vantagem", cust: "4 pts", desc: "+2 em testes de HT para não morrer quando abaixo de 0 PV.", tags: ["Física"] },
        { id: 'lib_v10', nome: "Empatia 1", cat: "Vantagem", cust: "5 pts", desc: "Sente as emoções de NPCs. Bônus em Primeiros Socorros e Diplomacia.", tags: ["Mental"] },

        // --- DESVANTAGENS ---
        { id: 'lib_d1', nome: "Código de Honra (Bushido)", cat: "Desvantagem", cust: "-15 pts", desc: "Lealdade, coragem e cortesia absoluta. Desonra exige reparação (Seppuku).", tags: ["Social", "Mental"] },
        { id: 'lib_d2', nome: "Excesso de Confiança", cat: "Desvantagem", cust: "-5 pts", desc: "Subestima oponentes e acredita que pode vencer qualquer desafio.", tags: ["Mental"] },
        { id: 'lib_d3', nome: "Dever (Daimyo)", cat: "Desvantagem", cust: "-10 a -20 pts", desc: "Obrigação militar e política compulsória com seu senhor feudal.", tags: ["Social"] },
        { id: 'lib_d4', nome: "Estigma Social (Ronin)", cat: "Desvantagem", cust: "-10 pts", desc: "Visto com desconfiança por não ter um mestre. -2 em reações de nobres.", tags: ["Social"] },
        { id: 'lib_d5', nome: "Sanguinolência", cat: "Desvantagem", cust: "-10 pts", desc: "Desejo de matar inimigos em vez de apenas derrotá-los.", tags: ["Mental"] },
        { id: 'lib_d6', nome: "Honestidade", cat: "Desvantagem", cust: "-10 pts", desc: "Obedece às leis fielmente. Tem dificuldade em mentir ou trapacear.", tags: ["Mental"] },
        { id: 'lib_d7', nome: "Fúria (Bad Temper)", cat: "Desvantagem", cust: "-10 pts", desc: "Perde o controle com insultos. Teste de Vontade para não explodir.", tags: ["Mental"] },

        // --- PERÍCIAS ---
        { id: 'lib_p1', nome: "Espada de Lâmina Larga", cat: "Perícia", cust: "DX/A", desc: "Uso de Katana ou Ninjato com uma mão.", tags: ["Combate", "Bushi"] },
        { id: 'lib_p2', nome: "Espada de Duas Mãos", cat: "Perícia", cust: "DX/A", desc: "Uso de Katana ou Nodachi com as duas mãos.", tags: ["Combate", "Bushi"] },
        { id: 'lib_p3', nome: "Arco (Yumi)", cat: "Perícia", cust: "DX/D", desc: "Uso do arco longo japonês. Exige força mínima (ST).", tags: ["Combate", "À Distância"] },
        { id: 'lib_p4', nome: "Furtividade", cat: "Perícia", cust: "DX/A", desc: "Mover-se em silêncio e esconder-se nas sombras.", tags: ["Infiltração", "Ninja"] },
        { id: 'lib_p5', nome: "Acrobacia", cat: "Perícia", cust: "DX/D", desc: "Pular, cair com segurança e esquivar-se acrobaticamente.", tags: ["Física", "Ninja"] },
        { id: 'lib_p6', nome: "Venenos", cat: "Perícia", cust: "IQ/D", desc: "Preparação, aplicação e identificação de toxinas letais.", tags: ["Infiltração", "Alquimia"] },
        { id: 'lib_p7', nome: "Primeiros Socorros", cat: "Perícia", cust: "IQ/F", desc: "Estancar hemorragias e tratar ferimentos leves no campo.", tags: ["Médico"] },

        // --- ARQUÉTIPOS ---
        { id: 'lib_a1', nome: "Samurai Nobre", cat: "Arquétipo", cust: "Elite", desc: "Focado em tática, comando e honra. Mestre da Katana e Diplomacia.", tags: ["Nobre", "Bushi"] },
        { id: 'lib_a2', nome: "Duelista de Iaijutsu", cat: "Arquétipo", cust: "Elite", desc: "Mestre do saque rápido. O combate termina em um único movimento.", tags: ["Bushi", "Rápido"] },
        { id: 'lib_a3', nome: "Ninja de Infiltração", cat: "Arquétipo", cust: "Sombra", desc: "Invisível e letal. Mestre em arrombamento e espionagem.", tags: ["Ninja", "Sombra"] },
        { id: 'lib_a4', nome: "Monge Sohei", cat: "Arquétipo", cust: "Forte", desc: "Guerreiro santificado com fúria religiosa. Mestre da Naginata.", tags: ["Templo", "Budo"] },

        // --- REGRAS ---
        { id: 'lib_r1', nome: "Relógio da Mácula", cat: "Regra", cust: "Mecânica", desc: "Mede a corrupção espiritual. Afeta Testes de Pânico e Reação.", tags: ["Sistema", "Mecânica"] },
        { id: 'lib_r2', nome: "Sangramento em GURPS", cat: "Regra", cust: "Letal", desc: "Ferimentos graves exigem teste de HT a cada minuto para não perder PV.", tags: ["Sistema", "Combate"] },
        { id: 'lib_r3', nome: "Exaustão (PF para PV)", cat: "Regra", cust: "Sobrevivência", desc: "Quando o PF chega a 0, cada ponto gasto consome 1 PV diretamente.", tags: ["Sistema", "Física"] }
    ];

    let data = [];
    let categories = [];

    function init() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        const savedCats = localStorage.getItem(CAT_STORAGE_KEY);

        if (savedCats) {
            categories = JSON.parse(savedCats);
        } else {
            categories = defaultCategories;
            saveCategories();
        }

        if (savedData) {
            data = JSON.parse(savedData);
        } else {
            // Se houver libraryData global (o antigo), migrar ele
            if (window.libraryData && window.libraryData.length > 5) {
                data = window.libraryData.map((item, idx) => ({
                    ...item,
                    id: 'lib_mig_' + idx,
                    tags: item.tags || []
                }));
            } else {
                data = initialData;
            }
            saveData();
        }
    }

    function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    function saveCategories() { 
        categories.sort((a,b) => a.order - b.order);
        localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories)); 
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

    init();

    return {
        getItems: () => data,
        getCategories: () => categories,
        addItem, editItem, removeItem,
        addCategory, editCategory, removeCategory, reorderCategory
    };
})();

// Exportar para uso global
window.LibraryManager = LibraryManager;
// Alias para compatibilidade com código antigo enquanto migra
window.libraryData = LibraryManager.getItems();
