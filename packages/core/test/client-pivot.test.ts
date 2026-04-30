import { describe, expect, it } from "vitest";
import { createClientPivotModel } from "../src/index.js";
import type { ColumnDef, PivotModel } from "../src/index.js";

interface PivotSourceRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly quarter: "Q1" | "Q2";
  readonly amount: number;
  readonly cases: number;
}

const columns: readonly ColumnDef<PivotSourceRow>[] = [
  { field: "region", headerName: "Region" },
  { field: "agency", headerName: "Agency" },
  { field: "quarter", headerName: "Quarter" },
  { field: "amount", headerName: "Amount" },
  { field: "cases", headerName: "Cases" }
];

const rows: readonly PivotSourceRow[] = [
  createRow("A1", "Capital", "Treasury", "Q1", 120, 2),
  createRow("A2", "Capital", "Treasury", "Q2", 80, 1),
  createRow("A3", "Capital", "Audit", "Q1", 40, 1),
  createRow("B1", "Digital", "Platform", "Q2", 70, 3)
];

describe("client pivot model", () => {
  it("creates pivot columns, subtotal rows, and grand total rows", () => {
    const result = createClientPivotModel(rows, columns, createModel());

    expect(result?.rowKey).toBe("__ogPivotKey");
    expect(result?.meta).toMatchObject({
      rowFields: ["region", "agency"],
      columnFields: ["quarter"],
      valueFields: ["amount", "cases"],
      pivotColumnCount: 2,
      dataRowCount: 3,
      subtotalRowCount: 2
    });
    expect(result?.columns.map((column) => "children" in column ? column.headerName : column.field))
      .toEqual(["region", "agency", "Q1", "Q2", "Total"]);
    expect(result?.rows).toHaveLength(6);

    const treasury = result?.rows.find((row) => row.agency === "Treasury");
    expect(treasury?.["pivot:Q1:amountTotal"]).toBe(120);
    expect(treasury?.["pivot:Q2:amountTotal"]).toBe(80);
    expect(treasury?.["pivot:total:caseCount"]).toBe(3);

    const capitalSubtotal = result?.rows.find((row) => row.__ogPivotKey === "subtotal:Capital");
    expect(capitalSubtotal?.agency).toBe("Subtotal");
    expect(capitalSubtotal?.["pivot:Q1:amountTotal"]).toBe(160);

    const grandTotal = result?.rows.find((row) => row.__ogPivotKey === "grand-total");
    expect(grandTotal?.region).toBe("Grand total");
    expect(grandTotal?.["pivot:total:amountTotal"]).toBe(310);
  });
});

function createModel(): PivotModel {
  return {
    rows: ["region", "agency"],
    columns: ["quarter"],
    values: [
      { field: "amount", function: "sum", alias: "amountTotal", label: "Amount" },
      { field: "cases", function: "sum", alias: "caseCount", label: "Cases" }
    ],
    totals: "both",
    subtotals: true
  };
}

function createRow(
  id: string,
  region: string,
  agency: string,
  quarter: "Q1" | "Q2",
  amount: number,
  cases: number
): PivotSourceRow {
  return { id, region, agency, quarter, amount, cases };
}
