import type { ColumnDef, SelectionOptions } from "@onegrid/core";
import { afterEach, describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

interface MergeIntegrationRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly memo: string;
  readonly memoSpan: boolean;
  readonly owner: string;
  readonly status: string;
}

const columns: readonly ColumnDef<MergeIntegrationRow>[] = [
  { field: "id", headerName: "ID" },
  { field: "region", headerName: "Region", merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", merge: { mode: "value" } },
  { field: "program", headerName: "Program" },
  {
    field: "memo",
    headerName: "Memo",
    editable: true,
    editor: "text",
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memoSpan ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner" },
  { field: "status", headerName: "Status" }
];

const rows: readonly MergeIntegrationRow[] = Object.freeze([
  createRow("M-1", "Capital", "Treasury Office", "Budget approval", "Joint approval", true, "Han", "Approved"),
  createRow("M-2", "Capital", "Treasury Office", "Bond issuance", "Joint approval", true, "Han", "Approved"),
  createRow("M-3", "Capital", "Audit Bureau", "Risk sampling", "Desk review", false, "Lee", "Review")
]);

describe("cell merge integration", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("routes public cell selection on a covered cell to its merge anchor", () => {
    const grid = createGrid({ mode: "range", multiple: true });

    grid.selectCell({ rowIndex: 1, rowKey: "M-2", field: "agency", columnIndex: 2 });

    expect(grid.getSelectionState().cells[0]).toMatchObject({
      rowIndex: 0,
      rowKey: "M-1",
      field: "agency",
      columnIndex: 2
    });
    grid.destroy();
  });

  it("expands public ranges that intersect merged cells", () => {
    const grid = createGrid({ mode: "range", multiple: true });

    grid.selectCellRange(
      { rowIndex: 1, rowKey: "M-2", field: "agency", columnIndex: 2 },
      { rowIndex: 1, rowKey: "M-2", field: "program", columnIndex: 3 }
    );

    expect(grid.getSelectionState().ranges[0]).toMatchObject({
      firstRow: 0,
      lastRow: 1,
      firstColumn: 2,
      lastColumn: 3
    });
    grid.destroy();
  });

  it("routes public edit requests on a covered cell to the anchor editor", () => {
    const grid = createGrid(undefined);

    grid.startEdit({ rowIndex: 0, rowKey: "M-1", field: "owner" });

    expect(document.body.querySelector('[role="dialog"]')?.getAttribute("aria-label")).toBe("Edit Memo");
    grid.destroy();
  });
});

function createGrid(selection?: SelectionOptions): OneGrid<MergeIntegrationRow> {
  const el = document.createElement("div");
  document.body.append(el);
  return new OneGrid<MergeIntegrationRow>({
    el,
    columns,
    data: rows,
    rowKey: "id",
    rowModel: "client",
    ...(selection === undefined ? {} : { selection }),
    editing: { enabled: true },
    merge: { enabled: true }
  });
}

function createRow(
  id: string,
  region: string,
  agency: string,
  program: string,
  memo: string,
  memoSpan: boolean,
  owner: string,
  status: string
): MergeIntegrationRow {
  return { id, region, agency, program, memo, memoSpan, owner, status };
}
