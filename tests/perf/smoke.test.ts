import { describe, expect, it } from "vitest";
import {
  calculateFixedRowVirtualWindow,
  createCellSpanModel,
  createColumnModel,
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
