/**
 * KEGARE MANAGER - Módulo Centralizado de Mácula e Pânico (GURPS 4e)
 * Gerencia o estado global da Mácula e a automação de Testes de Medo.
 */

window.KegareManager = (function() {
  const STATE_KEY = 'daimyoShieldState';

  const FRIGHT_TABLE = Object.freeze([
    { min: -99, max: 3,  label: 'Calma',          desc: 'Nenhum efeito adverso imediato.' },
    { min: 4,   max: 9,  label: 'Atordoado',      desc: 'Congela por 1 segundo (próximo turno). Larga o que estava na mão.' },
    { min: 10,  max: 12, label: 'Pânico',          desc: 'Foge o mais rápido possível por 1d minutos.' },
    { min: 13,  max: 15, label: 'Torpor',          desc: 'Vomita ou desmaia por 1d minutos.' },
    { min: 16,  max: 18, label: 'Trauma Leve',     desc: 'O samurai adquire uma Peculiaridade devido ao trauma.' },
    { min: 19,  max: 23, label: 'Trauma Grave',    desc: 'Adquire uma Fobia, Pesadelos ou Covardia (Desvantagem Mental).' },
    { min: 24,  max: 99, label: 'Choque Fatal',    desc: 'Ataque Cardíaco (Teste de HT para não morrer) ou Coma.' },
  ]);

  const KEGARE_TIERS = Object.freeze([
    { min: 1, max: 2, label: 'Puro',      mod: +2, color: '#22c55e' }, // Verde
    { min: 3, max: 4, label: 'Maculado',  mod: 0,  color: '#eab308' }, // Amarelo
    { min: 5, max: 6, label: 'Condenado', mod: -2, color: '#c41e3a' }, // Vermelho
  ]);

  const STORE = 'vault';
  const KEY = 'combat_state';
  let cache = { kegare: { level: 1 } };

  // Initialize: Pre-load from IndexedDB
  const init = async () => {
    if (!window.DaimyoDB) return;
    try {
      const data = await window.DaimyoDB.get(STORE, KEY);
      if (data) cache = data;
      console.log("🌓 KegareManager: Mácula sincronizada com o Cofre.");
    } catch (e) {
      console.error("Erro ao inicializar KegareManager", e);
    }
  };

  async function saveState() {
    if (window.DaimyoDB) {
      await window.DaimyoDB.put(STORE, KEY, cache);
    }
    // Notificar UI global
    window.dispatchEvent(new CustomEvent('daimyoStateUpdated', { detail: cache }));
  }

  function getLevel() {
    return cache.kegare?.level || 1;
  }

  function setLevel(level) {
    cache.kegare = cache.kegare || {};
    cache.kegare.level = Math.max(1, Math.min(6, level));
    saveState();
    return cache.kegare.level;
  }

  // Sync between tabs
  window.addEventListener('load', () => {
    if (window.DaimyoDB) {
       init();
       window.DaimyoDB.onSync((data) => {
         if (data.store === STORE && data.key === KEY) {
           window.DaimyoDB.get(STORE, KEY).then(d => { if(d) cache = d; });
         }
       });
    } else {
       setTimeout(init, 200);
    }
  });

  function getModifier(level) {
    const lv = level !== undefined ? level : getLevel();
    const tier = KEGARE_TIERS.find(t => lv >= t.min && lv <= t.max);
    return tier ? tier.mod : 0;
  }

  function getTierInfo(level) {
    const lv = level !== undefined ? level : getLevel();
    return KEGARE_TIERS.find(t => lv >= t.min && lv <= t.max) || KEGARE_TIERS[0];
  }

  function roll3d6() {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    return { dice: [d1, d2, d3], total: d1 + d2 + d3 };
  }

  function runFrightCheck(will, monsterMod) {
    const kegareLevel = getLevel();
    const kegareMod = getModifier();
    const target = will + monsterMod + kegareMod;
    
    const roll1 = roll3d6();
    const success = roll1.total <= target;
    
    let result = {
      success, will, monsterMod, kegareMod, kegareLevel, target, roll1,
      mof: 0, roll2: null, tableResult: null
    };

    if (!success) {
      result.mof = roll1.total - target;
      result.roll2 = roll3d6();
      const finalScore = result.roll2.total + result.mof + kegareLevel;
      result.finalScore = finalScore;
      result.tableResult = FRIGHT_TABLE.find(r => finalScore >= r.min && finalScore <= r.max) || FRIGHT_TABLE[FRIGHT_TABLE.length - 1];
    }

    return result;
  }

  return {
    getLevel, setLevel, getModifier, getTierInfo, runFrightCheck, roll3d6, FRIGHT_TABLE
  };
})();
