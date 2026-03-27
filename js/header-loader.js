(function() {
  const css = `
    /* === MOBILE-FIRST HEADER === */
    #daimyo-header {
      position: relative;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border-panel);
      z-index: 1000;
    }
    
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
    .new-header__title span { color: var(--red-accent); }
    
    .mobile-menu-btn {
      display: none;
      background: transparent;
      border: 1px solid var(--border-panel);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 1.5rem;
      padding: 6px 12px;
      cursor: pointer;
    }
    
    .new-nav-container {
      display: flex;
      flex: 1;
      justify-content: space-between;
      align-items: center;
    }
    
    .new-tab-nav {
      display: flex;
      gap: 4px;
    }
    .new-tab-nav__link {
      font-family: var(--font-body);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      text-decoration: none;
      padding: 10px 14px;
      border-radius: var(--radius);
      transition: all var(--transition);
      display: flex;
      align-items: center;
      min-height: 44px; /* Touch target size */
    }
    .new-tab-nav__link:hover { color: var(--text-secondary); background: rgba(255,255,255,0.03); }
    .new-tab-nav__link.active { color: var(--gold); border-bottom: 2px solid var(--gold); border-radius: var(--radius) var(--radius) 0 0; }
    
    .new-header__tools {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    /* MOBILE DRAWER STYLES */
    .mobile-drawer-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.8);
      z-index: 2000;
      opacity: 0;
      visibility: hidden;
      transition: all 300ms ease;
    }
    .mobile-drawer-overlay.open {
      opacity: 1; visibility: visible;
    }
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
    .mobile-drawer-overlay.open .mobile-drawer {
      transform: translateX(300px);
    }
    
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
    .mobile-drawer__links {
      display: flex;
      flex-direction: column;
    }
    .mobile-drawer__links a, .mobile-drawer__links button {
      padding: 15px 20px;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      border-bottom: 1px solid var(--border-panel);
      background: transparent;
      border-left: none; border-right: none; border-top: none;
      text-align: left;
      cursor: pointer;
      font-family: var(--font-body);
    }
    .mobile-drawer__links a.active {
      color: var(--gold);
      background: rgba(212,168,70,0.05);
      border-left: 3px solid var(--gold);
    }
    
    /* PREVENT BODY SCROLL */
    body.nav-open { overflow: hidden; touch-action: none; }

    @media (max-width: 1050px) {
      .new-nav-container { display: none; }
      .mobile-menu-btn { display: flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px;}
      .new-header { padding: 10px 15px; }
    }
  `;

  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  // Define Links Mapping
  const pages = [
    { url: 'index.html', icon: '⚔', label: 'Combate' },
    { url: 'time-management.html', icon: '⏱', label: 'Tempo' },
    { url: 'oracle-generators.html', icon: '🔮', label: 'Oráculo' },
    { url: 'equipment-database.html', icon: '📦', label: 'Arsenal' },
    { url: 'library.html', icon: '📚', label: 'Biblioteca' },
    { url: 'combat-calculator.html', icon: '🎲', label: 'Dano Extra' },
    { url: 'kegare-panico.html', icon: '🧠', label: 'Sanidade' }
  ];

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function renderDesktopNav() {
    let tabs = pages.map(p => `
      <a href="${p.url}" class="new-tab-nav__link ${p.url === currentPage ? 'active' : ''}">${p.icon} ${p.label}</a>
    `).join('');
    
    return `
      <div class="new-nav-container">
        <nav class="new-tab-nav">
          ${tabs}
        </nav>
        ${currentPage === 'index.html' ? `
        <div class="new-header__tools">
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleDrawer('gm-notes-drawer')" title="Anotações" style="min-height:44px; padding:0 15px;">📝 Notas</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleDrawer('clocks-drawer')" title="Ameaças" style="min-height:44px; padding:0 15px;">⏱ Ameaças</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleModal('combat-mass-overlay')" title="Guerra" style="min-height:44px; padding:0 15px;">⚔ Guerra</button>
        </div>` : ''}
      </div>
    `;
  }

  function renderMobileDrawer() {
    let links = pages.map(p => `
      <a href="${p.url}" class="mobile-nav-item ${p.url === currentPage ? 'active' : ''}">${p.icon} ${p.label}</a>
    `).join('');

    return `
      <div class="mobile-drawer-overlay" id="mobile-nav-overlay">
        <div class="mobile-drawer">
          <div class="mobile-drawer__header">
            <h2 class="new-header__title">⚔ Escudo do <span>Daimyo</span></h2>
            <button class="mobile-drawer__close" id="mobile-nav-close">✕</button>
          </div>
          
          <div class="mobile-drawer__section">Páginas de Consulta</div>
          <div class="mobile-drawer__links">
            ${links}
          </div>
          
          ${currentPage === 'index.html' ? `
          <div class="mobile-drawer__section">Ferramentas de Mestre</div>
          <div class="mobile-drawer__links">
            <button onclick="window.closeMobileNav(); NarrativeTools && NarrativeTools.toggleDrawer('gm-notes-drawer')">📝 Anotações do Mestre</button>
            <button onclick="window.closeMobileNav(); NarrativeTools && NarrativeTools.toggleDrawer('clocks-drawer')">⏱ Relógios de Facção</button>
            <button onclick="window.closeMobileNav(); NarrativeTools && NarrativeTools.toggleModal('combat-mass-overlay')">⚔ Combate em Massa</button>
          </div>` : ''}
        </div>
      </div>
    `;
  }

  const headerHtml = `
    <header class="new-header">
      <a href="index.html" class="new-header__title">⚔ Escudo do <span>Daimyo</span></a>
      ${renderDesktopNav()}
      <button class="mobile-menu-btn" id="mobile-menu-open">☰</button>
    </header>
    ${renderMobileDrawer()}
  `;

  // Write synchronously if we are in parsing phase (avoids blank flicker)
  // or append via DOM
  document.write('<div id="daimyo-header-mount"></div>');
  
  document.addEventListener('DOMContentLoaded', () => {
    const mount = document.getElementById('daimyo-header-mount');
    const oldContainer = document.getElementById('daimyo-header'); // Fallback
    const target = mount || oldContainer;
    
    if (target) {
      target.innerHTML = headerHtml;
      
      const overlay = document.getElementById('mobile-nav-overlay');
      const btnOpen = document.getElementById('mobile-menu-open');
      const btnClose = document.getElementById('mobile-nav-close');
      
      window.closeMobileNav = function() {
        if(overlay) overlay.classList.remove('open');
        document.body.classList.remove('nav-open');
      };

      if(btnOpen) {
        btnOpen.addEventListener('click', () => {
          overlay.classList.add('open');
          document.body.classList.add('nav-open');
        });
      }
      if(btnClose) {
        btnClose.addEventListener('click', window.closeMobileNav);
      }
      if(overlay) {
        overlay.addEventListener('click', (e) => {
          if(e.target === overlay) window.closeMobileNav();
        });
      }
    }
  });

  // PWA Service Worker Registration
  if ('serviceWorker' in navigator) {
    if (window.location.protocol === 'file:') {
      console.log('🛡️ Modo Local Detectado: O Service Worker do PWA e o Manifest.json estão pausados porque você está abrindo o HTML direto do disco (file://). Para testar as capacidades offline e a instalação do app, utilize uma extensão como o "Live Server" no VSCode ou hospe o site.');
    } else {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
          .then(reg => console.log('✨ PWA Service Worker registrado com sucesso no escopo:', reg.scope))
          .catch(err => console.warn('Erro ao registrar Service Worker:', err));
      });
    }
  }

})();
