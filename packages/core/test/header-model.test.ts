import { describe, expect, it } from "vitest";
import { createColumnModel, createHeaderModel } from "../src/index.js";
import type { ColumnDef, HeaderCell, HeaderModel } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly tax: number;
  readonly status: "Draft" | "Approved";
  readonly auditNote: string;
}

const columns: readonly ColumnDef<OrderRow>[] = [
  { id: "id", field: "id", headerName: "ID", pinned: "left", width: 96 },
  {
    groupId: "portfolio",
    headerName: "Portfolio",
    children: [
      { field: "customer", headerName: "Customer", width: 180 },
      {
        groupId: "financial",
        headerName: "Financial",
        children: [
          { field: "amount", headerName: "Amount", width: 110 },
          { field: "tax", headerName: "Tax", width: 92 }
        ]
      }
    ]
  },
  { field: "auditNote", headerName: "Audit Note", hidden: true },
  { field: "status", headerName: "Status", pinned: "right", width: 128 }
];

describe("core header model", () => {
  it("builds a visible header tree from normalized columns", () => {
    const header = createHeaderModel(createColumnModel(columns));
    const portfolio = header.tree.find((node) => node.id === "portfolio");

    expect(portfolio?.kind).toBe("group");
    expect(portfolio?.columnIds).toEqual(["customer", "amount", "tax"]);
    expect(header.tree.some((node) => node.id === "auditNote")).toBe(false);
  });

  it("creates a header matrix with group spans and leaf row spans", () => {
    const header = createHeaderModel(createColumnModel(columns));
    const topRow = getRow(header, 0);
    const secondRow = getRow(header, 1);

    expect(getCell(topRow, "portfolio").colSpan).toBe(3);
    expect(getCell(topRow, "id").rowSpan).toBe(3);
    expect(getCell(topRow, "status").rowSpan).toBe(3);
    expect(getCell(secondRow, "financial").colSpan).toBe(2);
  });

  it("applies explicit header merge rules as a top matrix row", () => {
    const header = createHeaderModel(createColumnModel(columns), {
      merge: {
        rules: [
          {
            id: "financial-merge",
            headerName: "Financial Metrics",
            columnIds: ["amount", "tax"]
          }
        ]
      }
    });
    const mergeRow = getRow(header, 0);
    const mergeCell = getCell(mergeRow, "financial-merge");

    expect(header.depth).toBe(4);
    expect(mergeCell.kind).toBe("merge");
    expect(mergeCell.colSpan).toBe(2);
    expect(mergeCell.ariaLabel).toBe("Financial Metrics, spans 2 columns");
  });

  it("promotes parentless leaf headers through explicit merge rows", () => {
    const header = createHeaderModel(createColumnModel(columns), {
      merge: {
        rules: [
          {
            id: "financial-merge",
            headerName: "Financial Metrics",
            columnIds: ["amount", "tax"]
          }
        ]
      }
    });
    const topRow = getRow(header, 0);
    const secondRow = getRow(header, 1);

    expect(getCell(topRow, "id").rowSpan).toBe(4);
    expect(getCell(topRow, "status").rowSpan).toBe(4);
    expect(secondRow.cells.some((cell) => cell.sourceId === "id")).toBe(false);
    expect(secondRow.cells.some((cell) => cell.sourceId === "status")).toBe(false);
  });

  it("renders header merge as a label without adding a structural row", () => {
    const header = createHeaderModel(createColumnModel(columns), {
      merge: {
        rules: [
          {
            id: "financial-label",
            headerName: "Financial Metrics",
            columnIds: ["amount", "tax"],
            presentation: "label"
          }
        ]
      }
    });
    const financialCell = getCell(getRow(header, 1), "financial");

    expect(header.depth).toBe(3);
    expect(financialCell.labels?.[0]?.text).toBe("Financial Metrics");
    expect(financialCell.ariaLabel).toBe("Financial, spans 2 columns, Financial Metrics");
  });

  it("clips header cells into pinned regions", () => {
    const header = createHeaderModel(createColumnModel(columns));

    expect(getCell(header.regions.left.rows[0] ?? failRow(), "id").columnIds).toEqual(["id"]);
    expect(getCell(header.regions.center.rows[0] ?? failRow(), "portfolio").columnIds).toEqual([
      "customer",
      "amount",
      "tax"
    ]);
    expect(getCell(header.regions.right.rows[0] ?? failRow(), "status").columnIds).toEqual([
      "status"
    ]);
  });

  it("recalculates matrix metadata after resize and reorder inputs change", () => {
    const resizedHeader = createHeaderModel(
      createColumnModel([
        { id: "id", field: "id", headerName: "ID" },
        { field: "amount", headerName: "Amount", width: 220 }
      ])
    );
    const reorderedHeader = createHeaderModel(
      createColumnModel(columns, { columnOrder: ["status", "id", "customer", "amount", "tax"] })
    );

    expect(resizedHeader.leafColumns.find((column) => column.id === "amount")?.width).toBe(220);
    expect(getRow(reorderedHeader, 0).cells[0]?.sourceId).toBe("status");
  });

  it("publishes ARIA labels for rendered header cells", () => {
    const header = createHeaderModel(createColumnModel(columns));
    const portfolioCell = getCell(getRow(header, 0), "portfolio");

    expect(header.ariaLabels.get(portfolioCell.id)).toBe("Portfolio, spans 3 columns");
    expect(getCell(getRow(header, 0), "id").ariaLabel).toBe("ID");
  });
});

function getRow(header: HeaderModel<OrderRow>, depth: number) {
  const row = header.rows.find((candidate) => candidate.depth === depth);
  if (!row) {
    throw new Error(`Missing header row at depth ${depth}`);
  }

  return row;
}

function getCell(row: { readonly cells: readonly HeaderCell[] }, sourceId: string): HeaderCell {
  const cell = row.cells.find((candidate) => candidate.sourceId === sourceId);
  if (!cell) {
    throw new Error(`Missing header cell ${sourceId}`);
  }

  return cell;
}

function failRow(): never {
  throw new Error("Missing header region row");
}
