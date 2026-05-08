import { describe, expect, it } from "vitest";
import { calculateViewportRange, ViewportRowModel } from "../src/index.js";
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
