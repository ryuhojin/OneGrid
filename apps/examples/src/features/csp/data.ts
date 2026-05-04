import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface CspRow {
  readonly id: string;
  readonly department: string;
  readonly owner: string;
  readonly amount: number;
  readonly status: "Ready" | "Review" | "Blocked";
}

export const cspColumns: readonly ColumnDef<CspRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 150 },
  { field: "department", headerName: "Department", width: 220 },
  { field: "owner", headerName: "Owner", width: 160 },
  { field: "amount", headerName: "Amount", type: "number", width: 150 },
  { field: "status", headerName: "Status", pinned: "right", filter: "set", width: 150 }
];

export const cspRows: readonly CspRow[] = [
  { id: "CSP-0001", department: "Budget Office", owner: "Han", amount: 1200, status: "Ready" },
  { id: "CSP-0002", department: "Treasury Review", owner: "Seo", amount: 860, status: "Review" },
  { id: "CSP-0003", department: "Audit Desk", owner: "Lee", amount: 430, status: "Blocked" }
];

export const cspNonce = "onegrid-csp-test";

export const cspTheme: NonNullable<GridOptions<CspRow>["theme"]> = {
  name: "csp-safe",
  variables: {
    "--og-color-header-bg": "#eaf6f1",
    "--og-color-focus-ring": "#0f766e",
    "--og-font-size": "14px"
  }
};
