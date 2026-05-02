import type { ColumnDef } from "@onegrid/core";
import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";
import { createDomExportMatrix } from "../src/grid/exportData.js";

interface ExportTestRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly memo: string;
  readonly owner: string;
  readonly amount: number;
  readonly status: string;
}

const columns: readonly ColumnDef<ExportTestRow>[] = [
  { field: "id", headerName: "ID" },
  { field: "region", headerName: "Region", merge: { mode: "value" } },
  {
    groupId: "workflow",
    headerName: "Workflow",
    children: [
      { field: "agency", headerName: "Agency", merge: { mode: "value" } },
      { field: "program", headerName: "Program" },
      { field: "memo", headerName: "Memo" },
      { field: "owner", headerName: "Owner" }
    ]
  },
  { field: "amount", headerName: "Amount" },
  { field: "status", headerName: "Status" }
];

describe("DOM export matrix", () => {
  it("marks row-spanned header and body cells as covered for print/export layout", () => {
    const matrix = createDomExportMatrix({
      options: {
        el: document.createElement("div"),
        columns,
        data: [
          createRow("EXP-1", "Capital", "Treasury Office", "Budget approval"),
          createRow("EXP-2", "Capital", "Treasury Office", "Bond issuance")
        ],
        rowKey: "id",
        merge: { enabled: true },
        headerMerge: {
          enabled: true,
          rules: [{
            headerName: "Export review window",
            columnIds: ["agency", "program", "memo", "owner"],
            presentation: "row"
          }]
        }
      },
      rowRenderState: undefined,
      selection: { rowKeys: [], cells: [], ranges: [] }
    }, {
      includeCellMerges: true,
      includeHeaderMerges: true,
      preserveVisualLayout: true
    });

    expect(matrix.headerRows[0]?.[0]).toMatchObject({ value: "ID", rowSpan: 3 });
    expect(visibleHeaderValues(matrix.headerRows[1] ?? [])).toEqual(["Workflow"]);
    expect(visibleHeaderValues(matrix.headerRows[2] ?? [])).toEqual(["Agency", "Program", "Memo", "Owner"]);
    expect(matrix.headerRows[1]?.[0]?.covered).toBe(true);
    expect(matrix.headerRows[2]?.[7]?.covered).toBe(true);
    expect(matrix.bodyRows[0]?.[1]).toMatchObject({ value: "Capital", rowSpan: 2 });
    expect(matrix.bodyRows[1]?.[1]?.covered).toBe(true);
  });

  it("replaces imported rows by default and appends only when requested", async () => {
    const host = document.createElement("div");
    const grid = new OneGrid<SimpleImportRow>({
      el: host,
      columns: [
        { field: "id", headerName: "ID" },
        { field: "status", headerName: "Status" }
      ],
      data: [{ id: "OLD-1", status: "Old" }],
      rowKey: "id",
      import: { format: "csv", hasHeaders: true, parseRow: parseSimpleImportRow }
    });

    await grid.importData("id,status\nNEW-1,Ready");

    expect(host.textContent).not.toContain("OLD-1");
    expect(host.textContent).toContain("NEW-1");

    await grid.importData("id,status\nNEW-2,Review", { mode: "append" });

    expect(host.textContent).toContain("NEW-1");
    expect(host.textContent).toContain("NEW-2");

    grid.destroy();
  });
});

function visibleHeaderValues(row: readonly { readonly value: unknown; readonly covered?: boolean }[]): string[] {
  return row.filter((cell) => cell.covered !== true).map((cell) => String(cell.value));
}

function createRow(
  id: string,
  region: string,
  agency: string,
  program: string
): ExportTestRow {
  return {
    id,
    region,
    agency,
    program,
    memo: "Joint approval",
    owner: "Han",
    amount: 1200,
    status: "Approved"
  };
}

interface SimpleImportRow {
  readonly id: string;
  readonly status: string;
}

function parseSimpleImportRow(record: Readonly<Record<string, unknown>>): SimpleImportRow {
  return {
    id: String(record.id ?? ""),
    status: String(record.status ?? "")
  };
}
