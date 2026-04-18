/**
 * Escudo do Daimyo - Theme Manager
 * Adapter do contrato compartilhado de tema para o app do jogador.
 */

window.ThemeManager = (function () {
  const STORAGE_KEY = "daimyo-theme-preference";
  const SETTINGS_KEY = "daimyo-ui-settings";

  function buildFallbackContract() {
    return {
      defaultTheme: "dark",
      defaultSettings: {
        theme: "dark",
        textColor: "",
        fontFamily: "serif",
        fontSize: 100
      },
      themeOrder: ["dark"],
      themes: {
        dark: {
          id: "dark",
          label: "Sumi-e",
          tone: "Laca negra, ouro envelhecido e vermelho cerimonial.",
          group: "classic",
          preview: ["#050505", "#D4A846", "#C41E3A"],
          tokens: {
            "--bg-deep": "#050505",
            "--bg-panel": "#111111",
            "--bg-card": "#181818",
            "--bg-input": "#0f0f0f",
            "--border-panel": "#2a2a2a",
            "--border-input": "#333333",
            "--border-focus": "#8b0000",
            "--text-primary": "#f5f0e8",
            "--text-secondary": "#b7ab9a",
            "--text-muted": "#7c7267",
            "--red-blood": "#8b0000",
            "--red-accent": "#c41e3a",
            "--red-glow": "rgba(196, 30, 58, 0.32)",
            "--gold": "#d4a846",
            "--gold-dim": "#8b6914",
            "--mist": "rgba(245, 240, 232, 0.05)",
            "--paper": "#f3ecdf"
          }
        }
      },
      fontFamilies: {
        serif: {
          id: "serif",
          label: "Com serifa",
          body: "'Noto Serif JP', serif",
          display: "'Noto Serif JP', serif"
        },
        sans: {
          id: "sans",
          label: "Sem serifa",
          body: "'Inter', sans-serif",
          display: "'Inter', sans-serif"
        }
      },
      textColors: [
        { id: "paper", label: "Marfim", value: "#F5F0E8" },
        { id: "white", label: "Branco", value: "#FFFFFF" },
        { id: "default", label: "Padrao", value: "" }
      ]
    };
  }

  const contract = window.DaimyoThemeContract || buildFallbackContract();

  let currentSettings = normalizeSettings(contract.defaultSettings);

  function normalizeSettings(partial) {
    const defaults = contract.defaultSettings;
    const theme =
      partial && partial.theme && contract.themes[partial.theme]
        ? partial.theme
        : defaults.theme;
    const fontFamily =
      partial && partial.fontFamily && contract.fontFamilies[partial.fontFamily]
        ? partial.fontFamily
        : defaults.fontFamily;
    const fontSize =
      partial && typeof partial.fontSize === "number"
        ? Math.max(70, Math.min(160, partial.fontSize))
        : defaults.fontSize;

    return {
      theme: theme,
      textColor: partial && typeof partial.textColor === "string" ? partial.textColor : defaults.textColor,
      fontFamily: fontFamily,
      fontSize: fontSize
    };
  }

  function buildThemeCss() {
    return contract.themeOrder
      .map(function (themeId) {
        const theme = contract.themes[themeId];
        const tokens = Object.entries(theme.tokens)
          .map(function (entry) {
            return "  " + entry[0] + ": " + entry[1] + ";";
          })
          .join("\n");

        return 'html[data-theme="' + themeId + '"] {\n' + tokens + "\n}";
      })
      .join("\n\n");
  }

  function injectThemeStyles() {
    const existing = document.getElementById("daimyo-theme-overrides");
    const style = existing || document.createElement("style");
    style.id = "daimyo-theme-overrides";
    style.textContent = buildThemeCss();

    if (!existing) {
      document.head.appendChild(style);
    }
  }

  function persistSettings() {
    localStorage.setItem(STORAGE_KEY, currentSettings.theme);
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        textColor: currentSettings.textColor,
        fontFamily: currentSettings.fontFamily,
        fontSize: currentSettings.fontSize
      })
    );
  }

  function updateThemeSelectionUI() {
    document
      .querySelectorAll("[data-daimyo-theme-option]")
      .forEach(function (node) {
        const themeId = node.getAttribute("data-theme-id");
        node.classList.toggle("active", themeId === currentSettings.theme);
      });
  }

  function updateFontDisplayUI() {
    document
      .querySelectorAll("[data-daimyo-font-size-display], #font-size-display")
      .forEach(function (node) {
        node.textContent = currentSettings.fontSize + "%";
      });
  }

  function applyUISettings(options) {
    const shouldPersist = !options || options.persist !== false;
    const root = document.documentElement;
    const theme = contract.themes[currentSettings.theme] || contract.themes[contract.defaultTheme];
    const fontFamily = contract.fontFamilies[currentSettings.fontFamily] || contract.fontFamilies.serif;

    root.style.setProperty("--font-body", fontFamily.body);
    root.style.setProperty("--font-display", fontFamily.display);
    root.style.fontSize = currentSettings.fontSize + "%";

    if (currentSettings.textColor) {
      root.style.setProperty("--text-primary", currentSettings.textColor);
    } else {
      root.style.setProperty(
        "--text-primary",
        theme.tokens["--text-primary"] || "#f5f0e8"
      );
    }

    updateFontDisplayUI();
    updateThemeSelectionUI();

    if (shouldPersist) {
      persistSettings();
    }
  }

  function apply(themeId, options) {
    const nextTheme = contract.themes[themeId] ? themeId : contract.defaultTheme;
    currentSettings.theme = nextTheme;
    document.documentElement.setAttribute("data-theme", nextTheme);
    applyUISettings(options);
    window.dispatchEvent(
      new CustomEvent("daimyo-theme-changed", {
        detail: { theme: nextTheme, settings: getSettings() }
      })
    );
  }

  function setTextColor(color) {
    currentSettings.textColor = color || "";
    applyUISettings();
  }

  function setFontFamily(type) {
    currentSettings.fontFamily = contract.fontFamilies[type] ? type : contract.defaultSettings.fontFamily;
    applyUISettings();
  }

  function setFontSize(percent) {
    currentSettings.fontSize = Math.max(70, Math.min(160, Number(percent) || 100));
    applyUISettings();
    window.dispatchEvent(
      new CustomEvent("daimyo-fontsize-changed", {
        detail: { fontSize: currentSettings.fontSize, settings: getSettings() }
      })
    );
  }

  function adjustFontSize(delta) {
    setFontSize((currentSettings.fontSize || 100) + delta);
  }

  function openDrawer() {
    const drawer = document.getElementById("theme-drawer");
    if (drawer) {
      drawer.classList.add("open");
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById("theme-drawer");
    if (drawer) {
      drawer.classList.remove("open");
    }
  }

  function getSettings() {
    return {
      theme: currentSettings.theme,
      textColor: currentSettings.textColor,
      fontFamily: currentSettings.fontFamily,
      fontSize: currentSettings.fontSize
    };
  }

  function init() {
    injectThemeStyles();

    let parsedSettings = {};
    const rawSettings = localStorage.getItem(SETTINGS_KEY);

    if (rawSettings) {
      try {
        parsedSettings = JSON.parse(rawSettings) || {};
      } catch (_error) {
        parsedSettings = {};
      }
    }

    currentSettings = normalizeSettings({
      theme: localStorage.getItem(STORAGE_KEY) || contract.defaultTheme,
      textColor: parsedSettings.textColor,
      fontFamily: parsedSettings.fontFamily,
      fontSize: parsedSettings.fontSize
    });

    apply(currentSettings.theme, { persist: false });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    apply: apply,
    setTextColor: setTextColor,
    setFontFamily: setFontFamily,
    setFontSize: setFontSize,
    adjustFontSize: adjustFontSize,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    getSettings: getSettings,
    getContract: function () {
      return contract;
    }
  };
})();
