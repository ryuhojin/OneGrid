export interface ThemeToken {
  readonly name: string;
  readonly cssVariable: string;
  readonly defaultValue: string;
}

export const defaultThemeTokens: readonly ThemeToken[] = [
  { name: "fontFamily", cssVariable: "--og-font-family", defaultValue: "system-ui, sans-serif" },
  { name: "fontSize", cssVariable: "--og-font-size", defaultValue: "13px" },
  { name: "rowHeight", cssVariable: "--og-row-height", defaultValue: "36px" },
  { name: "headerHeight", cssVariable: "--og-header-height", defaultValue: "40px" }
];
