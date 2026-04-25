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

  async function getAllWithKeys(storeName) {
    if (!db) await init();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push({ key: cursor.key, value: cursor.value });
          cursor.continue();
        } else {
          resolve(results);
        }
      };
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
    
    const safeMigrate = async (lsKey, store, dbKey, isJSON = true) => {
      try {
        const raw = localStorage.getItem(lsKey);
        if (raw) {
          const val = isJSON ? JSON.parse(raw) : raw;
          await put(store, dbKey, val);
          console.log(`✅ Migrado: ${lsKey} -> ${store}:${dbKey}`);
        }
      } catch (e) {
        console.warn(`⚠️ Falha ao migrar ${lsKey}:`, e);
      }
    };

    // Combat State & Kegare
    await safeMigrate('daimyoShieldState', STORES.VAULT, 'combat_state');

    // Characters
    await safeMigrate('daimyo_characters', STORES.CHARACTERS, 'all');

    // Tactical Map
    await safeMigrate('daimyo_war_map_tokens', STORES.MAP_STATE, 'tokens');
    await safeMigrate('daimyo_map_hierarchy', STORES.MAP_STATE, 'hierarchy');

    // Narrative Tools (Clocks & Notes)
    const clocksKey = localStorage.getItem('daimyo_clocks') ? 'daimyo_clocks' : 'daimyo_faction_clocks';
    await safeMigrate(clocksKey, STORES.VAULT, 'clocks');
    await safeMigrate('daimyo_clocks_history', STORES.VAULT, 'clocks_history');
    
    // Special handling for notes (fallback to raw if JSON fails)
    const notesKey = localStorage.getItem('daimyo_gm_notes') ? 'daimyo_gm_notes' : 'daimyo_notes';
    await safeMigrate(notesKey, STORES.VAULT, 'gm_notes');

    // Logs & History
    await safeMigrate('escudo_daimyo_history', STORES.HISTORY, 'combat_log');
    await safeMigrate('daimyo_crisis_log', STORES.HISTORY, 'crisis_log');
    await safeMigrate('espadas_quebradas_history', STORES.HISTORY, 'calc_history');

    // Library Data
    await safeMigrate('daimyo_library_data', STORES.VAULT, 'library_data');
    await safeMigrate('daimyo_library_categories', STORES.VAULT, 'library_categories');
    await safeMigrate('daimyo_data_version', STORES.VAULT, 'library_data_version');

    localStorage.setItem(migrationKey, 'true');
    console.log("⛩️ Migração v2 concluída.");
  }

  return {
    init,
    put,
    get,
    remove,
    getAll,
    getAllWithKeys,
    clearStore,
    migrateFromLocalStorage,
    STORES,
    onSync: (callback) => {
      if (typeof callback === 'function') syncListeners.push(callback);
    }
  };
})();
