(function () {
  const themeContract =
    window.DaimyoThemeContract ||
    (window.ThemeManager && window.ThemeManager.getContract
      ? window.ThemeManager.getContract()
      : null);

  function renderThemeOption(theme, activeTheme) {
    return `
      <button
        type="button"
        class="theme-option ${activeTheme === theme.id ? "active" : ""}"
        data-daimyo-theme-option
        data-theme-id="${theme.id}"
        onclick="ThemeManager.apply('${theme.id}')"
      >
        <div class="theme-preview">
          ${theme.preview
            .map((color) => `<div class="theme-color" style="background:${color}"></div>`)
            .join("")}
        </div>
        <div class="theme-name" style="font-size:0.84rem;">${theme.label}</div>
        <p style="margin:0; font-size:0.68rem; line-height:1.5; color:var(--text-muted);">
          ${theme.tone}
        </p>
      </button>
    `;
  }

  const css = `
    #daimyo-header {
      position: relative;
      background: var(--bg-panel);
      border-bottom: 1px solid var(--border-panel);
      z-index: 1000;
    }

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
      gap: 12px;
      padding: 12px 20px;
    }

    .new-header__title {
      font-family: var(--font-display);
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      text-decoration: none;
      white-space: nowrap;
    }
    .new-header__title span { color: var(--gold); }

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
      align-items: center;
      justify-content: space-between;
      gap: 16px;
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
    .new-tab-nav__link:hover {
      color: var(--text-secondary);
      background: rgba(255,255,255,0.03);
    }
    .new-tab-nav__link.active {
      color: var(--gold);
      border-bottom: 2px solid var(--gold);
      border-radius: var(--radius) var(--radius) 0 0;
    }

    .active-char-box {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border-panel);
      background: rgba(0,0,0,0.2);
    }
    .active-char-name {
      font-family: var(--font-display);
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--gold);
    }
    .header-avatar {
      width: 34px;
      height: 34px;
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
      background: rgba(212,168,70,0.1);
      font-size: 0.9rem;
    }

    .btn-portal {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border-panel);
      background: rgba(255, 255, 255, 0.05);
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

    .mobile-drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      background: rgba(0,0,0,0.8);
      z-index: 2000;
      opacity: 0;
      visibility: hidden;
      transition: all 300ms ease;
    }
    .mobile-drawer-overlay.open {
      opacity: 1;
      visibility: visible;
    }
    .mobile-drawer {
      position: absolute;
      top: 0;
      left: -300px;
      width: 300px;
      height: 100vh;
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
      background: none;
      border: none;
      font-size: 1.5rem;
      color: var(--text-secondary);
      cursor: pointer;
      min-height: 44px;
      min-width: 44px;
      display: flex;
      justify-content: center;
      align-items: center;
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
    .mobile-drawer__links a,
    .mobile-drawer__links button {
      padding: 15px 20px;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 0.95rem;
      font-weight: 600;
      border-bottom: 1px solid var(--border-panel);
      background: transparent;
      border-left: none;
      border-right: none;
      border-top: none;
      text-align: left;
      cursor: pointer;
      font-family: var(--font-body);
    }
    .mobile-drawer__links a.active {
      color: var(--gold);
      background: rgba(212,168,70,0.05);
      border-left: 3px solid var(--gold);
    }

    .theme-drawer {
      position: fixed;
      top: 0;
      right: -360px;
      width: 340px;
      max-width: 100%;
      height: 100vh;
      background: var(--bg-deep);
      border-left: 1px solid var(--border-panel);
      z-index: 3000;
      transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      box-shadow: -10px 0 30px rgba(0,0,0,0.5);
    }
    .theme-drawer.open { transform: translateX(-360px); }
    .theme-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      padding: 20px;
    }
    .theme-option {
      padding: 16px;
      border: 1px solid var(--border-panel);
      border-radius: var(--radius-lg);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all var(--transition);
      background: var(--bg-panel);
    }
    .theme-option:hover { border-color: var(--gold); }
    .theme-option.active { border-color: var(--gold); border-width: 2px; }
    .theme-name {
      font-weight: 700;
      font-family: var(--font-display);
      font-size: 1rem;
    }
    .theme-preview { display: flex; gap: 4px; }
    .theme-color {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.1);
    }
  `;

  const pages = [
    { url: "index.html", icon: "🏠", label: "Inicio" },
    { url: "characters-sheet.html", icon: "📜", label: "Ficha" },
    { url: "notes.html", icon: "📓", label: "Notas" },
    { url: "equipment-database.html", icon: "⚔", label: "Arsenal" },
    { url: "library.html", icon: "📚", label: "Biblioteca" },
    { url: "settings.html", icon: "⚙", label: "Ajustes" }
  ];

  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  function renderThemeDrawer() {
    const activeTheme =
      window.ThemeManager && window.ThemeManager.getSettings
        ? window.ThemeManager.getSettings().theme
        : themeContract
          ? themeContract.defaultTheme
          : "dark";
    const classicThemes = themeContract
      ? themeContract.themeOrder
          .map((themeId) => themeContract.themes[themeId])
          .filter((theme) => theme.group === "classic")
      : [];
    const experimentalThemes = themeContract
      ? themeContract.themeOrder
          .map((themeId) => themeContract.themes[themeId])
          .filter((theme) => theme.group === "experimental")
      : [];
    const textColors = themeContract ? themeContract.textColors : [];
    const fontFamilies = themeContract
      ? Object.values(themeContract.fontFamilies)
      : [];

    return `
      <div id="theme-drawer" class="theme-drawer" style="overflow-y:auto; scrollbar-width:thin;">
        <div class="mobile-drawer__header">
          <h2 class="new-header__title">Leitura do <span>Viajante</span></h2>
          <button class="mobile-drawer__close" onclick="ThemeManager.closeDrawer()">✕</button>
        </div>

        <div class="mobile-drawer__section">Paletas da corte</div>
        <div class="theme-grid" style="grid-template-columns: 1fr 1fr; padding: 10px 20px;">
          ${classicThemes.map((theme) => renderThemeOption(theme, activeTheme)).join("")}
        </div>

        <div class="mobile-drawer__section">Paletas experimentais</div>
        <div class="theme-grid" style="grid-template-columns: 1fr 1fr; padding: 10px 20px;">
          ${experimentalThemes.map((theme) => renderThemeOption(theme, activeTheme)).join("")}
        </div>

        <div class="mobile-drawer__section">Traco e leitura</div>
        <div style="padding: 10px 20px; display:flex; flex-direction:column; gap:12px;">
          <div class="field">
            <label class="field__label" style="font-size:0.65rem;">Cor principal do texto</label>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${textColors
                .map(
                  (color) => `
                    <button
                      type="button"
                      onclick="ThemeManager.setTextColor('${color.value}')"
                      style="display:inline-flex; align-items:center; gap:8px; border:1px solid var(--border-panel); background:var(--bg-panel); color:var(--text-primary); border-radius:999px; padding:6px 10px; cursor:pointer;"
                    >
                      <span style="width:18px; height:18px; background:${color.value || "#9ca3af"}; border-radius:999px; border:1px solid rgba(0,0,0,0.15); display:inline-block;"></span>
                      <span style="font-size:0.68rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em;">${color.label}</span>
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="field">
            <label class="field__label" style="font-size:0.65rem;">Estilo da escrita</label>
            <div style="display:flex; gap:8px;">
              ${fontFamilies
                .map(
                  (fontFamily) => `
                    <button class="btn btn-ghost" onclick="ThemeManager.setFontFamily('${fontFamily.id}')" style="flex:1; font-size:0.68rem; padding:8px 10px;">
                      ${fontFamily.label}
                    </button>
                  `
                )
                .join("")}
            </div>
          </div>
          <div class="field">
            <label class="field__label" style="font-size:0.65rem;">Tamanho do texto</label>
            <div style="display:flex; align-items:center; gap:12px; background:var(--bg-panel); border:1px solid var(--border-panel); padding:8px; border-radius:var(--radius);">
              <button id="btn-font-dec" class="btn btn-ghost" style="width:44px; height:44px; font-size:1.2rem;">-</button>
              <div id="font-size-display" data-daimyo-font-size-display style="flex:1; text-align:center; font-weight:700; font-family:monospace; font-size:1rem; min-width:60px;">100%</div>
              <button id="btn-font-inc" class="btn btn-ghost" style="width:44px; height:44px; font-size:1.2rem;">+</button>
              <button id="btn-font-reset" class="btn btn-sm btn-ghost" style="padding:4px 8px; font-size:0.6rem;">Reset</button>
            </div>
          </div>
        </div>
        <div style="padding:20px; font-size:0.7rem; color:var(--text-muted); text-align:center; border-top:1px solid var(--border-panel); margin-top:auto;">
          O tom da interface acompanha o mesmo contrato visual do VTT, mas continua salvo separadamente neste app.
        </div>
      </div>
    `;
  }

  function renderDesktopNav(activeChar) {
    const tabs = pages
      .map(
        (page) =>
          `<a href="${page.url}" class="new-tab-nav__link ${
            page.url === currentPage ? "active" : ""
          }">${page.icon} ${page.label}</a>`
      )
      .join("");

    return `
      <div class="new-nav-container">
        <nav class="new-tab-nav">
          ${tabs}
        </nav>
        <div style="display:flex; align-items:center; gap:10px;">
          <button class="btn-portal" type="button" onclick="ThemeManager.openDrawer()">Leitura</button>
          <div class="active-char-box">
            ${
              activeChar && activeChar.photo
                ? `<img src="${activeChar.photo}" class="header-avatar" alt="Avatar">`
                : `<div class="header-avatar header-avatar--empty">👤</div>`
            }
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:0.55rem; color:var(--text-muted); text-transform:uppercase; font-weight:700; line-height:1;">Personagem ativo</span>
              <span class="active-char-name">${activeChar ? activeChar.name : "Nenhum"}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderMobileDrawer(activeChar) {
    const links = pages
      .map(
        (page) =>
          `<a href="${page.url}" class="${
            page.url === currentPage ? "active" : ""
          }">${page.icon} ${page.label}</a>`
      )
      .join("");

    return `
      <div class="mobile-drawer-overlay" id="mobile-nav-overlay">
        <div class="mobile-drawer">
          <div class="mobile-drawer__header">
            <h2 class="new-header__title">Escudo do <span>Jogador</span></h2>
            <button class="mobile-drawer__close" id="mobile-nav-close">✕</button>
          </div>

          <div class="mobile-drawer__section">Personagem escolhido</div>
          <div style="padding: 15px 20px; border-bottom: 1px solid var(--border-panel); display:flex; align-items:center; gap:15px;">
            ${
              activeChar && activeChar.photo
                ? `<img src="${activeChar.photo}" class="header-avatar" style="width:50px; height:50px;" alt="Avatar">`
                : `<div class="header-avatar header-avatar--empty" style="width:50px; height:50px; font-size:1.5rem;">👤</div>`
            }
            <span class="active-char-name" style="font-size:1.05rem;">${
              activeChar ? activeChar.name : "Escolha um personagem"
            }</span>
          </div>

          <div class="mobile-drawer__section">Rotas do viajante</div>
          <div class="mobile-drawer__links">
            ${links}
          </div>

          <div class="mobile-drawer__section">Leitura</div>
          <div class="mobile-drawer__links">
            <button onclick="window.closeMobileNav(); ThemeManager.openDrawer();">Ajustar leitura</button>
          </div>
        </div>
      </div>
    `;
  }

  const style = document.createElement("style");
  style.innerHTML = css;
  document.head.appendChild(style);

  window.closeMobileNav = function () {
    const overlay = document.getElementById("mobile-nav-overlay");
    if (overlay) {
      overlay.classList.remove("open");
    }
  };

  window.initPlayerHeader = function () {
    const activeChar =
      typeof CharacterManager !== "undefined"
        ? CharacterManager.getActiveCharacter()
        : null;

    const headerHtml = `
      <header class="new-header">
        <div style="display:flex; align-items:center;">
          <a href="index.html" class="new-header__title">Escudo do <span>Jogador</span></a>
        </div>
        ${renderDesktopNav(activeChar)}
        <div style="display:flex; align-items:center; gap:8px;">
          ${
            currentPage === "library.html"
              ? `<a href="../index.html" class="btn-portal" title="Voltar ao Santuario">⛩️ <span>Santuario</span></a>`
              : ""
          }
          <button class="mobile-menu-btn" id="mobile-menu-open">☰</button>
        </div>
      </header>
      ${renderMobileDrawer(activeChar)}
      ${renderThemeDrawer()}
    `;

    const target = document.getElementById("daimyo-header");
    if (!target) {
      return;
    }

    target.innerHTML = headerHtml;

    const overlay = document.getElementById("mobile-nav-overlay");
    const btnOpen = document.getElementById("mobile-menu-open");
    const btnClose = document.getElementById("mobile-nav-close");
    const btnDec = document.getElementById("btn-font-dec");
    const btnInc = document.getElementById("btn-font-inc");
    const btnRes = document.getElementById("btn-font-reset");

    if (btnOpen) {
      btnOpen.addEventListener("click", () => {
        if (overlay) {
          overlay.classList.add("open");
        }
      });
    }

    if (btnClose) {
      btnClose.addEventListener("click", window.closeMobileNav);
    }

    if (overlay) {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          window.closeMobileNav();
        }
      });
    }

    if (btnDec) {
      btnDec.addEventListener("click", () => ThemeManager.adjustFontSize(-10));
    }
    if (btnInc) {
      btnInc.addEventListener("click", () => ThemeManager.adjustFontSize(10));
    }
    if (btnRes) {
      btnRes.addEventListener("click", () => ThemeManager.setFontSize(100));
    }
  };

  if (document.readyState === "complete") {
    window.initPlayerHeader();
  } else {
    window.addEventListener("load", window.initPlayerHeader);
  }

  window.addEventListener("daimyoActiveCharacterChanged", () => {
    if (window.initPlayerHeader) {
      window.initPlayerHeader();
    }
  });

  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    window.addEventListener("load", () => {
      const swPath = window.location.pathname.includes("/Jogadores/") ? "../sw.js" : "sw.js";
      navigator.serviceWorker
        .register(swPath)
        .then(() => console.log("🛡️ Daimyo Shield: PWA Ativo via cabecalho do jogador."))
        .catch((error) => console.warn("PWA Error:", error));
    });
  }

  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason &&
      event.reason.name === "AbortError" &&
      (event.reason.message.includes("Transition") ||
        event.reason.message.includes("skipped"))
    ) {
      event.preventDefault();
    }
  });
})();
