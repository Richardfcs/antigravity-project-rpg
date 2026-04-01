/**
 * LOG MANAGER - Resgistro de Sangue
 * Gerencia o log persistente de combate e narrativa no localStorage.
 */

window.LogManager = (function() {
  const STORE = 'history';
  const KEY = 'session_log';
  const MAX_ENTRIES = 200;
  let cache = [];

  // Initialize: Pre-load from IndexedDB to memory
  const init = async () => {
    if (!window.DaimyoDB) return;
    try {
      const data = await window.DaimyoDB.get(window.DaimyoDB.STORES.HISTORY, KEY);
      if (data) cache = data;
      console.log(`🛡️ DaimyoDB: ${cache.length} entradas de log carregadas.`);
      // Notificar que o log inicial está pronto
      window.dispatchEvent(new CustomEvent('daimyoLogUpdated', { detail: { initial: true } }));
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

    cache.unshift(entry);

    // Circular buffer: Limitar a MAX_ENTRIES para performance
    if (cache.length > MAX_ENTRIES) {
      cache = cache.slice(0, MAX_ENTRIES);
    }
    
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

  // Auto-init with retry for DaimyoDB
  let bootRetries = 0;
  const boot = async () => {
    if (window.DaimyoDB) {
      await init();
      // Register sync after initialization
      window.DaimyoDB.onSync(async (change) => {
        if (change.store === window.DaimyoDB.STORES.HISTORY && change.key === KEY) {
          try {
            const data = await window.DaimyoDB.get(window.DaimyoDB.STORES.HISTORY, KEY);
            if (data) {
              cache = data;
              window.dispatchEvent(new CustomEvent('daimyoLogUpdated', { detail: { sync: true } }));
            }
          } catch (e) {
            console.error("Erro ao sincronizar cache de log", e);
          }
        }
      });
    } else if (bootRetries < 30) {
      bootRetries++;
      setTimeout(boot, 200);
    }
  };

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot);

  return {
    add,
    get,
    clear
  };
})();
