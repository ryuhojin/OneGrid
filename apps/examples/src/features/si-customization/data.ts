import type { ColumnDef, GridOptions } from "@onegrid/core";
import { createSiTheme } from "@onegrid/themes";
import type { SiDesignTokens, SiThemeOptions, ThemeDensity } from "@onegrid/themes";

export type SiPresetId =
  | "public-red"
  | "civic-blue"
  | "forest"
  | "neutral-audit"
  | "bnk-red"
  | "bnk-gold"
  | "bnk-gray";

export interface SiThemePreset {
  readonly id: SiPresetId;
  readonly label: string;
  readonly themeName: string;
  readonly tokens: SiDesignTokens;
  readonly overrides?: Readonly<Record<`--og-${string}`, string>>;
}

export interface SiCustomizationRow {
  readonly id: string;
  readonly agency: string;
  readonly service: string;
  readonly budget: number;
  readonly risk: "Low" | "Medium" | "High";
  readonly status: "Ready" | "Review" | "Hold";
}

export const siRows: readonly SiCustomizationRow[] = Object.freeze([
  { id: "SI-0001", agency: "Treasury Office", service: "Budget approval", budget: 1200, risk: "Low", status: "Ready" },
  { id: "SI-0002", agency: "Audit Bureau", service: "Risk sampling", budget: 430, risk: "High", status: "Review" },
  { id: "SI-0003", agency: "Welfare Office", service: "Care center", budget: 620, risk: "Medium", status: "Hold" },
  { id: "SI-0004", agency: "Records Office", service: "Records cloud", budget: 710, risk: "Low", status: "Ready" },
  { id: "SI-0005", agency: "Digital Team", service: "Identity sync", budget: 980, risk: "Medium", status: "Review" },
  { id: "SI-0006", agency: "Procurement", service: "Field exception", budget: 860, risk: "High", status: "Hold" }
]);

export const siColumns: readonly ColumnDef<SiCustomizationRow>[] = Object.freeze([
  { field: "id", headerName: "ID", pinned: "left", width: 118 },
  { field: "agency", headerName: "Agency", width: 220 },
  {
    groupId: "approval",
    headerName: "Approval workflow",
    children: [
      { field: "service", headerName: "Service", width: 220 },
      { field: "budget", headerName: "Budget", type: "number", width: 130 },
      { field: "risk", headerName: "Risk", width: 120 }
    ]
  },
  { field: "status", headerName: "Status", pinned: "right", width: 130 }
]);

export const siPresets: readonly SiThemePreset[] = Object.freeze([
  {
    id: "public-red",
    label: "Public red",
    themeName: "si-public-red",
    tokens: {
      colors: {
        accent: "#d7191f",
        accentHover: "#8b0304",
        header: "#f7f3ef",
        pinnedHeader: "#efe7df",
        selected: "#fff0f0",
        hover: "#f5ece8",
        summary: "#faf6f3"
      }
    },
    overrides: {
      "--og-color-control-active-bg": "#ffe4e6",
      "--og-color-control-active-border": "#d7191f",
      "--og-color-control-active-fg": "#8b0304"
    }
  },
  {
    id: "civic-blue",
    label: "Civic blue",
    themeName: "si-civic-blue",
    tokens: {
      colors: {
        accent: "#1d4ed8",
        accentHover: "#123a9c",
        header: "#eef5ff",
        pinnedHeader: "#e4eefc",
        selected: "#e7f0ff",
        hover: "#eef4ff",
        summary: "#f7faff"
      }
    }
  },
  {
    id: "forest",
    label: "Forest",
    themeName: "si-forest",
    tokens: {
      colors: {
        accent: "#237454",
        accentHover: "#15583e",
        header: "#edf7f3",
        pinnedHeader: "#dff1eb",
        selected: "#e7f6ee",
        hover: "#eef8f2",
        summary: "#f6fbf8"
      }
    }
  },
  {
    id: "neutral-audit",
    label: "Neutral audit",
    themeName: "si-neutral-audit",
    tokens: {
      colors: {
        accent: "#655c4f",
        accentHover: "#494238",
        border: "#cfc8bf",
        header: "#f2efeb",
        pinnedHeader: "#e6e0d9",
        selected: "#f4efe8",
        hover: "#f4f1ed",
        summary: "#f8f6f3"
      }
    }
  },
  {
    id: "bnk-red",
    label: "BNK red",
    themeName: "si-bnk-red",
    tokens: {
      colors: {
        accent: "#d7191f",
        accentHover: "#8b0304",
        border: "#d7cbc2",
        header: "#f7f1ed",
        hover: "#f8eeea",
        pinnedHeader: "#efe4dc",
        selected: "#fff0f1",
        summary: "#fbf7f4"
      }
    },
    overrides: {
      "--og-color-control-active-bg": "#ffe4e6",
      "--og-color-control-active-border": "#d7191f",
      "--og-color-control-active-fg": "#8b0304",
      "--og-color-header-label-border": "#d7191f",
      "--og-color-header-label-fg": "#8b0304"
    }
  },
  {
    id: "bnk-gold",
    label: "BNK gold",
    themeName: "si-bnk-gold",
    tokens: {
      colors: {
        accent: "#896e4a",
        accentHover: "#655c4f",
        border: "#cfc5b5",
        header: "#f4efe7",
        hover: "#f5efe5",
        pinnedHeader: "#ebe2d5",
        selected: "#f7efe4",
        summary: "#faf7f1"
      }
    },
    overrides: {
      "--og-color-control-active-bg": "#f6ead8",
      "--og-color-control-active-border": "#896e4a",
      "--og-color-control-active-fg": "#55432d"
    }
  },
  {
    id: "bnk-gray",
    label: "BNK gray",
    themeName: "si-bnk-gray",
    tokens: {
      colors: {
        accent: "#655c4f",
        accentHover: "#4a4238",
        border: "#c9c5be",
        header: "#f2f1ef",
        hover: "#f5f3f0",
        pinnedHeader: "#e8e4df",
        selected: "#efebe5",
        summary: "#f8f7f5"
      }
    },
    overrides: {
      "--og-color-control-active-bg": "#e8e4df",
      "--og-color-control-active-border": "#655c4f",
      "--og-color-control-active-fg": "#34302a",
      "--og-color-muted": "#655c4f"
    }
  }
]);

export function createTenantTheme(presetId: SiPresetId, density: ThemeDensity): SiThemeOptions {
  const fallbackPreset = siPresets[0];
  if (fallbackPreset === undefined) {
    throw new Error("SI theme presets are not configured.");
  }

  const preset = siPresets.find((item) => item.id === presetId) ?? fallbackPreset;
  const themeInput = {
    name: preset.themeName,
    density,
    tokens: preset.tokens,
    ...(preset.overrides === undefined ? {} : { overrides: preset.overrides })
  };
  return createSiTheme(themeInput);
}

export const siGridOptions: Omit<GridOptions<SiCustomizationRow>, "theme"> = {
  columns: siColumns,
  data: siRows,
  rowKey: "id",
  rowModel: "client",
  layout: { height: 376, bodyHeight: 376 },
  accessibility: { label: "SI customization grid" }
};
