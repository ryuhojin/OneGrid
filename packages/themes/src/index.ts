export type ThemePresetName = "default" | "clean" | "compact" | "dark" | "high-contrast";
export type ThemeDensity = "comfortable" | "standard" | "compact";
export type {
  CreateSiThemeInput,
  SiColorTokens,
  SiDesignTokens,
  SiShadowTokens,
  SiThemeDensity,
  SiThemeOptions,
  SiTokenMapping,
  SiTypographyTokens,
  ThemeVariableName
} from "./siTheme.js";
export { createSiTheme, siTokenMappings } from "./siTheme.js";
export type {
  ThemeContrastCheck,
  ThemeContrastPair,
  ThemeValidationIssue,
  ThemeValidationIssueCode,
  ThemeValidationOptions,
  ThemeValidationResult,
  ThemeValidationSeverity
} from "./themeValidation.js";
export { defaultThemeContrastPairs, validateSiTheme } from "./themeValidation.js";

export interface ThemeToken {
  readonly name: string;
  readonly cssVariable: `--og-${string}`;
  readonly defaultValue: string;
  readonly description: string;
}

export interface ThemePreset {
  readonly name: ThemePresetName;
  readonly cssFile: string;
  readonly density?: ThemeDensity;
}

export const defaultThemeTokens: readonly ThemeToken[] = Object.freeze([
  token("fontFamily", "--og-font-family", "system-ui, sans-serif", "Grid font stack"),
  token("fontSize", "--og-font-size", "13px", "Base grid text size"),
  token("rowHeight", "--og-row-height", "36px", "Body row height"),
  token("headerHeight", "--og-header-height", "40px", "Header row height"),
  token("bg", "--og-color-bg", "#ffffff", "Body background"),
  token("fg", "--og-color-fg", "#101828", "Primary foreground"),
  token("border", "--og-color-border", "#d7dbe0", "Grid line color"),
  token("headerBg", "--og-color-header-bg", "#f8fafc", "Header background"),
  token("hoverBg", "--og-color-hover-bg", "#eef3f7", "Interactive hover background"),
  token("muted", "--og-color-muted", "#667085", "Secondary text"),
  token("panelBg", "--og-color-panel-bg", "#ffffff", "Popup and editor background"),
  token("pinnedBg", "--og-color-pinned-bg", "#fbfcff", "Pinned body background"),
  token("pinnedHeaderBg", "--og-color-pinned-header-bg", "#f2f6fa", "Pinned header background"),
  token("summaryBg", "--og-color-summary-bg", "#f7fafc", "Summary and footer background"),
  token("selectedBg", "--og-color-selected-bg", "#e6f0ff", "Selected cell or row background"),
  token("focusRing", "--og-color-focus-ring", "#2f6fed", "Focus and active indicator"),
  token("accent", "--og-color-accent", "#1d8fe8", "Checkbox, editor, and action accent"),
  token("controlBg", "--og-color-control-bg", "#f2f5f8", "Button and control background"),
  token("mergeBg", "--og-color-merge-bg", "#fffdf6", "Merged cell background"),
  token("scrollbarThumb", "--og-color-scrollbar-thumb", "rgb(71 84 103 / 64%)", "Scrollbar thumb")
]);

export const themePresets: readonly ThemePreset[] = Object.freeze([
  { name: "default", cssFile: "@onegrid/themes/default.css" },
  { name: "clean", cssFile: "@onegrid/themes/clean.css" },
  { name: "compact", cssFile: "@onegrid/themes/compact.css", density: "compact" },
  { name: "dark", cssFile: "@onegrid/themes/dark.css" },
  { name: "high-contrast", cssFile: "@onegrid/themes/high-contrast.css", density: "comfortable" }
]);

export const densityPresets: readonly ThemeDensity[] = Object.freeze([
  "comfortable",
  "standard",
  "compact"
]);

function token(
  name: string,
  cssVariable: `--og-${string}`,
  defaultValue: string,
  description: string
): ThemeToken {
  return { name, cssVariable, defaultValue, description };
}
