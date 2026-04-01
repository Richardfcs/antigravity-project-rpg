window.DaimyoSeal = (function() {
  
  /**
   * Exporta todo o estado (localStorage + IndexedDB) para um arquivo JSON.
   */
  async function exportCampaign() {
    console.log('✨ O Selo do Daimyo: Iniciando exportação completa...');
    const data = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        localStorage: {},
        indexedDB: {}
    };

    // 1. LocalStorage
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data.localStorage[key] = localStorage.getItem(key);
    }
    
    // 2. IndexedDB (Cofre Infinito)
    if (window.DaimyoDB) {
        try {
            await window.DaimyoDB.init();
            const stores = Object.values(window.DaimyoDB.STORES);
            for (const store of stores) {
                data.indexedDB[store] = await window.DaimyoDB.getAll(store);
            }
        } catch (e) {
            console.error('Erro ao exportar IndexedDB:', e);
        }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `daimyo_backup_total_${dateStr}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
    
    console.log('✅ Exportação concluída.');
  }

  /**
   * Importa um arquivo JSON e restaura o estado global.
   */
  async function importCampaign(file) {
    if (!file) return;

    if (!confirm('⚠️ ATENÇÃO: Importar um backup irá SOBRESCREVER todos os dados atuais. Recomendamos exportar o estado atual antes. Continuar?')) {
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        
        // Suporte para backups antigos (v1) e novos (v2)
        const lsData = data.localStorage || data;
        const dbData = data.indexedDB || null;

        // 1. Restaurar LocalStorage
        for (const key in lsData) {
            if (typeof lsData[key] === 'string') {
                localStorage.setItem(key, lsData[key]);
            }
        }

        // 2. Restaurar IndexedDB
        if (dbData && window.DaimyoDB) {
            await window.DaimyoDB.init();
            for (const store in dbData) {
                const items = dbData[store];
                if (Array.isArray(items)) {
                    await window.DaimyoDB.clearStore(store);
                    for (const item of items) {
                        const key = item.id || item.key || (store === 'vault' ? item.name : null);
                        if (key) await window.DaimyoDB.put(store, key, item);
                    }
                }
            }
        }

        alert('✅ O Destino foi restaurado! Reiniciando a aplicação...');
        window.location.reload();
        
      } catch (err) {
        console.error('Erro na importação:', err);
        alert('❌ Erro crítico ao processar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  }

  return { exportCampaign, importCampaign };
})();
