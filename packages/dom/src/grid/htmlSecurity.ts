import type { HtmlSanitizer, SecurityOptions } from "@onegrid/core";

interface TrustedHtml {
  readonly __trustedHtmlBrand?: "TrustedHTML";
}

interface TrustedTypesPolicy {
  createHTML(input: string): string | TrustedHtml;
}

interface TrustedTypesFactory {
  createPolicy(
    name: string,
    rules: { readonly createHTML: (input: string) => string }
  ): TrustedTypesPolicy;
}

interface TrustedTypesWindow extends Window {
  readonly trustedTypes?: TrustedTypesFactory;
}

type HtmlSink = { innerHTML: string | TrustedHtml };

const DEFAULT_TRUSTED_TYPES_POLICY = "onegrid-html-renderer";
const DEFAULT_ALLOWED_PROTOCOLS = ["https:", "http:", "mailto:", "tel:"] as const;
const URL_ATTRIBUTES = new Set(["href", "src", "action", "formaction", "poster", "cite", "background"]);
const BLOCKED_TAGS = new Set(["script", "style", "iframe", "object", "embed", "base", "link", "meta"]);
const policyCache = new Map<string, TrustedTypesPolicy>();

export function renderSanitizedHtml(
  cell: HTMLElement,
  html: string,
  security: SecurityOptions | undefined
): boolean {
  const sanitizer = security?.html?.sanitizer;
  if (security?.html?.allowHtmlRenderer !== true || !sanitizer) {
    cell.textContent = html;
    cell.dataset.htmlRendererBlocked = "true";
    return false;
  }

  delete cell.dataset.htmlRendererBlocked;
  setInnerHtml(cell, sanitizer.sanitize(html), security.html.trustedTypesPolicyName);
  return true;
}

export function getSafeTagName(tagName: string): string {
  const normalized = tagName.toLowerCase();
  if (!/^[a-z][a-z0-9-]*$/u.test(normalized)) {
    return "span";
  }

  return BLOCKED_TAGS.has(normalized) ? "span" : normalized;
}

export function applySafeAttribute(
  element: HTMLElement,
  name: string,
  value: string,
  security: SecurityOptions | undefined
): void {
  const normalized = name.toLowerCase();
  if (!isSafeAttributeName(normalized)) {
    return;
  }

  if (isUrlAttribute(normalized) && !isAllowedUrl(value, security)) {
    return;
  }

  element.setAttribute(name, value);
}

export function isAllowedUrl(value: string, security: SecurityOptions | undefined): boolean {
  const trimmed = value.trim();
  if (!trimmed || hasControlCharacter(trimmed)) {
    return false;
  }

  if (
    trimmed.startsWith("#")
    || trimmed.startsWith("./")
    || trimmed.startsWith("../")
    || (trimmed.startsWith("/") && !trimmed.startsWith("//"))
  ) {
    return true;
  }

  try {
    const url = new URL(trimmed, "https://onegrid.local");
    return getAllowedProtocols(security).includes(url.protocol.toLowerCase());
  } catch {
    return false;
  }
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 31 || code === 127) {
      return true;
    }
  }

  return false;
}

function setInnerHtml(
  element: HTMLElement,
  sanitizedHtml: string,
  policyName: string | undefined
): void {
  const trustedTypes = getTrustedTypes();
  if (!trustedTypes) {
    element.innerHTML = sanitizedHtml;
    return;
  }

  const policy = getPolicy(trustedTypes, policyName ?? DEFAULT_TRUSTED_TYPES_POLICY);
  if (!policy) {
    element.textContent = sanitizedHtml;
    element.dataset.trustedTypesBlocked = "true";
    return;
  }

  delete element.dataset.trustedTypesBlocked;
  (element as unknown as HtmlSink).innerHTML = policy.createHTML(sanitizedHtml);
  element.dataset.trustedTypesPolicy = policyName ?? DEFAULT_TRUSTED_TYPES_POLICY;
}

function getPolicy(
  trustedTypes: TrustedTypesFactory,
  policyName: string
): TrustedTypesPolicy | undefined {
  const existing = policyCache.get(policyName);
  if (existing) {
    return existing;
  }

  try {
    const policy = trustedTypes.createPolicy(policyName, { createHTML: (input) => input });
    policyCache.set(policyName, policy);
    return policy;
  } catch {
    return undefined;
  }
}

function getTrustedTypes(): TrustedTypesFactory | undefined {
  const candidate = (window as TrustedTypesWindow).trustedTypes;
  return typeof candidate?.createPolicy === "function" ? candidate : undefined;
}

function isSafeAttributeName(name: string): boolean {
  if (!/^[a-z_][a-z0-9_.-]*$/u.test(name)) {
    return false;
  }

  return !(
    name.startsWith("on")
    || name === "style"
    || name === "srcdoc"
    || name === "innerhtml"
    || name === "outerhtml"
    || name === "srcset"
  );
}

function isUrlAttribute(name: string): boolean {
  return URL_ATTRIBUTES.has(name);
}

function getAllowedProtocols(security: SecurityOptions | undefined): readonly string[] {
  return (security?.url?.allowedProtocols ?? DEFAULT_ALLOWED_PROTOCOLS)
    .map((protocol) => protocol.toLowerCase().endsWith(":")
      ? protocol.toLowerCase()
      : `${protocol.toLowerCase()}:`);
}

export const strictTextOnlySanitizer: HtmlSanitizer = {
  sanitize(html: string): string {
    const template = document.createElement("template");
    template.innerHTML = html;
    return template.content.textContent ?? "";
  }
};
