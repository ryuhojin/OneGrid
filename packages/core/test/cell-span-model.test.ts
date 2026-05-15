import { describe, expect, it } from "vitest";
import {
  createCellSpanModel,
  createColumnModel,
  expandCellSpanRange,
  getCellSpansForColumn,
  getCellSpansForRange,
  getCellSpansForRow,
  getCellSpanState,
  resolveCellSpanAnchor
} from "../src/index.js";
import type { CellSpanRow, ColumnDef, MergeMeta } from "../src/index.js";

interface BudgetRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly memo: string;
  readonly owner: string;
  readonly status: string;
}

const rows: readonly CellSpanRow<BudgetRow>[] = [
  createRow(0, "A", "North", "Treasury", "Joint review", "Kim", "Approved"),
  createRow(1, "B", "North", "Treasury", "Joint review", "Kim", "Approved"),
  createRow(2, "C", "South", "Audit", "Desk review", "Lee", "Draft")
];

const columns: readonly ColumnDef<BudgetRow>[] = [
  { field: "id", headerName: "ID" },
  { field: "region", headerName: "Region", merge: { mode: "value" } },
  { field: "agency", headerName: "Agency", merge: { mode: "value" } },
  {
    field: "memo",
    headerName: "Memo",
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memo === "Joint review" ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner" },
  { field: "status", headerName: "Status" }
];

describe("cell span model", () => {
  it("builds value and custom spans without overlapping covered cells", () => {
    const columnModel = createColumnModel(columns);
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    const regionState = getCellSpanState(model, 0, 1, {
      firstRow: 0,
      lastRow: 2,
      firstColumn: 0,
      lastColumn: 5
    });
    const coveredRegion = getCellSpanState(model, 1, 1, {
      firstRow: 0,
      lastRow: 2,
      firstColumn: 0,
      lastColumn: 5
    });
    const memoState = getCellSpanState(model, 0, 3, {
      firstRow: 0,
      lastRow: 2,
      firstColumn: 0,
      lastColumn: 5
    });

    expect(regionState).toMatchObject({ kind: "anchor", rowSpan: 2, colSpan: 1 });
    expect(coveredRegion).toMatchObject({ kind: "covered" });
    expect(memoState).toMatchObject({ kind: "anchor", rowSpan: 1, colSpan: 2 });
  });

  it("clips spans to virtual row and pinned column windows", () => {
    const columnModel = createColumnModel(columns);
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    const state = getCellSpanState(model, 1, 1, {
      firstRow: 1,
      lastRow: 2,
      firstColumn: 1,
      lastColumn: 2
    });

    expect(state).toMatchObject({
      kind: "anchor",
      rowSpan: 1,
      colSpan: 1,
      clippedTop: true
    });
  });

  it("applies server mergeMeta and resolves covered cells to anchors", () => {
    const columnModel = createColumnModel(columns);
    const serverMeta: readonly MergeMeta[] = [
      {
        anchor: { rowIndex: 1, field: "status", rowKey: "B" },
        rowSpan: 2,
        colSpan: 1,
        value: "Server hold"
      }
    ];
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true, strategy: "server" },
      serverMeta
    });

    const state = getCellSpanState(model, 1, 5, {
      firstRow: 0,
      lastRow: 2,
      firstColumn: 0,
      lastColumn: 5
    });
    const anchor = resolveCellSpanAnchor(model, 2, 5);

    expect(state).toMatchObject({ kind: "anchor", rowSpan: 2 });
    expect(anchor).toEqual({
      rowIndex: 1,
      rowKey: "B",
      columnIndex: 5,
      columnId: "status",
      field: "status"
    });
  });

  it("expands selection ranges to include merged cells", () => {
    const columnModel = createColumnModel(columns);
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    expect(expandCellSpanRange(model, {
      firstRow: 0,
      lastRow: 0,
      firstColumn: 4,
      lastColumn: 4
    })).toEqual({
      firstRow: 0,
      lastRow: 0,
      firstColumn: 3,
      lastColumn: 4
    });
  });

  it("indexes spans by anchor, row, column, and queried range", () => {
    const columnModel = createColumnModel(columns);
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    const region = model.index.byAnchorCell.get("0:1");
    const rowZeroIds = getCellSpansForRow(model.index, 0).map((span) => span.id);
    const ownerColumnIds = getCellSpansForColumn(model.index, 4).map((span) => span.id);
    const memoRangeIds = getCellSpansForRange(model.index, {
      firstRow: 0,
      lastRow: 0,
      firstColumn: 4,
      lastColumn: 4
    }).map((span) => span.id);

    expect(region).toMatchObject({ kind: "value", rowSpan: 2 });
    expect(rowZeroIds).toEqual(expect.arrayContaining([
      "value:0:region",
      "value:0:agency",
      "custom:0:memo"
    ]));
    expect(ownerColumnIds).toEqual(["custom:0:memo", "custom:1:memo"]);
    expect(memoRangeIds).toEqual(["custom:0:memo"]);
  });

  it("uses indexed range expansion without pulling unrelated spans", () => {
    const columnModel = createColumnModel(columns);
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    const expanded = expandCellSpanRange(model, {
      firstRow: 2,
      lastRow: 2,
      firstColumn: 0,
      lastColumn: 0
    });

    expect(expanded).toEqual({
      firstRow: 2,
      lastRow: 2,
      firstColumn: 0,
      lastColumn: 0
    });
  });

  it("indexes large server spans only for loaded covered cells", () => {
    const columnModel = createColumnModel(columns);
    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true, strategy: "server" },
      serverMeta: [
        {
          anchor: { rowIndex: 1, field: "status", rowKey: "B" },
          rowSpan: 1_000_000,
          colSpan: 1,
          value: "Long server span"
        }
      ]
    });

    expect(model.index.byRow.size).toBeLessThanOrEqual(rows.length);
    expect(getCellSpansForRow(model.index, 999_999)).toEqual([]);
    expect(getCellSpansForRange(model.index, {
      firstRow: 999_998,
      lastRow: 999_999,
      firstColumn: 5,
      lastColumn: 5
    })).toEqual([]);
  });
});

function createRow(
  rowIndex: number,
  rowKey: string,
  region: string,
  agency: string,
  memo: string,
  owner: string,
  status: string
): CellSpanRow<BudgetRow> {
  return {
    rowIndex,
    rowKey,
    data: { id: rowKey, region, agency, memo, owner, status }
  };
}
