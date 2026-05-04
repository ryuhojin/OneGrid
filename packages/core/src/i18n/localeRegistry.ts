import type { LocaleDefinition } from "./localeTypes.js";
import { enUSLocale, koKRLocale } from "./locales.js";

export const DEFAULT_LOCALE = "en-US";

const localeRegistry = new Map<string, LocaleDefinition>();

registerLocale(enUSLocale);
registerLocale(koKRLocale);
localeRegistry.set("en", enUSLocale);
localeRegistry.set("ko", koKRLocale);

export function registerLocale(definition: LocaleDefinition): void {
  localeRegistry.set(normalizeLocaleKey(definition.locale), definition);
}

export function getLocale(locale?: string): LocaleDefinition {
  const requested = normalizeLocaleKey(locale ?? DEFAULT_LOCALE);
  const exact = localeRegistry.get(requested);
  if (exact) {
    return exact;
  }

  const language = requested.split("-")[0];
  const languageFallback = language ? localeRegistry.get(language) : undefined;
  return languageFallback ?? enUSLocale;
}

export function listLocales(): readonly string[] {
  return Object.freeze([...new Set([...localeRegistry.values()].map((definition) => definition.locale))]);
}

function normalizeLocaleKey(locale: string): string {
  return locale.trim().toLowerCase();
}
