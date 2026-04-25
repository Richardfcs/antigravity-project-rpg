/**
 * ════════════════════════════════════════════════════════════════
 * MESA TÁTICA DE GUERRA V3 (TACTICAL WAR MAP)
 * Upload de Arquivo, Hierarquia Visual, Grid de Batalha, Mobile-First
 * ════════════════════════════════════════════════════════════════
 */

(function () {
  const STORAGE_TOKENS = 'daimyo_war_map_tokens';
  const STORAGE_TREE = 'daimyo_map_hierarchy';
  const MEDIA_PREFIX = 'map_img_';

  // DEFAULT MAP TREE
  let defaultTree = {
    macro: { id: "mapa-macro.png", name: "Japão Macro", source: "bundled" },
    regions: [
      { id: "regiao-chugoku.png", name: "Região de Chugoku", source: "bundled" }
    ],
    cities: [
      { id: "kamamura.png", name: "Kamamura", parentId: "regiao-chugoku.png", source: "bundled" }
    ],
    battles: [
      { id: "grid-battle.png", name: "Grid de Batalha", parentId: "kamamura.png", source: "bundled", hasGrid: true, gridSize: 48 }
    ]
  };

  let mapTree = null;
  let tokensState = {};
  let currentMapId = "";
  let currentMapType = "";
  let isMapOpen = false;

  // CAMERA STATE
  let camScale = 1;
  let camX = 0;
  let camY = 0;
  const MIN_SCALE = 0.2;
  const MAX_SCALE = 5;

  // GRID STATE
  let gridEnabled = false;
  let gridSize = 48;

  // CONTEXT MENU STATE
  let contextTargetId = null;

  // UPLOAD STATE
  let uploadedFileData = null;
  let selectedMapType = null;

  // TOKEN MODAL STATE
  let tokenModalType = null;
  let tokenModalImage = null;

  // DOM Elements
  const tacticalBoard = document.getElementById('tactical-board');
  const mainView = document.querySelector('.main');
  const historyView = document.getElementById('history-section');
  const viewport = document.getElementById('tactical-map-viewport');
  const content = document.getElementById('tactical-map-content');
  const emptyState = document.getElementById('map-empty-state');
  const breadcrumb = document.getElementById('map-breadcrumb');
  const battleGridEl = document.getElementById('battle-grid');
  const contextMenu = document.getElementById('token-context-menu');

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
  const btnToggleGrid = document.getElementById('btn-toggle-grid');
  const selGridSize = document.getElementById('sel-grid-size');

  // Modal UI
  const modalRegister = document.getElementById('modal-register-map');
  const regName = document.getElementById('reg-map-name');
  const regFileInput = document.getElementById('reg-map-file-input');
  const regParentCont = document.getElementById('reg-map-parent-container');
  const regParent = document.getElementById('reg-map-parent');
  const btnRegCancel = document.getElementById('btn-reg-cancel');
  const btnRegCancelBottom = document.getElementById('btn-reg-cancel-bottom');
  const btnRegSave = document.getElementById('btn-reg-save');
  const uploadZone = document.getElementById('upload-zone');
  const uploadZoneContent = document.getElementById('upload-zone-content');
  const uploadZonePreview = document.getElementById('upload-zone-preview');
  const uploadPreviewImg = document.getElementById('upload-preview-img');
  const uploadFilename = document.getElementById('upload-filename');
  const btnRemoveUpload = document.getElementById('btn-remove-upload');
  const mapTypeCards = document.getElementById('map-type-cards');
  const battleGridOptions = document.getElementById('battle-grid-options');
  const regHasGrid = document.getElementById('reg-has-grid');
  const regGridSize = document.getElementById('reg-grid-size');
  const gridSizeRow = document.getElementById('grid-size-row');
  const labelNameStep = document.getElementById('label-name-step');
  const labelFileStep = document.getElementById('label-file-step');

  // DRAG STATE
  let dragMode = null;
  let activeToken = null;
  let startClientX = 0, startClientY = 0;
  let startCamX = 0, startCamY = 0;
  let startTokenLeft = 0, startTokenTop = 0;

  let isInitialized = false;

  // ── INIT ──
  async function init() {
    await loadData();
    
    // Global listeners setup only once
    if (!isInitialized) {
      document.addEventListener('click', hideContextMenu);
      viewport.addEventListener('wheel', hideContextMenu);
      isInitialized = true;
    }

    setupControls();
    setupCameraEvents();
    setupContextMenu();
    setupModal();
    setupUploadZone();
    setupTokenModal();
    updateSelectors();
  }

  // ── DATA MANAGER ──
  async function loadData() {
    while (!window.DaimyoDB) {
      await new Promise(r => setTimeout(r, 100));
    }

    try {
      const savedTree = await window.DaimyoDB.get(window.DaimyoDB.STORES.MAP_STATE, 'hierarchy');
      const { merged, changed } = syncMapTree(savedTree, defaultTree);
      mapTree = merged;
      if (changed) {
        console.log("⛩️ Porta do Daimyo: Sincronizando novos mapas padrão...");
        await saveData();
      }
    } catch (err) { 
      console.error("Falha ao sincronizar hierarquia, usando padrão:", err);
      mapTree = JSON.parse(JSON.stringify(defaultTree)); 
    }

    try {
      const savedTokens = await window.DaimyoDB.get(window.DaimyoDB.STORES.MAP_STATE, 'tokens');
      tokensState = savedTokens ? savedTokens : {};
    } catch { tokensState = {}; }
  }

  function syncMapTree(saved, defaults) {
    if (!saved || !saved.macro) return { merged: JSON.parse(JSON.stringify(defaults)), changed: true };

    const merged = JSON.parse(JSON.stringify(saved));
    let changed = false;

    // Ensure structure
    if (!merged.regions) merged.regions = [];
    if (!merged.cities) merged.cities = [];
    if (!merged.battles) merged.battles = [];

    const checkAndAdd = (listName, defaultList) => {
      defaultList.forEach(defItem => {
        const existing = merged[listName].find(item => item.id === defItem.id);
        if (!existing) {
          merged[listName].push(JSON.parse(JSON.stringify(defItem)));
          changed = true;
        }
      });
    };

    checkAndAdd('regions', defaults.regions);
    checkAndAdd('cities', defaults.cities);
    checkAndAdd('battles', defaults.battles);

    return { merged, changed };
  }

  async function saveData() {
    if (!window.DaimyoDB) return;
    await window.DaimyoDB.put(window.DaimyoDB.STORES.MAP_STATE, 'hierarchy', mapTree);
    await window.DaimyoDB.put(window.DaimyoDB.STORES.MAP_STATE, 'tokens', tokensState);
  }

  async function saveMapImage(mapId, dataUrl) {
    if (!window.DaimyoDB) return;
    await window.DaimyoDB.put(window.DaimyoDB.STORES.MEDIA, MEDIA_PREFIX + mapId, dataUrl);
  }

  async function getMapImage(mapId) {
    if (!window.DaimyoDB) return null;
    return await window.DaimyoDB.get(window.DaimyoDB.STORES.MEDIA, MEDIA_PREFIX + mapId);
  }

  async function removeMapImage(mapId) {
    if (!window.DaimyoDB) return;
    await window.DaimyoDB.remove(window.DaimyoDB.STORES.MEDIA, MEDIA_PREFIX + mapId);
  }

  // ── UI / TREE SELECTORS ──
  // NAMED HANDLERS (for idempotency)
  const onLevelChange = () => updateSelectors();
  const onSpecificChange = (e) => {
    currentMapId = e.target.value;
    loadCurrentMap();
  };
  const onAddPlayer = () => {
    if (!currentMapId) return;
    openAddTokenModal('player');
  };
  const onAddEnemy = () => {
    if (!currentMapId) return;
    openAddTokenModal('enemy');
  };
  const onClearMap = () => {
    if (!currentMapId) return;
    if (confirm('Limpar TODOS os pinos deste mapa?')) {
      tokensState[currentMapId] = [];
      saveData();
      renderTokens();
    }
  };
  const onToggleGrid = () => {
    gridEnabled = !gridEnabled;
    selGridSize.style.display = gridEnabled ? '' : 'none';
    btnToggleGrid.style.color = gridEnabled ? 'var(--gold)' : '';
    renderGrid();
  };
  const onGridSizeChange = () => {
    gridSize = parseInt(selGridSize.value);
    renderGrid();
  };

  function setupControls() {
    selLevel.removeEventListener('change', onLevelChange);
    selLevel.addEventListener('change', onLevelChange);

    selSpecific.removeEventListener('change', onSpecificChange);
    selSpecific.addEventListener('change', onSpecificChange);

    btnAddPlayer.removeEventListener('click', onAddPlayer);
    btnAddPlayer.addEventListener('click', onAddPlayer);

    btnAddEnemy.removeEventListener('click', onAddEnemy);
    btnAddEnemy.addEventListener('click', onAddEnemy);

    btnClearMap.removeEventListener('click', onClearMap);
    btnClearMap.addEventListener('click', onClearMap);

    btnToggleGrid.removeEventListener('click', onToggleGrid);
    btnToggleGrid.addEventListener('click', onToggleGrid);

    selGridSize.removeEventListener('change', onGridSizeChange);
    selGridSize.addEventListener('change', onGridSizeChange);
  }

  function updateSelectors() {
    const level = selLevel.value;
    selSpecific.style.display = level === 'macro' ? 'none' : '';
    selSpecific.innerHTML = '';

    if (level === 'macro') {
      currentMapId = mapTree.macro.id;
      currentMapType = 'macro';
      loadCurrentMap();
      return;
    }

    let arr;
    if (level === 'region') {
      arr = mapTree.regions;
      currentMapType = 'region';
    } else if (level === 'city') {
      arr = mapTree.cities;
      currentMapType = 'city';
    } else {
      arr = mapTree.battles;
      currentMapType = 'battle';
    }

    if (!arr || arr.length === 0) {
      selSpecific.innerHTML = '<option value="">(Nenhum)</option>';
      currentMapId = "";
      loadCurrentMap();
      return;
    }

    arr.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.id;
      let prefix = "";
      if (level === 'city' && item.parentId) {
        const parent = mapTree.regions.find(r => r.id === item.parentId);
        if (parent) prefix = `[${parent.name}] `;
      }
      if (level === 'battle' && item.parentId) {
        const parentCity = mapTree.cities.find(c => c.id === item.parentId);
        if (parentCity) prefix = `[${parentCity.name}] `;
      }
      opt.textContent = prefix + item.name;
      selSpecific.appendChild(opt);
    });

    currentMapId = selSpecific.value;
    loadCurrentMap();
  }

  function findMapById(id) {
    if (mapTree.macro.id === id) return { ...mapTree.macro, type: 'macro' };
    const region = mapTree.regions.find(r => r.id === id);
    if (region) return { ...region, type: 'region' };
    const city = mapTree.cities.find(c => c.id === id);
    if (city) return { ...city, type: 'city' };
    const battle = mapTree.battles.find(b => b.id === id);
    if (battle) return { ...battle, type: 'battle' };
    return null;
  }

  function getParentChain(id) {
    const chain = [];
    const map = findMapById(id);
    if (!map) return chain;

    chain.unshift({ name: map.name, type: map.type, id: map.id });

    if (map.type === 'city' && map.parentId) {
      const region = mapTree.regions.find(r => r.id === map.parentId);
      if (region) chain.unshift({ name: region.name, type: 'region', id: region.id });
    }

    if (map.type === 'battle' && map.parentId) {
      const city = mapTree.cities.find(c => c.id === map.parentId);
      if (city) {
        chain.unshift({ name: city.name, type: 'city', id: city.id });
        if (city.parentId) {
          const region = mapTree.regions.find(r => r.id === city.parentId);
          if (region) chain.unshift({ name: region.name, type: 'region', id: region.id });
        }
      }
    }

    chain.unshift({ name: mapTree.macro.name, type: 'macro', id: mapTree.macro.id });
    return chain;
  }

  function renderBreadcrumb() {
    if (!currentMapId) {
      breadcrumb.style.display = 'none';
      return;
    }

    const chain = getParentChain(currentMapId);
    if (chain.length <= 1) {
      breadcrumb.style.display = 'none';
      return;
    }

    breadcrumb.style.display = 'flex';
    breadcrumb.innerHTML = '';

    chain.forEach((item, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'map-breadcrumb__sep';
        sep.textContent = '›';
        breadcrumb.appendChild(sep);
      }

      const el = document.createElement('span');
      const isLast = i === chain.length - 1;
      el.className = 'map-breadcrumb__item' + (isLast ? ' map-breadcrumb__item--active' : '');
      el.textContent = item.name;

      if (!isLast) {
        el.addEventListener('click', () => {
          currentMapId = item.id;
          const levelMap = { macro: 'macro', region: 'region', city: 'city', battle: 'battle' };
          selLevel.value = levelMap[item.type] || 'macro';
          updateSelectors();
        });
      }

      breadcrumb.appendChild(el);
    });
  }

  async function loadCurrentMap() {
    if (!currentMapId) {
      content.style.backgroundImage = 'none';
      content.innerHTML = '';
      emptyState.style.display = 'flex';
      renderBreadcrumb();
      renderGrid();
      return;
    }

    emptyState.style.display = 'none';
    const mapInfo = findMapById(currentMapId);
    let imageUrl;

    // Check if it's a bundled map or uploaded
    if (mapInfo && mapInfo.source === 'uploaded') {
      imageUrl = await getMapImage(currentMapId);
    }

    if (!imageUrl) {
      // Fallback to bundled maps folder
      const fullPath = 'maps/' + currentMapId;
      imageUrl = encodeURI(fullPath).replace(/'/g, "\\'");
      content.style.backgroundImage = 'url("' + imageUrl + '")';
    } else {
      content.style.backgroundImage = 'url("' + imageUrl + '")';
    }

    camScale = 1;
    camX = 0;
    camY = 0;
    applyCamera(false);
    renderTokens();
    renderBreadcrumb();

    // Auto-enable grid for battle maps
    if (mapInfo && mapInfo.type === 'battle' && mapInfo.hasGrid) {
      gridEnabled = true;
      gridSize = mapInfo.gridSize || 48;
      selGridSize.value = gridSize;
      selGridSize.style.display = '';
      btnToggleGrid.style.color = 'var(--gold)';
    }
    renderGrid();
  }

  function renderGrid() {
    if (!battleGridEl) return;
    if (!gridEnabled || !currentMapId) {
      battleGridEl.style.display = 'none';
      return;
    }

    battleGridEl.style.display = 'block';
    battleGridEl.style.backgroundImage =
      `linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),` +
      `linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)`;
    battleGridEl.style.backgroundSize = `${gridSize}px ${gridSize}px`;
  }

  function renderTokens() {
    // Preserve grid element
    const gridEl = document.getElementById('battle-grid');
    content.innerHTML = '';
    if (gridEl) content.appendChild(gridEl);

    if (!currentMapId) return;

    const tokens = tokensState[currentMapId] || [];
    tokens.forEach(token => {
      const el = document.createElement('div');
      const px = token.x !== undefined ? token.x : 50;
      const py = token.y !== undefined ? token.y : 50;
      const sizeClass = `token-${token.size || 'md'}`;
      const colorClass = `token-${token.color || token.type}`;
      const hasImage = !!token.image;

      // Image tokens are always circular
      const shapeClass = hasImage ? 'token-shape-circle' : `token-shape-${token.shape || 'circle'}`;
      const imageClass = hasImage ? 'tactical-token--has-image' : '';

      el.className = `tactical-token ${sizeClass} ${colorClass} ${shapeClass} ${imageClass}`.trim();
      el.dataset.id = token.id;
      el.style.left = `${px}%`;
      el.style.top = `${py}%`;

      if (hasImage) {
        const img = document.createElement('img');
        img.className = 'tactical-token__img';
        img.src = token.image;
        img.alt = token.name || token.type;
        img.draggable = false;
        el.appendChild(img);
      } else {
        const init = (token.name || token.type).charAt(0).toUpperCase();
        el.textContent = init;
      }

      if (token.name) {
        const label = document.createElement('div');
        label.className = 'token-label';
        label.textContent = token.name;
        el.appendChild(label);
      }

      el.addEventListener('pointerdown', (e) => {
        if (e.button === 2) return;
        e.stopPropagation();
        hideContextMenu();
        startTokenDrag(e, el, token);
      });

      el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, token.id);
      });

      content.appendChild(el);
    });
  }

  // UPLOAD HANDLERS
  const onZoneClick = (e) => {
    if (e.target === btnRemoveUpload || e.target.closest('.upload-zone__remove')) return;
    regFileInput.click();
  };
  const onZoneKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      regFileInput.click();
    }
  };
  const onFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };
  const onZoneDragOver = (e) => {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  };
  const onZoneDragLeave = () => {
    uploadZone.classList.remove('drag-over');
  };
  const onZoneDrop = (e) => {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  const onRemoveClick = (e) => {
    e.stopPropagation();
    clearUpload();
  };

  function setupUploadZone() {
    uploadZone.removeEventListener('click', onZoneClick);
    uploadZone.addEventListener('click', onZoneClick);

    uploadZone.removeEventListener('keydown', onZoneKey);
    uploadZone.addEventListener('keydown', onZoneKey);

    regFileInput.removeEventListener('change', onFileChange);
    regFileInput.addEventListener('change', onFileChange);

    uploadZone.removeEventListener('dragover', onZoneDragOver);
    uploadZone.addEventListener('dragover', onZoneDragOver);

    uploadZone.removeEventListener('dragleave', onZoneDragLeave);
    uploadZone.addEventListener('dragleave', onZoneDragLeave);

    uploadZone.removeEventListener('drop', onZoneDrop);
    uploadZone.addEventListener('drop', onZoneDrop);

    btnRemoveUpload.removeEventListener('click', onRemoveClick);
    btnRemoveUpload.addEventListener('click', onRemoveClick);
  }

  function handleFileUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione uma imagem (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Imagem muito grande. Limite de 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedFileData = e.target.result;
      uploadPreviewImg.src = uploadedFileData;
      uploadFilename.textContent = file.name;
      uploadZoneContent.style.display = 'none';
      uploadZonePreview.style.display = 'flex';
      uploadZone.classList.add('has-file');
      regFileInput.value = '';
      validateForm();
    };
    reader.readAsDataURL(file);
  }

  function clearUpload() {
    uploadedFileData = null;
    uploadZoneContent.style.display = '';
    uploadZonePreview.style.display = 'none';
    uploadZone.classList.remove('has-file');
    regFileInput.value = '';
    validateForm();
  }

  // MODAL HANDLERS
  const onModalOpen = openModal;
  const onModalClose = closeModal;
  const onModalOverlay = (e) => { if (e.target === modalRegister) closeModal(); };
  const onModalEsc = (e) => { if (e.key === 'Escape' && modalRegister.style.display !== 'none') closeModal(); };
  const onGridCheck = () => { gridSizeRow.style.display = regHasGrid.checked ? 'flex' : 'none'; };
  const onFormChange = () => validateForm();
  const onSaveMap = () => saveNewMap();

  function setupModal() {
    btnRegister.removeEventListener('click', onModalOpen);
    btnRegister.addEventListener('click', onModalOpen);

    btnRegCancel.removeEventListener('click', onModalClose);
    btnRegCancel.addEventListener('click', onModalClose);

    btnRegCancelBottom.removeEventListener('click', onModalClose);
    btnRegCancelBottom.addEventListener('click', onModalClose);

    modalRegister.removeEventListener('click', onModalOverlay);
    modalRegister.addEventListener('click', onModalOverlay);

    document.removeEventListener('keydown', onModalEsc);
    document.addEventListener('keydown', onModalEsc);

    mapTypeCards.querySelectorAll('.map-type-card').forEach(card => {
      const onCardClick = () => {
        mapTypeCards.querySelectorAll('.map-type-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        selectedMapType = card.dataset.level;
        updateModalFields();
        validateForm();
      };
      card.removeEventListener('click', card._handler);
      card.addEventListener('click', onCardClick);
      card._handler = onCardClick;
    });

    regHasGrid.removeEventListener('change', onGridCheck);
    regHasGrid.addEventListener('change', onGridCheck);

    regParent.removeEventListener('change', onFormChange);
    regParent.addEventListener('change', onFormChange);

    regName.removeEventListener('input', onFormChange);
    regName.addEventListener('input', onFormChange);

    btnRegSave.removeEventListener('click', onSaveMap);
    btnRegSave.addEventListener('click', onSaveMap);
  }

  function openModal() {
    // Reset state
    selectedMapType = null;
    clearUpload();
    regName.value = '';
    regHasGrid.checked = false;
    gridSizeRow.style.display = 'none';

    mapTypeCards.querySelectorAll('.map-type-card').forEach(c => c.classList.remove('active'));

    // Hide battle option if no cities exist
    const battleCard = mapTypeCards.querySelector('[data-level="battle"]');
    if (battleCard) {
      battleCard.style.display = mapTree.cities.length > 0 ? '' : 'none';
    }

    modalRegister.style.display = 'flex';
    updateModalFields();
    validateForm();
  }

  function closeModal() {
    modalRegister.style.display = 'none';
    selectedMapType = null;
    clearUpload();
  }

  function updateModalFields() {
    const type = selectedMapType;

    // Parent selector
    if (type === 'city') {
      regParentCont.style.display = '';
      regParent.innerHTML = '';
      if (mapTree.regions.length === 0) {
        regParent.innerHTML = '<option value="">(Sem região — mundo aberto)</option>';
      } else {
        mapTree.regions.forEach(r => {
          const o = document.createElement('option');
          o.value = r.id;
          o.textContent = r.name;
          regParent.appendChild(o);
        });
      }
    } else if (type === 'battle') {
      regParentCont.style.display = '';
      regParent.innerHTML = '';
      if (mapTree.cities.length === 0) {
        regParent.innerHTML = '<option value="">(Nenhuma cidade cadastrada)</option>';
      } else {
        mapTree.cities.forEach(c => {
          const o = document.createElement('option');
          o.value = c.id;
          let prefix = '';
          if (c.parentId) {
            const region = mapTree.regions.find(r => r.id === c.parentId);
            if (region) prefix = `[${region.name}] `;
          }
          o.textContent = prefix + c.name;
          regParent.appendChild(o);
        });
      }
    } else {
      regParentCont.style.display = 'none';
    }

    // Battle grid options
    battleGridOptions.style.display = type === 'battle' ? '' : 'none';

    // Step labels
    const hasParent = (type === 'city' && mapTree.regions.length > 0) ||
                      (type === 'battle' && mapTree.cities.length > 0);
    const nameStep = hasParent ? '3' : '2';
    const fileStep = hasParent ? '4' : '3';
    if (labelNameStep) labelNameStep.textContent = nameStep;
    if (labelFileStep) labelFileStep.textContent = fileStep;
  }

  function validateForm() {
    const hasName = regName.value.trim().length > 0;
    const hasFile = !!uploadedFileData;
    const hasType = !!selectedMapType;
    btnRegSave.disabled = !(hasName && hasFile && hasType);
  }

  async function saveNewMap() {
    const name = regName.value.trim();
    const type = selectedMapType;

    if (!name || !uploadedFileData || !type) return;

    const mapId = 'map_' + Date.now() + '_' + name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const entry = {
      id: mapId,
      name: name,
      source: 'uploaded'
    };

    if (type === 'city') {
      entry.parentId = regParent.value || null;
      mapTree.cities.push(entry);
    } else if (type === 'region') {
      mapTree.regions.push(entry);
    } else if (type === 'battle') {
      entry.parentId = regParent.value || null;
      entry.hasGrid = regHasGrid.checked;
      entry.gridSize = parseInt(regGridSize.value) || 48;
      mapTree.battles.push(entry);
    }

    // Save image to IndexedDB
    await saveMapImage(mapId, uploadedFileData);
    await saveData();

    closeModal();

    // Switch to the new map
    const levelMap = { region: 'region', city: 'city', battle: 'battle' };
    selLevel.value = levelMap[type] || 'macro';
    updateSelectors();

    // Select the newly added map
    if (type !== 'macro') {
      selSpecific.value = mapId;
      currentMapId = mapId;
      loadCurrentMap();
    }
  }

  // CAMERA HANDLERS
  const onCameraWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    camScale += delta;
    camScale = Math.min(Math.max(MIN_SCALE, camScale), MAX_SCALE);
    applyCamera(false);
  };
  const onZoomIn = () => { camScale = Math.min(MAX_SCALE, camScale + 0.2); applyCamera(); };
  const onZoomOut = () => { camScale = Math.max(MIN_SCALE, camScale - 0.2); applyCamera(); };
  const onZoomReset = () => { camScale = 1; camX = 0; camY = 0; applyCamera(); };
  const onCameraDown = (e) => {
    if (e.target.closest('.tactical-token')) return;
    dragMode = 'camera';
    viewport.setPointerCapture(e.pointerId);
    startClientX = e.clientX;
    startClientY = e.clientY;
    startCamX = camX;
    startCamY = camY;
    viewport.addEventListener('pointermove', onCameraMove);
    viewport.addEventListener('pointerup', onCameraEnd);
    viewport.addEventListener('pointercancel', onCameraEnd);
  };

  function setupCameraEvents() {
    viewport.removeEventListener('wheel', onCameraWheel);
    viewport.addEventListener('wheel', onCameraWheel, { passive: false });

    btnZoomIn.removeEventListener('click', onZoomIn);
    btnZoomIn.addEventListener('click', onZoomIn);

    btnZoomOut.removeEventListener('click', onZoomOut);
    btnZoomOut.addEventListener('click', onZoomOut);

    btnZoomReset.removeEventListener('click', onZoomReset);
    btnZoomReset.addEventListener('click', onZoomReset);

    viewport.removeEventListener('pointerdown', onCameraDown);
    viewport.addEventListener('pointerdown', onCameraDown);
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

  // CONTEXT MENU HANDLERS
  const onDeleteCtx = () => {
    if (contextTargetId) deleteToken(contextTargetId);
    hideContextMenu();
  };

  const ctxImageFileInput = document.getElementById('ctx-image-file-input');

  const onCtxChangeImage = () => {
    if (!contextTargetId) return;
    ctxImageFileInput.dataset.tokenId = contextTargetId;
    ctxImageFileInput.click();
    hideContextMenu();
  };

  const onCtxRemoveImage = () => {
    if (contextTargetId) {
      updateTokenProperty(contextTargetId, 'image', '');
    }
    hideContextMenu();
  };

  const onCtxImageFileChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    const tokenId = ctxImageFileInput.dataset.tokenId;
    if (!file || !tokenId) return;
    const resized = await resizeImageForToken(file);
    if (resized) {
      updateTokenProperty(tokenId, 'image', resized);
    }
    ctxImageFileInput.value = '';
  };

  function setupContextMenu() {
    if (!contextMenu) return;

    const btnDel = document.getElementById('ctx-delete-token');
    btnDel.removeEventListener('click', onDeleteCtx);
    btnDel.addEventListener('click', onDeleteCtx);

    const btnChangeImg = document.getElementById('ctx-change-image');
    const btnRemoveImg = document.getElementById('ctx-remove-image');

    if (btnChangeImg) {
      btnChangeImg.removeEventListener('click', onCtxChangeImage);
      btnChangeImg.addEventListener('click', onCtxChangeImage);
    }
    if (btnRemoveImg) {
      btnRemoveImg.removeEventListener('click', onCtxRemoveImage);
      btnRemoveImg.addEventListener('click', onCtxRemoveImage);
    }
    if (ctxImageFileInput) {
      ctxImageFileInput.removeEventListener('change', onCtxImageFileChange);
      ctxImageFileInput.addEventListener('change', onCtxImageFileChange);
    }

    contextMenu.querySelectorAll('.color-dot').forEach(dot => {
      const onColorClick = () => {
        updateTokenProperty(contextTargetId, 'color', dot.dataset.color);
        hideContextMenu();
      };
      dot.removeEventListener('click', dot._handler);
      dot.addEventListener('click', onColorClick);
      dot._handler = onColorClick;
    });

    contextMenu.querySelectorAll('.size-box').forEach(box => {
      const onSizeClick = (e) => {
        e.stopPropagation();
        if (box.dataset.size) {
          updateTokenProperty(contextTargetId, 'size', box.dataset.size);
        } else if (box.dataset.shape) {
          updateTokenProperty(contextTargetId, 'shape', box.dataset.shape);
        }
        hideContextMenu();
      };
      box.removeEventListener('click', box._handler);
      box.addEventListener('click', onSizeClick);
      box._handler = onSizeClick;
    });
  }

  function showContextMenu(x, y, tokenId) {
    if (!contextMenu) return;
    contextTargetId = tokenId;
    contextMenu.style.display = 'flex';
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
    const deltaX = (e.clientX - startClientX) / camScale;
    const deltaY = (e.clientY - startClientY) / camScale;
    const w = content.offsetWidth || viewport.clientWidth;
    const h = content.offsetHeight || viewport.clientHeight;
    const deltaPercentX = (deltaX / w) * 100;
    const deltaPercentY = (deltaY / h) * 100;
    let newLeft = Math.max(0, Math.min(100, startTokenLeft + deltaPercentX));
    let newTop = Math.max(0, Math.min(100, startTokenTop + deltaPercentY));
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

  function addToken(type, name, image) {
    if (!currentMapId) return;
    if (!tokensState[currentMapId]) tokensState[currentMapId] = [];
    tokensState[currentMapId].push({
      id: Date.now().toString(),
      type: type,
      name: name,
      size: 'md',
      color: type,
      shape: 'circle',
      image: image || '',
      x: 50,
      y: 50
    });
    saveData();
    renderTokens();
  }

  // ── IMAGE RESIZE UTILITY ──
  function resizeImageForToken(file, maxSize = 128) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          // Center crop to square
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/webp', 0.8));
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  // ── ADD TOKEN MODAL ──
  const tokenModal = document.getElementById('modal-add-token');
  const tokenCharSelect = document.getElementById('token-char-select');
  const tokenNameInput = document.getElementById('token-name-input');
  const tokenImgAvatar = document.getElementById('token-img-avatar');
  const tokenImgPlaceholder = document.getElementById('token-img-placeholder');
  const tokenImgFilename = document.getElementById('token-img-filename');
  const tokenImgFileInput = document.getElementById('token-img-file-input');
  const btnTokenUpload = document.getElementById('btn-token-upload');
  const btnTokenClearImg = document.getElementById('btn-token-clear-img');
  const btnTokenCreate = document.getElementById('btn-token-create');
  const btnTokenCancel = document.getElementById('btn-token-cancel');
  const btnTokenCancelBottom = document.getElementById('btn-token-cancel-bottom');
  const tokenTypeBadge = document.getElementById('token-modal-type-badge');

  async function openAddTokenModal(type) {
    tokenModalType = type;
    tokenModalImage = null;

    // Reset fields
    tokenNameInput.value = '';
    clearTokenImagePreview();
    tokenCharSelect.value = '';

    // Set badge
    if (type === 'player') {
      tokenTypeBadge.textContent = '● Aliado / Grupo';
      tokenTypeBadge.className = 'add-token-type-badge add-token-type-badge--player';
    } else {
      tokenTypeBadge.textContent = '● Inimigo';
      tokenTypeBadge.className = 'add-token-type-badge add-token-type-badge--enemy';
    }

    // Load characters into dropdown
    await populateCharacterDropdown();

    validateTokenForm();
    tokenModal.style.display = 'flex';
    tokenNameInput.focus();
  }

  function closeAddTokenModal() {
    tokenModal.style.display = 'none';
    tokenModalType = null;
    tokenModalImage = null;
  }

  async function populateCharacterDropdown() {
    tokenCharSelect.innerHTML = '<option value="">— Nenhum (token genérico) —</option>';
    try {
      let characters = [];
      if (window.CharacterManager) {
        characters = await window.CharacterManager.loadAll();
      } else if (window.DaimyoDB) {
        characters = await window.DaimyoDB.get(window.DaimyoDB.STORES.CHARACTERS, 'all') || [];
      }
      characters.forEach(char => {
        const opt = document.createElement('option');
        opt.value = char.id;
        opt.textContent = char.name + (char.clan ? ` (${char.clan})` : '');
        opt.dataset.photo = char.photo || '';
        opt.dataset.charName = char.name;
        tokenCharSelect.appendChild(opt);
      });
    } catch (e) {
      console.warn('⚠️ Erro ao carregar personagens para tokens:', e);
    }
  }

  function onCharSelectChange() {
    const opt = tokenCharSelect.selectedOptions[0];
    if (!opt || !opt.value) {
      // Reset if "none" selected
      tokenNameInput.value = '';
      clearTokenImagePreview();
      validateTokenForm();
      return;
    }

    // Auto-fill name
    tokenNameInput.value = opt.dataset.charName || '';

    // Auto-fill photo
    const photo = opt.dataset.photo;
    if (photo) {
      tokenModalImage = photo;
      showTokenImagePreview(photo, opt.dataset.charName || 'Personagem');
    } else {
      clearTokenImagePreview();
    }
    validateTokenForm();
  }

  function showTokenImagePreview(dataUrl, name) {
    tokenImgAvatar.src = dataUrl;
    tokenImgAvatar.style.display = '';
    tokenImgPlaceholder.style.display = 'none';
    tokenImgFilename.textContent = name || 'Imagem selecionada';
    btnTokenClearImg.style.display = '';
  }

  function clearTokenImagePreview() {
    tokenModalImage = null;
    tokenImgAvatar.style.display = 'none';
    tokenImgAvatar.src = '';
    tokenImgPlaceholder.style.display = '';
    tokenImgFilename.textContent = 'Nenhuma imagem';
    btnTokenClearImg.style.display = 'none';
    if (tokenImgFileInput) tokenImgFileInput.value = '';
  }

  function validateTokenForm() {
    const hasName = tokenNameInput.value.trim().length > 0;
    btnTokenCreate.disabled = !hasName;
  }

  async function onTokenImgFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const resized = await resizeImageForToken(file);
    if (resized) {
      tokenModalImage = resized;
      showTokenImagePreview(resized, file.name);
    }
    tokenImgFileInput.value = '';
  }

  function onCreateToken() {
    const name = tokenNameInput.value.trim();
    if (!name) return;
    addToken(tokenModalType || 'player', name, tokenModalImage || '');
    closeAddTokenModal();
  }

  // Setup token modal events (idempotent)
  function setupTokenModal() {
    if (!tokenModal) return;

    const close = () => closeAddTokenModal();

    btnTokenCancel.removeEventListener('click', close);
    btnTokenCancel.addEventListener('click', close);

    btnTokenCancelBottom.removeEventListener('click', close);
    btnTokenCancelBottom.addEventListener('click', close);

    tokenModal.removeEventListener('click', tokenModal._overlayHandler);
    tokenModal._overlayHandler = (e) => { if (e.target === tokenModal) close(); };
    tokenModal.addEventListener('click', tokenModal._overlayHandler);

    tokenCharSelect.removeEventListener('change', onCharSelectChange);
    tokenCharSelect.addEventListener('change', onCharSelectChange);

    tokenNameInput.removeEventListener('input', validateTokenForm);
    tokenNameInput.addEventListener('input', validateTokenForm);

    btnTokenUpload.removeEventListener('click', btnTokenUpload._handler);
    btnTokenUpload._handler = () => tokenImgFileInput.click();
    btnTokenUpload.addEventListener('click', btnTokenUpload._handler);

    btnTokenClearImg.removeEventListener('click', btnTokenClearImg._handler);
    btnTokenClearImg._handler = () => clearTokenImagePreview();
    btnTokenClearImg.addEventListener('click', btnTokenClearImg._handler);

    tokenImgFileInput.removeEventListener('change', onTokenImgFileChange);
    tokenImgFileInput.addEventListener('change', onTokenImgFileChange);

    btnTokenCreate.removeEventListener('click', onCreateToken);
    btnTokenCreate.addEventListener('click', onCreateToken);

    // Enter key on name field
    tokenNameInput.removeEventListener('keydown', tokenNameInput._handler);
    tokenNameInput._handler = (e) => { if (e.key === 'Enter' && !btnTokenCreate.disabled) onCreateToken(); };
    tokenNameInput.addEventListener('keydown', tokenNameInput._handler);
  }

  function deleteToken(id) {
    if (!currentMapId) return;
    tokensState[currentMapId] = tokensState[currentMapId].filter(t => t.id !== id);
    saveData();
    renderTokens();
  }

  // ── DELETE MAP ──
  window.deleteMapEntry = async function (mapId) {
    const mapInfo = findMapById(mapId);
    if (!mapInfo) return;
    if (!confirm(`Excluir "${mapInfo.name}"? Esta ação não pode ser desfeita.`)) return;

    // Remove from tree
    if (mapInfo.type === 'region') {
      mapTree.regions = mapTree.regions.filter(r => r.id !== mapId);
      // Remove orphan cities
      mapTree.cities = mapTree.cities.filter(c => c.parentId !== mapId);
    } else if (mapInfo.type === 'city') {
      mapTree.cities = mapTree.cities.filter(c => c.id !== mapId);
      // Remove orphan battles
      mapTree.battles = mapTree.battles.filter(b => b.parentId !== mapId);
    } else if (mapInfo.type === 'battle') {
      mapTree.battles = mapTree.battles.filter(b => b.id !== mapId);
    }

    // Remove tokens
    delete tokensState[mapId];

    // Remove image
    if (mapInfo.source === 'uploaded') {
      await removeMapImage(mapId);
    }

    await saveData();

    if (currentMapId === mapId) {
      currentMapId = '';
      selLevel.value = 'macro';
    }

    updateSelectors();
    renderManageTree();
  };

  // ── MANAGE MAPS TREE ──
  (function setupManageModal() {
    const manageModal = document.getElementById('modal-manage-maps');
    const manageClose = document.getElementById('btn-manage-close');

    if (manageClose) {
      manageClose.addEventListener('click', () => {
        if (manageModal) manageModal.style.display = 'none';
      });
    }

    if (manageModal) {
      manageModal.addEventListener('click', (e) => {
        if (e.target === manageModal) manageModal.style.display = 'none';
      });
    }
  })();

  window.openManageMaps = function () {
    const modal = document.getElementById('modal-manage-maps');
    if (modal) {
      modal.style.display = 'flex';
      renderManageTree();
    }
  };

  function renderManageTree() {
    const treeView = document.getElementById('map-tree-view');
    if (!treeView) return;
    treeView.innerHTML = '';

    // Macro
    const macroNode = createTreeNode(mapTree.macro.name, '🗾', 'macro', mapTree.macro.id, true);
    treeView.appendChild(macroNode);

    // Regions + their cities
    const renderedCities = new Set();
    mapTree.regions.forEach(region => {
      treeView.appendChild(createTreeNode(region.name, '🏔', 'region', region.id));

      mapTree.cities.filter(c => c.parentId === region.id).forEach(city => {
        treeView.appendChild(createTreeNode(city.name, '🏘', 'city', city.id));
        renderedCities.add(city.id);
      });
    });

    // Cities without region parent
    mapTree.cities.filter(c => !renderedCities.has(c.id)).forEach(city => {
      treeView.appendChild(createTreeNode(city.name, '🏘', 'city', city.id));
    });

    // Battles
    mapTree.battles.forEach(battle => {
      treeView.appendChild(createTreeNode(battle.name, '⚔️', 'battle', battle.id));
    });

    if (mapTree.regions.length === 0 && mapTree.cities.length === 0 && mapTree.battles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'map-tree__empty';
      empty.textContent = 'Nenhum mapa cadastrado ainda.';
      treeView.appendChild(empty);
    }
  }

  function createTreeNode(name, icon, type, id, isProtected) {
    const node = document.createElement('div');
    node.className = `map-tree__node map-tree__node--${type}`;

    const iconEl = document.createElement('span');
    iconEl.className = 'map-tree__icon';
    iconEl.textContent = icon;
    node.appendChild(iconEl);

    const nameEl = document.createElement('span');
    nameEl.className = 'map-tree__name';
    nameEl.textContent = name;
    node.appendChild(nameEl);

    const badge = document.createElement('span');
    badge.className = 'map-tree__badge';
    badge.textContent = type === 'macro' ? 'Base' : type === 'region' ? 'Região' : type === 'city' ? 'Cidade' : 'Batalha';
    node.appendChild(badge);

    if (!isProtected) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-ghost map-tree__delete';
      delBtn.textContent = '✕';
      delBtn.title = 'Excluir';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.deleteMapEntry(id);
      });
      node.appendChild(delBtn);
    }

    return node;
  }

  // ── TOGGLE VIEW ──
  window.toggleTacticalMap = function () {
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

  // Start
  init();

})();
