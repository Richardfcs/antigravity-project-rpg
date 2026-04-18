import { daimyoThemeContract } from "@/lib/theme/contract";

const THEME_STORAGE_KEY = "daimyo-vtt-theme-preference";
const SETTINGS_STORAGE_KEY = "daimyo-vtt-ui-settings";

export function buildThemeBootScript() {
  const defaults = JSON.stringify(daimyoThemeContract.defaultSettings);
  const themes = JSON.stringify(daimyoThemeContract.themes);
  const fonts = JSON.stringify(daimyoThemeContract.fontFamilies);

  return `
    (() => {
      try {
        const defaults = ${defaults};
        const themes = ${themes};
        const fonts = ${fonts};
        const themeKey = "${THEME_STORAGE_KEY}";
        const settingsKey = "${SETTINGS_STORAGE_KEY}";
        const root = document.documentElement;
        const rawTheme = localStorage.getItem(themeKey);
        const rawSettings = localStorage.getItem(settingsKey);
        let parsed = {};

        if (rawSettings) {
          try {
            parsed = JSON.parse(rawSettings);
          } catch {
            parsed = {};
          }
        }

        const themeId = rawTheme && themes[rawTheme] ? rawTheme : defaults.theme;
        const theme = themes[themeId];
        const fontId = parsed.fontFamily && fonts[parsed.fontFamily]
          ? parsed.fontFamily
          : defaults.fontFamily;
        const font = fonts[fontId];
        const fontSize = typeof parsed.fontSize === "number"
          ? Math.max(70, Math.min(160, parsed.fontSize))
          : defaults.fontSize;

        root.setAttribute("data-theme", themeId);
        Object.entries(theme.tokens).forEach(([token, value]) => {
          root.style.setProperty(token, value);
        });
        root.style.setProperty("--font-body", font.body);
        root.style.setProperty("--font-display", font.display);
        root.style.setProperty("--text-primary", parsed.textColor || theme.tokens["--text-primary"]);
        root.style.fontSize = fontSize + "%";
      } catch {}
    })();
  `;
}
