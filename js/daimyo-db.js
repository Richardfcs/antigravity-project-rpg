/**
 * ════════════════════════════════════════════════════════════════
 * O COFRE INFINITO — Database Manager (IndexedDB)
 * ════════════════════════════════════════════════════════════════
 */

window.DaimyoDB = (function() {
  const DB_NAME = 'DaimyoVault';
  const DB_VERSION = 1;
  const STORES = {
    CHARACTERS: 'characters',
    MAP_STATE: 'map_state',
    HISTORY: 'history',
    VAULT: 'vault',
    MEDIA: 'media'
  };

  const channel = new BroadcastChannel('daimyo_sync');
  let db = null;
  let initPromise = null;
  const syncListeners = [];

  function init() {
    if (initPromise) return initPromise;

    initPromise = new Promise((resolve, reject) => {
      console.log("⛩️ Cofre Infinito: Abrindo conexão...");
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const dbInstance = event.target.result;
        Object.values(STORES).forEach(storeName => {
          if (!dbInstance.objectStoreNames.contains(storeName)) {
            dbInstance.createObjectStore(storeName);
          }
        });
      };

      request.onsuccess = (event) => {
        db = event.target.result;
        console.log("⛩️ Cofre Infinito: Conexão estabelecida.");
        resolve(db);
      };

      request.onerror = (event) => {
        console.error("❌ Erro ao abrir DaimyoDB:", event.target.error);
        initPromise = null; // Permitir tentativa futura se falhar
        reject(event.target.error);
      };
    });

    return initPromise;
  }

  // Escuta central de sincronização via BroadcastChannel
  channel.onmessage = (event) => {
    syncListeners.forEach(callback => {
      try { callback(event.data); } catch(e) { console.error("Erro no listener de sync:", e); }
    });
  };

  async function put(storeName, key, value) {
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onsuccess = () => {
        channel.postMessage({ type: 'sync', store: storeName, key: key });
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function get(storeName, key) {
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function remove(storeName, key) {
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => {
        channel.postMessage({ type: 'sync', store: storeName, key: key });
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll(storeName) {
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function clearStore(storeName) {
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        channel.postMessage({ type: 'sync', store: storeName, all: true });
        resolve(true);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async function migrateFromLocalStorage() {
    const migrationKey = 'daimyo_migrated_v2';
    if (localStorage.getItem(migrationKey)) return;

    console.log("🛠️ Iniciando Migração estratégica para o Cofre Infinito (v2)...");
    
    // Combat State & Kegare
    const combatState = localStorage.getItem('daimyoShieldState');
    if (combatState) await put(STORES.VAULT, 'combat_state', JSON.parse(combatState));

    // Characters
    const characters = localStorage.getItem('daimyo_characters');
    if (characters) await put(STORES.CHARACTERS, 'all', JSON.parse(characters));

    // Tactical Map
    const mapTokens = localStorage.getItem('daimyo_war_map_tokens');
    if (mapTokens) await put(STORES.MAP_STATE, 'tokens', JSON.parse(mapTokens));
    const mapHierarchy = localStorage.getItem('daimyo_map_hierarchy');
    if (mapHierarchy) await put(STORES.MAP_STATE, 'hierarchy', JSON.parse(mapHierarchy));

    // Narrative Tools (Clocks & Notes)
    const clocks = localStorage.getItem('daimyo_clocks') || localStorage.getItem('daimyo_faction_clocks');
    if (clocks) await put(STORES.VAULT, 'clocks', JSON.parse(clocks));
    const clocksHist = localStorage.getItem('daimyo_clocks_history');
    if (clocksHist) await put(STORES.VAULT, 'clocks_history', JSON.parse(clocksHist));
    const gmNotes = localStorage.getItem('daimyo_gm_notes') || localStorage.getItem('daimyo_notes');
    if (gmNotes) {
        try { 
            const parsed = JSON.parse(gmNotes);
            await put(STORES.VAULT, 'gm_notes', parsed);
        } catch(e) { await put(STORES.VAULT, 'gm_notes', gmNotes); }
    }

    // Logs & History
    const combatLog = localStorage.getItem('escudo_daimyo_history');
    if (combatLog) await put(STORES.HISTORY, 'combat_log', JSON.parse(combatLog));
    const crisisLog = localStorage.getItem('daimyo_crisis_log');
    if (crisisLog) await put(STORES.HISTORY, 'crisis_log', JSON.parse(crisisLog));
    const calcLog = localStorage.getItem('espadas_quebradas_history');
    if (calcLog) await put(STORES.HISTORY, 'calc_history', JSON.parse(calcLog));

    // Library Data
    const libData = localStorage.getItem('daimyo_library_data');
    if (libData) await put(STORES.VAULT, 'library_data', JSON.parse(libData));
    const libCats = localStorage.getItem('daimyo_library_categories');
    if (libCats) await put(STORES.VAULT, 'library_categories', JSON.parse(libCats));
    const libVer = localStorage.getItem('daimyo_data_version');
    if (libVer) await put(STORES.VAULT, 'library_data_version', parseInt(libVer));

    localStorage.setItem(migrationKey, 'true');
    console.log("✅ Migração v2 concluída. Todos os subsistemas alinhados.");
  }

  return {
    init,
    put,
    get,
    remove,
    getAll,
    clearStore,
    migrateFromLocalStorage,
    STORES,
    onSync: (callback) => {
      if (typeof callback === 'function') syncListeners.push(callback);
    }
  };
})();
