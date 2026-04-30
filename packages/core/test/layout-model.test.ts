import { describe, expect, it } from "vitest";
import { createColumnModel, createGridLayoutModel, createSummaryRow } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly amount: number;
  readonly tax: number;
  readonly status: string;
}

const rows: readonly OrderRow[] = [
  { id: "A", amount: 100, tax: 10, status: "Approved" },
  { id: "B", amount: 250, tax: 25, status: "Draft" }
];

describe("grid layout model", () => {
  it("splits visible columns into pinned left, center, and right panes", () => {
    const columnModel = createColumnModel<OrderRow>([
      { field: "id", headerName: "ID", pinned: "left", width: 90 },
      { field: "amount", headerName: "Amount", width: 140 },
      { field: "tax", headerName: "Tax", width: 100 },
      { field: "status", headerName: "Status", pinned: "right", width: 120 }
    ]);

    const layout = createGridLayoutModel(columnModel, { hasSummary: true, hasFooter: true });

    expect(layout.paneOrder).toEqual(["left", "center", "right"]);
    expect(layout.panes.left.columnTemplate).toBe("90px");
    expect(layout.panes.center.columnTemplate).toBe("140px 100px");
    expect(layout.panes.right.columnTemplate).toBe("120px");
    expect(layout.panes.center.ariaColumnOffset).toBe(1);
    expect(layout.panes.right.ariaColumnOffset).toBe(3);
    expect(layout.sections.summary).toBe(true);
    expect(layout.sections.footer).toBe(true);
    expect(layout.totalColumnWidth).toBe(450);
  });

  it("calculates summary cells from all built-in and custom summary definitions", () => {
    const columnModel = createColumnModel<OrderRow>([
      { field: "id", headerName: "ID", summary: "count" },
      { field: "amount", headerName: "Amount", summary: "sum" },
      { field: "tax", headerName: "Tax", summary: "avg" },
      { id: "min-amount", field: "amount", headerName: "Min", summary: "min" },
      { id: "max-amount", field: "amount", headerName: "Max", summary: "max" },
      { id: "distinct-status", field: "status", headerName: "Statuses", summary: "distinct-count" },
      {
        field: "status",
        headerName: "Status",
        summary: {
          kind: "custom",
          calculate: (sourceRows) => sourceRows.map((row) => row.status).join(", ")
        }
      }
    ]);

    const summary = createSummaryRow(columnModel.visibleLeafColumns, rows);

    expect(summary?.cells).toEqual([
      { columnId: "id", field: "id", label: "Count", value: 2 },
      { columnId: "amount", field: "amount", label: "Sum", value: 350 },
      { columnId: "tax", field: "tax", label: "Avg", value: 17.5 },
      { columnId: "min-amount", field: "amount", label: "Min", value: 100 },
      { columnId: "max-amount", field: "amount", label: "Max", value: 250 },
      { columnId: "distinct-status", field: "status", label: "Distinct", value: 2 },
      { columnId: "status", field: "status", label: "Summary", value: "Approved, Draft" }
    ]);
  });

  it("uses server aggregate values before local summary calculation", () => {
    const columnModel = createColumnModel<OrderRow>([
      {
        field: "amount",
        headerName: "Amount",
        summary: { kind: "sum", aggregateKey: "amountTotal", label: "Total" }
      },
      { field: "tax", headerName: "Tax", summary: "avg" }
    ]);

    const summary = createSummaryRow(columnModel.visibleLeafColumns, rows, {
      aggregateValues: { amountTotal: 999, "avg:tax": 22 }
    });

    expect(summary?.cells).toEqual([
      { columnId: "amount", field: "amount", label: "Total", value: 999 },
      { columnId: "tax", field: "tax", label: "Avg", value: 22 }
    ]);
  });
});
