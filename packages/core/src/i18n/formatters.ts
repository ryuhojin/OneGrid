import { getLocale } from "./localeRegistry.js";
import type {
  LocaleDateValue,
  LocaleDefinition,
  LocaleFormatterBridge
} from "./localeTypes.js";

export function createLocaleFormatter(locale?: string | LocaleDefinition): LocaleFormatterBridge {
  const definition = typeof locale === "string" || locale === undefined ? getLocale(locale) : locale;
  return Object.freeze({
    locale: definition.locale,
    text: definition.text,
    formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
      return new Intl.NumberFormat(definition.locale, options ?? definition.number).format(value);
    },
    formatDate(value: LocaleDateValue, options?: Intl.DateTimeFormatOptions): string {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }

      return new Intl.DateTimeFormat(definition.locale, options ?? definition.date).format(date);
    }
  });
}
