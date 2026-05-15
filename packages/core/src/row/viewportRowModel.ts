import {
  createViewportRowCache,
  getViewportEntries,
  listViewportCacheKeys,
  setViewportEntries,
  updateViewportCacheRow
} from "./viewportCache.js";
import { calculatePrefetchRange, calculateViewportRange } from "./viewportRange.js";
import { createViewportRowsRequest } from "./viewportRequest.js";
import { createRowNodes, resolveRowKey } from "./rowIdentity.js";
import { createDataSourceSuccessStatus, executeDataSourceRequest } from "../dataSource/index.js";
import type { RowModelStateSnapshot, ViewportRowModelStateSnapshot } from "./rowModelState.js";
import type { ViewportRowCache } from "./viewportCache.js";
import type { DataSourceStatusSnapshot } from "../types/data.js";
import type {
  ViewportLiveUpdate,
  ViewportLoadInput,
  ViewportLoadResult,
  ViewportRowEntry,
  ViewportRowModelOptions
} from "./viewportTypes.js";
import type { GetRowsRequest } from "../types/data.js";
import type { RowKey, ViewportRange } from "../types/shared.js";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_OVERSCAN = 2;
const DEFAULT_PREFETCH_ROWS = 20;
const DEFAULT_HIGH_VELOCITY = 120;
const DEFAULT_MAX_RANGES = 4;

export class ViewportRowModel<TData = unknown> {
  private readonly options: ViewportRowModelOptions<TData>;
  private cache: ViewportRowCache<TData>;
  private accessSequence = 0;
  private requestSequence = 0;
  private activeRequestSequence = 0;
  private totalRowCount: number | undefined;
  private currentRange: ViewportRange | undefined;
  private currentEntries: readonly ViewportRowEntry<TData>[] = [];
  private lastLoad: { readonly firstRow: number; readonly nowMs: number } | undefined;
  private dataSourceStatus: DataSourceStatusSnapshot | undefined;

  constructor(options: ViewportRowModelOptions<TData>) {
    this.options = options;
    this.totalRowCount = options.initialRowCount;
    this.cache = createViewportRowCache<TData>(
      normalizePositiveInteger(options.maxCachedRanges, DEFAULT_MAX_RANGES)
    );
  }

  get rowCount(): number {
    return this.totalRowCount ?? this.currentEntries.length;
  }

  get entries(): readonly ViewportRowEntry<TData>[] {
    return this.currentEntries;
  }

  get range(): ViewportRange | undefined {
    return this.currentRange;
  }

  get cachedKeys(): readonly RowKey[] {
    return listViewportCacheKeys(this.cache);
  }

  get status(): DataSourceStatusSnapshot | undefined {
    return this.dataSourceStatus;
  }

  getState(): ViewportRowModelStateSnapshot {
    return Object.freeze({
      rowModel: "viewport",
      rowCount: this.rowCount,
      ...(this.currentRange === undefined
        ? {}
        : { range: Object.freeze({ ...this.currentRange }) })
    });
  }

  restoreState(state: RowModelStateSnapshot): void {
    if (state.rowModel !== "viewport") {
      return;
    }

    this.totalRowCount = state.rowCount;
    this.currentRange = state.range;
    this.currentEntries = Object.freeze([]);
    this.cache = createViewportRowCache<TData>(
      normalizePositiveInteger(this.options.maxCachedRanges, DEFAULT_MAX_RANGES)
    );
    this.lastLoad = undefined;
  }

  loadViewport(input: ViewportLoadInput): Promise<ViewportLoadResult<TData>> {
    const visibleRange = calculateViewportRange({
      scrollTop: input.scrollTop,
      viewportHeight: input.viewportHeight,
      rowHeight: this.rowHeight,
      overscan: this.overscan,
      ...(this.totalRowCount === undefined ? {} : { rowCount: this.totalRowCount }),
      ...(input.firstColumn === undefined ? {} : { firstColumn: input.firstColumn }),
      ...(input.lastColumn === undefined ? {} : { lastColumn: input.lastColumn })
    });
    const nowMs = normalizeTimestamp(input.nowMs);
    const velocity = this.calculateVelocity(visibleRange, nowMs);
    const requestedRange = calculatePrefetchRange({
      visibleRange,
      direction: velocity.direction,
      velocityRowsPerSecond: velocity.rowsPerSecond,
      thresholdRowsPerSecond: this.highVelocityRowsPerSecond,
      prefetchRows: this.prefetchRows,
      ...(this.totalRowCount === undefined ? {} : { rowCount: this.totalRowCount })
    });
    this.lastLoad = { firstRow: visibleRange.firstRow, nowMs };

    return this.loadRange(visibleRange, requestedRange, requestedRange !== visibleRange);
  }

  applyLiveUpdate(update: ViewportLiveUpdate<TData>): readonly ViewportRowEntry<TData>[] {
    const entry = Object.freeze({
      kind: "data" as const,
      rowIndex: update.rowIndex,
      key: update.rowKey ?? resolveRowKey(update.row, update.rowIndex, this.options.rowKey),
      data: update.row
    });
    this.cache = updateViewportCacheRow(this.cache, update.rowIndex, entry);
    this.currentEntries = this.currentEntries.map((item) =>
      item.rowIndex === update.rowIndex ? entry : item
    );
    return this.currentEntries;
  }

  private async loadRange(
    visibleRange: ViewportRange,
    requestedRange: ViewportRange,
    prefetched: boolean
  ): Promise<ViewportLoadResult<TData>> {
    const cachedEntries = getViewportEntries(this.cache, visibleRange);
    const request = this.createRequest(visibleRange, requestedRange);

    if (cachedEntries && getViewportEntries(this.cache, requestedRange)) {
      this.currentRange = visibleRange;
      this.currentEntries = cachedEntries;
      return this.createResult(request, visibleRange, requestedRange, cachedEntries, true, false, prefetched);
    }

    const requestSequence = ++this.activeRequestSequence;
    const result = await executeDataSourceRequest(
      () => this.options.dataSource.getRows(request),
      {
        requestKind: "getRows",
        requestId: request.requestId,
        ...(this.options.retryPolicy === undefined ? {} : { retryPolicy: this.options.retryPolicy }),
        status: (status) => {
          this.dataSourceStatus = status;
        }
      }
    );
    if (requestSequence !== this.activeRequestSequence) {
      return this.createResult(
        request,
        visibleRange,
        requestedRange,
        this.currentEntries,
        false,
        true,
        prefetched
      );
    }

    const entries = this.createEntries(result.rows, request.startRow);
    if (result.rowCount !== undefined) {
      this.totalRowCount = result.rowCount;
    }
    this.cache = setViewportEntries(this.cache, requestedRange, entries, ++this.accessSequence);

    const visibleEntries = getViewportEntries(this.cache, visibleRange) ?? [];
    this.currentRange = visibleRange;
    this.currentEntries = visibleEntries;
    return this.createResult(request, visibleRange, requestedRange, visibleEntries, false, false, prefetched);
  }

  private createRequest(
    visibleRange: ViewportRange,
    requestedRange: ViewportRange
  ): GetRowsRequest {
    return createViewportRowsRequest(
      this.options,
      visibleRange,
      requestedRange,
      `viewport:${++this.requestSequence}:${visibleRange.firstRow}-${visibleRange.lastRow}`
    );
  }

  private createEntries(
    rows: readonly TData[],
    startRow: number
  ): readonly ViewportRowEntry<TData>[] {
    const rowIdentity = {
      ...(this.options.rowKey === undefined ? {} : { rowKey: this.options.rowKey }),
      startIndex: startRow,
      ...(this.options.duplicateRowKeyPolicy === undefined
        ? {}
        : { duplicateRowKeyPolicy: this.options.duplicateRowKeyPolicy })
    };
    return Object.freeze(
      createRowNodes(rows, rowIdentity).map<ViewportRowEntry<TData>>((node) =>
        Object.freeze({
          kind: "data",
          rowIndex: node.sourceIndex,
          key: node.key,
          data: node.data
        })
      )
    );
  }

  private createResult(
    request: GetRowsRequest,
    visibleRange: ViewportRange,
    requestedRange: ViewportRange,
    entries: readonly ViewportRowEntry<TData>[],
    cached: boolean,
    stale: boolean,
    prefetched: boolean
  ): ViewportLoadResult<TData> {
    return Object.freeze({
      request,
      visibleRange,
      requestedRange,
      entries,
      rowCount: this.rowCount,
      cached,
      stale,
      prefetched,
      status: this.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", request.requestId)
    });
  }

  private calculateVelocity(
    visibleRange: ViewportRange,
    nowMs: number
  ): { readonly direction: "up" | "down" | "none"; readonly rowsPerSecond: number } {
    if (!this.lastLoad) {
      return { direction: "none", rowsPerSecond: 0 };
    }

    const deltaRows = visibleRange.firstRow - this.lastLoad.firstRow;
    const deltaMs = Math.max(1, nowMs - this.lastLoad.nowMs);
    const rowsPerSecond = Math.abs(deltaRows) / (deltaMs / 1000);
    return {
      direction: deltaRows === 0 ? "none" : deltaRows > 0 ? "down" : "up",
      rowsPerSecond
    };
  }

  private get rowHeight(): number {
    return normalizePositiveInteger(this.options.rowHeight, DEFAULT_ROW_HEIGHT);
  }

  private get overscan(): number {
    return normalizeNonNegativeInteger(this.options.overscan, DEFAULT_OVERSCAN);
  }

  private get prefetchRows(): number {
    return normalizeNonNegativeInteger(this.options.prefetchRows, DEFAULT_PREFETCH_ROWS);
  }

  private get highVelocityRowsPerSecond(): number {
    return normalizePositiveInteger(
      this.options.highVelocityRowsPerSecond,
      DEFAULT_HIGH_VELOCITY
    );
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return Math.trunc(value);
}

function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return Math.trunc(value);
}

function normalizeTimestamp(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) ? Date.now() : value;
}
