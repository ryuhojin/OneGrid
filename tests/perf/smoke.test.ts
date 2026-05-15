import { describe, expect, it } from "vitest";
import {
  calculateFixedColumnVirtualWindow,
  calculateFixedRowVirtualWindow,
  calculateVariableRowVirtualWindow,
  createCellSpanModel,
  createColumnModel,
  createColumnVirtualizationIndex,
  createRowHeightIndex,
  createSegmentedVirtualScroll
} from "../../packages/core/src/index.js";
import {
  createQspServerRow,
  QSP_SERVER_TOTAL_ROWS
} from "../../apps/examples/src/features/qsp-server-10m/data.js";
import {
  createQspViewportRow,
  QSP_VIEWPORT_TOTAL_ROWS
} from "../../apps/examples/src/features/qsp-viewport-100m/data.js";
import type { CellSpanRow, ColumnDef } from "../../packages/core/src/index.js";
import { createFixtureRows } from "../../packages/testing/src/index.js";

describe("performance harness smoke", () => {
  it("creates deterministic fixture rows without large allocation", () => {
    const rows = createFixtureRows(5);

    expect(rows).toHaveLength(5);
    expect(rows[0]?.id).toBe("ROW-0001");
  });

  it("maps 10M logical rows into a bounded scroll height", () => {
    const state = createSegmentedVirtualScroll({
      rowCount: 10_000_000,
      rowHeight: 32,
      viewportHeight: 320,
      logicalScrollTop: 120_000_000
    });

    expect(state.physicalScrollHeight).toBeLessThanOrEqual(24_000_000);
    expect(state.segmentCount).toBeGreaterThan(1);
  });

  it("calculates a 100M row viewport without allocating row objects", () => {
    const window = calculateFixedRowVirtualWindow({
      rowCount: 100_000_000,
      rowHeight: 32,
      viewportHeight: 320,
      scrollTop: 1_000_000_000,
      overscan: 4,
      maxDomRows: 80
    });

    expect(window.renderedRowCount).toBeLessThanOrEqual(80);
    expect(window.firstRow).toBeGreaterThan(31_000_000);
  });

  it("resolves a 50K column viewport with bounded rendered columns", () => {
    const columnWidths = Array.from({ length: 50_000 }, (_, index) => 96 + (index % 9));
    const columnIndex = createColumnVirtualizationIndex({ columnWidths });
    const window = calculateFixedColumnVirtualWindow({
      columnWidths,
      columnVirtualizationIndex: columnIndex,
      scrollLeft: columnIndex.getColumnOffset(45_000),
      viewportWidth: 960,
      overscan: 4,
      maxDomColumns: 18
    });

    expect(window.visibleFirstColumn).toBe(45_000);
    expect(window.renderedColumnCount).toBeLessThanOrEqual(18);
    expect(window.totalWidth).toBe(columnIndex.totalWidth);
  });

  it("resolves a 20K variable-height client row viewport with bounded rows", () => {
    const rowHeightIndex = createRowHeightIndex({
      rowCount: 20_000,
      estimatedRowHeight: 44,
      getRowHeight: (index) => 32 + (index % 5) * 8
    });
    const window = calculateVariableRowVirtualWindow({
      rowHeightIndex,
      scrollTop: rowHeightIndex.getRowOffset(15_000),
      viewportHeight: 420,
      overscan: 4,
      maxDomRows: 32
    });

    expect(window.visibleFirstRow).toBe(15_000);
    expect(window.renderedRowCount).toBeLessThanOrEqual(32);
    expect(window.totalHeight).toBe(rowHeightIndex.totalHeight);
  });

  it("keeps EX-005 large-row examples deterministic without bulk arrays", () => {
    expect(QSP_SERVER_TOTAL_ROWS).toBe(10_000_000);
    expect(QSP_VIEWPORT_TOTAL_ROWS).toBe(100_000_000);
    expect(createQspServerRow(9_999_990).id).toBe("SRV10M-09999991");
    expect(createQspViewportRow(99_999_950).id).toBe("VP100M-099999951");
  });

  it("builds cell spans for the current window instead of logical row count", () => {
    interface MergeRow {
      readonly id: string;
      readonly region: string;
    }
    const columns: readonly ColumnDef<MergeRow>[] = [
      { field: "id" },
      { field: "region", merge: { mode: "value" } }
    ];
    const columnModel = createColumnModel(columns);
    const rows: readonly CellSpanRow<MergeRow>[] = Array.from({ length: 64 }, (_, index) => ({
      rowIndex: 31_000_000 + index,
      rowKey: `R-${index}`,
      data: { id: `R-${index}`, region: index < 32 ? "A" : "B" }
    }));

    const model = createCellSpanModel({
      rows,
      columns: columnModel.visibleLeafColumns,
      options: { enabled: true }
    });

    expect(model.spans).toHaveLength(2);
    expect(model.byCell.size).toBe(64);
  });
});
