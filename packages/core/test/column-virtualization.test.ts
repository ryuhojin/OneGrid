import { describe, expect, it } from "vitest";
import {
  calculateFixedColumnVirtualWindow,
  clipHeaderRowsToColumns,
  createColumnModel,
  createColumnVirtualizationIndex,
  createHeaderModel,
  getScrollLeftForColumn
} from "../src/index.js";
import type { ColumnDef } from "../src/index.js";

interface WideRow {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly [key: `metric${number}`]: number | string;
}

describe("column virtualization", () => {
  it("calculates a visible column window with horizontal overscan", () => {
    const window = calculateFixedColumnVirtualWindow({
      columnWidths: [100, 120, 140, 160, 180, 200],
      scrollLeft: 260,
      viewportWidth: 240,
      overscan: { before: 1, after: 2 }
    });

    expect(window.visibleFirstColumn).toBe(2);
    expect(window.visibleLastColumn).toBe(3);
    expect(window.firstColumn).toBe(1);
    expect(window.lastColumn).toBe(5);
    expect(window.offsetLeft).toBe(100);
    expect(window.beforeWidth).toBe(100);
    expect(window.afterWidth).toBe(0);
    expect(window.renderedColumnCount).toBe(5);
  });

  it("caps rendered columns without clipping visible columns", () => {
    const window = calculateFixedColumnVirtualWindow({
      columnWidths: Array.from({ length: 20 }, () => 80),
      scrollLeft: 320,
      viewportWidth: 320,
      overscan: 10,
      maxDomColumns: 6
    });

    expect(window.visibleColumnCount).toBe(4);
    expect(window.renderedColumnCount).toBe(6);
    expect(window.firstColumn).toBe(2);
    expect(window.lastColumn).toBe(7);
  });

  it("calculates scrollToColumn positions with common alignments", () => {
    const columnWidths = [100, 120, 140, 160, 180];

    expect(getScrollLeftForColumn({ columnWidths, columnIndex: 2, viewportWidth: 220 })).toBe(220);
    expect(getScrollLeftForColumn({
      columnWidths,
      columnIndex: 3,
      viewportWidth: 220,
      align: "center"
    })).toBe(330);
    expect(getScrollLeftForColumn({
      columnWidths,
      columnIndex: 2,
      viewportWidth: 300,
      currentScrollLeft: 180,
      align: "nearest"
    })).toBe(180);
  });

  it("resolves wide column windows from a reusable offset index", () => {
    const columnWidths = Array.from({ length: 50_000 }, (_, index) => 80 + (index % 7));
    const columnIndex = createColumnVirtualizationIndex({ columnWidths });
    const scrollLeft = columnIndex.getColumnOffset(40_000);
    const window = calculateFixedColumnVirtualWindow({
      columnWidths,
      columnVirtualizationIndex: columnIndex,
      scrollLeft,
      viewportWidth: 640,
      overscan: { before: 2, after: 2 },
      maxDomColumns: 12
    });

    expect(window.visibleFirstColumn).toBe(40_000);
    expect(window.firstColumn).toBe(39_998);
    expect(window.renderedColumnCount).toBeLessThanOrEqual(12);
    expect(columnIndex.sumColumns(0, columnWidths.length - 1)).toBe(columnIndex.totalWidth);
    expect(getScrollLeftForColumn({
      columnWidths,
      columnVirtualizationIndex: columnIndex,
      columnIndex: 40_000,
      viewportWidth: 640
    })).toBe(scrollLeft);
  });

  it("clips group headers to a virtualized center column range", () => {
    const columns: readonly ColumnDef<WideRow>[] = [
      { field: "id", headerName: "ID", pinned: "left" },
      {
        groupId: "metrics",
        headerName: "Metrics",
        children: [
          { field: "metric1", headerName: "M1" },
          { field: "metric2", headerName: "M2" },
          { field: "metric3", headerName: "M3" },
          { field: "metric4", headerName: "M4" }
        ]
      },
      { field: "status", headerName: "Status", pinned: "right" }
    ];
    const columnModel = createColumnModel(columns);
    const headerModel = createHeaderModel(columnModel);
    const clippedRows = clipHeaderRowsToColumns(
      headerModel.regions.center.rows,
      "center",
      columnModel.pinnedLeafColumns.center.slice(1, 3)
    );

    const groupCell = clippedRows[0]?.cells.find((cell) => cell.headerName === "Metrics");
    expect(groupCell?.startLeafIndex).toBe(0);
    expect(groupCell?.colSpan).toBe(2);
    expect(groupCell?.columnIds).toEqual(["metric2", "metric3"]);
  });
});
