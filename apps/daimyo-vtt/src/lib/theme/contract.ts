export type ThemeId =
  | "dark"
  | "light"
  | "sakura"
  | "stone"
  | "neon-green"
  | "neon-yellow"
  | "neon-red";

export type ThemeFontFamily = "serif" | "sans";

export interface DaimyoThemeDefinition {
  id: ThemeId;
  label: string;
  tone: string;
  group: "classic" | "experimental";
  preview: string[];
  tokens: Record<string, string>;
}

export interface DaimyoThemeSettings {
  theme: ThemeId;
  textColor: string;
  fontFamily: ThemeFontFamily;
  fontSize: number;
}

export interface DaimyoThemeContract {
  version: number;
  defaultTheme: ThemeId;
  defaultSettings: DaimyoThemeSettings;
  themeOrder: ThemeId[];
  themes: Record<ThemeId, DaimyoThemeDefinition>;
  fontFamilies: Record<
    ThemeFontFamily,
    {
      id: ThemeFontFamily;
      label: string;
      body: string;
      display: string;
    }
  >;
  textColors: Array<{
    id: string;
    label: string;
    value: string;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const rawContract = require("../../../../../shared/daimyo-theme-contract.js") as DaimyoThemeContract;

export const daimyoThemeContract: DaimyoThemeContract = rawContract;
export const daimyoThemes = daimyoThemeContract.themeOrder.map(
  (themeId) => daimyoThemeContract.themes[themeId]
);
