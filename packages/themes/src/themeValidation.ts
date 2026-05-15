import type { SiThemeOptions, ThemeVariableName } from "./siTheme.js";

export type ThemeValidationSeverity = "error" | "warning";

export type ThemeValidationIssueCode =
  | "theme.color.unsupported"
  | "theme.contrast.minimum"
  | "theme.size.minimum"
  | "theme.variable.name"
  | "theme.variable.value";

export interface ThemeValidationIssue {
  readonly code: ThemeValidationIssueCode;
  readonly severity: ThemeValidationSeverity;
  readonly path: string;
  readonly message: string;
  readonly value?: string;
  readonly expected?: string;
  readonly actual?: string;
}

export interface ThemeContrastPair {
  readonly label: string;
  readonly foreground: ThemeVariableName;
  readonly background: ThemeVariableName;
  readonly kind?: "text" | "ui";
  readonly minimumRatio?: number;
}

export interface ThemeContrastCheck {
  readonly label: string;
  readonly foreground: ThemeVariableName;
  readonly background: ThemeVariableName;
  readonly foregroundValue: string;
  readonly backgroundValue: string;
  readonly minimumRatio: number;
  readonly ratio?: number;
  readonly pass: boolean;
}

export interface ThemeValidationOptions {
  readonly contrastPairs?: readonly ThemeContrastPair[];
  readonly minimumTextContrastRatio?: number;
  readonly minimumUiContrastRatio?: number;
  readonly minRowHeightPx?: number;
  readonly minHeaderHeightPx?: number;
  readonly unsupportedColorSeverity?: ThemeValidationSeverity;
  readonly strict?: boolean;
}

export interface ThemeValidationResult {
  readonly valid: boolean;
  readonly issues: readonly ThemeValidationIssue[];
  readonly errors: readonly ThemeValidationIssue[];
  readonly warnings: readonly ThemeValidationIssue[];
  readonly contrastChecks: readonly ThemeContrastCheck[];
}

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

const DEFAULT_TEXT_CONTRAST_RATIO = 4.5;
const DEFAULT_UI_CONTRAST_RATIO = 3;
const DEFAULT_MIN_ROW_HEIGHT_PX = 28;
const DEFAULT_MIN_HEADER_HEIGHT_PX = 32;

export const defaultThemeContrastPairs: readonly ThemeContrastPair[] = Object.freeze([
  pair("Body text", "--og-color-fg", "--og-color-bg"),
  pair("Header text", "--og-color-fg", "--og-color-header-bg"),
  pair("Pinned body text", "--og-color-fg", "--og-color-pinned-bg"),
  pair("Pinned header text", "--og-color-fg", "--og-color-pinned-header-bg"),
  pair("Panel text", "--og-color-fg", "--og-color-panel-bg"),
  pair("Summary text", "--og-color-fg", "--og-color-summary-bg"),
  pair("Selected text", "--og-color-fg", "--og-color-selected-bg"),
  pair("Accent foreground", "--og-color-on-accent", "--og-color-accent", "ui"),
  pair("Focus ring on body", "--og-color-focus-ring", "--og-color-bg", "ui"),
  pair("Focus ring on header", "--og-color-focus-ring", "--og-color-header-bg", "ui")
]);

export function validateSiTheme(
  theme: SiThemeOptions,
  options: ThemeValidationOptions = {}
): ThemeValidationResult {
  const issues: ThemeValidationIssue[] = [];
  const variables = resolveThemeVariables(theme);
  validateVariableNamesAndValues(theme.variables, issues, options.strict === true);
  validateSupportedColorVariables(
    theme.variables,
    issues,
    options.unsupportedColorSeverity ?? "error"
  );
  validateSize("--og-row-height", variables, options.minRowHeightPx ?? DEFAULT_MIN_ROW_HEIGHT_PX, issues);
  validateSize(
    "--og-header-height",
    variables,
    options.minHeaderHeightPx ?? DEFAULT_MIN_HEADER_HEIGHT_PX,
    issues
  );

  const contrastChecks = validateContrast(theme, variables, options, issues);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
    contrastChecks
  };
}

function validateSupportedColorVariables(
  variables: Readonly<Record<string, string>>,
  issues: ThemeValidationIssue[],
  severity: ThemeValidationSeverity
): void {
  for (const [name, value] of Object.entries(variables)) {
    if (name.startsWith("--og-color-") && isSafeCssVariableValue(value) && parseColor(value) === undefined) {
      issues.push(issue(
        severity,
        "theme.color.unsupported",
        name,
        "SI color tokens must use hex, rgb(), or rgba() values.",
        value
      ));
    }
  }
}

function validateVariableNamesAndValues(
  variables: Readonly<Record<string, string>>,
  issues: ThemeValidationIssue[],
  strict: boolean
): void {
  for (const [name, value] of Object.entries(variables)) {
    if (!/^--og-[A-Za-z0-9_-]+$/u.test(name)) {
      issues.push(issue("error", "theme.variable.name", name, "Theme variables must use the --og-* namespace.", name));
    }
    if (!isSafeCssVariableValue(value)) {
      issues.push(issue("error", "theme.variable.value", name, "Theme variable contains an unsafe CSS value.", value));
    }
    if (strict && value.trim() !== value) {
      issues.push(issue("warning", "theme.variable.value", name, "Theme variable has surrounding whitespace.", value));
    }
  }
}

function validateSize(
  variable: ThemeVariableName,
  variables: Readonly<Record<string, string>>,
  minimumPx: number,
  issues: ThemeValidationIssue[]
): void {
  const value = variables[variable];
  const parsed = value === undefined ? undefined : parsePx(value);
  if (value === undefined || parsed === undefined) {
    issues.push(issue("warning", "theme.size.minimum", variable, "Theme size token could not be validated.", value));
    return;
  }
  if (parsed < minimumPx) {
    issues.push(issue(
      "error",
      "theme.size.minimum",
      variable,
      "Theme size token is below the minimum enterprise grid hit target.",
      value,
      `>= ${minimumPx}px`,
      `${parsed}px`
    ));
  }
}

function validateContrast(
  theme: SiThemeOptions,
  variables: Readonly<Record<string, string>>,
  options: ThemeValidationOptions,
  issues: ThemeValidationIssue[]
): readonly ThemeContrastCheck[] {
  const checks: ThemeContrastCheck[] = [];
  const pairs = options.contrastPairs ?? defaultThemeContrastPairs;
  const unsupportedColorSeverity = options.unsupportedColorSeverity ?? "error";
  for (const contrastPair of pairs) {
    const foregroundValue = variables[contrastPair.foreground] ?? "";
    const backgroundValue = variables[contrastPair.background] ?? "";
    const minimumRatio = contrastPair.minimumRatio
      ?? (contrastPair.kind === "ui"
        ? options.minimumUiContrastRatio ?? DEFAULT_UI_CONTRAST_RATIO
        : options.minimumTextContrastRatio ?? DEFAULT_TEXT_CONTRAST_RATIO);
    const foreground = parseColor(foregroundValue);
    const background = parseColor(backgroundValue);
    if (foreground === undefined || background === undefined) {
      checks.push({ ...contrastPair, foregroundValue, backgroundValue, minimumRatio, pass: false });
      issues.push(issue(
        unsupportedColorSeverity,
        "theme.color.unsupported",
        `theme.${theme.name}.${contrastPair.label}`,
        "Theme contrast pair uses an unsupported color format.",
        `${foregroundValue} on ${backgroundValue}`
      ));
      continue;
    }

    const ratio = getContrastRatio(foreground, background);
    const pass = ratio >= minimumRatio;
    checks.push({ ...contrastPair, foregroundValue, backgroundValue, minimumRatio, ratio, pass });
    if (!pass) {
      issues.push(issue(
        "error",
        "theme.contrast.minimum",
        `theme.${theme.name}.${contrastPair.label}`,
        "Theme contrast ratio is below the configured gate.",
        `${foregroundValue} on ${backgroundValue}`,
        `>= ${minimumRatio.toFixed(2)}`,
        ratio.toFixed(2)
      ));
    }
  }
  return checks;
}

function resolveThemeVariables(theme: SiThemeOptions): Readonly<Record<string, string>> {
  return {
    ...defaultVariablesForDensity(theme.density),
    ...theme.variables
  };
}

function defaultVariablesForDensity(density: SiThemeOptions["density"]): Readonly<Record<ThemeVariableName, string>> {
  const sizeTokens = density === "compact"
    ? { "--og-row-height": "30px", "--og-header-height": "34px" }
    : density === "comfortable"
      ? { "--og-row-height": "42px", "--og-header-height": "46px" }
      : { "--og-row-height": "36px", "--og-header-height": "40px" };
  return {
    "--og-color-bg": "#ffffff",
    "--og-color-fg": "#101828",
    "--og-color-header-bg": "#f8fafc",
    "--og-color-pinned-bg": "#fbfcff",
    "--og-color-pinned-header-bg": "#f2f6fa",
    "--og-color-panel-bg": "#ffffff",
    "--og-color-summary-bg": "#f7fafc",
    "--og-color-selected-bg": "#e6f0ff",
    "--og-color-focus-ring": "#2f6fed",
    "--og-color-accent": "#1d8fe8",
    "--og-color-on-accent": "#ffffff",
    ...sizeTokens
  };
}

function pair(
  label: string,
  foreground: ThemeVariableName,
  background: ThemeVariableName,
  kind: "text" | "ui" = "text"
): ThemeContrastPair {
  return { label, foreground, background, kind };
}

function issue(
  severity: ThemeValidationSeverity,
  code: ThemeValidationIssueCode,
  path: string,
  message: string,
  value?: string,
  expected?: string,
  actual?: string
): ThemeValidationIssue {
  return {
    severity,
    code,
    path,
    message,
    ...(value === undefined ? {} : { value }),
    ...(expected === undefined ? {} : { expected }),
    ...(actual === undefined ? {} : { actual })
  };
}

function isSafeCssVariableValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized !== ""
    && !/[<>{};]/u.test(value)
    && !normalized.includes("@import")
    && !normalized.includes("javascript:")
    && !normalized.includes("url(");
}

function parsePx(value: string): number | undefined {
  const match = /^([0-9]+(?:\.[0-9]+)?)px$/u.exec(value.trim());
  return match?.[1] === undefined ? undefined : Number(match[1]);
}

function parseColor(value: string): RgbColor | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "black") {
    return { r: 0, g: 0, b: 0 };
  }
  if (normalized === "white") {
    return { r: 255, g: 255, b: 255 };
  }
  return parseHexColor(normalized) ?? parseRgbColor(normalized);
}

function parseHexColor(value: string): RgbColor | undefined {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/u.exec(value)?.[1];
  if (hex === undefined) {
    return undefined;
  }
  const expanded = hex.length === 3
    ? [...hex].map((character) => `${character}${character}`).join("")
    : hex;
  return {
    r: Number.parseInt(expanded.slice(0, 2), 16),
    g: Number.parseInt(expanded.slice(2, 4), 16),
    b: Number.parseInt(expanded.slice(4, 6), 16)
  };
}

function parseRgbColor(value: string): RgbColor | undefined {
  const body = /^rgba?\((.+)\)$/u.exec(value)?.[1];
  if (body === undefined) {
    return undefined;
  }
  const channels = body.split("/")[0]?.trim().replaceAll(",", " ").split(/\s+/u) ?? [];
  const [r, g, b] = channels.map(parseColorChannel);
  if (r === undefined || g === undefined || b === undefined) {
    return undefined;
  }
  return { r, g, b };
}

function parseColorChannel(value: string): number | undefined {
  const parsed = value.endsWith("%")
    ? Number(value.slice(0, -1)) * 2.55
    : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 255) {
    return undefined;
  }
  return parsed;
}

function getContrastRatio(first: RgbColor, second: RgbColor): number {
  const lighter = Math.max(getRelativeLuminance(first), getRelativeLuminance(second));
  const darker = Math.min(getRelativeLuminance(first), getRelativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(color: RgbColor): number {
  const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}
