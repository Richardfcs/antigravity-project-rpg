/* ═════════════════════════════════════════════
   NARRATIVE TOOLS — Escudo do Daimyo
   Anotações, Relógios e Combate em Massa
   ═════════════════════════════════════════════ */

const NarrativeTools = (function () {

  // State Keys
  const NOTES_KEY = 'daimyo_gm_notes';
  const CLOCKS_KEY = 'daimyo_faction_clocks';

  // Local State
  let clocks = [];

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

  // --- GM NOTES ---
  function initNotes() {
    const editor = document.getElementById('gm-notes-editor');
    if (!editor) return;

    // Load
    const saved = localStorage.getItem(NOTES_KEY);
    if (saved) editor.value = saved;

    // Save on Input
    editor.addEventListener('input', () => {
      localStorage.setItem(NOTES_KEY, editor.value);
      const status = document.getElementById('gm-notes-status');
      if (status) {
        status.textContent = 'Salvando...';
        clearTimeout(editor._saveTimeout);
        editor._saveTimeout = setTimeout(() => {
          status.textContent = 'Sincronizado ✓';
        }, 500);
      }
    });
  }

  // --- CLOCKS (AMEAÇAS) ---
  function loadClocks() {
    const saved = localStorage.getItem(CLOCKS_KEY);
    if (saved) {
      try { clocks = JSON.parse(saved); } catch (e) { clocks = []; }
    }
    renderClocks();
  }

  function saveClocks() {
    localStorage.setItem(CLOCKS_KEY, JSON.stringify(clocks));
    renderClocks();
  }

  function addClock() {
    const nameInput = document.getElementById('clock-new-name');
    const stepsInput = document.getElementById('clock-new-steps');
    if (!nameInput || !stepsInput) return;

    const name = nameInput.value.trim();
    const max = parseInt(stepsInput.value) || 4;

    if (!name) return;

    clocks.unshift({
      id: 'clk_' + Date.now(),
      name: name,
      max: Math.max(2, max),
      current: 0
    });

    nameInput.value = '';
    saveClocks();
  }

  function deleteClock(id) {
    if (!confirm("Remover esta frente/ameaça permanentemente?")) return;
    clocks = clocks.filter(c => c.id !== id);
    saveClocks();
  }

  function tickClock(id) {
    const c = clocks.find(x => x.id === id);
    if (!c || c.current >= c.max) return;

    // Rola um d6 para ver se avançou
    const roll = Math.floor(Math.random() * 6) + 1;
    let advance = 0;
    let msg = "";

    if (roll >= 5) { advance = 2; msg = `Rolou ${roll}: Progresso Rápido (+2)!`; }
    else if (roll >= 3) { advance = 1; msg = `Rolou ${roll}: Progresso Lento (+1).`; }
    else { advance = 0; msg = `Rolou ${roll}: Falha/Atraso (0).`; }

    if (advance > 0) {
      c.current = Math.min(c.max, c.current + advance);
      saveClocks();
    }

    // Feedback rápido (idealmente num toast, mas alert/console serve por hora)
    console.log(`Relógio [${c.name}]: ${msg}`);
  }

  function setClock(id, val) {
    const c = clocks.find(x => x.id === id);
    if (!c) return;
    c.current = val;
    saveClocks();
  }

  function renderClocks() {
    const list = document.getElementById('clocks-list');
    if (!list) return;

    if (clocks.length === 0) {
      list.innerHTML = '<div style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding: 20px 0;">Nenhum relógio ativo. Crie uma nova ameaça acima.</div>';
      return;
    }

    list.innerHTML = clocks.map(c => {
      const isComplete = c.current >= c.max;

      let segments = '';
      for (let i = 0; i < c.max; i++) {
        segments += `<div class="clock-segment ${i < c.current ? 'filled' : ''}"></div>`;
      }

      return `
        <div class="clock-item" style="${isComplete ? 'border-color:var(--red-accent); box-shadow: 0 0 10px rgba(196,30,58,0.2)' : ''}">
          <div class="clock-header">
            <span class="clock-title" style="${isComplete ? 'color:var(--red-accent)' : ''}">${c.name}</span>
            <button class="clock-delete" onclick="NarrativeTools.deleteClock('${c.id}')" title="Excluir">✕</button>
          </div>
          <div class="clock-progress">${segments}</div>
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

  return { toggleDrawer, toggleModal, addClock, deleteClock, tickClock, setClock, resolveMassCombat };

})();
