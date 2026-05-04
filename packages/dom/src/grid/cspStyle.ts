import type { SecurityOptions, ThemeOptions } from "@onegrid/core";

export interface GridRuntimeStyleInput {
  readonly root: HTMLElement;
  readonly instanceId: string;
  readonly theme?: ThemeOptions;
  readonly security?: SecurityOptions;
}

const STYLE_ATTRIBUTE = "data-onegrid-instance-style";

export function applyGridRuntimeStyles(input: GridRuntimeStyleInput): void {
  const existing = findRuntimeStyle(input.root, input.instanceId);
  if (input.security?.csp?.disableStyleInjection === true || !hasThemeVariables(input.theme)) {
    existing?.remove();
    input.root.dataset.ogStyleInjection = input.security?.csp?.disableStyleInjection === true
      ? "disabled"
      : "none";
    return;
  }

  const cssText = createThemeVariableCss(input.instanceId, input.theme.variables);
  if (cssText === "") {
    existing?.remove();
    input.root.dataset.ogStyleInjection = "none";
    return;
  }

  const style = existing ?? input.root.ownerDocument.createElement("style");
  style.setAttribute(STYLE_ATTRIBUTE, input.instanceId);
  if (input.security?.csp?.nonce) {
    style.nonce = input.security.csp.nonce;
  } else {
    style.removeAttribute("nonce");
  }
  style.textContent = cssText;
  if (!existing) {
    input.root.ownerDocument.head.append(style);
  }
  input.root.dataset.ogStyleInjection = "active";
}

export function removeGridRuntimeStyles(root: HTMLElement, instanceId: string): void {
  findRuntimeStyle(root, instanceId)?.remove();
}

function hasThemeVariables(theme: ThemeOptions | undefined): theme is ThemeOptions & {
  readonly variables: Readonly<Record<string, string>>;
} {
  return theme?.variables !== undefined && Object.keys(theme.variables).length > 0;
}

function findRuntimeStyle(root: HTMLElement, instanceId: string): HTMLStyleElement | undefined {
  return root.ownerDocument.querySelector<HTMLStyleElement>(
    `style[${STYLE_ATTRIBUTE}="${instanceId}"]`
  ) ?? undefined;
}

function createThemeVariableCss(
  instanceId: string,
  variables: Readonly<Record<string, string>>
): string {
  const declarations = Object.entries(variables)
    .flatMap(([name, value]) => {
      const declaration = createSafeVariableDeclaration(name, value);
      return declaration === undefined ? [] : [declaration];
    });
  if (declarations.length === 0) {
    return "";
  }

  return `.og-root-host[data-og-instance="${instanceId}"]{${declarations.join("")}}`;
}

function createSafeVariableDeclaration(name: string, value: string): string | undefined {
  if (!/^--[A-Za-z0-9_-]+$/u.test(name) || !isSafeCssVariableValue(value)) {
    return undefined;
  }

  return `${name}:${value};`;
}

function isSafeCssVariableValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized !== ""
    && !/[<>{};]/u.test(value)
    && !normalized.includes("@import")
    && !normalized.includes("javascript:");
}
