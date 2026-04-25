/**
 * Daimyo Bestiary Manager
 * Sistema de blocos de estatísticas rápidos (Statblocks) e inserção direta no combate (Spawner).
 */
const BestiaryManager = (function() {
  const STOREKey = 'bestiary_data';

  const defaultMooks = [
    { id: 'b1', name: 'Bandido Comum', hpMax: 10, fpMax: 10, ht: 10, dodge: 8, rd: 1, attack1: 'Espada Curta (12) - GeB 1d', attack2: '', type: 'Bandido' },
    { id: 'b2', name: 'Ashigaru Fiel', hpMax: 11, fpMax: 12, ht: 11, dodge: 8, rd: 3, attack1: 'Lança (13) - GdP 1d+2', attack2: '', type: 'Soldado' },
    { id: 'b3', name: 'Lobo Sanguinário', hpMax: 8, fpMax: 10, ht: 10, dodge: 9, rd: 0, attack1: 'Mordida (14) - GeB 1d-1', attack2: '', type: 'Besta' }
  ];

  async function getBestiary() {
    if (!window.DaimyoDB) return [];
    let data = await window.DaimyoDB.get('vault', STOREKey);
    if (!data) {
      data = defaultMooks;
      await window.DaimyoDB.put('vault', STOREKey, data);
    }
    return data;
  }

  async function saveBestiary(data) {
    if (window.DaimyoDB) await window.DaimyoDB.put('vault', STOREKey, data);
  }

  async function renderBestiary() {
    const list = await getBestiary();
    const container = document.getElementById('bestiary-grid');
    if (!container) return;

    container.innerHTML = list.map(mook => `
      <div class="bestiary-card">
         <div class="bestiary-card__header">
           <strong>${mook.name}</strong> <span class="tag" style="font-size:0.6rem;">${mook.type}</span>
         </div>
         <div class="bestiary-card__stats">
           <span title="Dodge/Esquiva Base">Esq: ${mook.dodge}</span>
           <span title="Resistência ao Dano (Armadura)">RD: ${mook.rd}</span>
           <span title="Pontos de Vida Máximos">PV: ${mook.hpMax}</span>
           <span title="Pontos de Fadiga">PF: ${mook.fpMax}</span>
           <span title="Saúde Básica">HT: ${mook.ht}</span>
         </div>
         <div class="bestiary-card__attacks">
           ${mook.attack1 ? `<div>⚔ ${mook.attack1}</div>` : ''}
           ${mook.attack2 ? `<div>⚔ ${mook.attack2}</div>` : ''}
         </div>
         <div class="bestiary-card__actions" style="display: flex; gap: 8px; margin-top: 10px;">
           <button class="btn btn--sm btn--gold" style="flex: 1;" onclick="BestiaryManager.spawnToArena('${mook.id}')">⚔️ Puxar p/ Arena</button>
           <button class="btn btn--sm btn--ghost" style="padding: 4px;" onclick="BestiaryManager.deleteMook('${mook.id}')" title="Remover do Bestiário">✕</button>
         </div>
      </div>
    `).join('');
  }

  async function spawnToArena(id) {
    const list = await getBestiary();
    const mook = list.find(m => m.id === id);
    if (!mook) return;

    let state = null;
    if (window.DaimyoDB) {
       state = await window.DaimyoDB.get('vault', 'combat_state');
    }
    if (!state) state = { combatants: [], combat: { round:0, nextId: 200 } };

    if(!state.combat.nextId) state.combat.nextId = 200;

    // Achar sufixos lógicos se houver repetidos
    const regex = new RegExp(`^${mook.name} (\\d+)$`);
    let maxSuffix = 0;
    
    state.combatants.forEach(c => {
      if (c.name === mook.name && maxSuffix === 0) maxSuffix = 1;
      const match = c.name.match(regex);
      if (match) {
        let num = parseInt(match[1]);
        if (num > maxSuffix) maxSuffix = num;
      }
    });

    let spawnName = maxSuffix === 0 ? mook.name : `${mook.name} ${maxSuffix + 1}`;

    const newCombatant = {
      id: "C" + Date.now() + Math.floor(Math.random()*1000),
      combatId: state.combat.nextId++,
      name: spawnName,
      hpCur: parseInt(mook.hpMax),
      hpMax: parseInt(mook.hpMax),
      fpCur: parseInt(mook.fpMax),
      fpMax: parseInt(mook.fpMax),
      ht: parseInt(mook.ht),
      dodge: parseInt(mook.dodge),
      rd: parseInt(mook.rd) || 0,
      dr: parseInt(mook.rd) || 0,
      will: parseInt(mook.ht),
      tag: mook.type || 'NPC',
      isMook: true
    };

    state.combatants.push(newCombatant);
    
    // Save to Vault
    if (window.DaimyoDB) {
       await window.DaimyoDB.put('vault', 'combat_state', state);
    } else {
       localStorage.setItem('daimyoShieldState', JSON.stringify(state)); // fallback legacy
    }

    // Trigger visual/global sync
    if(window.showToast) window.showToast(`🔥 ${spawnName} arremessado na Arena!`);
    
    // UI update inside master-hub
    if (typeof window.renderCombatants === 'function') {
        window.renderCombatants();
    }
    // Cross-tab sync
    window.dispatchEvent(new CustomEvent('daimyoStateUpdated')); 
  }

  async function createMook(dataObj) {
     const list = await getBestiary();
     const mook = {
        id: 'mook_' + Date.now(),
        name: dataObj.name || 'Desconhecido',
        hpMax: parseInt(dataObj.hpMax) || 10,
        fpMax: parseInt(dataObj.fpMax) || 10,
        ht: parseInt(dataObj.ht) || 10,
        dodge: parseInt(dataObj.dodge) || 8,
        rd: parseInt(dataObj.rd) || 0,
        attack1: dataObj.attack1 || '',
        attack2: dataObj.attack2 || '',
        type: dataObj.type || 'NPC'
     };
     list.push(mook);
     await saveBestiary(list);
     await renderBestiary();
  }

  async function deleteMook(id) {
     if(!confirm("Remover este Inimigo definitivamente do seu Códex?")) return;
     let list = await getBestiary();
     list = list.filter(m => m.id !== id);
     await saveBestiary(list);
     await renderBestiary();
  }

  function openModal() {
     const modal = document.getElementById('bestiary-modal');
     if(modal) {
        modal.classList.add('visible');
        renderBestiary();
     }
  }

  function closeModal() {
     const modal = document.getElementById('bestiary-modal');
     if(modal) modal.classList.remove('visible');
  }

  return { getBestiary, renderBestiary, spawnToArena, createMook, deleteMook, openModal, closeModal };
})();
window.BestiaryManager = BestiaryManager;
