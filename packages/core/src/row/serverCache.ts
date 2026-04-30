import type { ServerRowCacheEntry } from "./serverTypes.js";

export interface ServerRowCache<TData = unknown> {
  readonly entries: ReadonlyMap<string, ServerRowCacheEntry<TData>>;
}

export function createServerRowCache<TData>(): ServerRowCache<TData> {
  return { entries: new Map<string, ServerRowCacheEntry<TData>>() };
}

export function getServerCacheEntry<TData>(
  cache: ServerRowCache<TData>,
  cacheKey: string
): ServerRowCacheEntry<TData> | undefined {
  return cache.entries.get(cacheKey);
}

export function setServerCacheEntry<TData>(
  cache: ServerRowCache<TData>,
  entry: ServerRowCacheEntry<TData>
): void {
  (cache.entries as Map<string, ServerRowCacheEntry<TData>>).set(entry.cacheKey, entry);
}

export function clearServerRowCache<TData>(cache: ServerRowCache<TData>): void {
  (cache.entries as Map<string, ServerRowCacheEntry<TData>>).clear();
}

export function listServerCacheEntries<TData>(
  cache: ServerRowCache<TData>
): readonly ServerRowCacheEntry<TData>[] {
  return Object.freeze([...cache.entries.values()]);
}
