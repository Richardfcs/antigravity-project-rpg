/**
 * LOG MANAGER - Resgistro de Sangue
 * Gerencia o log persistente de combate e narrativa no localStorage.
 */

window.LogManager = (function() {
  const STORE = 'history';
  const KEY = 'session_log';
  let cache = [];

  // Initialize: Pre-load from IndexedDB to memory
  const init = async () => {
    if (!window.DaimyoDB) return;
    try {
      const data = await window.DaimyoDB.get(window.DaimyoDB.STORES.HISTORY, KEY);
      if (data) cache = data;
      console.log(`🛡️ DaimyoDB: ${cache.length} entradas de log carregadas.`);
    } catch (e) {
      console.error("Erro ao inicializar cache de log", e);
    }
  };

  /**
   * Adiciona uma entrada ao log.
   */
  function add(type, text, round = null) {
    const entry = {
      id: Date.now() + Math.random(),
      type: type || 'info',
      text: text,
      round: round,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    cache.push(entry);
    
    // Sem limite artificial de linhas (Cofre Infinito)
    if (window.DaimyoDB) {
      window.DaimyoDB.put(window.DaimyoDB.STORES.HISTORY, KEY, cache)
        .catch(e => console.error("Erro ao salvar log no Cofre", e));
    }

    // Notificar UI
    window.dispatchEvent(new CustomEvent('daimyoLogUpdated', { detail: entry }));
  }

  function get() {
    return cache;
  }

  function clear() {
    cache = [];
    if (window.DaimyoDB) {
      window.DaimyoDB.put(window.DaimyoDB.STORES.HISTORY, KEY, [])
        .catch(e => console.error("Erro ao limpar log no Cofre", e));
    }
    window.dispatchEvent(new CustomEvent('daimyoLogUpdated', { detail: { type: 'clear' } }));
  }

  // Auto-init
  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);

  return {
    add,
    get,
    clear
  };
})();
