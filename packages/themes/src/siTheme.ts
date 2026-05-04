export type ThemeVariableName = `--og-${string}`;
export type SiThemeDensity = "comfortable" | "standard" | "compact";

export interface SiColorTokens {
  readonly canvas?: string;
  readonly foreground?: string;
  readonly border?: string;
  readonly header?: string;
  readonly hover?: string;
  readonly muted?: string;
  readonly panel?: string;
  readonly pinned?: string;
  readonly pinnedHeader?: string;
  readonly selected?: string;
  readonly summary?: string;
  readonly accent?: string;
  readonly accentHover?: string;
  readonly onAccent?: string;
}

export interface SiTypographyTokens {
  readonly fontFamily?: string;
  readonly fontSize?: string;
  readonly rowHeight?: string;
  readonly headerHeight?: string;
}

export interface SiShadowTokens {
  readonly popover?: string;
  readonly pinnedLeft?: string;
  readonly pinnedRight?: string;
}

export interface SiDesignTokens {
  readonly colors?: SiColorTokens;
  readonly typography?: SiTypographyTokens;
  readonly shadows?: SiShadowTokens;
}

export interface CreateSiThemeInput {
  readonly name: string;
  readonly density?: SiThemeDensity;
  readonly className?: string;
  readonly tokens: SiDesignTokens;
  readonly overrides?: Readonly<Partial<Record<ThemeVariableName, string>>>;
}

export interface SiThemeOptions {
  readonly name: string;
  readonly density?: SiThemeDensity;
  readonly className?: string;
  readonly variables: Readonly<Record<ThemeVariableName, string>>;
}

export interface SiTokenMapping {
  readonly designToken: string;
  readonly cssVariable: ThemeVariableName;
  readonly usage: string;
}

interface TokenMapper<TTokens extends object> {
  readonly token: keyof TTokens;
  readonly variable: ThemeVariableName;
  readonly usage: string;
}

const colorTokenMappings: readonly TokenMapper<SiColorTokens>[] = Object.freeze([
  colorMap("canvas", "--og-color-bg", "Grid body and empty space surface"),
  colorMap("foreground", "--og-color-fg", "Primary text and icons"),
  colorMap("border", "--og-color-border", "Grid line and pane border"),
  colorMap("header", "--og-color-header-bg", "Column header surface"),
  colorMap("hover", "--og-color-hover-bg", "Hover surface for controls and rows"),
  colorMap("muted", "--og-color-muted", "Footer, labels, and secondary text"),
  colorMap("panel", "--og-color-panel-bg", "Menus, editors, and popovers"),
  colorMap("pinned", "--og-color-pinned-bg", "Pinned body pane surface"),
  colorMap("pinnedHeader", "--og-color-pinned-header-bg", "Pinned header pane surface"),
  colorMap("selected", "--og-color-selected-bg", "Selected row or cell surface"),
  colorMap("summary", "--og-color-summary-bg", "Summary and footer surface"),
  colorMap("accent", "--og-color-accent", "Checkbox, editor, and action accent"),
  colorMap("accent", "--og-color-focus-ring", "Keyboard focus ring"),
  colorMap("accentHover", "--og-color-accent-hover", "Primary action hover"),
  colorMap("onAccent", "--og-color-on-accent", "Foreground on accent")
]);

const typographyTokenMappings: readonly TokenMapper<SiTypographyTokens>[] = Object.freeze([
  typographyMap("fontFamily", "--og-font-family", "Grid font stack"),
  typographyMap("fontSize", "--og-font-size", "Base cell and header text size"),
  typographyMap("rowHeight", "--og-row-height", "Body row height"),
  typographyMap("headerHeight", "--og-header-height", "Header row height")
]);

const shadowTokenMappings: readonly TokenMapper<SiShadowTokens>[] = Object.freeze([
  shadowMap("popover", "--og-shadow-popover", "Menu, filter, and overlay shadow"),
  shadowMap("pinnedLeft", "--og-shadow-pinned-left", "Pinned-left separation shadow"),
  shadowMap("pinnedRight", "--og-shadow-pinned-right", "Pinned-right separation shadow")
]);

export const siTokenMappings: readonly SiTokenMapping[] = Object.freeze([
  ...toPublicMappings("colors", colorTokenMappings),
  ...toPublicMappings("typography", typographyTokenMappings),
  ...toPublicMappings("shadows", shadowTokenMappings)
]);

export function createSiTheme(input: CreateSiThemeInput): SiThemeOptions {
  const variables: Record<ThemeVariableName, string> = {};
  applyMappings(variables, input.tokens.colors, colorTokenMappings);
  applyMappings(variables, input.tokens.typography, typographyTokenMappings);
  applyMappings(variables, input.tokens.shadows, shadowTokenMappings);
  Object.assign(variables, input.overrides);

  return {
    name: input.name,
    ...(input.density === undefined ? {} : { density: input.density }),
    ...(input.className === undefined ? {} : { className: input.className }),
    variables
  };
}

function applyMappings<TTokens extends object>(
  target: Record<ThemeVariableName, string>,
  source: TTokens | undefined,
  mappings: readonly TokenMapper<TTokens>[]
): void {
  if (source === undefined) {
    return;
  }

  for (const mapping of mappings) {
    const value = source[mapping.token];
    if (typeof value === "string" && value.trim() !== "") {
      target[mapping.variable] = value;
    }
  }
}

function toPublicMappings<TTokens extends object>(
  namespace: string,
  mappings: readonly TokenMapper<TTokens>[]
): readonly SiTokenMapping[] {
  return mappings.map((mapping) => ({
    designToken: `${namespace}.${String(mapping.token)}`,
    cssVariable: mapping.variable,
    usage: mapping.usage
  }));
}

function colorMap(
  token: keyof SiColorTokens,
  variable: ThemeVariableName,
  usage: string
): TokenMapper<SiColorTokens> {
  return { token, variable, usage };
}

function typographyMap(
  token: keyof SiTypographyTokens,
  variable: ThemeVariableName,
  usage: string
): TokenMapper<SiTypographyTokens> {
  return { token, variable, usage };
}

function shadowMap(
  token: keyof SiShadowTokens,
  variable: ThemeVariableName,
  usage: string
): TokenMapper<SiShadowTokens> {
  return { token, variable, usage };
}
