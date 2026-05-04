import type { ColumnDef, GridOptions, ThemeOptions } from "@onegrid/core";

export type ThemeChoice = "default" | "clean" | "compact" | "dark" | "high-contrast" | "bnk";

export interface ThemeExampleRow {
  readonly id: string;
  readonly desk: string;
  readonly owner: string;
  readonly program: string;
  readonly amount: number;
  readonly status: "Ready" | "Review" | "Blocked";
}

export const themeRows: readonly ThemeExampleRow[] = Object.freeze([
  { id: "TH-0001", desk: "Treasury", owner: "Han", program: "Budget", amount: 1200, status: "Ready" },
  { id: "TH-0002", desk: "Public Funds", owner: "Seo", program: "Bond", amount: 860, status: "Review" },
  { id: "TH-0003", desk: "Audit", owner: "Lee", program: "Risk", amount: 430, status: "Blocked" },
  { id: "TH-0004", desk: "Procurement", owner: "Choi", program: "Field", amount: 620, status: "Ready" },
  { id: "TH-0005", desk: "Digital", owner: "Kang", program: "Identity", amount: 980, status: "Review" },
  { id: "TH-0006", desk: "Records", owner: "Min", program: "Archive", amount: 710, status: "Ready" }
]);

export const themeColumns: readonly ColumnDef<ThemeExampleRow>[] = Object.freeze([
  { field: "id", headerName: "ID", pinned: "left", width: 120 },
  { field: "desk", headerName: "Desk", width: 180 },
  {
    groupId: "workflow",
    headerName: "Workflow",
    children: [
      { field: "owner", headerName: "Owner", width: 140 },
      { field: "program", headerName: "Program", width: 220 },
      { field: "amount", headerName: "Amount", type: "number", width: 140 }
    ]
  },
  { field: "status", headerName: "Status", pinned: "right", width: 132 }
]);

export const themeChoices: readonly { readonly id: ThemeChoice; readonly label: string }[] = Object.freeze([
  { id: "default", label: "Default" },
  { id: "clean", label: "Clean" },
  { id: "compact", label: "Compact" },
  { id: "dark", label: "Dark" },
  { id: "high-contrast", label: "High contrast" },
  { id: "bnk", label: "BNK scoped" }
]);

export function createTheme(choice: ThemeChoice): ThemeOptions {
  if (choice === "bnk") {
    return {
      name: "bnk-enterprise",
      density: "standard",
      variables: {
        "--og-color-focus-ring": "#d7191f",
        "--og-color-accent": "#d7191f",
        "--og-color-accent-hover": "#8b0304",
        "--og-color-header-bg": "#f7f3ef",
        "--og-color-pinned-header-bg": "#efe7df",
        "--og-color-selected-bg": "#fff0f0",
        "--og-color-control-active-bg": "#ffe4e6",
        "--og-color-control-active-border": "#d7191f",
        "--og-color-control-active-fg": "#8b0304"
      }
    };
  }

  if (choice === "compact") {
    return { name: "compact", density: "compact" };
  }

  if (choice === "high-contrast") {
    return { name: "high-contrast", density: "comfortable" };
  }

  return { name: choice, density: "standard" };
}

export const themeGridOptions: Omit<GridOptions<ThemeExampleRow>, "theme"> = {
  columns: themeColumns,
  data: themeRows,
  rowKey: "id",
  rowModel: "client",
  layout: { height: 380, bodyHeight: 380 },
  accessibility: { label: "Theme foundation grid" }
};
