/**
 * ════════════════════════════════════════════════════════════════
 * MESA TÁTICA DE GUERRA V2 (TACTICAL WAR MAP)
 * Drag & Drop, Zoom/Pan, Árvore Semântica, e Registro de Mapa Offline
 * ════════════════════════════════════════════════════════════════
 */

(function() {
  const STORAGE_TOKENS = 'daimyo_war_map_tokens';
  const STORAGE_TREE = 'daimyo_map_hierarchy';
  const MAPS_FOLDER = 'Maps/';

  // DEFAULT MAP TREE
  let defaultTree = {
    macro: { id: "Mapa Macro.png", name: "Japão Macro" },
    regions: [
      { id: "Região Chugoku.png", name: "Região de Chugoku" }
    ],
    cities: [
      { id: "Kamamura.png", name: "Kamamura", parentId: "Região Chugoku.png" }
    ]
  };

  let mapTree = null;
  let tokensState = {};
  
  let currentMapId = "";
  let isMapOpen = false;

  // CAMERA STATE
  let camScale = 1;
  let camX = 0;
  let camY = 0;
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;

  // CONTEXT MENU STATE
  let contextTargetId = null;
  const contextMenu = document.getElementById('token-context-menu');

  // DOM Elements
  const tacticalBoard = document.getElementById('tactical-board');
  const mainView = document.querySelector('.main');
  const historyView = document.getElementById('history-section');
  
  const viewport = document.getElementById('tactical-map-viewport');
  const content = document.getElementById('tactical-map-content');

  // Controls UI
  const selLevel = document.getElementById('sel-map-level');
  const selSpecific = document.getElementById('sel-map-specific');
  const btnRegister = document.getElementById('btn-register-map');
  
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');

  const btnAddPlayer = document.getElementById('btn-add-player');
  const btnAddEnemy = document.getElementById('btn-add-enemy');
  const btnClearMap = document.getElementById('btn-clear-map');

  // Modal UI
  const modalRegister = document.getElementById('modal-register-map');
  const regLevel = document.getElementById('reg-map-level');
  const regParentCont = document.getElementById('reg-map-parent-container');
  const regParent = document.getElementById('reg-map-parent');
  const regName = document.getElementById('reg-map-name');
  const regFile = document.getElementById('reg-map-file');
  const btnRegCancel = document.getElementById('btn-reg-cancel');
  const btnRegSave = document.getElementById('btn-reg-save');

  // DRAG STATE
  let dragMode = null; // 'token' or 'camera'
  let activeToken = null;
  let startClientX = 0, startClientY = 0;
  let startCamX = 0, startCamY = 0;
  let startTokenLeft = 0, startTokenTop = 0;

  // ── INIT ──
  async function init() {
    await loadData();
    setupControls();
    setupCameraEvents();
    setupContextMenu();
    setupModal();
    updateSelectors();

    // Fechar menu de contexto ao clicar fora
    document.addEventListener('click', hideContextMenu);
    viewport.addEventListener('wheel', hideContextMenu);
  }

  // ── COFRE INFINITO / DATA MANAGER ──
  async function loadData() {
    // Wait for Vault
    while (!window.DaimyoDB) {
      await new Promise(r => setTimeout(r, 100));
    }

    try {
      const savedTree = await window.DaimyoDB.get(window.DaimyoDB.STORES.MAP_STATE, 'hierarchy');
      mapTree = savedTree ? savedTree : JSON.parse(JSON.stringify(defaultTree));
      if(!mapTree || !mapTree.macro) mapTree = JSON.parse(JSON.stringify(defaultTree));
    } catch { mapTree = JSON.parse(JSON.stringify(defaultTree)); }

    try {
      const savedTokens = await window.DaimyoDB.get(window.DaimyoDB.STORES.MAP_STATE, 'tokens');
      tokensState = savedTokens ? savedTokens : {};
    } catch { tokensState = {}; }
  }

  async function saveData() {
    if (!window.DaimyoDB) return;
    await window.DaimyoDB.put(window.DaimyoDB.STORES.MAP_STATE, 'hierarchy', mapTree);
    await window.DaimyoDB.put(window.DaimyoDB.STORES.MAP_STATE, 'tokens', tokensState);
  }

  // ── UI / TREE SELECTORS ──
  function setupControls() {
    selLevel.addEventListener('change', updateSelectors);
    selSpecific.addEventListener('change', (e) => {
      currentMapId = e.target.value;
      loadCurrentMap();
    });

    btnAddPlayer.addEventListener('click', () => {
      const name = prompt('Nome do Grupo/Aliado (Opcional):', 'Grupo');
      if (name !== null) addToken('player', name);
    });

    btnAddEnemy.addEventListener('click', () => {
      const name = prompt('Nome do Inimigo/Bando (Opcional):', 'Inimigo');
      if (name !== null) addToken('enemy', name);
    });

    btnClearMap.addEventListener('click', () => {
      if (!currentMapId) return;
      if (confirm(`Tem certeza que deseja limpar TODOS os pinos do mapa aberto?`)) {
        tokensState[currentMapId] = [];
        saveData();
        renderTokens();
      }
    });
  }

  function updateSelectors() {
    const level = selLevel.value;
    selSpecific.style.display = level === 'macro' ? 'none' : 'block';
    selSpecific.innerHTML = '';
    
    if (level === 'macro') {
      currentMapId = mapTree.macro.id;
      loadCurrentMap();
      return;
    }

    let arr = level === 'region' ? mapTree.regions : mapTree.cities;
    if (arr.length === 0) {
      selSpecific.innerHTML = '<option value="">(Nenhum Cadastrado)</option>';
      currentMapId = "";
      loadCurrentMap();
      return;
    }

    arr.forEach(item => {
      let opt = document.createElement('option');
      opt.value = item.id;
      let prefix = "";
      if (level === 'city' && item.parentId) {
        const parent = mapTree.regions.find(r => r.id === item.parentId);
        if (parent) prefix = `[${parent.name}] `;
      }
      opt.textContent = prefix + item.name;
      selSpecific.appendChild(opt);
    });

    currentMapId = selSpecific.value;
    loadCurrentMap();
  }

  function loadCurrentMap() {
    if (!currentMapId) {
      content.style.backgroundImage = 'none';
      content.innerHTML = '';
      imgWidth = 0; imgHeight = 0;
      return;
    }
    
    const safeUrl = (MAPS_FOLDER + currentMapId).replace(/'/g, "\\'");
    content.style.backgroundImage = 'url("' + safeUrl + '")';
    
    // Reseta câmera ao trocar o mapa (Centraliza inicialmente sem travas)
    camScale = 1;
    // O viewport costuma ser o container pai, vamos tentar centralizar o (0,0) do content
    // Mas sem saber o tamanho da imagem (que removemos), o melhor é deixar (0,0)
    // ou usar o tamanho do container se ele for fixo.
    // Como voltamos ao padrão, deixamos conforme solicitado:
    camX = 0; camY = 0;
    applyCamera(false);

    renderTokens();
  }

  function renderTokens() {
    content.innerHTML = ''; // Limpa pinos anteriores
    if (!currentMapId) return;

    const tokens = tokensState[currentMapId] || [];
    tokens.forEach(token => {
      const el = document.createElement('div');
      const px = token.x !== undefined ? token.x : 50;
      const py = token.y !== undefined ? token.y : 50;
      const sizeClass = `token-${token.size || 'md'}`;
      const colorClass = `token-${token.color || token.type}`;
      const shapeClass = `token-shape-${token.shape || 'circle'}`;

      el.className = `tactical-token ${sizeClass} ${colorClass} ${shapeClass}`;
      el.dataset.id = token.id; // GARANTE O ID PARA O CONTEXT MENU
      el.style.left = `${px}%`;
      el.style.top = `${py}%`;

      const init = (token.name || token.type).charAt(0).toUpperCase();
      el.textContent = init;

      if(token.name) {
        const label = document.createElement('div');
        label.className = 'token-label';
        label.textContent = token.name;
        el.appendChild(label);
      }

      // Evento de tocar no Pino (Drag)
      el.addEventListener('pointerdown', (e) => {
        if (e.button === 2) return; 
        e.stopPropagation();
        hideContextMenu();
        startTokenDrag(e, el, token);
      });

      // Context Menu (Right Click)
      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, token.id);
      });
      
      el.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        // Skip alert, just delete or open context menu
      });

      content.appendChild(el);
    });
  }

  // ── MODAL REGISTER ──
  function setupModal() {
    btnRegister.addEventListener('click', () => {
      modalRegister.style.display = 'flex';
      regName.value = '';
      regFile.value = '';
      updateModalFields();
    });

    btnRegCancel.addEventListener('click', () => {  modalRegister.style.display = 'none'; });
    
    regLevel.addEventListener('change', updateModalFields);

    btnRegSave.addEventListener('click', () => {
       const lvl = regLevel.value;
       const name = regName.value.trim();
       const file = regFile.value.trim();
       const parentRow = regParent.value;

       if(!name || !file) return alert('Por favor, preencha o Nome e o Arquivo exato.');

       if (lvl === 'region') {
         mapTree.regions.push({ id: file, name: name });
       } else {
         mapTree.cities.push({ id: file, name: name, parentId: parentRow });
       }

       saveData();
       modalRegister.style.display = 'none';
       updateSelectors();
    });
  }

  function updateModalFields() {
    if (regLevel.value === 'city') {
      regParentCont.style.display = 'block';
      regParent.innerHTML = '';
      
      if(mapTree.regions.length === 0) {
        regParent.innerHTML = '<option value="">Nenhuma Região (Mundo Aberto)</option>';
      } else {
        mapTree.regions.forEach(r => {
          let o = document.createElement('option');
          o.value = r.id; o.textContent = r.name;
          regParent.appendChild(o);
        });
      }
    } else {
      regParentCont.style.display = 'none';
    }
  }

  // ── CAMERA & PAN ──
  function setupCameraEvents() {
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      // Zoom
      const delta = e.deltaY * -0.001;
      camScale += delta;
      camScale = Math.min(Math.max(MIN_SCALE, camScale), MAX_SCALE);
      applyCamera(false);
    }, { passive: false });

    // Buttons
    btnZoomIn.addEventListener('click', () => { camScale = Math.min(MAX_SCALE, camScale + 0.2); applyCamera(); });
    btnZoomOut.addEventListener('click', () => { camScale = Math.max(MIN_SCALE, camScale - 0.2); applyCamera(); });
    btnZoomReset.addEventListener('click', () => { camScale = 1; camX = 0; camY = 0; applyCamera(); });

    // Pan do Viewport
    viewport.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.tactical-token')) return; // Pino lida com isso
      dragMode = 'camera';
      viewport.setPointerCapture(e.pointerId);
      
      startClientX = e.clientX;
      startClientY = e.clientY;
      startCamX = camX;
      startCamY = camY;

      viewport.addEventListener('pointermove', onCameraMove);
      viewport.addEventListener('pointerup', onCameraEnd);
      viewport.addEventListener('pointercancel', onCameraEnd);
    });
  }

  function onCameraMove(e) {
    if (dragMode !== 'camera') return;
    camX = startCamX + (e.clientX - startClientX);
    camY = startCamY + (e.clientY - startClientY);
    applyCamera(false);
  }

  function onCameraEnd(e) {
    dragMode = null;
    viewport.releasePointerCapture(e.pointerId);
    viewport.removeEventListener('pointermove', onCameraMove);
    viewport.removeEventListener('pointerup', onCameraEnd);
    viewport.removeEventListener('pointercancel', onCameraEnd);
  }

  function applyCamera(smooth = true) {
    content.style.transition = smooth ? 'transform 0.2s ease-out' : 'none';
    content.style.transform = `translate(${camX}px, ${camY}px) scale(${camScale})`;
  }

  // ── CONTEXT MENU LOGIC ──
  function setupContextMenu() {
    if (!contextMenu) return;

    document.getElementById('ctx-delete-token').addEventListener('click', () => {
      if (contextTargetId) deleteToken(contextTargetId);
      hideContextMenu();
    });

    contextMenu.querySelectorAll('.color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        updateTokenProperty(contextTargetId, 'color', dot.dataset.color);
        hideContextMenu();
      });
    });

    contextMenu.querySelectorAll('.size-box').forEach(box => {
      box.addEventListener('click', (e) => {
        e.stopPropagation();
        if (box.dataset.size) {
          updateTokenProperty(contextTargetId, 'size', box.dataset.size);
        } else if (box.dataset.shape) {
          updateTokenProperty(contextTargetId, 'shape', box.dataset.shape);
        }
        hideContextMenu();
      });
    });
  }

  function showContextMenu(x, y, tokenId) {
    if (!contextMenu) return;
    contextTargetId = tokenId;
    contextMenu.style.display = 'flex';
    
    // Ajuste de posição para não sair da tela
    const menuW = contextMenu.offsetWidth || 150;
    const menuH = contextMenu.offsetHeight || 200;
    
    let posX = x;
    let posY = y;
    
    if (x + menuW > window.innerWidth) posX -= menuW;
    if (y + menuH > window.innerHeight) posY -= menuH;
    
    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top = `${posY}px`;
  }

  function hideContextMenu() {
    if (contextMenu) contextMenu.style.display = 'none';
    contextTargetId = null;
  }

  function updateTokenProperty(id, prop, value) {
    if (!currentMapId) return;
    const tokens = tokensState[currentMapId] || [];
    const token = tokens.find(t => t.id === id);
    if (token) {
      token[prop] = value;
      saveData();
      renderTokens();
    }
  }

  // ── DRAG TOKENS ──
  function startTokenDrag(e, tokenEl, tokenData) {
    e.preventDefault();
    dragMode = 'token';
    activeToken = tokenEl;
    activeToken.classList.add('dragging');
    activeToken.setPointerCapture(e.pointerId);

    startClientX = e.clientX;
    startClientY = e.clientY;
    startTokenLeft = parseFloat(tokenEl.style.left) || 50;
    startTokenTop = parseFloat(tokenEl.style.top) || 50;

    activeToken.addEventListener('pointermove', onTokenMove);
    activeToken.addEventListener('pointerup', onTokenEnd);
    activeToken.addEventListener('pointercancel', onTokenEnd);
  }

  function onTokenMove(e) {
    if (dragMode !== 'token' || !activeToken) return;
    
    // Calcula o delta considerando o scale da câmera!!
    const deltaX = (e.clientX - startClientX) / camScale;
    const deltaY = (e.clientY - startClientY) / camScale;

    // Viewport pode ser usado como a base 100% já que content é 100% w/h dele
    const w = content.offsetWidth || viewport.clientWidth;
    const h = content.offsetHeight || viewport.clientHeight;

    const deltaPercentX = (deltaX / w) * 100;
    const deltaPercentY = (deltaY / h) * 100;

    let newLeft = startTokenLeft + deltaPercentX;
    let newTop = startTokenTop + deltaPercentY;

    // Clamp 0 to 100
    newLeft = Math.max(0, Math.min(100, newLeft));
    newTop = Math.max(0, Math.min(100, newTop));

    activeToken.style.left = `${newLeft}%`;
    activeToken.style.top = `${newTop}%`;
  }

  function onTokenEnd(e) {
    if (!activeToken) return;
    activeToken.classList.remove('dragging');
    activeToken.releasePointerCapture(e.pointerId);

    activeToken.removeEventListener('pointermove', onTokenMove);
    activeToken.removeEventListener('pointerup', onTokenEnd);
    activeToken.removeEventListener('pointercancel', onTokenEnd);

    // Save
    const id = activeToken.dataset.id;
    const finalLeft = parseFloat(activeToken.style.left);
    const finalTop = parseFloat(activeToken.style.top);

    const match = (tokensState[currentMapId] || []).find(t => t.id === id);
    if (match) {
      match.x = finalLeft;
      match.y = finalTop;
      saveData();
    }

    dragMode = null;
    activeToken = null;
  }

  function addToken(type, name) {
    if (!currentMapId) return;
    if (!tokensState[currentMapId]) tokensState[currentMapId] = [];
    tokensState[currentMapId].push({
      id: Date.now().toString(),
      type: type,
      name: name,
      size: 'md',
      color: type,
      shape: 'circle',
      x: 50, 
      y: 50  
    });
    saveData();
    renderTokens();
  }

  function deleteToken(id) {
    if (!currentMapId) return;
    tokensState[currentMapId] = tokensState[currentMapId].filter(t => t.id !== id);
    saveData();
    renderTokens();
  }

  // ── TOGGLE MAIN VIEW ──
  window.toggleTacticalMap = function() {
    isMapOpen = !isMapOpen;
    if (isMapOpen) {
      mainView.style.display = 'none';
      if (historyView) historyView.style.display = 'none';
      tacticalBoard.style.display = 'flex';
      setTimeout(() => { applyCamera(true); }, 50);
    } else {
      mainView.style.display = ''; 
      if (historyView) historyView.style.display = '';
      tacticalBoard.style.display = 'none';
    }
  };

  // Start app
  init();

})();
