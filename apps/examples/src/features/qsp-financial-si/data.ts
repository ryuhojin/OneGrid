import type { ColumnDef, GridOptions, RenderElementBuilder, RenderElement } from "@onegrid/core";
import { createSiTheme } from "@onegrid/themes";

export interface FinancialSiRow {
  readonly id: string;
  readonly desk: string;
  readonly account: string;
  readonly exposure: number;
  readonly limitUsage: number;
  readonly exception: string;
  readonly status: "Normal" | "Review" | "Hold";
}

export const financialSiRows: readonly FinancialSiRow[] = Object.freeze([
  {
    id: "FIN-0001",
    desk: "Treasury",
    account: "Public bond ladder",
    exposure: 1_250_000,
    limitUsage: 68,
    exception: "Dual approval complete",
    status: "Normal"
  },
  {
    id: "FIN-0002",
    desk: "Treasury",
    account: "Cash pool",
    exposure: 860_000,
    limitUsage: 76,
    exception: "Pending document check",
    status: "Review"
  },
  {
    id: "FIN-0003",
    desk: "Risk",
    account: "FX hedge",
    exposure: 430_000,
    limitUsage: 92,
    exception: "Limit breach review",
    status: "Hold"
  },
  {
    id: "FIN-0004",
    desk: "Settlement",
    account: "Reserve note",
    exposure: 710_000,
    limitUsage: 51,
    exception: "Daily reconciliation",
    status: "Normal"
  }
]);

export const financialExposureTotal = financialSiRows.reduce((sum, row) => sum + row.exposure, 0);

export const financialSiColumns: readonly ColumnDef<FinancialSiRow>[] = Object.freeze([
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 126 },
  { field: "desk", headerName: "Desk", width: 138, merge: { mode: "value" } },
  {
    groupId: "control",
    headerName: "Financial controls",
    children: [
      { field: "account", headerName: "Account", width: 230 },
      { field: "exposure", headerName: "Exposure", type: "number", width: 142 },
      { field: "limitUsage", headerName: "Limit %", type: "number", width: 118 },
      { field: "exception", headerName: "Exception", width: 230 }
    ]
  },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 126,
    renderer: {
      kind: "element",
      render: ({ value }, builder) => renderStatus(value, builder)
    }
  }
]);

export const financialSiOptions: GridOptions<FinancialSiRow> = {
  columns: financialSiColumns,
  data: financialSiRows,
  rowKey: "id",
  rowModel: "client",
  merge: { enabled: true, strategy: "value", fields: ["desk"] },
  selection: { mode: "range", multiple: true },
  clipboard: { enabled: true, includeHeaders: true, preserveMerge: true },
  summary: { enabled: true, position: "bottom" },
  aggregation: {
    enabled: true,
    model: { fields: [{ field: "exposure", function: "sum", alias: "Exposure Total" }] }
  },
  layout: { height: 388, bodyHeight: 388 },
  accessibility: { label: "Financial SI quality grid" },
  theme: createSiTheme({
    name: "qsp-financial-bnk",
    density: "compact",
    tokens: {
      colors: {
        accent: "#d7191f",
        accentHover: "#8b0304",
        header: "#f7f1ed",
        pinnedHeader: "#efe4dc",
        selected: "#fff0f1",
        hover: "#f8eeea",
        summary: "#fbf7f4"
      }
    }
  })
};

function renderStatus(value: unknown, builder: RenderElementBuilder): RenderElement {
  const status = String(value).toLowerCase();
  const tone = status === "hold" ? "high" : status === "review" ? "medium" : "low";
  return builder.element("span", { class: `example-pill example-pill--${tone}` }, [String(value)]);
}
