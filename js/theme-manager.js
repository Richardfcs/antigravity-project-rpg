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

  function init() {
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
    console.log('✨ ThemeManager: Mudando fonte para:', percent);
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
