(function() {
  const css = `
    /* === MOBILE-FIRST HEADER === */
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
      top: 0; left: 0; width: 100%; height: 100vh;
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
    
    /* === GLOBAL SCROLLBAR === */
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-track { background: var(--bg-deep); }
    ::-webkit-scrollbar-thumb { background: var(--border-panel); border-radius: 20px; border: 3px solid var(--bg-deep); }
    ::-webkit-scrollbar-thumb:hover { background: var(--gold); }
    * { scrollbar-width: thin; scrollbar-color: var(--gold) var(--bg-deep); }
    
    /* === THEME DRAWER === */
    .theme-drawer {
      position: fixed;
      top: 0; right: -360px; width: 340px; max-width: 100%; height: 100vh;
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
    
    /* LIGHT THEME OVERRIDES (Washi) */
    html[data-theme="light"] {
      --bg-deep: #F8F9FA; --bg-panel: #FFFFFF; --bg-card: #FFFFFF; --bg-input: #F8F9FA;
      --border-panel: #E2E8F0; --border-input: #CBD5E1; --border-focus: #C41E3A;
      --text-primary: #1E293B; --text-secondary: #475569; --text-muted: #64748B;
      --red-blood: #991B1B; --red-accent: #B91C1C; --gold: #A16207;
      --red-glow: rgba(185, 28, 28, 0.15);
    }
    
    /* SAKURA THEME (Pastel Suave) */
    html[data-theme="sakura"] {
      --bg-deep: #FFF7F9; --bg-panel: #FDF2F4; --bg-card: #FFFFFF; --bg-input: #FFFFFF;
      --border-panel: #FADADD; --border-input: #FFD1DC; --border-focus: #E91E63;
      --text-primary: #5D4037; --text-secondary: #8D6E63; --text-muted: #BCAAA4;
      --red-blood: #C2185B; --red-accent: #E91E63; --gold: #FFB7C5;
      --red-glow: rgba(233, 30, 99, 0.2);
    }

    /* STONE THEME (Cinza Azulado) */
    html[data-theme="stone"] {
      --bg-deep: #0F172A; --bg-panel: #1E293B; --bg-card: #334155; --bg-input: #0F172A;
      --border-panel: #475569; --border-input: #64748B; --border-focus: #38BDF8;
      --text-primary: #F8FAFC; --text-secondary: #94A3B8; --text-muted: #64748B;
      --red-blood: #0EA5E9; --red-accent: #38BDF8; --gold: #94A3B8;
      --red-glow: rgba(56, 189, 248, 0.2);
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

    /* === KEGARE CLOCK HEADER === */
    .kegare-mini-clock {
      display: flex; gap: 4px; margin-left: 12px; align-items: center;
    }
    .kegare-dot {
      width: 10px; height: 10px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); 
      cursor: pointer; background: rgba(255,255,255,0.05); transition: all 0.2s;
    }
    .kegare-dot.active-pure { background: #22c55e; box-shadow: 0 0 8px rgba(34,197,94,0.4); border-color: #22c55e; }
    .kegare-dot.active-tainted { background: #eab308; box-shadow: 0 0 8px rgba(234,179,8,0.4); border-color: #eab308; }
    .kegare-dot.active-doomed { background: #c41e3a; box-shadow: 0 0 8px rgba(196,30,58,0.4); border-color: #c41e3a; }
    
    /* === FRIGHT DRAWER === */
    .fright-drawer {
      position: fixed; top: 0; right: -360px; width: 340px; max-width: 100%; height: 100vh;
      background: var(--bg-deep); border-left: 1px solid var(--border-panel);
      z-index: 3000; transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
      display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.5);
      overflow-y: auto; overflow-x: hidden;
    }
    .fright-drawer.open { transform: translateX(-360px); }
    .fright-result-box {
      margin: 20px; padding: 15px; border-radius: var(--radius-lg);
      background: rgba(0,0,0,0.2); border: 1px solid var(--border-panel);
      display: none; flex-direction: column; gap: 10px;
    }
    .fright-result-box.visible { display: flex; animation: slide-up 0.3s ease; }
    .dice-display { display: flex; gap: 8px; justify-content: center; }
    .dice-icon { width: 32px; height: 32px; background: var(--bg-card); border: 1px solid var(--border-input); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 900; }
    
    @keyframes slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  `;

  /* Ranged Calc CSS removed from global header */

  // Define Links Mapping
  const pages = [
    { url: 'index.html', icon: '⚔', label: 'Combate' },
    { url: 'kegare-panico.html', icon: '🧠', label: 'Sanidade' },
    { url: 'combat-calculator.html', icon: '🎲', label: 'Dano' },
    { url: 'equipment-database.html', icon: '📦', label: 'Arsenal' },
    { url: 'library.html', icon: '📚', label: 'Biblioteca' },
    { url: 'time-management.html', icon: '⏱', label: 'Tempo' },
    { url: 'oracle-generators.html', icon: '🔮', label: 'Oráculo' }
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
          ${currentPage === 'combat-calculator.html' ? `
          <div style="display:flex; gap:8px;">
            <a href="characters-sheet.html" class="btn btn-ghost" title="Gerenciamento de Fichas" style="min-height:44px; padding:0 15px; color: var(--gold); border: 1px solid rgba(212, 168, 70, 0.3); display: flex; align-items: center; gap: 6px; text-decoration: none;">📜 Fichas</a>
            <button class="btn btn-ghost" onclick="window.toggleCharacterDrawer && window.toggleCharacterDrawer()" title="Lista de Personagens" style="min-height:44px; padding:0 15px; color: var(--text-primary); border: 1px solid var(--border-panel); display: flex; align-items: center; gap: 6px;">👥 Lista</button>
          </div>
          ` : ''}
          ${currentPage === 'index.html' ? `
          <button class="btn btn-ghost" onclick="ThemeManager.openDrawer()" title="Customizar Tema" style="min-height:44px; padding:0 15px;">🎨 Customizar</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleDrawer('gm-notes-drawer')" title="Anotações" style="min-height:44px; padding:0 15px;">📝 Notas</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleDrawer('clocks-drawer')" title="Ameaças" style="min-height:44px; padding:0 15px;">⏱ Ameaças</button>
          <button class="btn btn-ghost" onclick="NarrativeTools && NarrativeTools.toggleModal('combat-mass-overlay')" title="Guerra" style="min-height:44px; padding:0 15px;">⚔ Guerra</button>
          ` : ''}
          ${currentPage === 'kegare-panico.html' ? `
          <button class="btn btn-ghost" onclick="window.toggleFrightDrawer()" title="Teste de Pânico" style="min-height:44px; padding:0 15px;">🎲 Pânico</button>
          ` : ''}
          ${currentPage === 'oracle-generators.html' ? `
          <button class="btn btn-ghost" onclick="window.toggleTacticalMap && window.toggleTacticalMap()" title="Mesa Tática" style="min-height:44px; padding:0 15px; color: var(--gold); border: 1px solid rgba(212, 168, 70, 0.3);">🗺 Mapa de Guerra</button>
          ` : ''}
          ${currentPage === 'time-management.html' ? `
          <button class="btn btn-ghost" onclick="window.DataManager && window.DataManager.open()" title="Gerenciamento de Dados" style="min-height:44px; padding:0 15px; color: var(--gold); border: 1px solid rgba(212, 168, 70, 0.3);">⚙️ Dados</button>
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
            ${currentPage === 'combat-calculator.html' ? `
            <a href="characters-sheet.html" onclick="window.closeMobileNav()">📜 Fichas de Personagem</a>
            <button onclick="window.closeMobileNav(); window.toggleCharacterDrawer && window.toggleCharacterDrawer()">👥 Lista de Personagens</button>
            ` : ''}
            ${currentPage === 'kegare-panico.html' ? `
            <button onclick="window.closeMobileNav(); toggleFrightDrawer()">🎲 Teste de Pânico</button>
            ` : ''}
            ${currentPage === 'oracle-generators.html' ? `
            <button onclick="window.closeMobileNav(); window.toggleTacticalMap && window.toggleTacticalMap()" style="color: var(--gold);">🗺 Mesa Tática de Guerra</button>
            ` : ''}
            ${currentPage === 'time-management.html' ? `
            <button onclick="window.closeMobileNav(); window.DataManager && window.DataManager.open()" style="color: var(--gold);">⚙️ Gerenciamento de Dados</button>
            ` : ''}
          </div>
          <div class="mobile-drawer__section">Sistema ⚔️</div>
        <div style="padding: 10px 20px;">
          <div id="db-status-card" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-panel); padding: 12px; border-radius: 8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
              <span style="font-size: 0.75rem; color: var(--gold); font-weight: 700; text-transform: uppercase;">Cofre Infinito</span>
              <span id="db-status-badge" style="background: var(--green-success); color: #000; font-size: 0.6rem; padding: 2px 6px; border-radius: 4px; font-weight: 900;">ATIVO</span>
            </div>
            <p style="font-size: 0.65rem; color: var(--text-muted); line-height: 1.4;">
              Seu clã agora utiliza <strong>IndexedDB</strong>. 
              Capacidade: <span style="color:var(--text-primary)">~1GB (Giga)</span>.
              <br>Síncrono com a Arena e Registros.
            </p>
          </div>
        </div>

        <div style="height: 40px;"></div>
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
          <div class="theme-option" onclick="ThemeManager.apply('sakura')">
            <div class="theme-name" style="font-size:0.8rem;">Sakura (Pastel)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#FADADD"></div><div class="theme-color" style="background:#D81B60"></div></div>
          </div>
          <div class="theme-option" onclick="ThemeManager.apply('stone')">
            <div class="theme-name" style="font-size:0.8rem;">Stone (Azulado)</div>
            <div class="theme-preview"><div class="theme-color" style="background:#1E293B"></div><div class="theme-color" style="background:#38BDF8"></div></div>
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
          <div class="field">
            <label class="field__label" style="font-size:0.65rem;">Tamanho do Texto</label>
            <div style="display:flex; align-items:center; gap:12px; background:var(--bg-panel); border:1px solid var(--border-panel); padding:8px; border-radius:var(--radius);">
               <button id="btn-font-dec" class="btn btn-ghost" style="width:44px; height:44px; font-size:1.2rem;">-</button>
               <div id="font-size-display" style="flex:1; text-align:center; font-weight:700; font-family:monospace; font-size:1rem; min-width:60px;">100%</div>
               <button id="btn-font-inc" class="btn btn-ghost" style="width:44px; height:44px; font-size:1.2rem;">+</button>
               <button id="btn-font-reset" class="btn btn-sm btn-ghost" style="padding:4px 8px; font-size:0.6rem;">Reset</button>
            </div>
          </div>
        </div>
        <div class="mobile-drawer__section">📜 O Selo do Daimyo</div>
        <div style="padding: 10px 20px; display:flex; flex-direction:column; gap:8px;">
          <p style="font-size:0.65rem; color:var(--text-muted); margin-bottom:4px;">Backup e Sincronização da Campanha (JSON)</p>
          <button class="btn btn-gold" onclick="DaimyoSeal.exportCampaign()" style="font-size:0.75rem; padding:12px;">📤 Exportar Campanha</button>
          
          <div style="position:relative;">
            <button class="btn btn-secondary" onclick="document.getElementById('import-file-input').click()" style="width:100%; font-size:0.75rem; padding:12px;">📥 Importar Backup</button>
            <input type="file" id="import-file-input" style="display:none;" accept=".json" onchange="DaimyoSeal.importCampaign(this.files[0])">
          </div>
          <p style="font-size:0.6rem; color:var(--red-accent); font-style:italic; text-align:center;">Aviso: A importação sobrescreve todos os dados atuais.</p>
        </div>

        <div style="padding:20px; font-size:0.7rem; color:var(--text-muted); text-align:center; border-top:1px solid var(--border-panel); margin-top:auto;">
          A estética selecionada será aplicada em todas as páginas e lembrada na sua próxima sessão.
        </div>
      </div>
    `;
  }

  function renderFrightDrawer() {
    return `
      <div id="fright-drawer" class="fright-drawer">
        <div class="rc-header">
          <h2 class="new-header__title">🎲 Teste de <span>Pânico</span></h2>
          <button class="mobile-drawer__close" onclick="window.toggleFrightDrawer()">✕</button>
        </div>
        
        <div class="mobile-drawer__section">Parâmetros do Samurai</div>
        <div style="padding: 15px 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border-panel);">
          <div id="fright-drawer-kegare-status" style="font-size: 0.8rem; font-weight: 700; color: var(--gold); display: flex; justify-content: space-between;">
            <span>Mácula: <span id="fd-kegare-label">Puro</span></span>
            <span id="fd-kegare-mod">Von +2</span>
          </div>
        </div>
        <div style="padding: 20px; display:flex; flex-direction:column; gap:15px;">
          <div class="field">
            <label class="field__label">Vontade (Von)</label>
            <input type="number" id="fright-will" class="field__input" value="10">
          </div>
          <div class="field">
            <label class="field__label">Mod. Medo/Monstro</label>
            <input type="number" id="fright-mod" class="field__input" value="0">
          </div>
          <button class="btn btn-primary" onclick="window.executeFrightCheck()" style="margin-top:10px;">Rolar 3d6 Pânico</button>
        </div>

        <div id="fright-result-container" class="fright-result-box">
          <div id="fright-roll-1" class="dice-display"></div>
          <div id="fright-verdict-text" style="text-align:center; font-weight:700; font-size:1.1rem; padding:5px 0;"></div>
          <div id="fright-mof-info" style="font-size:0.75rem; color:var(--text-muted); text-align:center;"></div>
          
          <div id="fright-table-section" style="display:none; border-top:1px solid var(--border-panel); padding-top:10px; margin-top:5px;">
            <div id="fright-roll-2" class="dice-display" style="margin-bottom:10px;"></div>
            <div id="fright-table-effect" style="background:var(--bg-card); border-left:3px solid var(--red-accent); padding:10px; font-size:0.85rem;"></div>
          </div>
        </div>

        <div style="padding:20px; font-size:0.7rem; color:var(--text-muted); text-align:center; border-top:1px solid var(--border-panel); margin-top:auto;">
          O teste considera automaticamente o Modificador de Mácula do Relógio Global.
        </div>
      </div>
    `;
  }

  function renderKegareMini() {
    let dots = '';
    for(let i=1; i<=6; i++) {
        dots += `<div class="kegare-dot" data-lv="${i}" onclick="window.setGlobalKegare(${i})" title="Nível ${i}"></div>`;
    }
    return `<div class="kegare-mini-clock" id="kegare-header-clock">${dots}</div>`;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);

  // Script injection logic removed. Moved to explicit declaraction in HTML for better reliability.

  const headerHtml = `
    <header class="new-header">
      <div style="display:flex; align-items:center;">
        <a href="index.html" class="new-header__title">⚔ Escudo do <span>Daimyo</span></a>
        ${currentPage === 'kegare-panico.html' ? renderKegareMini() : ''}
      </div>
      ${renderDesktopNav()}
      <button class="mobile-menu-btn" id="mobile-menu-open">☰</button>
    </header>
    ${renderMobileDrawer()}
    ${renderThemeDrawer()}
    ${renderFrightDrawer()}
  `;

  function injectMount() {
    if (document.getElementById('daimyo-header-mount')) return;
    const mount = document.createElement('div');
    mount.id = 'daimyo-header-mount';
    document.body.prepend(mount);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMount);
  } else {
    injectMount();
  }
  
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

      // LISTENERS PARA CONTROLE DE FONTE
      const btnDec = document.getElementById('btn-font-dec');
      const btnInc = document.getElementById('btn-font-inc');
      const btnRes = document.getElementById('btn-font-reset');
      
      if(btnDec) btnDec.addEventListener('click', () => ThemeManager.adjustFontSize(-10));
      if(btnInc) btnInc.addEventListener('click', () => ThemeManager.adjustFontSize(10));
      if(btnRes) btnRes.addEventListener('click', () => ThemeManager.setFontSize(100));

      // KEGARE & FRIGHT LOGIC
      window.setGlobalKegare = async function(lv) {
        if (!window.KegareManager) return;
        const newLv = await KegareManager.setLevel(lv);
        window.updateKegareUI();
      };

      window.updateKegareUI = function() {
        if (!window.KegareManager) return;
        const lv = KegareManager.getLevel();
        const tier = KegareManager.getTierInfo();
        const dots = document.querySelectorAll('.kegare-dot');
        dots.forEach((dot, idx) => {
          const i = idx + 1;
          dot.className = 'kegare-dot';
          if (i <= lv) {
            let colorClass = 'active-pure';
            if (i >= 3) colorClass = 'active-tainted';
            if (i >= 5) colorClass = 'active-doomed';
            dot.classList.add(colorClass);
          }
        });

        // Update Drawer Status if exists
        const label = document.getElementById('fd-kegare-label');
        const mod = document.getElementById('fd-kegare-mod');
        if (label && mod) {
          label.textContent = tier.label;
          label.parentElement.parentElement.style.color = tier.color;
          mod.textContent = `Von ${tier.mod >= 0 ? '+' : ''}${tier.mod}`;
        }
      };

      window.toggleFrightDrawer = function() {
        const drawer = document.getElementById('fright-drawer');
        if (drawer) drawer.classList.toggle('open');
      };

      window.executeFrightCheck = function() {
        const will = parseInt(document.getElementById('fright-will').value) || 10;
        const mod = parseInt(document.getElementById('fright-mod').value) || 0;
        
        const result = KegareManager.runFrightCheck(will, mod);
        const box = document.getElementById('fright-result-container');
        box.classList.add('visible');
        
        // Roll 1
        const roll1El = document.getElementById('fright-roll-1');
        if (roll1El) {
          roll1El.innerHTML = result.roll1.dice.map(d => `<div class="dice-icon">${d}</div>`).join('') + 
            `<span style="margin-left:10px; font-weight:900;">= ${result.roll1.total}</span>`;
        }
        
        const verdictEl = document.getElementById('fright-verdict-text');
        const mofEl = document.getElementById('fright-mof-info');
        const tableSection = document.getElementById('fright-table-section');
        
        if (result.success) {
            if (verdictEl) {
                verdictEl.textContent = '✅ SUCESSO';
                verdictEl.style.color = '#22c55e';
            }
            if (mofEl) mofEl.textContent = `Vontade ${result.will} + Mod ${result.monsterMod} + Mácula ${result.kegareMod >= 0 ? '+' : ''}${result.kegareMod} = Alvo ${result.target}`;
            if (tableSection) tableSection.style.display = 'none';
        } else {
            if (verdictEl) {
                verdictEl.textContent = '❌ FALHA';
                verdictEl.style.color = '#c41e3a';
            }
            if (mofEl) mofEl.textContent = `Alvo ${result.target} | Margem de Falha: ${result.mof}`;
            if (tableSection) tableSection.style.display = 'block';
            
            // Roll 2
            const roll2El = document.getElementById('fright-roll-2');
            if (roll2El) {
                roll2El.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted); margin-right:5px;">3d6 + MoF + Mácula:</span>` +
                  result.roll2.dice.map(d => `<div class="dice-icon" style="width:24px; height:24px; font-size:0.8rem;">${d}</div>`).join('') +
                  `<span style="margin-left:5px; font-weight:900;">+ ${result.mof} + ${result.kegareLevel} = ${result.finalScore}</span>`;
            }
            
            const effectEl = document.getElementById('fright-table-effect');
            if (effectEl) effectEl.innerHTML = `<strong>${result.tableResult.label}</strong>: ${result.tableResult.desc}`;
        }
      };

      // Initial Sync
      setTimeout(() => {
        window.updateKegareUI();
      }, 500);

      window.addEventListener('daimyoStateUpdated', () => {
        window.updateKegareUI();
      });
      
      window.addEventListener('storage', (e) => {
        if (e.key === 'daimyoShieldState') window.updateKegareUI();
      });
    }
  });

  if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('✨ PWA Service Worker registrado:', reg.scope))
        .catch(err => console.warn('PWA Error:', err));
    });
  }

  /* === WAKE LOCK MANAGER (A TOCHA INEXTINGUÍVEL) === */
  window.WakeLockManager = (function() {
    let wakeLock = null;
    const STORAGE_KEY = 'daimyo-wake-lock-active';

    const isSupported = () => 'wakeLock' in navigator;

    const updateUI = () => {
      const active = localStorage.getItem(STORAGE_KEY) === 'true';
      
      // Notificação para outros componentes (como o DataManager)
      window.dispatchEvent(new CustomEvent('wakeLockStateChanged', { detail: { active } }));
    };

    const request = async (silent = false) => {
      if (!isSupported()) return false;
      try {
        if (wakeLock) await wakeLock.release();
        wakeLock = await navigator.wakeLock.request('screen');
        if (!silent) console.log('⛩️ Tocha Inextinguível: Acesa.');
        updateUI();
        return true;
      } catch (err) {
        console.error('⛩️ Tocha: Erro ao solicitar lock:', err);
        return false;
      }
    };

    const release = async () => {
      if (wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
      console.log('⛩️ Tocha Inextinguível: Apagada.');
      updateUI();
    };

    const toggle = async () => {
      const active = localStorage.getItem(STORAGE_KEY) === 'true';
      const newState = !active;
      localStorage.setItem(STORAGE_KEY, newState);
      
      if (newState) {
        await request();
      } else {
        await release();
      }
      return newState;
    };

    const init = async () => {
      if (!isSupported()) return;
      
      // Auto-ativa se estava ligado na sessão anterior
      if (localStorage.getItem(STORAGE_KEY) === 'true') {
        await request(true);
      }
      
      // Re-ativa ao voltar para a aba
      document.addEventListener('visibilitychange', async () => {
        if (localStorage.getItem(STORAGE_KEY) === 'true' && document.visibilityState === 'visible') {
          await request(true);
        }
      });

      updateUI();
    };

    return { init, toggle, isActive: () => localStorage.getItem(STORAGE_KEY) === 'true' };
  })();

  // Inicialização Automática
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.WakeLockManager.init());
  } else {
    window.WakeLockManager.init();
  }

  // --- SILENCIADOR DE ERROS (View Transitions) ---
  // Captura o AbortError disparado pelo navegador quando uma transição MPA é interrompida.
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.name === 'AbortError' && (event.reason.message.includes('Transition') || event.reason.message.includes('skipped'))) {
      event.preventDefault(); // Silencia o erro no console
      console.warn('✨ Transição suavizada: O navegador decidiu pular a animação (comum em navegações rápidas).');
    }
  });

})();
