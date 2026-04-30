import { describe, expect, it } from "vitest";
import {
  createCellSpanModel,
  createColumnModel,
  createSelectionState,
  isCellSelected,
  isRowSelected,
  selectAllVisibleRows,
  selectCell,
  selectCellRange,
  selectRows,
  selectServerDataset,
  toggleRowSelection
} from "../src/index.js";
import type { CellSpanRow, ColumnDef, SelectedCell } from "../src/index.js";

interface SelectionRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly memo: string;
  readonly owner: string;
}

const columns: readonly ColumnDef<SelectionRow>[] = [
  { field: "id", headerName: "ID" },
  { field: "region", headerName: "Region", merge: { mode: "value" } },
  { field: "agency", headerName: "Agency" },
  {
    field: "memo",
    headerName: "Memo",
    merge: {
      mode: "custom",
      colSpan: ({ row }) => row.memo === "Joint approval" ? 2 : 1
    }
  },
  { field: "owner", headerName: "Owner" }
];

const spanRows: readonly CellSpanRow<SelectionRow>[] = [
  createRow(0, "SEL-0001", "Capital", "Treasury", "Joint approval", "Han"),
  createRow(1, "SEL-0002", "Capital", "Treasury", "Joint approval", "Han"),
  createRow(2, "SEL-0003", "Regional", "Audit", "Desk review", "Lee")
];

describe("selection model", () => {
  it("selects and toggles rows with single and multi-select policies", () => {
    let state = createSelectionState({ mode: "row", multiple: true });

    state = selectRows(state, ["SEL-0001", "SEL-0002", "SEL-0001"], { multiple: true });
    expect(state.rowKeys).toEqual(["SEL-0001", "SEL-0002"]);
    expect(isRowSelected(state, "SEL-0001")).toBe(true);

    state = toggleRowSelection(state, "SEL-0002", { multiple: true });
    expect(state.rowKeys).toEqual(["SEL-0001"]);

    state = selectRows(state, ["SEL-0001", "SEL-0002"], { multiple: false });
    expect(state.rowKeys).toEqual(["SEL-0001"]);
  });

  it("tracks cell and additive multi-cell selection", () => {
    let state = createSelectionState({ mode: "cell" });
    const first = cell("SEL-0001", 0, "agency", 2);
    const second = cell("SEL-0002", 1, "memo", 3);

    state = selectCell(state, first);
    state = selectCell(state, second, true);

    expect(state.cells).toEqual([first, second]);
    expect(isCellSelected(state, first)).toBe(true);
    expect(state.rowKeys).toEqual([]);
  });

  it("expands ranges through merged cells", () => {
    const columnModel = createColumnModel(columns);
    const cellSpanModel = createCellSpanModel({
      rows: spanRows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    const state = selectCellRange(createSelectionState({ mode: "range" }), {
      anchor: cell("SEL-0001", 0, "memo", 3),
      focus: cell("SEL-0001", 0, "memo", 3),
      cellSpanModel
    });

    expect(state.ranges[0]).toMatchObject({
      firstRow: 0,
      lastRow: 0,
      firstColumn: 3,
      lastColumn: 4
    });
    expect(isCellSelected(state, cell("SEL-0001", 0, "owner", 4))).toBe(true);
  });

  it("selects visible rows and server dataset tokens without materializing data", () => {
    let state = createSelectionState({ mode: "row" });
    state = selectAllVisibleRows(state, ["SEL-0001", "SEL-0003"]);
    expect(state.rowKeys).toEqual(["SEL-0001", "SEL-0003"]);

    state = selectServerDataset(state, {
      rowModel: "server",
      filterModel: { quickText: "ready" },
      sortModel: [{ field: "id", direction: "asc" }],
      snapshotVersion: "snapshot-1",
      tokenPrefix: "selection"
    });

    expect(state.rowKeys).toEqual([]);
    expect(state.allRowsToken).toMatchObject({
      kind: "server-dataset",
      rowModel: "server"
    });
    expect(state.allRowsToken?.token.startsWith("selection:")).toBe(true);
  });
});

function cell(
  rowKey: string,
  rowIndex: number,
  field: string,
  columnIndex: number
): SelectedCell {
  return { rowKey, rowIndex, field, columnIndex };
}

function createRow(
  rowIndex: number,
  rowKey: string,
  region: string,
  agency: string,
  memo: string,
  owner: string
): CellSpanRow<SelectionRow> {
  return {
    rowIndex,
    rowKey,
    data: {
      id: rowKey,
      region,
      agency,
      memo,
      owner
    }
  };
}
