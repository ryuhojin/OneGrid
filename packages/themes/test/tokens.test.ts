import { describe, expect, it } from "vitest";
import {
  createSiTheme,
  defaultThemeTokens,
  defaultThemeContrastPairs,
  densityPresets,
  siTokenMappings,
  themePresets,
  validateSiTheme
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

  it("validates enterprise theme contrast, size, and safe CSS values", () => {
    const theme = createSiTheme({
      name: "validated-bnk-red",
      density: "standard",
      tokens: {
        colors: {
          accent: "#d7191f",
          accentHover: "rgb(139 3 4)",
          foreground: "#101828",
          canvas: "#ffffff",
          header: "#f7f3ef",
          pinnedHeader: "#efe7df",
          selected: "#fff0f0"
        },
        typography: {
          rowHeight: "36px",
          headerHeight: "40px"
        }
      },
      overrides: {
        "--og-color-on-accent": "#ffffff"
      }
    });

    const result = validateSiTheme(theme);

    expect(defaultThemeContrastPairs.length).toBeGreaterThan(5);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.contrastChecks.every((check) => check.pass)).toBe(true);
    expect(result.contrastChecks.map((check) => check.label)).toContain("Header text");
  });

  it("reports low contrast and undersized SI theme tokens", () => {
    const theme = createSiTheme({
      name: "broken-low-contrast",
      density: "standard",
      tokens: {
        colors: {
          canvas: "#777777",
          foreground: "#777777",
          accent: "#eeeeee",
          onAccent: "#ffffff"
        },
        typography: {
          rowHeight: "20px",
          headerHeight: "24px"
        }
      },
      overrides: {
        "--og-color-panel-bg": "url(javascript:alert(1))"
      }
    });

    const result = validateSiTheme(theme);

    expect(result.valid).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toContain("theme.contrast.minimum");
    expect(result.errors.map((issue) => issue.code)).toContain("theme.size.minimum");
    expect(result.errors.map((issue) => issue.code)).toContain("theme.variable.value");
    expect(result.errors.map((issue) => issue.code)).toContain("theme.color.unsupported");
  });

  it("rejects unsupported SI color formats outside contrast pairs", () => {
    const theme = createSiTheme({
      name: "broken-hsl-token",
      density: "standard",
      tokens: {
        colors: {
          accent: "#123a9c",
          foreground: "#101828",
          canvas: "#ffffff",
          hover: "hsl(210 40% 96%)"
        }
      }
    });

    const result = validateSiTheme(theme);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(expect.objectContaining({
      code: "theme.color.unsupported",
      path: "--og-color-hover-bg",
      value: "hsl(210 40% 96%)"
    }));
  });
});
