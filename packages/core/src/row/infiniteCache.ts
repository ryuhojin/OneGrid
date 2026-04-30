import type { InfiniteBlock } from "./infiniteTypes.js";

export interface InfiniteBlockCache<TData = unknown> {
  readonly blocks: ReadonlyMap<number, InfiniteBlock<TData>>;
  readonly maxBlocks: number;
}

export function createInfiniteBlockCache<TData>(maxBlocks: number): InfiniteBlockCache<TData> {
  return {
    blocks: new Map<number, InfiniteBlock<TData>>(),
    maxBlocks: Math.max(1, Math.trunc(maxBlocks))
  };
}

export function getCachedBlock<TData>(
  cache: InfiniteBlockCache<TData>,
  blockIndex: number
): InfiniteBlock<TData> | undefined {
  return cache.blocks.get(blockIndex);
}

export function setCachedBlock<TData>(
  cache: InfiniteBlockCache<TData>,
  block: InfiniteBlock<TData>
): void {
  (cache.blocks as Map<number, InfiniteBlock<TData>>).set(block.index, block);
}

export function deleteCachedBlock<TData>(
  cache: InfiniteBlockCache<TData>,
  blockIndex: number
): void {
  (cache.blocks as Map<number, InfiniteBlock<TData>>).delete(blockIndex);
}

export function listCachedBlocks<TData>(
  cache: InfiniteBlockCache<TData>
): readonly InfiniteBlock<TData>[] {
  return Object.freeze([...cache.blocks.values()].sort((left, right) => left.index - right.index));
}

export function evictInfiniteBlocks<TData>(
  cache: InfiniteBlockCache<TData>,
  protectedBlocks: ReadonlySet<number>
): readonly InfiniteBlock<TData>[] {
  const loadedBlocks = [...cache.blocks.values()].filter((block) => block.status === "loaded");
  const evicted: InfiniteBlock<TData>[] = [];

  while (loadedBlocks.length - evicted.length > cache.maxBlocks) {
    const candidate = loadedBlocks
      .filter((block) => !protectedBlocks.has(block.index) && !evicted.includes(block))
      .sort((left, right) => left.lastAccess - right.lastAccess)[0];

    if (!candidate) {
      break;
    }

    deleteCachedBlock(cache, candidate.index);
    evicted.push(candidate);
  }

  return Object.freeze(evicted);
}
