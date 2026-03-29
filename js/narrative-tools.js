/* ═════════════════════════════════════════════
   NARRATIVE TOOLS — Escudo do Daimyo
   Anotações, Relógios e Combate em Massa
   ═════════════════════════════════════════════ */

const NarrativeTools = (function () {

  // State Keys
  const NOTES_KEY = 'daimyo_gm_notes';
  const CLOCKS_KEY = 'daimyo_faction_clocks';
  const CLOCKS_HIST_KEY = 'daimyo_clocks_history';

  // Local State
  let clocks = [];
  let clocksHistory = [];
  let editingClockId = null;

  // --- DRAWER & MODAL UI ---
  function toggleDrawer(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
  }

  function toggleModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('open');
  }

  // --- GM NOTES (MULTI-PAGE) ---
  let gmNotes = []; // { id, title, content }
  let activePageId = null;

  function initNotes() {
    const saved = localStorage.getItem(NOTES_KEY);
    if (saved) {
      try {
        gmNotes = JSON.parse(saved);
        if (!Array.isArray(gmNotes)) gmNotes = [{ id: 'default', title: 'Principal', content: saved }];
      } catch (e) {
        gmNotes = [{ id: 'default', title: 'Principal', content: saved }];
      }
    } else {
      gmNotes = [{ id: 'default', title: 'Principal', content: '' }];
    }
    
    if (!activePageId && gmNotes.length > 0) activePageId = gmNotes[0].id;
    renderNotesUI();
  }

  function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(gmNotes));
  }

  function addNotePage() {
    const title = prompt("Nome da nova página:", "Nova Anotação");
    if (!title) return;
    const newId = 'note_' + Date.now();
    gmNotes.push({ id: newId, title: title, content: '' });
    activePageId = newId;
    saveNotes();
    renderNotesUI();
  }

  function deleteNotePage(id) {
    if (gmNotes.length <= 1) return alert("Você deve ter pelo menos uma página.");
    if (!confirm("Excluir esta página permanentemente?")) return;
    gmNotes = gmNotes.filter(n => n.id !== id);
    if (activePageId === id) activePageId = gmNotes[0].id;
    saveNotes();
    renderNotesUI();
  }

  function renameNotePage(id) {
    const note = gmNotes.find(n => n.id === id);
    if (!note) return;
    const newTitle = prompt("Novo nome:", note.title);
    if (!newTitle) return;
    note.title = newTitle;
    saveNotes();
    renderNotesUI();
  }

  function switchNotePage(id) {
    activePageId = id;
    renderNotesUI();
  }

  function updateActiveNoteContent(content) {
    const note = gmNotes.find(n => n.id === activePageId);
    if (note) {
      note.content = content;
      saveNotes();
      
      const status = document.getElementById('gm-notes-status');
      if (status) {
        status.textContent = 'Salvando...';
        clearTimeout(window._gmSaveTimeout);
        window._gmSaveTimeout = setTimeout(() => {
          status.textContent = 'Sincronizado ✓';
        }, 500);
      }
    }
  }

  // Simple Markdown Parser
  function parseMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }

  function renderNotesUI() {
    const nav = document.getElementById('gm-notes-nav');
    const editor = document.getElementById('gm-notes-editor');
    const preview = document.getElementById('gm-notes-preview');
    if (!nav || !editor) return;

    // Render Tabs
    nav.innerHTML = gmNotes.map(n => `
      <div class="note-tab ${n.id === activePageId ? 'active' : ''}" onclick="NarrativeTools.switchNotePage('${n.id}')">
        <span>${n.id === activePageId ? '👁️' : ''} ${n.title}</span>
        ${n.id !== 'default' ? `<button onclick="event.stopPropagation(); NarrativeTools.renameNotePage('${n.id}')">✏️</button>` : ''}
        ${n.id !== 'default' ? `<button onclick="event.stopPropagation(); NarrativeTools.deleteNotePage('${n.id}')">✕</button>` : ''}
      </div>
    `).join('') + `<button class="btn-ghost btn-sm" onclick="NarrativeTools.addNotePage()">＋ Nova</button>`;

    // Update Content
    const activeNote = gmNotes.find(n => n.id === activePageId) || gmNotes[0];
    editor.value = activeNote.content;
    
    if (preview && preview.style.display !== 'none') {
        preview.innerHTML = parseMarkdown(activeNote.content);
    }
  }

  function toggleNotesPreview() {
    const editor = document.getElementById('gm-notes-editor');
    const preview = document.getElementById('gm-notes-preview');
    const btn = document.getElementById('btn-toggle-preview');
    
    if (preview.style.display === 'none') {
        preview.innerHTML = parseMarkdown(editor.value);
        preview.style.display = 'block';
        editor.style.display = 'none';
        btn.textContent = '✏️ Editar';
    } else {
        preview.style.display = 'none';
        editor.style.display = 'block';
        btn.textContent = '👁️ Preview';
    }
  }

  // --- COFRE INFINITO / PERSISTENCE ---
  const init = async () => {
    if (!window.DaimyoDB) return;
    try {
      // Load Notes
      const savedNotes = await window.DaimyoDB.get(window.DaimyoDB.STORES.VAULT, 'gm_notes');
      if (savedNotes) {
        gmNotes = Array.isArray(savedNotes) ? savedNotes : [{ id: 'default', title: 'Principal', content: savedNotes }];
      } else {
        gmNotes = [{ id: 'default', title: 'Principal', content: '' }];
      }
      if (!activePageId && gmNotes.length > 0) activePageId = gmNotes[0].id;
      renderNotesUI();

      // Load Clocks
      const savedClocks = await window.DaimyoDB.get(window.DaimyoDB.STORES.VAULT, 'clocks');
      const savedClocksHist = await window.DaimyoDB.get(window.DaimyoDB.STORES.VAULT, 'clocks_history');
      if (savedClocks) clocks = savedClocks;
      if (savedClocksHist) clocksHistory = savedClocksHist;
      renderClocks();
      renderGlobalHistory();

      console.log("📜 NarrativeTools: Alinhado com o Cofre Infinito.");
    } catch (e) {
      console.error("Erro ao sincronizar NarrativeTools com o Cofre:", e);
    }
  };

  // Auto-init connection attempt
  window.addEventListener('load', () => {
    if (window.DaimyoDB) init();
    else setTimeout(init, 150);
  });

  // --- CLOCKS (AMEAÇAS) ---
  function loadClocks() {
    // Initialized via async init()
  }

  async function saveClocks() {
    if (window.DaimyoDB) {
      await window.DaimyoDB.put(window.DaimyoDB.STORES.VAULT, 'clocks', clocks);
      await window.DaimyoDB.put(window.DaimyoDB.STORES.VAULT, 'clocks_history', clocksHistory);
    }
    renderClocks();
    renderGlobalHistory();
  }

  function addHistoryEntry(msg) {
    const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    clocksHistory.unshift({ msg, timestamp });
    if (clocksHistory.length > 50) clocksHistory.pop();
    saveClocks();
  }

  function renderStepInputs() {
    const stepsCount = parseInt(document.getElementById('clock-new-steps').value) || 4;
    const container = document.getElementById('clock-steps-descriptions');
    if (!container) return;
    
    let html = '';
    for (let i = 0; i < stepsCount; i++) {
        html += `
            <div style="margin-bottom:5px;">
                <label style="font-size:0.6rem; color:var(--text-muted); text-transform:uppercase;">Etapa ${i+1}</label>
                <input type="text" class="field__input clock-step-desc-input" placeholder="O que acontece aqui?" style="font-size:0.7rem; padding:4px; text-align:left;">
            </div>
        `;
    }
    container.innerHTML = html;
  }

  function addClock() {
    const nameInput = document.getElementById('clock-new-name');
    const stepsInput = document.getElementById('clock-new-steps');
    const descInputs = document.querySelectorAll('.clock-step-desc-input');
    
    if (!nameInput || !stepsInput) return;

    const name = nameInput.value.trim();
    const max = parseInt(stepsInput.value) || 4;

    if (!name) return;

    const steps = Array.from({length: max}, (_, i) => ({ 
        label: (descInputs[i] && descInputs[i].value.trim()) || `Etapa ${i+1}`, 
        status: 'pending' 
    }));

    clocks.unshift({
      id: 'clk_' + Date.now(),
      name: name,
      max: Math.max(2, max),
      current: 0,
      steps: steps,
      includeInGlobal: true
    });

    nameInput.value = '';
    const container = document.getElementById('clock-steps-descriptions');
    if (container) container.innerHTML = '';
    addHistoryEntry(`Nova Frente criada: ${name} (${max} etapas)`);
    saveClocks();
  }

  function deleteClock(id) {
    if (!confirm("Remover esta frente/ameaça permanentemente?")) return;
    clocks = clocks.filter(c => c.id !== id);
    saveClocks();
  }

  function tickClock(id, fromGlobal = false) {
    const c = clocks.find(x => x.id === id);
    if (!c || c.current >= c.max) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    let advance = 0;
    let msg = "";

    if (roll >= 5) { advance = 2; msg = `Rolou ${roll}: Progresso Rápido (+2)!`; }
    else if (roll >= 3) { advance = 1; msg = `Rolou ${roll}: Progresso Lento (+1).`; }
    else { advance = 0; msg = `Rolou ${roll}: Falha/Atraso (0).`; }

    if (advance > 0) {
      const oldVal = c.current;
      c.current = Math.min(c.max, c.current + advance);
      
      // Update step statuses
      for(let i=oldVal; i<c.current; i++) {
          if (c.steps[i]) c.steps[i].status = 'filled';
      }

      const logMsg = `[${c.name}] ${msg} -> Fase: ${c.steps[c.current-1].label}`;
      addHistoryEntry(logMsg);
    } else {
      addHistoryEntry(`[${c.name}] ${msg}`);
    }
    
    if (!fromGlobal) console.log(`Relógio [${c.name}]: ${msg}`);
    return { name: c.name, msg, advance };
  }

  function rollAllClocks() {
    const activeClocks = clocks.filter(c => c.includeInGlobal && c.current < c.max);
    if (activeClocks.length === 0) return alert("Nenhuma frente ativa habilitada para rolo global.");
    
    let report = "Rolagem Coletiva:\n";
    activeClocks.forEach(c => {
        const res = tickClock(c.id, true);
        report += `• ${res.name}: ${res.msg}\n`;
    });
    alert(report);
  }

  function toggleGlobalRoll(id) {
    const c = clocks.find(x => x.id === id);
    if (c) {
        c.includeInGlobal = !c.includeInGlobal;
        saveClocks();
    }
  }

  function updateStepLabel(id, stepIdx, label) {
    const c = clocks.find(x => x.id === id);
    if (c && c.steps[stepIdx]) {
        c.steps[stepIdx].label = label;
        saveClocks();
    }
  }

  function reorderClock(id, direction) {
    const idx = clocks.findIndex(c => c.id === id);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= clocks.length) return;
    
    const temp = clocks[idx];
    clocks[idx] = clocks[newIdx];
    clocks[newIdx] = temp;
    saveClocks();
  }

  function setClock(id, val) {
    const c = clocks.find(x => x.id === id);
    if (!c) return;
    const oldVal = c.current;
    c.current = val;
    // Sync steps
    c.steps.forEach((s, i) => {
        s.status = i < val ? 'filled' : 'pending';
    });
    
    if (val > oldVal && c.steps[val-1]) {
        addHistoryEntry(`[${c.name}] Ajustado manualmente para Etapa ${val}: ${c.steps[val-1].label}`);
    } else if (val < oldVal) {
        addHistoryEntry(`[${c.name}] Revertido para Etapa ${val}`);
    }
    saveClocks();
  }

  function renderGlobalHistory() {
    const list = document.getElementById('clocks-global-history');
    if (!list) return;
    
    if (clocksHistory.length === 0) {
        list.innerHTML = '<div style="color:var(--text-muted); font-size:0.6rem; text-align:center; padding:10px;">Sem histórico de frentes.</div>';
        return;
    }
    
    list.innerHTML = clocksHistory.map(h => `
        <div style="font-size:0.65rem; color:var(--text-secondary); border-bottom:1px solid rgba(255,255,255,0.03); padding:4px 0; display:flex; gap:8px;">
            <span style="color:var(--text-muted); font-family:monospace; min-width:40px;">${h.timestamp}</span>
            <span>${h.msg}</span>
        </div>
    `).join('');
  }

  function renderClocks() {
    const list = document.getElementById('clocks-list');
    if (!list) return;

    if (clocks.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding: 20px 0;">Nenhum relógio ativo. Crie uma nova ameaça acima.</div>';
      return;
    }

    list.innerHTML = clocks.map(c => {
      if (c.id === editingClockId) {
          // EDIT MODE UI
          return `
            <div class="clock-item edit-mode" style="border: 1px solid var(--gold); background: rgba(212,168,70,0.05);">
                <div class="field" style="margin-bottom:10px;">
                    <label class="field__label">Nome da Frente</label>
                    <input type="text" id="edit-clock-name" class="field__input" value="${c.name}" style="text-align:left;">
                </div>
                <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:8px; text-transform:uppercase; font-weight:700;">Descrições das Etapas</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:12px;">
                    ${c.steps.map((s, idx) => `
                        <div>
                            <label style="font-size:0.6rem; color:var(--text-muted);">E${idx+1}</label>
                            <input type="text" class="field__input edit-step-desc" data-idx="${idx}" value="${s.label}" style="font-size:0.7rem; padding:4px; text-align:left;">
                        </div>
                    `).join('')}
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-primary btn-sm" style="flex:1" onclick="NarrativeTools.saveClockEdit('${c.id}')">Salvar</button>
                    <button class="btn btn-secondary btn-sm" style="flex:1" onclick="NarrativeTools.cancelEditClock()">Cancelar</button>
                </div>
            </div>
          `;
      }

      const isComplete = c.current >= c.max;
      const currentStep = (c.current > 0 && c.current <= c.max) ? c.steps[c.current-1] : null;

      let segments = '';
      c.steps.forEach((s, i) => {
        segments += `
          <div class="clock-segment ${i < c.current ? 'filled' : ''}" onclick="NarrativeTools.setClock('${c.id}', ${i+1})" title="${s.label}"></div>`;
      });

      return `
        <div class="clock-item" style="${isComplete ? 'border-color:var(--red-accent); box-shadow: 0 0 10px rgba(196,30,58,0.2)' : ''}">
          <div class="clock-header">
            <div style="display:flex; align-items:center; gap:8px; min-width:0; flex:1;">
                <input type="checkbox" ${c.includeInGlobal ? 'checked' : ''} onchange="NarrativeTools.toggleGlobalRoll('${c.id}')" title="Incluir no Rolo Global">
                <span class="clock-title" style="${isComplete ? 'color:var(--red-accent)' : ''}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.name}</span>
            </div>
            <div style="display:flex; gap:4px;">
                <button class="clock-delete" onclick="NarrativeTools.enterEditClock('${c.id}')" title="Editar">✏️</button>
                <button class="clock-delete" onclick="NarrativeTools.reorderClock('${c.id}', -1)" title="Subir">↑</button>
                <button class="clock-delete" onclick="NarrativeTools.reorderClock('${c.id}', 1)" title="Descer">↓</button>
                <button class="clock-delete" onclick="NarrativeTools.deleteClock('${c.id}')" title="Excluir">✕</button>
            </div>
          </div>
          
          ${currentStep ? `
            <div style="color:var(--red-accent); font-family:var(--font-display); font-size:1.05rem; font-weight:900; line-height:1.2; margin-bottom:5px; text-transform:uppercase; letter-spacing:0.02em;">
                ${currentStep.label}
            </div>` : ''}

          <div class="clock-progress" style="gap:4px; margin-bottom:8px;">${segments}</div>
          
          <div class="clock-action" style="justify-content:space-between; align-items:center;">
            <div style="font-size:0.75rem; color:var(--text-muted); font-weight:700;">${c.current} / ${c.max}</div>
            <div style="display:flex; gap:4px;">
              <button class="btn btn-secondary btn-sm" onclick="NarrativeTools.setClock('${c.id}', ${Math.max(0, c.current - 1)})" title="Retroceder">-</button>
              <button class="btn btn-secondary btn-sm" onclick="NarrativeTools.setClock('${c.id}', ${Math.min(c.max, c.current + 1)})" title="Avançar Manualmente">+</button>
              <button class="btn btn-primary btn-sm" onclick="NarrativeTools.tickClock('${c.id}')" title="Rolar 1d6 (5-6=+2, 3-4=+1)" ${isComplete ? 'disabled style="opacity:0.5"' : ''}>🎲 Rolar</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  function enterEditClock(id) {
      editingClockId = id;
      renderClocks();
  }

  function cancelEditClock() {
      editingClockId = null;
      renderClocks();
  }

  function saveClockEdit(id) {
      const c = clocks.find(x => x.id === id);
      if (!c) return cancelEditClock();

      const newName = document.getElementById('edit-clock-name').value.trim();
      const descInputs = document.querySelectorAll('.edit-step-desc');

      if (newName) c.name = newName;
      
      descInputs.forEach(input => {
          const idx = parseInt(input.dataset.idx);
          if (c.steps[idx]) {
              c.steps[idx].label = input.value.trim() || `Etapa ${idx+1}`;
          }
      });

      addHistoryEntry(`Frente editada: ${c.name}`);
      editingClockId = null;
      saveClocks();
  }

  function clearClocksHistory() {
    if (!confirm("Limpar todo o histórico de frentes?")) return;
    clocksHistory = [];
    saveClocks();
  }

  // --- MASS COMBAT ---
  function resolveMassCombat() {
    const aName = document.getElementById('mass-name').value || 'Exército Aliado';
    const dName = document.getElementById('mass-enemy').value || 'Forças Inimigas';

    const fA = parseInt(document.getElementById('mass-force-a').value) || 0;
    const vT = parseInt(document.getElementById('mass-adv').value) || 0;
    const dV = parseInt(document.getElementById('mass-disadv').value) || 0;

    const manualRoll = document.getElementById('mass-roll').value;

    // Simula 3d6 físicos ou captura o valor inserido (Se for sistema de batalha GURPS)
    const rollTotal = manualRoll ? parseInt(manualRoll) : (Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1 + Math.floor(Math.random() * 6) + 1);

    // Cálculo abstrato simplificado: Força + Vant - Desvant vs Rolagem (onde Rolagens baixas no GURPS são sucesso. Ou altas? 
    // GURPS Padrão: Rolar <= Nível de Habilidade. Margem de Sucesso = Habilidade - Rolagem.
    const effectiveSkill = fA + vT - dV;
    const margin = effectiveSkill - rollTotal;

    let resultLog = `<strong>Confronto Misto:</strong> <span style="color:var(--gold)">${aName}</span> contra <span style="color:var(--red-failure)">${dName}</span>\n`;
    resultLog += `<strong>Poder Tático Final:</strong> ${fA} (Base) + ${vT} (Vant) - ${dV} (Desv) = <span style="color:var(--text-primary)">Nível ${effectiveSkill}</span>\n`;
    resultLog += `<strong>Rolada (${manualRoll ? 'Física' : 'Auto 3d6'}):</strong> ${rollTotal}\n\n`;

    if (margin >= 10 || rollTotal <= 4) {
      resultLog += `🏆 <strong style="color:var(--green-success)">Vitória Esmagadora (Margem +${margin}):</strong> ${aName} obliterou as forças adversárias de surpresa. O inimigo sofre perdas catastróficas (>25%) e a moral colapsa. Suas baixas são insignificantes.`;
    } else if (margin >= 0) {
      resultLog += `✅ <strong style="color:var(--gold)">Vitória Estratégica (Margem +${margin}):</strong> ${aName} dominou o campo após intenso choque. O inimigo recua em ordem. Suas perdas são leves a moderadas (5-10%), mas o objetivo foi garantido.`;
    } else if (margin >= -5) {
      resultLog += `⚠ <strong style="color:var(--red-accent)">Reveses e Retirada (Margem ${margin}):</strong> ${aName} foi contido pelas defesas inimigas. Incapaz de quebrar a linha, exige recuo defensivo. Ambos perdem 10-15%. Formação avariada.`;
    } else {
      resultLog += `💀 <strong style="color:var(--red-blood)">Desastre Militar (Margem ${margin}):</strong> As forças de ${aName} foram destroçadas no flanco ou cercadas! Baixas terríveis (>30%), quebra total de liderança e sobreviventes em fuga irregular.`;
    }

    document.getElementById('mass-log').innerHTML = resultLog;
  }

  // --- INIT BOOT ---
  document.addEventListener("DOMContentLoaded", () => {
    initNotes();
    loadClocks();
  });

  return { 
    toggleDrawer, toggleModal, addClock, deleteClock, tickClock, setClock, resolveMassCombat,
    addNotePage, deleteNotePage, renameNotePage, switchNotePage, updateActiveNoteContent, toggleNotesPreview,
    rollAllClocks, toggleGlobalRoll, updateStepLabel, reorderClock, renderStepInputs, clearClocksHistory,
    enterEditClock, cancelEditClock, saveClockEdit
  };

})();
