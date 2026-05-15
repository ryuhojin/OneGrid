import { createInfiniteBlockCache, evictInfiniteBlocks, getCachedBlock, listCachedBlocks, setCachedBlock } from "./infiniteCache.js";
import { createInfiniteBlockRequest } from "./infiniteRequest.js";
import { createDataSourceSuccessStatus, executeDataSourceRequest } from "../dataSource/index.js";
import type { InfiniteRequestController } from "./infiniteCancellation.js";
import type { InfiniteBlockCache } from "./infiniteCache.js";
import type { InfiniteRowModelStateSnapshot, RowModelStateSnapshot } from "./rowModelState.js";
import type { DataSourceStatusSnapshot } from "../types/data.js";
import type { InfiniteBlock, InfiniteLoadResult, InfiniteRowEntry, InfiniteRowModelOptions } from "./infiniteTypes.js";

const DEFAULT_BLOCK_SIZE = 100;
const DEFAULT_MAX_BLOCKS = 10;

export class InfiniteRowModel<TData = unknown> {
  readonly blockSize: number;
  private readonly options: InfiniteRowModelOptions<TData>;
  private readonly cache: InfiniteBlockCache<TData>;
  private readonly pending = new Map<number, Promise<InfiniteLoadResult<TData>>>();
  private readonly controllers = new Map<number, InfiniteRequestController>();
  private accessSequence = 0;
  private requestSequence = 0;
  private nextAppendBlockIndex = 0;
  private totalRowCount: number | undefined;
  private reachedEnd = false;
  private dataSourceStatus: DataSourceStatusSnapshot | undefined;

  constructor(options: InfiniteRowModelOptions<TData>) {
    this.options = options;
    this.blockSize = normalizePositiveInteger(options.blockSize, DEFAULT_BLOCK_SIZE);
    this.cache = createInfiniteBlockCache<TData>(
      normalizePositiveInteger(options.maxBlocksInCache, DEFAULT_MAX_BLOCKS)
    );
    this.totalRowCount = options.initialRowCount;
  }

  get rowCount(): number | undefined {
    return this.totalRowCount;
  }

  get hasMore(): boolean {
    return !this.reachedEnd;
  }

  get cachedBlocks(): readonly InfiniteBlock<TData>[] {
    return listCachedBlocks(this.cache);
  }

  get status(): DataSourceStatusSnapshot | undefined {
    return this.dataSourceStatus;
  }

  getState(): InfiniteRowModelStateSnapshot {
    return Object.freeze({
      rowModel: "infinite",
      blockSize: this.blockSize,
      nextAppendBlockIndex: this.nextAppendBlockIndex,
      hasMore: this.hasMore,
      ...(this.totalRowCount === undefined ? {} : { rowCount: this.totalRowCount })
    });
  }

  restoreState(state: RowModelStateSnapshot): void {
    if (state.rowModel !== "infinite") {
      return;
    }

    this.totalRowCount = state.rowCount;
    this.nextAppendBlockIndex = normalizeBlockIndex(state.nextAppendBlockIndex ?? 0);
    this.reachedEnd = state.hasMore === false;
  }

  getBlock(blockIndex: number): InfiniteBlock<TData> | undefined {
    const block = getCachedBlock(this.cache, blockIndex);
    return block ? this.touchBlock(block) : undefined;
  }

  async loadBlock(blockIndex: number): Promise<InfiniteLoadResult<TData>> {
    const normalizedIndex = normalizeBlockIndex(blockIndex);
    const cached = getCachedBlock(this.cache, normalizedIndex);
    if (cached?.status === "loaded") {
      return {
        block: this.touchBlock(cached),
        deduped: false,
        status: cached.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", cached.requestId ?? "cached")
      };
    }

    const pendingRequest = this.pending.get(normalizedIndex);
    if (pendingRequest) {
      const result = await pendingRequest;
      return { ...result, deduped: true };
    }

    const requestId = `infinite:${++this.requestSequence}:${normalizedIndex}`;
    const { request, controller } = createInfiniteBlockRequest(
      this.options,
      normalizedIndex,
      this.blockSize,
      requestId
    );
    const loadingBlock = this.createBlock(normalizedIndex, "loading", [], requestId);
    setCachedBlock(this.cache, loadingBlock);
    this.controllers.set(normalizedIndex, controller);

    const promise = executeDataSourceRequest(
      () => this.options.dataSource.getRows(request),
      {
        requestKind: "getRows",
        requestId,
        ...(this.options.retryPolicy === undefined ? {} : { retryPolicy: this.options.retryPolicy }),
        status: (status) => {
          this.dataSourceStatus = status;
        }
      }
    ).then(
      (result) => {
        if (controller.signal.aborted) {
          const status = this.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", requestId);
          return {
            block: this.setCancelledBlock(normalizedIndex, requestId, status),
            deduped: false,
            status
          };
        }

        const status = this.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", requestId);
        const block = this.createBlock(normalizedIndex, "loaded", result.rows, requestId, {
          ...(result.rowCount === undefined ? {} : { rowCount: result.rowCount }),
          ...(result.hasMore === undefined ? {} : { hasMore: result.hasMore }),
          dataSourceStatus: status
        });
        this.applyResultMeta(block);
        setCachedBlock(this.cache, block);
        evictInfiniteBlocks(this.cache, new Set([normalizedIndex]));
        return { block, deduped: false, status };
      },
      (error: unknown) => ({
        block: this.setErrorBlock(
          normalizedIndex,
          requestId,
          error,
          this.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", requestId)
        ),
        deduped: false,
        status: this.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", requestId)
      })
    ).finally(() => {
      this.pending.delete(normalizedIndex);
      this.controllers.delete(normalizedIndex);
    });

    this.pending.set(normalizedIndex, promise);
    return promise;
  }

  async loadNextAppendBlock(): Promise<InfiniteLoadResult<TData>> {
    const blockIndex = this.nextAppendBlockIndex;
    const result = await this.loadBlock(blockIndex);

    if (result.block.status === "loaded") {
      this.nextAppendBlockIndex = Math.max(this.nextAppendBlockIndex, blockIndex + 1);
    }

    return result;
  }

  async ensureRowsWindow(
    startRow: number,
    endRow: number
  ): Promise<readonly InfiniteRowEntry<TData>[]> {
    const start = Math.max(0, Math.trunc(startRow));
    const end = this.totalRowCount === undefined
      ? Math.max(start, Math.trunc(endRow))
      : Math.min(Math.max(start, Math.trunc(endRow)), this.totalRowCount);
    if (end <= start) {
      return Object.freeze([]);
    }

    const firstBlock = Math.floor(start / this.blockSize);
    const lastBlock = Math.floor((end - 1) / this.blockSize);
    await Promise.all(
      Array.from({ length: lastBlock - firstBlock + 1 }, (_, index) =>
        this.loadBlock(firstBlock + index)
      )
    );
    return this.getRowsWindow(start, end);
  }

  cancelBlock(blockIndex: number, reason?: unknown): boolean {
    const normalizedIndex = normalizeBlockIndex(blockIndex);
    const controller = this.controllers.get(normalizedIndex);
    if (!controller) {
      return false;
    }

    controller.abort(reason);
    this.setCancelledBlock(normalizedIndex, `cancelled:${normalizedIndex}`);
    return true;
  }

  cancelAll(reason?: unknown): void {
    [...this.controllers.keys()].forEach((blockIndex) => {
      this.cancelBlock(blockIndex, reason);
    });
  }

  getRowsWindow(startRow: number, endRow: number): readonly InfiniteRowEntry<TData>[] {
    const start = Math.max(0, Math.trunc(startRow));
    const cappedEnd = this.totalRowCount === undefined
      ? endRow
      : Math.min(Math.trunc(endRow), this.totalRowCount);
    const entries: InfiniteRowEntry<TData>[] = [];

    for (let rowIndex = start; rowIndex < cappedEnd; rowIndex += 1) {
      const blockIndex = Math.floor(rowIndex / this.blockSize);
      const block = this.getBlock(blockIndex);
      const row = block?.status === "loaded" ? block.rows[rowIndex - block.startRow] : undefined;
      entries.push(
        row === undefined
          ? Object.freeze({ kind: "skeleton", rowIndex })
          : Object.freeze({ kind: "data", rowIndex, key: rowIndex, data: row })
      );
    }

    return Object.freeze(entries);
  }

  getAppendRows(): readonly InfiniteRowEntry<TData>[] {
    const entries = listCachedBlocks(this.cache).flatMap((block) => this.getBlockEntries(block));
    return Object.freeze(entries);
  }

  private createBlock(
    blockIndex: number,
    status: InfiniteBlock<TData>["status"],
    rows: readonly TData[],
    requestId: string,
    meta: {
      readonly rowCount?: number;
      readonly hasMore?: boolean;
      readonly dataSourceStatus?: DataSourceStatusSnapshot;
    } = {}
  ): InfiniteBlock<TData> {
    const startRow = blockIndex * this.blockSize;
    return Object.freeze({
      index: blockIndex,
      startRow,
      endRow: startRow + this.blockSize,
      status,
      rows: Object.freeze([...rows]),
      ...(meta.rowCount === undefined ? {} : { rowCount: meta.rowCount }),
      ...(meta.hasMore === undefined ? {} : { hasMore: meta.hasMore }),
      ...(meta.dataSourceStatus === undefined ? {} : { dataSourceStatus: meta.dataSourceStatus }),
      requestId,
      lastAccess: ++this.accessSequence
    });
  }

  private touchBlock(block: InfiniteBlock<TData>): InfiniteBlock<TData> {
    const touched = Object.freeze({ ...block, lastAccess: ++this.accessSequence });
    setCachedBlock(this.cache, touched);
    return touched;
  }

  private setCancelledBlock(
    blockIndex: number,
    requestId: string,
    dataSourceStatus?: DataSourceStatusSnapshot
  ): InfiniteBlock<TData> {
    const block = this.createBlock(blockIndex, "cancelled", [], requestId, {
      ...(dataSourceStatus === undefined ? {} : { dataSourceStatus })
    });
    setCachedBlock(this.cache, block);
    return block;
  }

  private setErrorBlock(
    blockIndex: number,
    requestId: string,
    error: unknown,
    dataSourceStatus: DataSourceStatusSnapshot
  ): InfiniteBlock<TData> {
    const block = Object.freeze({
      ...this.createBlock(blockIndex, "error", [], requestId, { dataSourceStatus }),
      error
    });
    setCachedBlock(this.cache, block);
    return block;
  }

  private applyResultMeta(block: InfiniteBlock<TData>): void {
    if (block.rowCount !== undefined) {
      this.totalRowCount = block.rowCount;
    }

    if (block.hasMore === false || block.rows.length < this.blockSize) {
      this.reachedEnd = true;
      this.totalRowCount = block.startRow + block.rows.length;
    }
  }

  private getBlockEntries(block: InfiniteBlock<TData>): readonly InfiniteRowEntry<TData>[] {
    const blockEnd = this.totalRowCount === undefined
      ? block.endRow
      : Math.min(block.endRow, this.totalRowCount);

    if (block.status === "loaded") {
      return Object.freeze(
        block.rows.map<InfiniteRowEntry<TData>>((row, index) =>
          Object.freeze({
            kind: "data",
            rowIndex: block.startRow + index,
            key: block.startRow + index,
            data: row
          })
        )
      );
    }

    const skeletons: InfiniteRowEntry<TData>[] = [];
    for (let rowIndex = block.startRow; rowIndex < blockEnd; rowIndex += 1) {
      skeletons.push(Object.freeze({ kind: "skeleton", rowIndex }));
    }

    return Object.freeze(skeletons);
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.trunc(value);
}

function normalizeBlockIndex(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.trunc(value);
}
