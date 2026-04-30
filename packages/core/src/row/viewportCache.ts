import type { ViewportCacheRange, ViewportRowEntry } from "./viewportTypes.js";
import type { RowKey, ViewportRange } from "../types/shared.js";

export interface ViewportRowCache<TData = unknown> {
  readonly rows: ReadonlyMap<number, ViewportRowEntry<TData>>;
  readonly ranges: readonly ViewportCacheRange[];
  readonly maxRanges: number;
}

export function createViewportRowCache<TData>(maxRanges: number): ViewportRowCache<TData> {
  return {
    rows: new Map<number, ViewportRowEntry<TData>>(),
    ranges: Object.freeze([]),
    maxRanges: Math.max(1, Math.trunc(maxRanges))
  };
}

export function getViewportEntries<TData>(
  cache: ViewportRowCache<TData>,
  range: ViewportRange
): readonly ViewportRowEntry<TData>[] | undefined {
  const entries: ViewportRowEntry<TData>[] = [];
  for (let rowIndex = range.firstRow; rowIndex <= range.lastRow; rowIndex += 1) {
    const entry = cache.rows.get(rowIndex);
    if (!entry) {
      return undefined;
    }
    entries.push(entry);
  }

  return Object.freeze(entries);
}

export function setViewportEntries<TData>(
  cache: ViewportRowCache<TData>,
  range: ViewportRange,
  entries: readonly ViewportRowEntry<TData>[],
  lastAccess: number
): ViewportRowCache<TData> {
  const rows = new Map(cache.rows);
  entries.forEach((entry) => rows.set(entry.rowIndex, entry));

  const ranges = [
    ...cache.ranges.filter((item) => !sameRange(item, range)),
    { firstRow: range.firstRow, lastRow: range.lastRow, lastAccess }
  ].sort((left, right) => right.lastAccess - left.lastAccess);
  const keptRanges = ranges.slice(0, cache.maxRanges);
  const keptRows = new Map<number, ViewportRowEntry<TData>>();

  for (const keptRange of keptRanges) {
    for (let rowIndex = keptRange.firstRow; rowIndex <= keptRange.lastRow; rowIndex += 1) {
      const entry = rows.get(rowIndex);
      if (entry) {
        keptRows.set(rowIndex, entry);
      }
    }
  }

  return {
    rows: keptRows,
    ranges: Object.freeze(keptRanges),
    maxRanges: cache.maxRanges
  };
}

export function updateViewportCacheRow<TData>(
  cache: ViewportRowCache<TData>,
  rowIndex: number,
  entry: ViewportRowEntry<TData>
): ViewportRowCache<TData> {
  if (!cache.rows.has(rowIndex)) {
    return cache;
  }

  const rows = new Map(cache.rows);
  rows.set(rowIndex, entry);
  return {
    rows,
    ranges: cache.ranges,
    maxRanges: cache.maxRanges
  };
}

export function listViewportCacheKeys<TData>(
  cache: ViewportRowCache<TData>
): readonly RowKey[] {
  return Object.freeze([...cache.rows.values()].map((entry) => entry.key));
}

function sameRange(range: ViewportCacheRange, target: ViewportRange): boolean {
  return range.firstRow === target.firstRow && range.lastRow === target.lastRow;
}
