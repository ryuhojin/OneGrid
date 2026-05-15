import type { HtmlSanitizer, HtmlSanitizerContext, SecurityOptions } from "@onegrid/core";

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
const BLOCKED_TAGS = new Set([
  "script", "style", "iframe", "object", "embed", "base", "link", "meta", "svg", "math", "template"
]);
const DEFAULT_ALLOWED_HTML_TAGS = [
  "a", "abbr", "b", "br", "code", "div", "em", "i", "kbd", "li", "mark", "ol", "p", "pre", "s",
  "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "tfoot", "th", "thead", "tr",
  "u", "ul"
] as const;
const DEFAULT_ALLOWED_HTML_ATTRIBUTES = ["class", "role", "title"] as const;
const TABLE_ATTRIBUTES = new Set(["colspan", "rowspan", "scope"]);
const policyCache = new Map<string, TrustedTypesPolicy>();

export interface AllowlistHtmlSanitizerOptions {
  readonly allowedTags?: readonly string[];
  readonly allowedAttributes?: readonly string[];
  readonly allowAriaAttributes?: boolean;
  readonly allowDataAttributes?: boolean;
  readonly name?: string;
}

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
  const context = createSanitizerContext(security);
  const sanitized = sanitizer.sanitize(html, context);
  if (sanitizer.mode === "text") {
    cell.textContent = sanitized;
    cell.dataset.htmlSanitizerMode = "text";
    return true;
  }

  const hardened = sanitizeHtmlWithAllowlist(sanitized, security);
  delete cell.dataset.htmlSanitizerMode;
  setInnerHtml(cell, hardened, security.html.trustedTypesPolicyName);
  return true;
}

export function createAllowlistHtmlSanitizer(
  options: AllowlistHtmlSanitizerOptions = {}
): HtmlSanitizer {
  return {
    name: options.name ?? "onegrid-allowlist-html",
    mode: "allowlist",
    sanitize(html: string, context?: HtmlSanitizerContext): string {
      return sanitizeHtmlWithAllowlist(html, securityFromContext(context), options);
    }
  };
}

export function sanitizeHtmlWithAllowlist(
  html: string,
  security: SecurityOptions | undefined,
  options: AllowlistHtmlSanitizerOptions = {}
): string {
  const template = document.createElement("template");
  if (!setTemplateHtml(template, html, security?.html?.trustedTypesPolicyName)) {
    return "";
  }
  sanitizeChildNodes(template.content, createAllowlistPolicy(options), security);
  return template.innerHTML;
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
  const trustedHtml = createTrustedHtml(sanitizedHtml, policyName);
  if (trustedHtml) {
    (element as unknown as HtmlSink).innerHTML = trustedHtml;
    element.dataset.trustedTypesPolicy = policyName ?? DEFAULT_TRUSTED_TYPES_POLICY;
    return;
  }

  element.textContent = sanitizedHtml;
  element.dataset.trustedTypesBlocked = "true";
}

function setTemplateHtml(template: HTMLTemplateElement, html: string, policyName: string | undefined): boolean {
  const trustedHtml = createTrustedHtml(html, policyName);
  if (!trustedHtml) {
    return false;
  }

  (template as unknown as HtmlSink).innerHTML = trustedHtml;
  return true;
}

function createTrustedHtml(input: string, policyName: string | undefined): string | TrustedHtml | undefined {
  const trustedTypes = getTrustedTypes();
  if (!trustedTypes) {
    return input;
  }

  const policy = getPolicy(trustedTypes, policyName ?? DEFAULT_TRUSTED_TYPES_POLICY);
  return policy?.createHTML(input);
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
  name: "onegrid-strict-text-only",
  mode: "text",
  sanitize(html: string, context?: HtmlSanitizerContext): string {
    const template = document.createElement("template");
    if (!setTemplateHtml(template, html, context?.trustedTypesPolicyName)) {
      return "";
    }
    return template.content.textContent ?? "";
  }
};

interface AllowlistPolicy {
  readonly allowedTags: ReadonlySet<string>;
  readonly allowedAttributes: ReadonlySet<string>;
  readonly allowAriaAttributes: boolean;
  readonly allowDataAttributes: boolean;
}

function createSanitizerContext(security: SecurityOptions): HtmlSanitizerContext {
  return {
    allowedProtocols: getAllowedProtocols(security),
    ...(security.html?.trustedTypesPolicyName === undefined
      ? {}
      : { trustedTypesPolicyName: security.html.trustedTypesPolicyName })
  };
}

function securityFromContext(context: HtmlSanitizerContext | undefined): SecurityOptions | undefined {
  if (!context) {
    return undefined;
  }

  return {
    url: { allowedProtocols: context.allowedProtocols },
    ...(context.trustedTypesPolicyName === undefined
      ? {}
      : { html: { trustedTypesPolicyName: context.trustedTypesPolicyName } })
  };
}

function createAllowlistPolicy(options: AllowlistHtmlSanitizerOptions): AllowlistPolicy {
  return {
    allowedTags: normalizeSet(options.allowedTags ?? DEFAULT_ALLOWED_HTML_TAGS),
    allowedAttributes: normalizeSet(options.allowedAttributes ?? DEFAULT_ALLOWED_HTML_ATTRIBUTES),
    allowAriaAttributes: options.allowAriaAttributes ?? true,
    allowDataAttributes: options.allowDataAttributes ?? true
  };
}

function normalizeSet(values: readonly string[]): ReadonlySet<string> {
  return new Set(values.map((value) => value.toLowerCase()));
}

function sanitizeChildNodes(parent: ParentNode, policy: AllowlistPolicy, security: SecurityOptions | undefined): void {
  for (const child of Array.from(parent.childNodes)) {
    sanitizeNode(child, policy, security);
  }
}

function sanitizeNode(node: ChildNode, policy: AllowlistPolicy, security: SecurityOptions | undefined): void {
  if (node.nodeType === Node.COMMENT_NODE) {
    node.remove();
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as HTMLElement;
  const tagName = element.tagName.toLowerCase();
  if (BLOCKED_TAGS.has(tagName)) {
    element.remove();
    return;
  }

  if (!policy.allowedTags.has(tagName)) {
    unwrapElement(element, policy, security);
    return;
  }

  sanitizeAttributes(element, tagName, policy, security);
  sanitizeChildNodes(element, policy, security);
}

function unwrapElement(element: HTMLElement, policy: AllowlistPolicy, security: SecurityOptions | undefined): void {
  sanitizeChildNodes(element, policy, security);
  element.replaceWith(...Array.from(element.childNodes));
}

function sanitizeAttributes(
  element: HTMLElement,
  tagName: string,
  policy: AllowlistPolicy,
  security: SecurityOptions | undefined
): void {
  for (const attribute of Array.from(element.attributes)) {
    const name = attribute.name.toLowerCase();
    const value = attribute.value;
    if (
      !isAllowedHtmlAttribute(tagName, name, policy)
      || !isSafeAttributeName(name)
      || hasControlCharacter(value)
      || (isUrlAttribute(name) && !isAllowedUrl(value, security))
    ) {
      element.removeAttribute(attribute.name);
    }
  }
}

function isAllowedHtmlAttribute(tagName: string, name: string, policy: AllowlistPolicy): boolean {
  if (policy.allowedAttributes.has(name)) {
    return true;
  }

  if (policy.allowAriaAttributes && name.startsWith("aria-")) {
    return true;
  }

  if (policy.allowDataAttributes && name.startsWith("data-")) {
    return true;
  }

  if (tagName === "a" && name === "href") {
    return true;
  }

  if ((tagName === "td" || tagName === "th") && TABLE_ATTRIBUTES.has(name)) {
    return true;
  }

  return false;
}
