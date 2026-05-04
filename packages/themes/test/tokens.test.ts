import { describe, expect, it } from "vitest";
import {
  createSiTheme,
  defaultThemeTokens,
  densityPresets,
  siTokenMappings,
  themePresets
} from "../src/index.js";

describe("theme package contracts", () => {
  it("exports stable theme presets and density names", () => {
    expect(themePresets.map((preset) => preset.name)).toEqual([
      "default",
      "clean",
      "compact",
      "dark",
      "high-contrast"
    ]);
    expect(densityPresets).toEqual(["comfortable", "standard", "compact"]);
  });

  it("documents public CSS variable tokens", () => {
    expect(defaultThemeTokens.length).toBeGreaterThan(10);
    expect(defaultThemeTokens.map((token) => token.cssVariable)).toContain("--og-color-focus-ring");
    expect(defaultThemeTokens.every((token) => token.cssVariable.startsWith("--og-"))).toBe(true);
  });

  it("maps SI design tokens into scoped theme variables", () => {
    const theme = createSiTheme({
      name: "public-red",
      density: "compact",
      tokens: {
        colors: {
          accent: "#d7191f",
          header: "#f7f3ef",
          selected: "#fff0f0"
        },
        typography: {
          rowHeight: "34px"
        }
      },
      overrides: {
        "--og-color-control-active-fg": "#8b0304"
      }
    });

    expect(theme).toMatchObject({
      name: "public-red",
      density: "compact",
      variables: {
        "--og-color-accent": "#d7191f",
        "--og-color-focus-ring": "#d7191f",
        "--og-color-header-bg": "#f7f3ef",
        "--og-color-selected-bg": "#fff0f0",
        "--og-row-height": "34px",
        "--og-color-control-active-fg": "#8b0304"
      }
    });
    expect(siTokenMappings.map((mapping) => mapping.designToken)).toContain("colors.accent");
  });
});
