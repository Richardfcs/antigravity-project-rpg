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
      display: block;
      background: transparent;
      border: 1px solid var(--border-panel);
      border-radius: var(--radius);
      color: var(--text-primary);
      font-size: 1.5rem;
      padding: 6px 12px;
      cursor: pointer;
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
    
    .new-header__tools {
      display: flex;
      align-items: center;
      gap: 6px;
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
    
    /* === THEME DRAWER === */
    .theme-drawer {
      position: fixed;
      top: 0; right: -360px; width: 340px; height: 100vh;
      background: var(--bg-deep);
      border-left: 1px solid var(--border-panel);
      z-index: 3000;
      transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
      display: flex; flex-direction: column;
      box-shadow: -10px 0 30px rgba(0,0,0,0.5);
    }
    .theme-drawer.open { transform: translateX(-360px); }
    
    .theme-grid { display: grid; grid-template-columns: 1fr; gap: 12px; padding: 20px; }
    .theme-option {
      padding: 16px;
      border: 1px solid var(--border-panel);
      border-radius: var(--radius-lg);
      cursor: pointer;
      display: flex; flex-direction: column; gap: 8px;
      transition: all var(--transition);
      background: var(--bg-panel);
    }
    .theme-option:hover { border-color: var(--gold); background: rgba(255,255,255,0.02); }
    .theme-option.active { border-color: var(--gold); border-width: 2px; }
    
    .theme-name { font-weight: 700; font-family: var(--font-display); font-size: 1rem; }
    .theme-preview { display: flex; gap: 4px; }
    .theme-color { width: 24px; height: 24px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); }
    
    /* LIGHT THEME OVERRIDES */
    html[data-theme="light"] {
      --bg-deep: #F2F2EB; --bg-panel: #FFFFFF; --bg-card: #FAF9F5; --bg-input: #FDFDFB;
      --border-panel: #D1D5DB; --border-input: #E5E7EB; --border-focus: #C41E3A;
      --text-primary: #1A1A1A; --text-secondary: #4B5563; --text-muted: #6B7280;
      --red-blood: #8B0000; --red-accent: #C41E3A; --gold: #B8860B;
    }
    
    /* NEON THEMES */
    html[data-theme="neon-green"] {
      --bg-deep: #050805; --bg-panel: #0A120A; --border-panel: #1A3A1A;
      --red-accent: #39FF14; --gold: #CCFF00; --text-primary: #E0FFE0;
      --red-blood: #00FF41; --gold-glow: rgba(57, 255, 20, 0.4);
    }
    html[data-theme="neon-yellow"] {
      --bg-deep: #080802; --bg-panel: #121205; --border-panel: #3A3A1A;
      --red-accent: #FFFF00; --gold: #FFD700; --text-primary: #FFFFE0;
      --red-blood: #FFEA00; --gold-glow: rgba(255, 215, 0, 0.4);
    }
    html[data-theme="neon-red"] {
      --bg-deep: #0A0202; --bg-panel: #1A0505; --border-panel: #4A1A1A;
      --red-accent: #FF003C; --gold: #FF4D00; --text-primary: #FFE0E5;
      --red-blood: #8B0000; --gold-glow: rgba(255, 0, 60, 0.4);
    }

    html[data-theme="light"] i, html[data-theme="light"] .icon { filter: brightness(0.2); }
    html[data-theme="light"] .new-tab-nav__link:hover { background: rgba(0,0,0,0.03); }
    html[data-theme="light"] .theme-drawer { box-shadow: -10px 0 30px rgba(0,0,0,0.1); }
  `;

  /* Ranged Calc CSS removed from global header */

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
        <div class="new-header__tools">
          ${currentPage === 'index.html' ? `
          <button class="btn btn-ghost" onclick="ThemeManager.openDrawer()" title="Customizar Tema" style="min-height:44px; padding:0 15px;">🎨 Customizar</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleDrawer('gm-notes-drawer')" title="Anotações" style="min-height:44px; padding:0 15px;">📝 Notas</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleDrawer('clocks-drawer')" title="Ameaças" style="min-height:44px; padding:0 15px;">⏱ Ameaças</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleModal('combat-mass-overlay')" title="Guerra" style="min-height:44px; padding:0 15px;">⚔ Guerra</button>
          ` : ''}
        </div>
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
          
          <div class="mobile-drawer__section">Ferramentas de Mestre</div>
          <div class="mobile-drawer__links">
            ${currentPage === 'index.html' ? `
            <button onclick="window.closeMobileNav(); ThemeManager.openDrawer()">🎨 Customizar Cores</button>
            <button onclick="window.closeMobileNav(); NarrativeTools && NarrativeTools.toggleDrawer('gm-notes-drawer')">📝 Anotações do Mestre</button>
            <button onclick="window.closeMobileNav(); NarrativeTools && NarrativeTools.toggleDrawer('clocks-drawer')">⏱ Relógios de Facção</button>
            <button onclick="window.closeMobileNav(); NarrativeTools && NarrativeTools.toggleModal('combat-mass-overlay')">⚔ Combate em Massa</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderThemeDrawer() {
    return `
      <div id="theme-drawer" class="theme-drawer" style="overflow-y:auto; scrollbar-width:thin;">
        <div class="rc-header">
          <h2 class="new-header__title">🎨 Personalizar <span>Estética</span></h2>
          <button class="mobile-drawer__close" onclick="ThemeManager.closeDrawer()">✕</button>
        </div>
        
        <div class="mobile-drawer__section">Paletas Clássicas</div>
        <div class="theme-grid" style="grid-template-columns: 1fr 1fr; padding: 10px 20px;">
          <div class="theme-option" onclick="ThemeManager.apply('dark')">
            <div class="theme-name" style="font-size:0.8rem;">Sumi-e (Escuro)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#0A0A0A"></div><div class="theme-color" style="background:#C41E3A"></div></div>
          </div>
          <div class="theme-option" onclick="ThemeManager.apply('light')">
            <div class="theme-name" style="font-size:0.8rem;">Washi (Claro)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#F2F2EB"></div><div class="theme-color" style="background:#8B0000"></div></div>
          </div>
        </div>

        <div class="mobile-drawer__section">Paletas Neon (Vibrantes)</div>
        <div class="theme-grid" style="grid-template-columns: 1fr 1fr; padding: 10px 20px;">
          <div class="theme-option" onclick="ThemeManager.apply('neon-green')">
            <div class="theme-name" style="font-size:0.8rem;">Venenoso (Kegare)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#050805"></div><div class="theme-color" style="background:#39FF14"></div></div>
          </div>
          <div class="theme-option" onclick="ThemeManager.apply('neon-yellow')">
            <div class="theme-name" style="font-size:0.8rem;">Dourado (Tempo)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#080802"></div><div class="theme-color" style="background:#FFFF00"></div></div>
          </div>
          <div class="theme-option" onclick="ThemeManager.apply('neon-red')">
            <div class="theme-name" style="font-size:0.8rem;">Sengoku (Escudo)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#0A0202"></div><div class="theme-color" style="background:#FF003C"></div></div>
          </div>
        </div>

        <div class="mobile-drawer__section">Acessibilidade e Texto</div>
        <div style="padding: 10px 20px; display:flex; flex-direction:column; gap:12px;">
          <div class="field">
            <label class="field__label" style="font-size:0.65rem;">Cor de Texto Primária</label>
            <div style="display:flex; gap:8px;">
               <div onclick="ThemeManager.setTextColor('#F5F0E8')" style="width:24px; height:24px; background:#F5F0E8; border-radius:50%; cursor:pointer; border:1px solid #666;"></div>
               <div onclick="ThemeManager.setTextColor('#FFFFFF')" style="width:24px; height:24px; background:#FFFFFF; border-radius:50%; cursor:pointer; border:1px solid #666;"></div>
               <div onclick="ThemeManager.setTextColor('#E0FFE0')" style="width:24px; height:24px; background:#E0FFE0; border-radius:50%; cursor:pointer; border:1px solid #666;"></div>
               <div onclick="ThemeManager.setTextColor('#FFFFE0')" style="width:24px; height:24px; background:#FFFFE0; border-radius:50%; cursor:pointer; border:1px solid #666;"></div>
               <div onclick="ThemeManager.setTextColor('')" style="width:24px; height:24px; background:#aaa; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:12px; color:#000;">✕</div>
            </div>
          </div>
          <div class="field">
            <label class="field__label" style="font-size:0.65rem;">Estilo de Fonte</label>
            <div style="display:flex; gap:8px;">
               <button class="btn btn-ghost" onclick="ThemeManager.setFontFamily('serif')" style="flex:1; font-size:0.65rem; padding:5px;">Com Serifa (JP)</button>
               <button class="btn btn-ghost" onclick="ThemeManager.setFontFamily('sans')" style="flex:1; font-size:0.65rem; padding:5px;">Sem Serifa (Inter)</button>
            </div>
          </div>
        </div>

        <div style="padding:20px; font-size:0.7rem; color:var(--text-muted); text-align:center; border-top:1px solid var(--border-panel); margin-top:auto;">
          A estética selecionada será aplicada em todas as páginas e lembrada na sua próxima sessão.
        </div>
      </div>
    `;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  // Inject Scripts
  const themeScript = document.createElement('script');
  themeScript.src = 'js/theme-manager.js';
  document.head.appendChild(themeScript);

  const calcScript = document.createElement('script');
  calcScript.src = 'js/ranged-calc.js';
  document.head.appendChild(calcScript);

  const headerHtml = `
    <header class="new-header">
      <a href="index.html" class="new-header__title">⚔ Escudo do <span>Daimyo</span></a>
      ${renderDesktopNav()}
      <button class="mobile-menu-btn" id="mobile-menu-open">☰</button>
    </header>
    ${renderMobileDrawer()}
    ${renderThemeDrawer()}
  `;

  document.write('<div id="daimyo-header-mount"></div>');
  
  document.addEventListener('DOMContentLoaded', () => {
    const mount = document.getElementById('daimyo-header-mount');
    const oldContainer = document.getElementById('daimyo-header');
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

      if(btnOpen) btnOpen.addEventListener('click', () => { overlay.classList.add('open'); document.body.classList.add('nav-open'); });
      if(btnClose) btnClose.addEventListener('click', window.closeMobileNav);
      if(overlay) overlay.addEventListener('click', (e) => { if(e.target === overlay) window.closeMobileNav(); });
    }
  });

  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('✨ PWA Service Worker registrado:', reg.scope))
        .catch(err => console.warn('PWA Error:', err));
    });
  }

})();
