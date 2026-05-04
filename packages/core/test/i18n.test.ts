import { describe, expect, it } from "vitest";
import {
  createLocaleFormatter,
  getLocale,
  listLocales,
  registerLocale
} from "../src/index.js";
import type { LocaleDefinition } from "../src/index.js";

describe("i18n locale registry", () => {
  it("resolves English and Korean locale definitions", () => {
    expect(getLocale("en-US").locale).toBe("en-US");
    expect(getLocale("ko-KR").locale).toBe("ko-KR");
    expect(getLocale("ko").text.footerRows(12, createLocaleFormatter("ko-KR").formatNumber))
      .toBe("행: 12");
  });

  it("formats numbers and dates through the shared bridge", () => {
    const korean = createLocaleFormatter("ko-KR");

    expect(korean.formatNumber(1_234_567)).toBe("1,234,567");
    expect(korean.formatNumber(1200, { style: "currency", currency: "KRW" })).toContain("1,200");
    expect(korean.formatDate("2026-05-04")).toContain("2026");
  });

  it("registers custom locale definitions without replacing defaults", () => {
    const custom: LocaleDefinition = {
      locale: "en-XA",
      text: {
        ...getLocale("en-US").text,
        footerRows: (rowCount, formatNumber) => `Rows localized: ${formatNumber(rowCount)}`
      }
    };

    registerLocale(custom);

    expect(getLocale("en-XA").text.footerRows(5, createLocaleFormatter("en-XA").formatNumber))
      .toBe("Rows localized: 5");
    expect(listLocales()).toContain("ko-KR");
  });
});
