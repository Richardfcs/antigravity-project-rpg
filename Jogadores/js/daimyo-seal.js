/**
 * O SELO DO DAIMYO (Jogador) - Backup e Sincronização
 * Exportar, Importar e Mesclar dados seguramente (com chaves DB).
 */

window.DaimyoSeal = (function() {
  
  async function exportCampaign() {
    const data = {
        version: '2.0',
        timestamp: new Date().toISOString(),
        localStorage: {},
        indexedDB: {}
    };

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data.localStorage[key] = localStorage.getItem(key);
    }
    
    if (window.DaimyoDB) {
        try {
            await window.DaimyoDB.init();
            const stores = Object.values(window.DaimyoDB.STORES);
            for (const store of stores) {
                if (typeof window.DaimyoDB.getAllWithKeys === 'function') {
                    data.indexedDB[store] = await window.DaimyoDB.getAllWithKeys(store);
                } else {
                    data.indexedDB[store] = await window.DaimyoDB.getAll(store);
                }
            }
        } catch (e) {
            console.error('Erro ao exportar IndexedDB:', e);
        }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `daimyo_player_backup_${dateStr}.json`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
  }

  async function importCampaign(file) {
    if (!file) return;

    const confirmImport = confirm("⚠️ ATENÇÃO!\nIsso apagará TODOS os dados atuais deste dispositivo e os substituirá pelo arquivo de backup.\n\nDeseja continuar?");
    if (!confirmImport) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!data || (!data.localStorage && !data.indexedDB && !data.version)) {
            throw new Error('Formato inválido.');
        }

        localStorage.clear();
        
        const lsData = data.localStorage || data;
        const dbData = data.indexedDB || null;

        for (const key in lsData) {
            if (typeof lsData[key] === 'string') {
                localStorage.setItem(key, lsData[key]);
            }
        }

        if (dbData && window.DaimyoDB) {
            await window.DaimyoDB.init();
            for (const store in dbData) {
                const items = dbData[store];
                if (Array.isArray(items)) {
                    await window.DaimyoDB.clearStore(store);
                    for (const item of items) {
                        if (item && item.hasOwnProperty('key') && item.hasOwnProperty('value')) {
                            await window.DaimyoDB.put(store, item.key, item.value);
                        } else {
                            const key = item.id || item.key || (store === 'vault' ? item.name : null);
                            if (key) await window.DaimyoDB.put(store, key, item);
                        }
                    }
                }
            }
        }

        alert('✅ Restauração concluída! Reiniciando...');
        window.location.reload();
        
      } catch (err) {
        console.error('Erro:', err);
        alert('❌ Erro crítico ao processar o arquivo.');
      }
    };
    reader.readAsText(file);
  }

  async function mergeCampaign(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = JSON.parse(e.target.result);
        const dbData = data.indexedDB || null;
        const lsData = data.localStorage || (data.version ? null : data);

        let added = 0;
        let updated = 0;
        let skipped = 0;

        if (lsData) {
          for (const key in lsData) {
            if (typeof lsData[key] === 'string') {
              if (!localStorage.getItem(key)) {
                localStorage.setItem(key, lsData[key]);
                added++;
              } else {
                skipped++;
              }
            }
          }
        }

        if (dbData && window.DaimyoDB) {
          await window.DaimyoDB.init();

          for (const storeName in dbData) {
            const incomingItems = dbData[storeName];
            if (!Array.isArray(incomingItems)) continue;

            let existingItemsWithKeys = [];
            if (typeof window.DaimyoDB.getAllWithKeys === 'function') {
                existingItemsWithKeys = await window.DaimyoDB.getAllWithKeys(storeName) || [];
            } else {
                const raw = await window.DaimyoDB.getAll(storeName) || [];
                existingItemsWithKeys = raw.map(v => ({ key: v.id || v.key || v.name, value: v }));
            }

            const existingStoreRecordKeys = new Set(existingItemsWithKeys.map(i => i.key));

            for (const incoming of incomingItems) {
              let itemKey, itemValue;
              
              if (incoming && incoming.hasOwnProperty('key') && incoming.hasOwnProperty('value')) {
                itemKey = incoming.key;
                itemValue = incoming.value;
              } else {
                itemKey = incoming.id || incoming.key || (storeName === 'vault' ? incoming.name : null);
                itemValue = incoming;
              }

              if (!itemKey) { skipped++; continue; }

              if (storeName === 'characters' && itemKey === 'all') {
                  const localRecord = existingItemsWithKeys.find(i => i.key === itemKey);
                  let localChars = localRecord && localRecord.value ? [...localRecord.value] : [];
                  let incomingChars = Array.isArray(itemValue) ? itemValue : [];
                  
                  let cAdded = 0;
                  let cUpdated = 0;

                  for (const incChar of incomingChars) {
                      const idx = localChars.findIndex(c => c.id === incChar.id);
                      if (idx === -1) {
                          localChars.push(incChar);
                          cAdded++;
                      } else {
                          const locChar = localChars[idx];
                          if (!locChar.updatedAt || (incChar.updatedAt && incChar.updatedAt > locChar.updatedAt)) {
                              localChars[idx] = incChar;
                              cUpdated++;
                          }
                      }
                  }

                  if (cAdded > 0 || cUpdated > 0) {
                      await window.DaimyoDB.put(storeName, itemKey, localChars);
                      added += cAdded;
                      updated += cUpdated;
                  } else {
                      skipped += incomingChars.length;
                  }
              } else if (storeName === 'vault' && (itemKey === 'gm_notes' || itemKey === 'player_notes' || itemKey === 'clocks')) {
                  const localRecord = existingItemsWithKeys.find(i => i.key === itemKey);
                  let localArr = localRecord && Array.isArray(localRecord.value) ? [...localRecord.value] : [];
                  let incomingArr = Array.isArray(itemValue) ? itemValue : [];
                  
                  const locIds = new Set(localArr.map(x => x.id).filter(Boolean));
                  let nAdded = 0;

                  for (const nInc of incomingArr) {
                      if (!locIds.has(nInc.id)) {
                          localArr.push(nInc);
                          locIds.add(nInc.id);
                          nAdded++;
                      }
                  }

                  if (nAdded > 0) {
                      await window.DaimyoDB.put(storeName, itemKey, localArr);
                      added += nAdded;
                  } else {
                      skipped++;
                  }
              } else {
                  if (!existingStoreRecordKeys.has(itemKey)) {
                      await window.DaimyoDB.put(storeName, itemKey, itemValue);
                      added++;
                  } else {
                      skipped++;
                  }
              }
            }
          }
        }

        alert(`🧩 Mesclagem Concluída!\n\nDados Processados:\n➕ Adicionados: ${added}\n🔄 Atualizados: ${updated}\n⏭️ Pulados: ${skipped}`);
        window.location.reload();
      } catch (err) {
        console.error('Erro no merge:', err);
        alert('❌ Erro crítico ao tentar mesclar o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  }

  return { exportCampaign, importCampaign, mergeCampaign };
})();
