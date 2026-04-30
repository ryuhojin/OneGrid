import { describe, expect, it } from "vitest";
import { InfiniteRowModel } from "../src/index.js";
import type { GetRowsRequest, GetRowsResult } from "../src/index.js";

interface InfiniteOrderRow {
  readonly id: string;
  readonly amount: number;
}

function createRows(start: number, end: number): readonly InfiniteOrderRow[] {
  return Array.from({ length: end - start }, (_, index) => ({
    id: `ORD-${start + index}`,
    amount: start + index
  }));
}

describe("infinite row model", () => {
  it("loads blocks into cache and exposes append entries", async () => {
    const requests: GetRowsRequest[] = [];
    const model = new InfiniteRowModel<InfiniteOrderRow>({
      blockSize: 5,
      dataSource: {
        async getRows(request) {
          requests.push(request);
          return { rows: createRows(request.startRow, request.endRow), rowCount: 12 };
        }
      }
    });

    await model.loadNextAppendBlock();
    await model.loadNextAppendBlock();

    expect(requests.map((request) => [request.startRow, request.endRow])).toEqual([
      [0, 5],
      [5, 10]
    ]);
    expect(model.getAppendRows().filter((entry) => entry.kind === "data")).toHaveLength(10);
    expect(model.getAppendRows().filter((entry) => entry.kind === "skeleton")).toHaveLength(0);
  });

  it("dedupes concurrent requests for the same block", async () => {
    let requestCount = 0;
    const model = new InfiniteRowModel<InfiniteOrderRow>({
      blockSize: 4,
      dataSource: {
        async getRows(request) {
          requestCount += 1;
          return { rows: createRows(request.startRow, request.endRow), rowCount: 20 };
        }
      }
    });

    const [first, second] = await Promise.all([model.loadBlock(1), model.loadBlock(1)]);

    expect(requestCount).toBe(1);
    expect(first.block.rows).toHaveLength(4);
    expect(second.deduped).toBe(true);
  });

  it("cancels stale requests and keeps a cancelled block state", async () => {
    let capturedRequest: GetRowsRequest | undefined;
    let resolveRows: ((result: GetRowsResult<InfiniteOrderRow>) => void) | undefined;
    const model = new InfiniteRowModel<InfiniteOrderRow>({
      blockSize: 3,
      dataSource: {
        getRows(request) {
          capturedRequest = request;
          return new Promise((resolve) => {
            resolveRows = resolve;
          });
        }
      }
    });

    const pending = model.loadBlock(0);
    expect(model.cancelBlock(0, "viewport changed")).toBe(true);
    resolveRows?.({ rows: createRows(0, 3), rowCount: 30 });
    const result = await pending;

    expect(capturedRequest?.signal?.aborted).toBe(true);
    expect(result.block.status).toBe("cancelled");
    expect(model.getBlock(0)?.status).toBe("cancelled");
  });

  it("evicts least recently used loaded blocks", async () => {
    const model = new InfiniteRowModel<InfiniteOrderRow>({
      blockSize: 2,
      maxBlocksInCache: 2,
      dataSource: {
        async getRows(request) {
          return { rows: createRows(request.startRow, request.endRow), rowCount: 20 };
        }
      }
    });

    await model.loadBlock(0);
    await model.loadBlock(1);
    model.getBlock(0);
    await model.loadBlock(2);

    expect(model.cachedBlocks.map((block) => block.index)).toEqual([0, 2]);
  });

  it("continues append requests after older blocks are evicted", async () => {
    const requests: number[] = [];
    const model = new InfiniteRowModel<InfiniteOrderRow>({
      blockSize: 2,
      maxBlocksInCache: 2,
      dataSource: {
        async getRows(request) {
          requests.push(request.startRow);
          return { rows: createRows(request.startRow, request.endRow), rowCount: 20 };
        }
      }
    });

    await model.loadNextAppendBlock();
    await model.loadNextAppendBlock();
    await model.loadNextAppendBlock();

    expect(requests).toEqual([0, 2, 4]);
    expect(model.cachedBlocks.map((block) => block.index)).toEqual([1, 2]);
    expect(model.getAppendRows().filter((entry) => entry.kind === "data")).toHaveLength(4);
  });

  it("shows skeleton rows while a block is loading", () => {
    const model = new InfiniteRowModel<InfiniteOrderRow>({
      blockSize: 3,
      initialRowCount: 9,
      dataSource: {
        async getRows() {
          return { rows: [], rowCount: 9 };
        }
      }
    });

    const entries = model.getRowsWindow(0, 3);
    expect(entries).toEqual([
      { kind: "skeleton", rowIndex: 0 },
      { kind: "skeleton", rowIndex: 1 },
      { kind: "skeleton", rowIndex: 2 }
    ]);
  });
});
