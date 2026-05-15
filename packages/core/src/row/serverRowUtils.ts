import type {
  ServerGroupRowEntry,
  ServerLoadResult,
  ServerRowCacheEntry,
  ServerRowEntry
} from "./serverTypes.js";

export const DEFAULT_SERVER_PAGE_SIZE = 50;

export function normalizeServerPage(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value < 0 ? 0 : Math.trunc(value);
}

export function normalizeServerPageSize(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value <= 0
    ? DEFAULT_SERVER_PAGE_SIZE
    : Math.trunc(value);
}

export function createServerRequestId(
  sequence: number,
  page: number,
  groupKeys: readonly string[] | undefined
): string {
  return groupKeys === undefined || groupKeys.length === 0
    ? `server:${sequence}:${page}`
    : `server:${sequence}:group:${groupKeys.join("/")}:${page}`;
}

export function getServerGroupRequestPath(groupKey: string): readonly string[] {
  const normalized = groupKey.startsWith("group:") ? groupKey.slice("group:".length) : groupKey;
  return Object.freeze(normalized.split("/").filter(Boolean));
}

export function withServerGroupExpanded(
  entry: ServerGroupRowEntry,
  expanded: boolean
): ServerGroupRowEntry {
  return entry.expanded === expanded ? entry : Object.freeze({ ...entry, expanded });
}

export function reindexServerVisibleEntries<TData>(
  entries: readonly ServerRowEntry<TData>[]
): readonly ServerRowEntry<TData>[] {
  return Object.freeze(entries.map((entry, rowIndex) =>
    entry.kind === "data" ? Object.freeze({ ...entry, rowIndex }) : entry
  ));
}

export function toServerLoadResult<TData>(
  entry: ServerRowCacheEntry<TData>,
  cached: boolean
): ServerLoadResult<TData> {
  return Object.freeze({
    cacheKey: entry.cacheKey,
    request: entry.request,
    status: entry.dataSourceStatus,
    rows: entry.result.rows,
    ...(entry.result.columns === undefined ? {} : { columns: entry.result.columns }),
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
