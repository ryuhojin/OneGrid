import {
  clearServerRowCache,
  createServerRowCache,
  getServerCacheEntry,
  listServerCacheEntries,
  setServerCacheEntry
} from "./serverCache.js";
import { createServerEntries } from "./serverEntries.js";
import { createServerRowsRequest } from "./serverRequest.js";
import { resolveRowKey } from "./rowIdentity.js";
import type { ServerRowCache } from "./serverCache.js";
import type {
  ServerLoadResult,
  ServerGroupRowEntry,
  ServerRowCacheEntry,
  ServerRowEntry,
  ServerRowModelOptions,
  ServerUpdateRowsResult
} from "./serverTypes.js";
import type { RowUpdate } from "../types/data.js";
import type { RowKey } from "../types/shared.js";

const DEFAULT_PAGE_SIZE = 50;

export class ServerRowModel<TData = unknown> {
  private readonly options: ServerRowModelOptions<TData>;
  private readonly cache: ServerRowCache<TData>;
  private readonly pending = new Map<string, Promise<ServerLoadResult<TData>>>();
  private accessSequence = 0;
  private requestSequence = 0;
  private currentPage: number;
  private currentResult: ServerLoadResult<TData> | undefined;
  private currentBaseCacheKey: string | undefined;
  private readonly cursors = new Map<number, string | undefined>();
  private readonly expandedGroupKeys = new Set<string>();
  private readonly collapsedGroupKeys = new Set<string>();

  constructor(options: ServerRowModelOptions<TData>) {
    this.options = options;
    this.cache = createServerRowCache<TData>();
    this.currentPage = normalizePage(options.initialPage);
    this.cursors.set(0, options.initialCursor);
    for (const groupKey of options.groupModel?.expandedKeys ?? []) {
      this.expandedGroupKeys.add(groupKey);
    }
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

  get expandedGroups(): readonly string[] {
    return Object.freeze([...this.expandedGroupKeys]);
  }

  async loadPage(page = this.currentPage, refresh = false): Promise<ServerLoadResult<TData>> {
    this.currentPage = normalizePage(page);
    if (refresh) {
      clearServerRowCache(this.cache);
      this.resetCursors();
    }

    const baseResult = await this.loadRequest(this.currentPage, refresh);
    const result = await this.expandLoadResult(baseResult, refresh);
    this.currentBaseCacheKey = baseResult.cacheKey;
    this.currentResult = result;
    return result;
  }

  refresh(): Promise<ServerLoadResult<TData>> {
    return this.loadPage(this.currentPage, true);
  }

  expandGroup(groupKey: string): Promise<ServerLoadResult<TData>> {
    this.collapsedGroupKeys.delete(groupKey);
    this.expandedGroupKeys.add(groupKey);
    return this.loadPage(this.currentPage);
  }

  collapseGroup(groupKey: string): Promise<ServerLoadResult<TData>> {
    this.expandedGroupKeys.delete(groupKey);
    this.collapsedGroupKeys.add(groupKey);
    return this.loadPage(this.currentPage);
  }

  toggleGroup(groupKey: string): Promise<ServerLoadResult<TData>> {
    return this.isGroupExpanded(groupKey) ? this.collapseGroup(groupKey) : this.expandGroup(groupKey);
  }

  isGroupExpanded(groupKey: string): boolean {
    return this.expandedGroupKeys.has(groupKey) && !this.collapsedGroupKeys.has(groupKey);
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
    await this.refreshCurrentResultFromCache();
    return result;
  }

  private loadRequest(
    page: number,
    refresh: boolean,
    groupKeys?: readonly string[]
  ): Promise<ServerLoadResult<TData>> {
    const normalizedPage = normalizePage(page);
    const requestId = createRequestId(++this.requestSequence, normalizedPage, groupKeys);
    const cursor = groupKeys === undefined ? this.getCursorForPage(normalizedPage) : undefined;
    const requestBundle = createServerRowsRequest(this.options, {
      page: normalizedPage,
      pageSize: this.pageSize,
      requestId,
      ...(cursor === undefined ? {} : { cursor }),
      ...(groupKeys === undefined ? {} : { groupKeys })
    });

    const cached = getServerCacheEntry(this.cache, requestBundle.cacheKey);
    if (cached && !refresh) {
      return Promise.resolve(this.toLoadResult(cached, true));
    }

    const pending = this.pending.get(requestBundle.cacheKey);
    if (pending) {
      return pending;
    }

    const promise = this.options.dataSource.getRows(requestBundle.request).then((result) => {
      if (groupKeys === undefined) {
        this.rememberNextCursor(result.nextCursor);
      }
      const entry = Object.freeze({
        cacheKey: requestBundle.cacheKey,
        request: requestBundle.request,
        result,
        entries: createServerEntries(
          result.rows,
          requestBundle.request.startRow,
          this.options.rowKey,
          result.groupMeta
        ),
        lastAccess: ++this.accessSequence
      });
      setServerCacheEntry(this.cache, entry);
      return this.toLoadResult(entry, false);
    }).finally(() => {
      this.pending.delete(requestBundle.cacheKey);
    });

    this.pending.set(requestBundle.cacheKey, promise);
    return promise;
  }

  private async expandLoadResult(
    result: ServerLoadResult<TData>,
    refresh: boolean
  ): Promise<ServerLoadResult<TData>> {
    if (result.entries.every((entry) => entry.kind !== "group")) {
      return result;
    }

    const entries = await this.expandEntries(result.entries, refresh);
    const visibleEntries = reindexVisibleEntries(entries);
    return Object.freeze({
      ...result,
      entries: visibleEntries,
      rowCount: visibleEntries.length
    });
  }

  private async expandEntries(
    entries: readonly ServerRowEntry<TData>[],
    refresh: boolean,
    parentGroupKey?: string
  ): Promise<readonly ServerRowEntry<TData>[]> {
    const output: ServerRowEntry<TData>[] = [];
    for (const entry of entries) {
      if (entry.kind !== "group") {
        output.push(entry);
        continue;
      }
      if (entry.key === parentGroupKey) {
        continue;
      }

      const clientExpanded = this.expandedGroupKeys.has(entry.key) && !this.collapsedGroupKeys.has(entry.key);
      const expanded = !this.collapsedGroupKeys.has(entry.key) && (clientExpanded || entry.expanded);
      output.push(withGroupExpanded(entry, expanded));
      if (clientExpanded) {
        const childEntries = await this.loadExpandedGroupEntries(entry.key, refresh);
        output.push(...await this.expandEntries(childEntries, refresh, entry.key));
      }
    }
    return Object.freeze(output);
  }

  private async loadExpandedGroupEntries(
    groupKey: string,
    refresh: boolean
  ): Promise<readonly ServerRowEntry<TData>[]> {
    const result = await this.loadRequest(0, refresh, getGroupRequestPath(groupKey));
    return result.entries;
  }

  private async refreshCurrentResultFromCache(): Promise<void> {
    if (this.currentBaseCacheKey === undefined) {
      return;
    }

    const cacheEntry = getServerCacheEntry(this.cache, this.currentBaseCacheKey);
    if (!cacheEntry) {
      return;
    }

    const baseResult = this.toLoadResult(cacheEntry, true);
    this.currentResult = await this.expandLoadResult(baseResult, false);
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
        entries: createServerEntries(
          nextRows,
          cacheEntry.request.startRow,
          this.options.rowKey,
          cacheEntry.result.groupMeta
        ),
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

function createRequestId(sequence: number, page: number, groupKeys: readonly string[] | undefined): string {
  return groupKeys === undefined || groupKeys.length === 0
    ? `server:${sequence}:${page}`
    : `server:${sequence}:group:${groupKeys.join("/")}:${page}`;
}

function getGroupRequestPath(groupKey: string): readonly string[] {
  const normalized = groupKey.startsWith("group:") ? groupKey.slice("group:".length) : groupKey;
  return Object.freeze(normalized.split("/").filter(Boolean));
}

function withGroupExpanded(entry: ServerGroupRowEntry, expanded: boolean): ServerGroupRowEntry {
  return entry.expanded === expanded ? entry : Object.freeze({ ...entry, expanded });
}

function reindexVisibleEntries<TData>(
  entries: readonly ServerRowEntry<TData>[]
): readonly ServerRowEntry<TData>[] {
  return Object.freeze(entries.map((entry, rowIndex) =>
    entry.kind === "data" ? Object.freeze({ ...entry, rowIndex }) : entry
  ));
}
