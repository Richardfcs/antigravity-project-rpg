/**
 * Escudo do Daimyo - Theme Manager
 * Gerencia a alternância entre Dark/Light mode e paletas personalizadas,
 * agora com suporte a temas Neon e acessibilidade de fontes.
 */

window.ThemeManager = (function() {
  const STORAGE_KEY = 'daimyo-theme-preference';
  const SETTINGS_KEY = 'daimyo-ui-settings';
  
  let currentSettings = {
    theme: 'dark',
    textColor: '',
    fontFamily: 'serif', // 'serif' ou 'sans'
    fontSize: 100 // Porcentagem (100 = 16px padrão)
  };

  function injectThemeStyles() {
    const themeCss = `
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
    `;
    const style = document.createElement('style');
    style.id = 'daimyo-theme-overrides';
    style.innerHTML = themeCss;
    document.head.appendChild(style);
  }

  function init() {
    injectThemeStyles();
    const savedTheme = localStorage.getItem(STORAGE_KEY) || 'dark';
    const savedSettings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    
    currentSettings = {
      theme: savedTheme,
      textColor: savedSettings.textColor || '',
      fontFamily: savedSettings.fontFamily || 'serif',
      fontSize: savedSettings.fontSize || 100
    };

    apply(currentSettings.theme);
    applyUISettings();
  }

  function apply(themeId) {
    document.documentElement.setAttribute('data-theme', themeId);
    localStorage.setItem(STORAGE_KEY, themeId);
    currentSettings.theme = themeId;
    
    // Dispatch event for UI updates if needed
    window.dispatchEvent(new CustomEvent('daimyo-theme-changed', { detail: { theme: themeId } }));
  }

  function applyUISettings() {
    const root = document.documentElement;
    
    // Aplicar cor de texto se houver
    if (currentSettings.textColor) {
      root.style.setProperty('--text-primary', currentSettings.textColor);
    } else {
      root.style.removeProperty('--text-primary');
    }

    // Aplicar fonte
    if (currentSettings.fontFamily === 'sans') {
      root.style.setProperty('--font-body', "'Inter', sans-serif");
      root.style.setProperty('--font-display', "'Inter', sans-serif");
    } else {
      root.style.removeProperty('--font-body');
      root.style.removeProperty('--font-display');
    }

    // Aplicar tamanho de fonte
    root.style.fontSize = currentSettings.fontSize + '%';
    
    // Atualizar mostrador na interface se existir
    const fsDisplay = document.getElementById('font-size-display');
    if (fsDisplay) fsDisplay.textContent = currentSettings.fontSize + '%';

    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
  }

  function setTextColor(color) {
    currentSettings.textColor = color;
    applyUISettings();
  }

  function setFontFamily(type) {
    currentSettings.fontFamily = type;
    applyUISettings();
  }

  function setFontSize(percent) {
    // Limites razoáveis: 70% a 160%
    const newSize = Math.max(70, Math.min(160, percent));
    currentSettings.fontSize = newSize;
    applyUISettings();
    // Dispatch event for UI updates if needed
    window.dispatchEvent(new CustomEvent('daimyo-fontsize-changed', { detail: { fontSize: newSize } }));
  }

  function adjustFontSize(delta) {
    const current = currentSettings.fontSize || 100;
    setFontSize(current + delta);
  }

  function openDrawer() {
    const drawer = document.getElementById('theme-drawer');
    if (drawer) drawer.classList.add('open');
  }

  function closeDrawer() {
    const drawer = document.getElementById('theme-drawer');
    if (drawer) drawer.classList.remove('open');
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    apply,
    setTextColor,
    setFontFamily,
    setFontSize,
    adjustFontSize,
    openDrawer,
    closeDrawer,
    getSettings: () => currentSettings
  };
})();
