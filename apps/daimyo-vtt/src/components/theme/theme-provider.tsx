"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { BrushCleaning, Minus, Plus } from "lucide-react";

import {
  daimyoThemeContract,
  daimyoThemes,
  type DaimyoThemeSettings,
  type ThemeFontFamily,
  type ThemeId
} from "@/lib/theme/contract";
import { cn } from "@/lib/utils";

const THEME_STORAGE_KEY = "daimyo-vtt-theme-preference";
const SETTINGS_STORAGE_KEY = "daimyo-vtt-ui-settings";

interface ThemeContextValue {
  settings: DaimyoThemeSettings;
  isReady: boolean;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setTheme: (themeId: ThemeId) => void;
  setTextColor: (color: string) => void;
  setFontFamily: (fontFamily: ThemeFontFamily) => void;
  setFontSize: (fontSize: number) => void;
  adjustFontSize: (delta: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function normalizeSettings(partial?: Partial<DaimyoThemeSettings>): DaimyoThemeSettings {
  const defaults = daimyoThemeContract.defaultSettings;
  const theme = partial?.theme;
  const fontFamily = partial?.fontFamily;
  const fontSize = partial?.fontSize;

  return {
    theme:
      theme && theme in daimyoThemeContract.themes ? theme : defaults.theme,
    textColor: partial?.textColor ?? defaults.textColor,
    fontFamily:
      fontFamily && fontFamily in daimyoThemeContract.fontFamilies
        ? fontFamily
        : defaults.fontFamily,
    fontSize:
      typeof fontSize === "number"
        ? Math.max(70, Math.min(160, fontSize))
        : defaults.fontSize
  };
}

function applyThemeSettings(settings: DaimyoThemeSettings) {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  const theme = daimyoThemeContract.themes[settings.theme];
  const fontFamily = daimyoThemeContract.fontFamilies[settings.fontFamily];

  root.setAttribute("data-theme", settings.theme);

  Object.entries(theme.tokens).forEach(([token, value]) => {
    root.style.setProperty(token, value);
  });

  root.style.setProperty("--font-body", fontFamily.body);
  root.style.setProperty("--font-display", fontFamily.display);

  if (settings.textColor) {
    root.style.setProperty("--text-primary", settings.textColor);
  } else {
    root.style.setProperty(
      "--text-primary",
      theme.tokens["--text-primary"] ?? "#f5f0e8"
    );
  }

  root.style.fontSize = `${settings.fontSize}%`;
}

function persistThemeSettings(settings: DaimyoThemeSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, settings.theme);
  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      textColor: settings.textColor,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize
    })
  );
}

function readStoredSettings() {
  if (typeof window === "undefined") {
    return daimyoThemeContract.defaultSettings;
  }

  const rawTheme = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  const rawSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  let parsedSettings: Partial<DaimyoThemeSettings> = {};

  if (rawSettings) {
    try {
      parsedSettings = JSON.parse(rawSettings) as Partial<DaimyoThemeSettings>;
    } catch {
      parsedSettings = {};
    }
  }

  return normalizeSettings({
    ...parsedSettings,
    theme: rawTheme ?? parsedSettings.theme
  });
}

function ThemeSettingsDrawer({
  isOpen,
  onClose,
  settings,
  setTheme,
  setTextColor,
  setFontFamily,
  adjustFontSize
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: DaimyoThemeSettings;
  setTheme: (themeId: ThemeId) => void;
  setTextColor: (color: string) => void;
  setFontFamily: (fontFamily: ThemeFontFamily) => void;
  adjustFontSize: (delta: number) => void;
}) {
  const classicThemes = daimyoThemes.filter((theme) => theme.group === "classic");
  const experimentalThemes = daimyoThemes.filter(
    (theme) => theme.group === "experimental"
  );

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-hidden={!isOpen}
        className={cn(
          "fixed inset-0 z-[120] bg-[rgba(2,2,2,0.72)] backdrop-blur-sm transition",
          isOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        )}
      />
      <aside
        className={cn(
          "fixed right-0 top-0 z-[130] flex h-screen w-full max-w-[380px] flex-col border-l border-white/10 bg-[var(--bg-panel)] shadow-[0_24px_90px_rgba(0,0,0,0.42)] transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-5">
          <div>
            <p className="section-label">Ajustes de leitura</p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">
              Estética da mesa
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              Ajuste o traço, a cor e o tom da interface sem perder a atmosfera da campanha.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--text-primary)] transition hover:border-white/20"
          >
            fechar
          </button>
        </div>

        <div className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section className="space-y-3">
            <div>
              <p className="section-label">Paletas do mundo</p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                As paletas principais seguem a mesma direção do app base.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {classicThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    "rounded-[22px] border p-4 text-left transition",
                    settings.theme === theme.id
                      ? "border-[color:var(--gold)] bg-[color:var(--mist)]"
                      : "border-white/10 bg-black/15 hover:border-[color:var(--gold)]/45"
                  )}
                >
                  <div className="flex gap-2">
                    {theme.preview.map((color) => (
                      <span
                        key={`${theme.id}:${color}`}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 font-semibold text-[color:var(--text-primary)]">
                    {theme.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                    {theme.tone}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div>
              <p className="section-label">Experimentais</p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Os temas neon continuam vivos, mas ficam como trilha alternativa.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {experimentalThemes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setTheme(theme.id)}
                  className={cn(
                    "rounded-[22px] border p-4 text-left transition",
                    settings.theme === theme.id
                      ? "border-[color:var(--gold)] bg-[color:var(--mist)]"
                      : "border-white/10 bg-black/15 hover:border-[color:var(--gold)]/45"
                  )}
                >
                  <div className="flex gap-2">
                    {theme.preview.map((color) => (
                      <span
                        key={`${theme.id}:${color}`}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <p className="mt-3 font-semibold text-[color:var(--text-primary)]">
                    {theme.label}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-muted)]">
                    {theme.tone}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-[24px] border border-white/10 bg-black/15 p-4">
            <div>
              <p className="section-label">Tom da leitura</p>
              <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
                Ajuste o brilho do texto e o traço principal da escrita.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {daimyoThemeContract.textColors.map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => setTextColor(color.value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                    settings.textColor === color.value
                      ? "border-[color:var(--gold)] bg-[color:var(--mist)] text-[color:var(--text-primary)]"
                      : "border-white/10 bg-white/5 text-[color:var(--text-secondary)] hover:border-white/20"
                  )}
                >
                  <span
                    className="h-3 w-3 rounded-full border border-black/15"
                    style={{ backgroundColor: color.value || "#aaa" }}
                  />
                  {color.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(daimyoThemeContract.fontFamilies) as ThemeFontFamily[]).map(
                (fontFamily) => (
                  <button
                    key={fontFamily}
                    type="button"
                    onClick={() => setFontFamily(fontFamily)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      settings.fontFamily === fontFamily
                        ? "border-[color:var(--gold)] bg-[color:var(--mist)] text-[color:var(--text-primary)]"
                        : "border-white/10 bg-white/5 text-[color:var(--text-secondary)] hover:border-white/20"
                    )}
                  >
                    {daimyoThemeContract.fontFamilies[fontFamily].label}
                  </button>
                )
              )}
            </div>

            <div className="rounded-[20px] border border-white/10 bg-black/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">Tamanho do texto</p>
                  <p className="mt-1 text-sm text-[color:var(--text-primary)]">
                    {settings.fontSize}%
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustFontSize(-10)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-[color:var(--text-primary)] transition hover:border-white/20"
                  >
                    <Minus size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustFontSize(10)}
                    className="rounded-full border border-white/10 bg-white/5 p-2 text-[color:var(--text-primary)] transition hover:border-white/20"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

export function ThemeProvider({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const [settings, setSettings] = useState<DaimyoThemeSettings>(() =>
    readStoredSettings()
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    applyThemeSettings(settings);
  }, [settings]);

  const updateSettings = (updater: (current: DaimyoThemeSettings) => DaimyoThemeSettings) => {
    setSettings((current) => {
      const nextSettings = normalizeSettings(updater(current));
      applyThemeSettings(nextSettings);
      persistThemeSettings(nextSettings);
      return nextSettings;
    });
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      settings,
      isReady: true,
      isOpen,
      openDrawer: () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
      setTheme: (themeId) =>
        updateSettings((current) => ({ ...current, theme: themeId })),
      setTextColor: (textColor) =>
        updateSettings((current) => ({ ...current, textColor })),
      setFontFamily: (fontFamily) =>
        updateSettings((current) => ({ ...current, fontFamily })),
      setFontSize: (fontSize) =>
        updateSettings((current) => ({ ...current, fontSize })),
      adjustFontSize: (delta) =>
        updateSettings((current) => ({
          ...current,
          fontSize: current.fontSize + delta
        }))
    }),
    [isOpen, settings]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <ThemeSettingsDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        settings={settings}
        setTheme={value.setTheme}
        setTextColor={value.setTextColor}
        setFontFamily={value.setFontFamily}
        adjustFontSize={value.adjustFontSize}
      />
    </ThemeContext.Provider>
  );
}

export function useThemeSettings() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useThemeSettings deve ser usado dentro de ThemeProvider.");
  }

  return context;
}

export function ThemeSettingsButton({
  className,
  label = "Ajustes de leitura"
}: {
  className?: string;
  label?: string;
}) {
  const { openDrawer } = useThemeSettings();

  return (
    <button
      type="button"
      onClick={openDrawer}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--text-primary)] transition hover:border-white/20",
        className
      )}
    >
      <BrushCleaning size={14} />
      {label}
    </button>
  );
}
