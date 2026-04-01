(function() {
  const css = `
    /* === PLAYER-FIRST HEADER === */
    #daimyo-header {
      position: relative;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border-panel);
      z-index: 1000;
    }

    /* === A DANÇA DAS LÂMINAS (View Transitions) === */
    @view-transition { navigation: auto; }

    ::view-transition-old(root) {
      animation: 300ms cubic-bezier(0.4, 0, 0.2, 1) both fade-out;
    }
    ::view-transition-new(root) {
      animation: 400ms cubic-bezier(0.4, 0, 0.2, 1) both fade-in;
    }
    @keyframes fade-in { from { opacity: 0; transform: translateY(5px); } }
    @keyframes fade-out { to { opacity: 0; transform: translateY(-5px); } }

    .new-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      gap: 12px;
    }
    
    .new-header__title {
      font-family: var(--font-display);
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      text-decoration: none;
      white-space: nowrap;
    }
    .new-header__title span { color: var(--gold); }
    .new-header__badge {
      font-size: 0.6rem;
      background: var(--gold);
      color: #000;
      padding: 2px 6px;
      border-radius: 4px;
      vertical-align: middle;
      margin-left: 5px;
      text-transform: uppercase;
      font-weight: 900;
    }
    
    .mobile-menu-btn {
      display: block;
      background: transparent;
      border: 1px solid var(--border-panel);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 1.5rem;
      padding: 6px 12px;
      cursor: pointer;
    }
    
    /* === PORTAL BUTTON === */
    .btn-portal {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      background: rgba(139, 30, 58, 0.05);
      border: 1px solid rgba(139, 30, 58, 0.3);
      border-radius: var(--radius);
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-size: 0.72rem;
      font-weight: 700;
      text-decoration: none;
      text-transform: uppercase;
      transition: all var(--transition);
      white-space: nowrap;
    }
    .btn-portal:hover {
      background: rgba(139, 30, 58, 0.1);
      border-color: var(--red-accent);
      color: var(--text-primary);
    }
    @media (max-width: 600px) {
      .btn-portal span { display: none; }
      .btn-portal { padding: 10px; }
    }
    
    .new-nav-container {
      display: none;
      flex: 1;
      justify-content: space-between;
      align-items: center;
    }

    @media (min-width: 900px) {
      .mobile-menu-btn { display: none; }
      .new-nav-container { display: flex; }
    }
    
    .new-tab-nav {
      display: flex;
      gap: 4px;
      margin-left: 20px;
    }
    .new-tab-nav__link {
      font-family: var(--font-body);
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      text-decoration: none;
      padding: 10px 10px;
      border-radius: var(--radius);
      transition: all var(--transition);
      display: flex;
      align-items: center;
      min-height: 44px;
      white-space: nowrap;
    }
    .new-tab-nav__link:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
    .new-tab-nav__link.active { color: var(--gold); border-bottom: 2px solid var(--gold); border-radius: var(--radius) var(--radius) 0 0; }
    
    .active-char-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 12px;
      background: rgba(0,0,0,0.2);
      border-radius: var(--radius);
      border: 1px solid var(--border-panel);
    }
    .active-char-name {
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--gold);
    }
    .header-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid var(--gold);
      object-fit: cover;
      background: var(--bg-deep);
      flex-shrink: 0;
    }
    .header-avatar--empty {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      background: rgba(212,168,70,0.1);
    }

    /* MOBILE DRAWER STYLES */
    .mobile-drawer-overlay {
      position: fixed;
      top: 0; left: 0; width: 100%; height: 100vh;
      background: rgba(0,0,0,0.8);
      z-index: 2000;
      opacity: 0;
      visibility: hidden;
      transition: all 300ms ease;
    }
    .mobile-drawer-overlay.open { opacity: 1; visibility: visible; }
    .mobile-drawer {
      position: absolute;
      top: 0; left: -300px; width: 300px; height: 100vh;
      background: var(--bg-deep);
      border-right: 1px solid var(--border-panel);
      transition: transform 300ms ease;
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow-y: auto;
    }
    .mobile-drawer-overlay.open .mobile-drawer { transform: translateX(300px); }
    
    .mobile-drawer__header {
      padding: 20px;
      border-bottom: 1px solid var(--border-panel);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .mobile-drawer__close {
      background: none; border: none; font-size: 1.5rem; color: var(--text-secondary); cursor: pointer;
      min-height: 44px; min-width: 44px; display:flex; justify-content:center; align-items:center;
    }
    
    .mobile-drawer__section {
      padding: 15px 20px 5px;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--text-muted);
      font-weight: 700;
      border-bottom: 1px solid rgba(255,255,255,0.02);
    }
    .mobile-drawer__links { display: flex; flex-direction: column; }
    .mobile-drawer__links a {
      padding: 15px 20px;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      border-bottom: 1px solid var(--border-panel);
    }
    .mobile-drawer__links a.active {
      color: var(--gold);
      background: rgba(212,168,70,0.05);
      border-left: 3px solid var(--gold);
    }

    .btn-portal {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border-panel);
      border-radius: var(--radius);
      color: var(--text-secondary);
      font-family: var(--font-body);
      font-size: 0.7rem;
      font-weight: 700;
      text-decoration: none;
      text-transform: uppercase;
      transition: all var(--transition);
      white-space: nowrap;
    }
    .btn-portal:hover {
      background: rgba(139, 30, 58, 0.1);
      border-color: var(--red-accent);
      color: var(--text-primary);
    }
  `;

  const pages = [
    { url: 'index.html', icon: '🏠', label: 'Início' },
    { url: 'characters-sheet.html', icon: '📜', label: 'Ficha' },
    { url: 'notes.html', icon: '📓', label: 'Notas' },
    { url: 'equipment-database.html', icon: '⚔', label: 'Arsenal' },
    { url: 'library.html', icon: '📚', label: 'Biblioteca' },
    { url: 'settings.html', icon: '⚙', label: 'Ajustes' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function renderDesktopNav(activeChar) {
    let tabs = pages.map(p => `
      <a href="${p.url}" class="new-tab-nav__link ${p.url === currentPage ? 'active' : ''}">${p.icon} ${p.label}</a>
    `).join('');
    
    return `
      <div class="new-nav-container">
        <nav class="new-tab-nav">
          ${tabs}
        </nav>
        <div class="active-char-box">
          ${activeChar && activeChar.photo ? `<img src="${activeChar.photo}" class="header-avatar" alt="Avatar">` : `<div class="header-avatar header-avatar--empty">👤</div>`}
          <div style="display:flex; flex-direction:column;">
            <span style="font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; line-height: 1;">Personagem Ativo</span>
            <span class="active-char-name">${activeChar ? activeChar.name : 'Nenhum'}</span>
          </div>
        </div>
      </div>
    `;
  }

  function renderMobileDrawer(activeChar) {
    let links = pages.map(p => `
      <a href="${p.url}" class="${p.url === currentPage ? 'active' : ''}">${p.icon} ${p.label}</a>
    `).join('');

    return `
      <div class="mobile-drawer-overlay" id="mobile-nav-overlay">
        <div class="mobile-drawer">
          <div class="mobile-drawer__header">
            <h2 class="new-header__title">🛡️ Daimyo <span>Jogador</span></h2>
            <button class="mobile-drawer__close" id="mobile-nav-close">✕</button>
          </div>
          
          <div class="mobile-drawer__section">Personagem Selecionado</div>
          <div style="padding: 15px 20px; border-bottom: 1px solid var(--border-panel); display: flex; align-items: center; gap: 15px;">
             ${activeChar && activeChar.photo ? `<img src="${activeChar.photo}" class="header-avatar" style="width: 50px; height: 50px;" alt="Avatar">` : `<div class="header-avatar header-avatar--empty" style="width: 50px; height: 50px; font-size: 1.5rem;">👤</div>`}
             <span class="active-char-name" style="font-size: 1.1rem;">${activeChar ? activeChar.name : 'Selecione um personagem'}</span>
          </div>

          <div class="mobile-drawer__section">Menu do Viajante</div>
          <div class="mobile-drawer__links">
            ${links}
          </div>
        </div>
      </div>
    `;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  window.initPlayerHeader = function() {
    const activeChar = typeof CharacterManager !== 'undefined' ? CharacterManager.getActiveCharacter() : null;
    
    const headerHtml = `
      <header class="new-header">
        <div style="display:flex; align-items:center;">
          <a href="index.html" class="new-header__title">🛡️ Escudo do <span>Jogador</span></a>
        </div>
        ${renderDesktopNav(activeChar)}
        <div class="new-header__tools" style="display:flex; align-items:center; gap: 8px;">
          ${currentPage === 'library.html' ? `
          <a href="../index.html" class="btn-portal" title="Voltar ao Santuário">⛩️ <span>Santuário</span></a>
          ` : ''}
          <button class="mobile-menu-btn" id="mobile-menu-open">☰</button>
        </div>
      </header>
      ${renderMobileDrawer(activeChar)}
    `;

    const target = document.getElementById('daimyo-header');
    if (target) {
      target.innerHTML = headerHtml;
      
      const overlay = document.getElementById('mobile-nav-overlay');
      const btnOpen = document.getElementById('mobile-menu-open');
      const btnClose = document.getElementById('mobile-nav-close');
      
      if(btnOpen) btnOpen.addEventListener('click', () => { overlay.classList.add('open'); });
      if(btnClose) btnClose.addEventListener('click', () => { overlay.classList.remove('open'); });
      if(overlay) overlay.addEventListener('click', (e) => { if(e.target === overlay) overlay.classList.remove('open'); });
    }
  };

  if (document.readyState === 'complete') window.initPlayerHeader();
  else window.addEventListener('load', window.initPlayerHeader);

  // Escuta mudanças de personagem para atualizar o cabeçalho em tempo real
  window.addEventListener('daimyoActiveCharacterChanged', () => {
    if (window.initPlayerHeader) window.initPlayerHeader();
  });

  // --- SILENCIADOR DE ERROS (View Transitions) ---
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'AbortError' && (event.reason.message.includes('Transition') || event.reason.message.includes('skipped'))) {
      event.preventDefault();
    }
  });

})();
