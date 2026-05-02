export interface FrozenRowSliceOptions {
  readonly top?: number;
  readonly bottom?: number;
  readonly totalRowCount?: number;
}

export interface FrozenRowSlices<TRow> {
  readonly topRows: readonly TRow[];
  readonly bodyRows: readonly TRow[];
  readonly bottomRows: readonly TRow[];
  readonly topCount: number;
  readonly bodyCount: number;
  readonly bottomCount: number;
  readonly bodyOffset: number;
  readonly bottomOffset: number;
  readonly scrollableRowCount: number;
  readonly renderedRowCount: number;
  readonly totalRowCount: number;
}

export function createFrozenRowSlices<TRow>(
  rows: readonly TRow[],
  options: FrozenRowSliceOptions = {}
): FrozenRowSlices<TRow> {
  const totalRowCount = normalizeTotalRowCount(options.totalRowCount, rows.length);
  const topCount = clampCount(options.top, rows.length);
  const bottomCount = clampCount(options.bottom, rows.length - topCount);
  const bodyStart = topCount;
  const bodyEnd = rows.length - bottomCount;

  return Object.freeze({
    topRows: Object.freeze(rows.slice(0, topCount)),
    bodyRows: Object.freeze(rows.slice(bodyStart, bodyEnd)),
    bottomRows: Object.freeze(rows.slice(bodyEnd)),
    topCount,
    bodyCount: Math.max(0, totalRowCount - topCount - bottomCount),
    bottomCount,
    bodyOffset: topCount,
    bottomOffset: Math.max(topCount, totalRowCount - bottomCount),
    scrollableRowCount: Math.max(0, totalRowCount - topCount - bottomCount),
    renderedRowCount: rows.length,
    totalRowCount
  });
}

function normalizeTotalRowCount(totalRowCount: number | undefined, fallback: number): number {
  return Number.isFinite(totalRowCount) && totalRowCount !== undefined
    ? Math.max(0, Math.floor(totalRowCount))
    : fallback;
}

function clampCount(value: number | undefined, max: number): number {
  if (!Number.isFinite(value) || value === undefined) {
    return 0;
  }

  return Math.max(0, Math.min(Math.floor(value), max));
}
