import { describe, expect, it } from "vitest";
import {
  calculateViewportRange,
  DuplicateRowKeyError,
  resolveLogicalRowWindow,
  ViewportRowModel
} from "../src/index.js";
import type { GetRowsRequest } from "../src/index.js";

interface ViewportOrderRow {
  readonly id: string;
  readonly amount: number;
  readonly status: "Open" | "Closed";
}

function createRows(start: number, end: number): readonly ViewportOrderRow[] {
  return Array.from({ length: end - start }, (_, index) => ({
    id: `ORD-VP-${start + index}`,
    amount: start + index,
    status: index % 2 === 0 ? "Open" : "Closed"
  }));
}

describe("viewport row model", () => {
  it("calculates visible ranges from scroll metrics", () => {
    expect(
      calculateViewportRange({
        scrollTop: 450,
        viewportHeight: 120,
        rowHeight: 30,
        rowCount: 1000,
        overscan: 2
      })
    ).toEqual({ firstRow: 13, lastRow: 20 });
  });

  it("clamps terminal viewport ranges for very large logical row counts", () => {
    const window = resolveLogicalRowWindow({
      rowCount: 100_000_000,
      rowHeight: 30,
      viewportHeight: 349,
      scrollTop: Number.MAX_SAFE_INTEGER
    });

    expect(window.maxScrollTop).toBe(2_999_999_651);
    expect(window.firstVisibleRow).toBe(99_999_988);
    expect(window.lastVisibleRow).toBe(99_999_999);
    expect(window.rowOffset).toBe(11);
    expect(
      calculateViewportRange({
        rowCount: 100_000_000,
        rowHeight: 30,
        viewportHeight: 349,
        scrollTop: Number.MAX_SAFE_INTEGER,
        overscan: 2
      })
    ).toEqual({ firstRow: 99_999_986, lastRow: 99_999_999 });
  });

  it("requests viewport ranges with server models", async () => {
    let capturedRequest: GetRowsRequest | undefined;
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 20,
      overscan: 1,
      initialRowCount: 1000,
      sortModel: [{ field: "amount", direction: "desc" }],
      filterModel: { conditions: [{ field: "status", kind: "set", operator: "in", value: ["Open"] }] },
      dataSource: {
        async getRows(request) {
          capturedRequest = request;
          return { rows: createRows(request.startRow, request.endRow), rowCount: 1000 };
        }
      }
    });

    const result = await model.loadViewport({ scrollTop: 100, viewportHeight: 60, nowMs: 0 });

    expect(capturedRequest?.rowModel).toBe("viewport");
    expect(capturedRequest?.viewport).toEqual({ firstRow: 4, lastRow: 8 });
    expect(capturedRequest?.startRow).toBe(4);
    expect(capturedRequest?.endRow).toBe(9);
    expect(capturedRequest?.sortModel[0]?.field).toBe("amount");
    expect(capturedRequest?.filterModel.conditions?.[0]?.field).toBe("status");
    expect(result.entries.map((entry) => entry.rowIndex)).toEqual([4, 5, 6, 7, 8]);
  });

  it("keeps cached viewport rows and avoids duplicate range requests", async () => {
    let requestCount = 0;
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      initialRowCount: 100,
      dataSource: {
        async getRows(request) {
          requestCount += 1;
          return { rows: createRows(request.startRow, request.endRow), rowCount: 100 };
        }
      }
    });

    const first = await model.loadViewport({ scrollTop: 20, viewportHeight: 30, nowMs: 0 });
    const second = await model.loadViewport({ scrollTop: 20, viewportHeight: 30, nowMs: 100 });

    expect(requestCount).toBe(1);
    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
  });

  it("rejects duplicate explicit row ids returned by a viewport range", async () => {
    const duplicateRows = [createRows(0, 1)[0], createRows(0, 1)[0]] as readonly ViewportOrderRow[];
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowKey: "id",
      rowHeight: 10,
      overscan: 0,
      initialRowCount: 2,
      dataSource: {
        async getRows() {
          return { rows: duplicateRows, rowCount: 2 };
        }
      }
    });

    await expect(model.loadViewport({ scrollTop: 0, viewportHeight: 20 })).rejects
      .toBeInstanceOf(DuplicateRowKeyError);
  });

  it("retries viewport data source failures and exposes final status", async () => {
    let requestCount = 0;
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      initialRowCount: 100,
      retryPolicy: { attempts: 2, delayMs: 0 },
      dataSource: {
        async getRows(request) {
          requestCount += 1;
          if (requestCount === 1) {
            throw Object.assign(new Error("Rate limited"), { statusCode: 429 });
          }
          return { rows: createRows(request.startRow, request.endRow), rowCount: 100 };
        }
      }
    });

    const result = await model.loadViewport({ scrollTop: 20, viewportHeight: 30, nowMs: 0 });

    expect(requestCount).toBe(2);
    expect(result.status).toMatchObject({
      status: "success",
      requestKind: "getRows",
      attempt: 2,
      maxAttempts: 2
    });
    expect(model.status).toMatchObject({ status: "success", attempt: 2 });
  });

  it("captures and restores viewport row count and visible range state", async () => {
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      initialRowCount: 100,
      dataSource: {
        async getRows(request) {
          return { rows: createRows(request.startRow, request.endRow), rowCount: 100 };
        }
      }
    });
    await model.loadViewport({ scrollTop: 40, viewportHeight: 30, nowMs: 0 });

    const restored = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      dataSource: {
        async getRows(request) {
          return { rows: createRows(request.startRow, request.endRow), rowCount: 100 };
        }
      }
    });
    restored.restoreState(model.getState());

    expect(model.getState()).toMatchObject({
      rowModel: "viewport",
      rowCount: 100,
      range: { firstRow: 4, lastRow: 6 }
    });
    expect(restored.getState()).toMatchObject({
      rowModel: "viewport",
      rowCount: 100,
      range: { firstRow: 4, lastRow: 6 }
    });
  });

  it("discards stale viewport responses", async () => {
    let resolveFirst: ((value: { rows: readonly ViewportOrderRow[]; rowCount: number }) => void) | undefined;
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      initialRowCount: 100,
      dataSource: {
        getRows(request) {
          if (request.startRow === 0) {
            return new Promise((resolve) => {
              resolveFirst = resolve;
            });
          }
          return Promise.resolve({ rows: createRows(request.startRow, request.endRow), rowCount: 100 });
        }
      }
    });

    const first = model.loadViewport({ scrollTop: 0, viewportHeight: 30, nowMs: 0 });
    const second = await model.loadViewport({ scrollTop: 50, viewportHeight: 30, nowMs: 10 });
    resolveFirst?.({ rows: createRows(0, 3), rowCount: 100 });
    const stale = await first;

    expect(second.entries[0]?.rowIndex).toBe(5);
    expect(stale.stale).toBe(true);
    expect(model.entries[0]?.rowIndex).toBe(5);
  });

  it("prefetches extra rows during high velocity viewport moves", async () => {
    const requests: GetRowsRequest[] = [];
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      prefetchRows: 5,
      highVelocityRowsPerSecond: 50,
      initialRowCount: 1000,
      dataSource: {
        async getRows(request) {
          requests.push(request);
          return { rows: createRows(request.startRow, request.endRow), rowCount: 1000 };
        }
      }
    });

    await model.loadViewport({ scrollTop: 0, viewportHeight: 30, nowMs: 0 });
    const result = await model.loadViewport({ scrollTop: 1000, viewportHeight: 30, nowMs: 50 });

    expect(result.prefetched).toBe(true);
    expect(requests[1]?.viewport).toEqual({ firstRow: 100, lastRow: 102 });
    expect(requests[1]?.startRow).toBe(100);
    expect(requests[1]?.endRow).toBe(108);
  });

  it("applies live updates to visible cached rows", async () => {
    const model = new ViewportRowModel<ViewportOrderRow>({
      rowHeight: 10,
      overscan: 0,
      rowKey: "id",
      initialRowCount: 100,
      dataSource: {
        async getRows(request) {
          return { rows: createRows(request.startRow, request.endRow), rowCount: 100 };
        }
      }
    });

    await model.loadViewport({ scrollTop: 0, viewportHeight: 30, nowMs: 0 });
    model.applyLiveUpdate({
      rowIndex: 1,
      row: { id: "ORD-VP-1", amount: 999, status: "Closed" }
    });

    const updated = model.entries[1];
    expect(updated?.kind).toBe("data");
    expect(updated?.kind === "data" ? updated.data.amount : undefined).toBe(999);
  });
});
