import { clearServerRowCache, clearServerRowRouteCache, createServerRowCache, getServerCacheEntry, listServerCacheEntries, setServerCacheEntry } from "./serverCache.js";
import { createServerEntries } from "./serverEntries.js";
import { createServerRowsRequest } from "./serverRequest.js";
import { createRowNodes, resolveRowKey } from "./rowIdentity.js";
import { createDataSourceSuccessStatus, executeDataSourceRequest } from "../dataSource/index.js";
import { createServerRequestId, getServerGroupRequestPath, normalizeServerPage, normalizeServerPageSize, reindexServerVisibleEntries, toServerLoadResult, withServerGroupExpanded } from "./serverRowUtils.js";
import { createServerRouteCursorStore, createServerRouteKey, createServerRoutePath, getServerRouteCursor, resetServerRouteCursor, restoreServerRouteCursors, setServerRouteCursor, snapshotRootServerCursors, snapshotServerRouteCursors } from "./serverRouteCache.js";
import type { RowModelStateSnapshot, ServerRowModelStateSnapshot } from "./rowModelState.js";
import type { ServerRowCache } from "./serverCache.js";
import type { ServerRouteCursorStore } from "./serverRouteCache.js";
import type { DataSourceStatusSnapshot } from "../types/data.js";
import type { ServerLoadResult, ServerRowCacheEntry, ServerRowEntry, ServerRowModelOptions, ServerUpdateRowsResult } from "./serverTypes.js";
import type { RowUpdate } from "../types/data.js";
import type { RowKey } from "../types/shared.js";

export class ServerRowModel<TData = unknown> {
  private readonly options: ServerRowModelOptions<TData>;
  private readonly cache: ServerRowCache<TData>;
  private readonly pending = new Map<string, Promise<ServerLoadResult<TData>>>();
  private accessSequence = 0;
  private requestSequence = 0;
  private currentPage: number;
  private currentResult: ServerLoadResult<TData> | undefined;
  private currentBaseCacheKey: string | undefined;
  private readonly routeCursors: ServerRouteCursorStore;
  private dataSourceStatus: DataSourceStatusSnapshot | undefined;
  private readonly expandedGroupKeys = new Set<string>();
  private readonly collapsedGroupKeys = new Set<string>();

  constructor(options: ServerRowModelOptions<TData>) {
    this.options = options;
    this.cache = createServerRowCache<TData>();
    this.currentPage = normalizeServerPage(options.initialPage);
    this.routeCursors = createServerRouteCursorStore(options.initialCursor);
    for (const groupKey of options.groupModel?.expandedKeys ?? []) {
      this.expandedGroupKeys.add(groupKey);
    }
  }

  get page(): number {
    return this.currentPage;
  }

  get pageSize(): number {
    return normalizeServerPageSize(this.options.pageSize);
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

  get status(): DataSourceStatusSnapshot | undefined {
    return this.dataSourceStatus;
  }

  get expandedGroups(): readonly string[] {
    return Object.freeze([...this.expandedGroupKeys]);
  }

  getState(): ServerRowModelStateSnapshot {
    return Object.freeze({
      rowModel: "server",
      page: this.currentPage,
      pageSize: this.pageSize,
      rowCount: this.rowCount,
      hasMore: this.hasMore,
      expandedGroupKeys: Object.freeze([...this.expandedGroupKeys]),
      collapsedGroupKeys: Object.freeze([...this.collapsedGroupKeys]),
      cursors: snapshotRootServerCursors(this.routeCursors),
      routes: snapshotServerRouteCursors(this.routeCursors),
      ...(this.currentResult?.snapshotVersion === undefined && this.options.snapshotVersion === undefined
        ? {}
        : { snapshotVersion: this.currentResult?.snapshotVersion ?? this.options.snapshotVersion })
    });
  }

  restoreState(state: RowModelStateSnapshot): void {
    if (state.rowModel !== "server") {
      return;
    }

    this.currentPage = normalizeServerPage(state.page);
    this.expandedGroupKeys.clear();
    state.expandedGroupKeys?.forEach((key) => this.expandedGroupKeys.add(key));
    this.collapsedGroupKeys.clear();
    state.collapsedGroupKeys?.forEach((key) => this.collapsedGroupKeys.add(key));
    restoreServerRouteCursors(this.routeCursors, state.routes, state.cursors);
    clearServerRowCache(this.cache);
    this.currentResult = undefined;
    this.currentBaseCacheKey = undefined;
  }

  async loadPage(page = this.currentPage, refresh = false): Promise<ServerLoadResult<TData>> {
    this.currentPage = normalizeServerPage(page);
    if (refresh) {
      clearServerRowCache(this.cache);
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

  loadRoutePage(groupKeys: readonly string[], page = 0, refresh = false): Promise<ServerLoadResult<TData>> {
    return this.loadRequest(page, refresh, groupKeys);
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

  async applyTransaction(updates: readonly RowUpdate<TData>[]): Promise<ServerUpdateRowsResult<TData>> {
    if (!this.options.dataSource.updateRows) {
      throw new Error("ServerRowModel requires DataSource.updateRows for transactions.");
    }

    const requestId = `server:update:${++this.requestSequence}`;
    const result = await executeDataSourceRequest(
      () => this.options.dataSource.updateRows?.({ updates, requestId })
        ?? Promise.resolve({ rows: [] }),
      {
        requestKind: "updateRows",
        requestId,
        ...(this.options.retryPolicy === undefined ? {} : { retryPolicy: this.options.retryPolicy }),
        status: (status) => {
          this.dataSourceStatus = status;
        }
      }
    );
    this.patchCachedRows(result.rows);
    await this.refreshCurrentResultFromCache();
    return result;
  }

  private loadRequest(
    page: number,
    refresh: boolean,
    groupKeys?: readonly string[]
  ): Promise<ServerLoadResult<TData>> {
    const normalizedPage = normalizeServerPage(page);
    const routePath = createServerRoutePath(groupKeys, this.options.groupKeys);
    const routeKey = createServerRouteKey(routePath);
    const cursor = getServerRouteCursor(this.routeCursors, routePath, normalizedPage);
    if (refresh) {
      clearServerRowRouteCache(this.cache, routeKey);
      resetServerRouteCursor(this.routeCursors, routePath);
      setServerRouteCursor(this.routeCursors, routePath, normalizedPage, cursor);
    }
    const requestId = createServerRequestId(++this.requestSequence, normalizedPage, groupKeys);
    const requestBundle = createServerRowsRequest(this.options, {
      page: normalizedPage,
      pageSize: this.pageSize,
      requestId,
      ...(cursor === undefined ? {} : { cursor }),
      ...(groupKeys === undefined ? {} : { groupKeys })
    });

    const cached = getServerCacheEntry(this.cache, requestBundle.cacheKey);
    if (cached && !refresh) {
      return Promise.resolve(toServerLoadResult(cached, true));
    }

    const pending = this.pending.get(requestBundle.cacheKey);
    if (pending) {
      return pending;
    }

    const promise = executeDataSourceRequest(
      () => this.options.dataSource.getRows(requestBundle.request),
      {
        requestKind: "getRows",
        requestId,
        ...(this.options.retryPolicy === undefined ? {} : { retryPolicy: this.options.retryPolicy }),
        status: (status) => {
          this.dataSourceStatus = status;
        }
      }
    ).then((result) => {
      this.rememberNextCursor(routePath, normalizedPage, result.nextCursor);
      const entry = Object.freeze({
        cacheKey: requestBundle.cacheKey,
        routeKey,
        routePath,
        page: normalizedPage,
        request: requestBundle.request,
        dataSourceStatus: this.dataSourceStatus ?? createDataSourceSuccessStatus("getRows", requestId),
        result,
        entries: createServerEntries(
          result.rows,
          requestBundle.request.startRow,
          this.options.rowKey,
          result.groupMeta,
          this.options.duplicateRowKeyPolicy
        ),
        lastAccess: ++this.accessSequence
      });
      setServerCacheEntry(this.cache, entry);
      return toServerLoadResult(entry, false);
    }).finally(() => {
      this.pending.delete(requestBundle.cacheKey);
    });

    this.pending.set(requestBundle.cacheKey, promise);
    return promise;
  }

  private async expandLoadResult(result: ServerLoadResult<TData>, refresh: boolean): Promise<ServerLoadResult<TData>> {
    if (result.entries.every((entry) => entry.kind !== "group")) {
      return result;
    }

    const entries = await this.expandEntries(result.entries, refresh);
    const visibleEntries = reindexServerVisibleEntries(entries);
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
      output.push(withServerGroupExpanded(entry, expanded));
      if (clientExpanded) {
        const childEntries = await this.loadExpandedGroupEntries(entry.key, refresh);
        output.push(...await this.expandEntries(childEntries, refresh, entry.key));
      }
    }
    return Object.freeze(output);
  }

  private async loadExpandedGroupEntries(groupKey: string, refresh: boolean): Promise<readonly ServerRowEntry<TData>[]> {
    const result = await this.loadRequest(0, refresh, getServerGroupRequestPath(groupKey));
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

    const baseResult = toServerLoadResult(cacheEntry, true);
    this.currentResult = await this.expandLoadResult(baseResult, false);
  }

  private patchCachedRows(rows: readonly TData[]): void {
    if (rows.length === 0) {
      return;
    }

    const rowsByKey = new Map<RowKey, TData>(
      createRowNodes(rows, {
        ...(this.options.rowKey === undefined ? {} : { rowKey: this.options.rowKey }),
        ...(this.options.duplicateRowKeyPolicy === undefined
          ? {}
          : { duplicateRowKeyPolicy: this.options.duplicateRowKeyPolicy })
      }).map((node) => [node.key, node.data] as const)
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
          cacheEntry.result.groupMeta,
          this.options.duplicateRowKeyPolicy
        ),
        lastAccess: ++this.accessSequence
      });
      setServerCacheEntry(this.cache, nextEntry);
      if (this.currentResult?.cacheKey === nextEntry.cacheKey) {
        this.currentResult = toServerLoadResult(nextEntry, true);
      }
    }
  }

  private rememberNextCursor(
    routePath: readonly string[],
    page: number,
    cursor: string | undefined
  ): void {
    setServerRouteCursor(this.routeCursors, routePath, normalizeServerPage(page) + 1, cursor);
  }
}
