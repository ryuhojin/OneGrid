import {
  clearServerRowCache,
  createServerRowCache,
  getServerCacheEntry,
  listServerCacheEntries,
  setServerCacheEntry
} from "./serverCache.js";
import { createServerRowsRequest } from "./serverRequest.js";
import { resolveRowKey } from "./rowIdentity.js";
import type { ServerRowCache } from "./serverCache.js";
import type {
  ServerLoadResult,
  ServerGroupFooterRowEntry,
  ServerGroupRowEntry,
  ServerRowCacheEntry,
  ServerRowEntry,
  ServerRowModelOptions,
  ServerUpdateRowsResult
} from "./serverTypes.js";
import type { RowUpdate } from "../types/data.js";
import type { GroupMeta, RowKey } from "../types/shared.js";

const DEFAULT_PAGE_SIZE = 50;

export class ServerRowModel<TData = unknown> {
  private readonly options: ServerRowModelOptions<TData>;
  private readonly cache: ServerRowCache<TData>;
  private readonly pending = new Map<string, Promise<ServerLoadResult<TData>>>();
  private accessSequence = 0;
  private requestSequence = 0;
  private currentPage: number;
  private currentResult: ServerLoadResult<TData> | undefined;
  private readonly cursors = new Map<number, string | undefined>();

  constructor(options: ServerRowModelOptions<TData>) {
    this.options = options;
    this.cache = createServerRowCache<TData>();
    this.currentPage = normalizePage(options.initialPage);
    this.cursors.set(0, options.initialCursor);
  }

  get page(): number {
    return this.currentPage;
  }

  get pageSize(): number {
    return normalizePageSize(this.options.pageSize);
  }

  get rowCount(): number {
    return this.currentResult?.rowCount ?? 0;
  }

  get entries(): readonly ServerRowEntry<TData>[] {
    return this.currentResult?.entries ?? [];
  }

  get hasMore(): boolean {
    return this.currentResult?.hasMore ?? false;
  }

  get cachedEntries(): readonly ServerRowCacheEntry<TData>[] {
    return listServerCacheEntries(this.cache);
  }

  loadPage(page = this.currentPage, refresh = false): Promise<ServerLoadResult<TData>> {
    this.currentPage = normalizePage(page);
    if (refresh) {
      clearServerRowCache(this.cache);
      this.resetCursors();
    }

    const requestId = `server:${++this.requestSequence}:${this.currentPage}`;
    const cursor = this.getCursorForPage(this.currentPage);
    const requestBundle = createServerRowsRequest(this.options, {
      page: this.currentPage,
      pageSize: this.pageSize,
      requestId,
      ...(cursor === undefined ? {} : { cursor })
    });

    const cached = getServerCacheEntry(this.cache, requestBundle.cacheKey);
    if (cached && !refresh) {
      const result = this.toLoadResult(cached, true);
      this.currentResult = result;
      return Promise.resolve(result);
    }

    const pending = this.pending.get(requestBundle.cacheKey);
    if (pending) {
      return pending.then((result) => {
        this.currentResult = result;
        return result;
      });
    }

    const promise = this.options.dataSource.getRows(requestBundle.request).then((result) => {
      this.rememberNextCursor(result.nextCursor);
      const entry = Object.freeze({
        cacheKey: requestBundle.cacheKey,
        request: requestBundle.request,
        result,
        entries: this.createEntries(result.rows, requestBundle.request.startRow, result.groupMeta),
        lastAccess: ++this.accessSequence
      });
      setServerCacheEntry(this.cache, entry);
      const loadResult = this.toLoadResult(entry, false);
      this.currentResult = loadResult;
      return loadResult;
    }).finally(() => {
      this.pending.delete(requestBundle.cacheKey);
    });

    this.pending.set(requestBundle.cacheKey, promise);
    return promise;
  }

  refresh(): Promise<ServerLoadResult<TData>> {
    return this.loadPage(this.currentPage, true);
  }

  async applyTransaction(
    updates: readonly RowUpdate<TData>[]
  ): Promise<ServerUpdateRowsResult<TData>> {
    if (!this.options.dataSource.updateRows) {
      throw new Error("ServerRowModel requires DataSource.updateRows for transactions.");
    }

    const result = await this.options.dataSource.updateRows({
      updates,
      requestId: `server:update:${++this.requestSequence}`
    });
    this.patchCachedRows(result.rows);
    return result;
  }

  private createEntries(
    rows: readonly TData[],
    startRow: number,
    groupMeta: readonly GroupMeta[] | undefined = undefined
  ): readonly ServerRowEntry<TData>[] {
    if (groupMeta && groupMeta.length > 0) {
      return this.createGroupedEntries(rows, startRow, groupMeta);
    }

    return Object.freeze(
      rows.map<ServerRowEntry<TData>>((row, index) =>
        Object.freeze({
          kind: "data",
          rowIndex: startRow + index,
          key: resolveRowKey(row, startRow + index, this.options.rowKey),
          data: row
        })
      )
    );
  }

  private createGroupedEntries(
    rows: readonly TData[],
    startRow: number,
    groupMeta: readonly GroupMeta[]
  ): readonly ServerRowEntry<TData>[] {
    const headers = groupMeta.filter((meta) => meta.footer !== true).map(toServerGroupEntry);
    const footers = groupMeta.filter((meta) => meta.footer === true).map(toServerGroupFooterEntry);
    const dataEntries = this.createEntries(rows, startRow + headers.length);
    return Object.freeze([...headers, ...dataEntries, ...footers]);
  }

  private patchCachedRows(rows: readonly TData[]): void {
    if (rows.length === 0) {
      return;
    }

    const rowsByKey = new Map<RowKey, TData>(
      rows.map((row, index) => [resolveRowKey(row, index, this.options.rowKey), row] as const)
    );

    for (const cacheEntry of listServerCacheEntries(this.cache)) {
      const nextRows = cacheEntry.result.rows.map((row, index) => {
        const key = resolveRowKey(row, cacheEntry.request.startRow + index, this.options.rowKey);
        return rowsByKey.get(key) ?? row;
      });
      const nextEntry = Object.freeze({
        ...cacheEntry,
        result: Object.freeze({ ...cacheEntry.result, rows: Object.freeze(nextRows) }),
        entries: this.createEntries(nextRows, cacheEntry.request.startRow, cacheEntry.result.groupMeta),
        lastAccess: ++this.accessSequence
      });
      setServerCacheEntry(this.cache, nextEntry);
      if (this.currentResult?.cacheKey === nextEntry.cacheKey) {
        this.currentResult = this.toLoadResult(nextEntry, true);
      }
    }
  }

  private toLoadResult(
    entry: ServerRowCacheEntry<TData>,
    cached: boolean
  ): ServerLoadResult<TData> {
    return Object.freeze({
      cacheKey: entry.cacheKey,
      request: entry.request,
      rows: entry.result.rows,
      entries: entry.entries,
      rowCount: entry.result.rowCount ?? entry.entries.length,
      cached,
      ...(entry.result.aggregate === undefined ? {} : { aggregate: entry.result.aggregate }),
      ...(entry.result.groupMeta === undefined ? {} : { groupMeta: entry.result.groupMeta }),
      ...(entry.result.mergeMeta === undefined ? {} : { mergeMeta: entry.result.mergeMeta }),
      ...(entry.result.nextCursor === undefined ? {} : { nextCursor: entry.result.nextCursor }),
      ...(entry.result.hasMore === undefined ? {} : { hasMore: entry.result.hasMore }),
      ...(entry.result.snapshotVersion === undefined
        ? {}
        : { snapshotVersion: entry.result.snapshotVersion })
    });
  }

  private getCursorForPage(page: number): string | undefined {
    return this.cursors.get(page);
  }

  private rememberNextCursor(cursor: string | undefined): void {
    if (cursor !== undefined) {
      this.cursors.set(this.currentPage + 1, cursor);
    }
  }

  private resetCursors(): void {
    this.cursors.clear();
    this.cursors.set(0, this.options.initialCursor);
  }
}

function normalizePage(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value < 0 ? 0 : Math.trunc(value);
}

function normalizePageSize(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value <= 0
    ? DEFAULT_PAGE_SIZE
    : Math.trunc(value);
}

function toServerGroupEntry(meta: GroupMeta): ServerGroupRowEntry {
  return Object.freeze({
    kind: "group",
    key: meta.key,
    field: meta.field ?? "group",
    value: meta.value ?? meta.key,
    level: meta.level,
    childCount: meta.childCount ?? 0,
    expanded: meta.expanded === true,
    aggregateValues: meta.aggregateValues ?? {}
  });
}

function toServerGroupFooterEntry(meta: GroupMeta): ServerGroupFooterRowEntry {
  return Object.freeze({
    kind: "groupFooter",
    key: `${meta.key}:footer`,
    groupKey: meta.key,
    field: meta.field ?? "group",
    value: meta.value ?? meta.key,
    level: meta.level,
    childCount: meta.childCount ?? 0,
    aggregateValues: meta.aggregateValues ?? {}
  });
}
