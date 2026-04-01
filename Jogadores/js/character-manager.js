/**
 * 📜 CharacterManager - Motor de Dados de Personagens
 * Gerencia o ciclo de vida, persistência e portabilidade de Ronins.
 */
const CharacterManager = (function() {
    const STORE = 'characters';
    const KEY = 'all';
    let cache = [];

    let initPromise = null;

    // Initialize: Pre-load from IndexedDB to memory
    const init = () => {
        if (initPromise) return initPromise;
        
        initPromise = (async () => {
            if (!window.DaimyoDB) return;
            try {
                const data = await window.DaimyoDB.get(window.DaimyoDB.STORES.CHARACTERS, KEY);
                if (data) cache = data;
                console.log(`🛡️ DaimyoDB: ${cache.length} personagens carregados no cache.`);
                
                // Notificar que o sistema está pronto e o personagem ativo pode ser buscado no cache
                window.dispatchEvent(new CustomEvent('daimyoActiveCharacterChanged', { 
                    detail: { id: localStorage.getItem('daimyo_active_pc_id') } 
                }));
            } catch (e) {
                console.error("Erro ao inicializar cache de personagens", e);
            }
        })();
        return initPromise;
    };

    const loadAll = async () => {
        await init();
        return JSON.parse(JSON.stringify(cache));
    };

    const saveAll = async (chars) => {
        cache = chars;
        if (window.DaimyoDB) {
            await window.DaimyoDB.put(window.DaimyoDB.STORES.CHARACTERS, KEY, chars)
                .catch(e => console.error("Erro ao salvar no Cofre Infinito", e));
        }
        window.dispatchEvent(new CustomEvent('daimyoCharactersUpdated'));
    };

    // ... createNewCharacter and portToCombat remain largely the same, but using combat key from DB
    const createNewCharacter = () => {
        return {
            id: 'ronin_' + Date.now(),
            name: 'Novo Samurai',
            concept: '',
            clan: '',
            photo: '',
            isLegacy: false,
            attributes: {
                st: 10, dx: 10, iq: 10, ht: 10,
                hp: 10, fp: 10, will: 10, per: 10
            },
            hpCur: 10,
            fpCur: 10,
            basicSpeed: 5.0,
            slotsUsed: 0,
            equippedManeuvers: [],
            advantages: [],
            disadvantages: [],
            skills: [],
            equipment: [],
            legacy: { heir: '', history: '' }
        };
    };

    const portToCombat = async (id) => {
        const char = cache.find(c => c.id === id);
        if (!char) return false;

        try {
            const combatState = await window.DaimyoDB.get(window.DaimyoDB.STORES.VAULT, 'combat_state') || { combatants: [] };
            
            const newCombatant = {
                id: 'p_' + Date.now(),
                name: char.name,
                st: char.attributes.st,
                dx: char.attributes.dx,
                iq: char.attributes.iq || 10,
                ht: char.attributes.ht || 10,
                will: char.attributes.will || char.attributes.iq || 10,
                hp: char.attributes.hp, hpCur: char.attributes.hp, hpMax: char.attributes.hp, maxHp: char.attributes.hp,
                fp: char.attributes.fp || 10, fpCur: char.attributes.fp || 10, fpMax: char.attributes.fp || 10, maxFp: char.attributes.fp || 10,
                basicSpeed: char.basicSpeed || ((char.attributes.dx + char.attributes.ht) / 4),
                vel: (char.basicSpeed || ((char.attributes.dx + char.attributes.ht) / 4)).toFixed(2), 
                speed: (char.basicSpeed || ((char.attributes.dx + char.attributes.ht) / 4)).toFixed(2),
                esq: char.defenses?.dodge || Math.floor((char.basicSpeed || ((char.attributes.dx + char.attributes.ht) / 4)) + 3),
                esquiva: char.defenses?.dodge || Math.floor((char.basicSpeed || ((char.attributes.dx + char.attributes.ht) / 4)) + 3),
                apr: char.defenses?.parry || 8, aparar: char.defenses?.parry || 8,
                bloqueio: char.defenses?.block || 0,
                dr: char.dr || 0,
                equippedWeapon: char.equippedWeapon || '',
                maneuvers: char.equippedManeuvers || [],
                tag: 'PC',
                isBleeding: false,
                conditions: [],
                statusFx: { blind: false, stunned: false, grappled: false },
                posture: 'standing'
            };

            // Check if already in combat to avoid duplication
            const exists = combatState.combatants.find(c => c.name === char.name);
            if (exists) {
                console.log(`🛡️ CharacterManager: ${char.name} já está na Arena. Atualizando dados existentes.`);
                // Update basic stats of existing combatant
                exists.hpCur = char.attributes.hp; 
                exists.hpMax = char.attributes.hp;
                exists.st = char.attributes.st;
                exists.dx = char.attributes.dx;
            } else {
                combatState.combatants.push(newCombatant);
            }
            
            await window.DaimyoDB.put(window.DaimyoDB.STORES.VAULT, 'combat_state', combatState);
            
            window.dispatchEvent(new CustomEvent('daimyoStateUpdated'));
            return true;
        } catch (e) {
            console.error("Erro ao portar para combate", e);
            return false;
        }
    };

    /**
     * 🆔 Ativa um personagem para a sessão do jogador
     */
    const setActiveCharacter = (id) => {
        if (!id) localStorage.removeItem('daimyo_active_pc_id');
        else localStorage.setItem('daimyo_active_pc_id', id);
        
        window.dispatchEvent(new CustomEvent('daimyoActiveCharacterChanged', { detail: { id } }));
        console.log(`👤 Personagem ativo definido: ${id}`);
    };

    /**
     * 🔍 Obtém o ID do personagem ativo no momento
     */
    const getActiveCharacterId = () => {
        return localStorage.getItem('daimyo_active_pc_id');
    };

    /**
     * 🎭 Obtém o objeto completo do personagem ativo
     */
    const getActiveCharacter = () => {
        const id = getActiveCharacterId();
        if (!id) return null;
        return cache.find(c => c.id === id) || null;
    };

    const toggleLegacy = async (id) => {
        const chars = await loadAll();
        const char = chars.find(c => c.id === id);
        if (!char) return;

        char.isLegacy = !char.isLegacy;
        char.updatedAt = Date.now();

        // Se o personagem movido para o legado for o ativo, desativá-lo
        if (char.isLegacy && getActiveCharacterId() === id) {
            setActiveCharacter(null);
        }

        saveAll(chars);
        return char.isLegacy;
    };

    const deleteCharacter = async (id) => {
        let chars = await loadAll();
        chars = chars.filter(c => c.id !== id);

        if (getActiveCharacterId() === id) {
            setActiveCharacter(null);
        }

        saveAll(chars);
    };

    // Auto-init connection attempt
    if (document.readyState === 'complete') init();
    else window.addEventListener('load', init);

    return {
        init,
        loadAll,
        saveAll,
        createNewCharacter,
        portToCombat,
        setActiveCharacter,
        getActiveCharacterId,
        getActiveCharacter,
        toggleLegacy,
        deleteCharacter
    };
})();
