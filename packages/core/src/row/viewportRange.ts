import type { ViewportRange } from "../types/shared.js";
import { resolveLogicalRowWindow } from "./logicalRowWindow.js";

export interface ViewportRangeInput {
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly rowHeight: number;
  readonly rowCount?: number;
  readonly overscan?: number;
  readonly firstColumn?: number;
  readonly lastColumn?: number;
}

export function calculateViewportRange(input: ViewportRangeInput): ViewportRange {
  const rowCount = input.rowCount;
  if (rowCount !== undefined) {
    const window = resolveLogicalRowWindow({
      rowCount,
      rowHeight: input.rowHeight,
      viewportHeight: input.viewportHeight,
      scrollTop: input.scrollTop,
      ...(input.overscan === undefined ? {} : { overscan: input.overscan })
    });
    return Object.freeze({
      firstRow: window.firstRenderedRow,
      lastRow: window.lastRenderedRow,
      ...(input.firstColumn === undefined ? {} : { firstColumn: input.firstColumn }),
      ...(input.lastColumn === undefined ? {} : { lastColumn: input.lastColumn })
    });
  }

  const rowHeight = normalizePositive(input.rowHeight, 36);
  const viewportHeight = normalizePositive(input.viewportHeight, rowHeight);
  const overscan = Math.max(0, Math.trunc(input.overscan ?? 0));
  const firstVisible = Math.floor(Math.max(0, input.scrollTop) / rowHeight);
  const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const firstRow = Math.max(0, firstVisible - overscan);
  const lastRow = firstVisible + visibleCount - 1 + overscan;
  return Object.freeze({
    firstRow,
    lastRow,
    ...(input.firstColumn === undefined ? {} : { firstColumn: input.firstColumn }),
    ...(input.lastColumn === undefined ? {} : { lastColumn: input.lastColumn })
  });
}

export function calculatePrefetchRange(input: {
  readonly visibleRange: ViewportRange;
  readonly rowCount?: number;
  readonly direction: "up" | "down" | "none";
  readonly velocityRowsPerSecond: number;
  readonly thresholdRowsPerSecond: number;
  readonly prefetchRows: number;
}): ViewportRange {
  const maxRow = input.rowCount === undefined ? undefined : Math.max(0, input.rowCount - 1);
  const shouldPrefetch = input.velocityRowsPerSecond >= input.thresholdRowsPerSecond
    && input.prefetchRows > 0
    && input.direction !== "none";

  if (!shouldPrefetch) {
    return input.visibleRange;
  }

  const firstRow = input.direction === "up"
    ? Math.max(0, input.visibleRange.firstRow - input.prefetchRows)
    : input.visibleRange.firstRow;
  const uncappedLastRow = input.direction === "down"
    ? input.visibleRange.lastRow + input.prefetchRows
    : input.visibleRange.lastRow;
  const lastRow = maxRow === undefined ? uncappedLastRow : Math.min(uncappedLastRow, maxRow);

  return Object.freeze({
    firstRow,
    lastRow,
    ...(input.visibleRange.firstColumn === undefined
      ? {}
      : { firstColumn: input.visibleRange.firstColumn }),
    ...(input.visibleRange.lastColumn === undefined
      ? {}
      : { lastColumn: input.visibleRange.lastColumn })
  });
}

function normalizePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
