import type {
  FixedRowVirtualWindow,
  OverscanOptions,
  ResolvedOverscan,
  ScrollToRowAlign
} from "./types.js";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_VIEWPORT_HEIGHT = 360;
const DEFAULT_OVERSCAN = 4;
const DEFAULT_MAX_DOM_ROWS = 240;

export interface FixedRowVirtualWindowInput {
  readonly rowCount: number;
  readonly rowHeight?: number | undefined;
  readonly scrollTop?: number | undefined;
  readonly viewportHeight?: number | undefined;
  readonly overscan?: number | OverscanOptions | undefined;
  readonly maxDomRows?: number | undefined;
}

export function calculateFixedRowVirtualWindow(
  input: FixedRowVirtualWindowInput
): FixedRowVirtualWindow {
  const rowCount = normalizeCount(input.rowCount);
  const rowHeight = normalizePositive(input.rowHeight, DEFAULT_ROW_HEIGHT);
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const scrollTop = normalizeScrollTop(input.scrollTop);
  const overscan = resolveOverscan(input.overscan);

  if (rowCount === 0) {
    return Object.freeze({
      firstRow: 0,
      lastRow: -1,
      visibleFirstRow: 0,
      visibleLastRow: -1,
      rowHeight,
      offsetTop: 0,
      beforeHeight: 0,
      afterHeight: 0,
      totalHeight: 0,
      renderedRowCount: 0,
      visibleRowCount: 0,
      overscanBefore: overscan.before,
      overscanAfter: overscan.after,
      scrollTop,
      viewportHeight
    });
  }

  const visibleFirstRow = clamp(Math.floor(scrollTop / rowHeight), 0, rowCount - 1);
  const visibleRowCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const visibleLastRow = Math.min(rowCount - 1, visibleFirstRow + visibleRowCount - 1);
  const firstRow = Math.max(0, visibleFirstRow - overscan.before);
  const uncappedLastRow = Math.min(rowCount - 1, visibleLastRow + overscan.after);
  const cappedLastRow = capLastRow({
    firstRow,
    lastRow: uncappedLastRow,
    visibleRowCount,
    maxDomRows: input.maxDomRows
  });
  const renderedRowCount = cappedLastRow - firstRow + 1;

  return Object.freeze({
    firstRow,
    lastRow: cappedLastRow,
    visibleFirstRow,
    visibleLastRow,
    rowHeight,
    offsetTop: firstRow * rowHeight,
    beforeHeight: firstRow * rowHeight,
    afterHeight: Math.max(0, rowCount - cappedLastRow - 1) * rowHeight,
    totalHeight: rowCount * rowHeight,
    renderedRowCount,
    visibleRowCount,
    overscanBefore: overscan.before,
    overscanAfter: overscan.after,
    scrollTop,
    viewportHeight
  });
}

export function resolveOverscan(value: number | OverscanOptions | undefined): ResolvedOverscan {
  if (typeof value === "number") {
    const rows = normalizeNonNegative(value, DEFAULT_OVERSCAN);
    return Object.freeze({ before: rows, after: rows });
  }

  const rows = normalizeNonNegative(value?.rows, DEFAULT_OVERSCAN);
  return Object.freeze({
    before: normalizeNonNegative(value?.before, rows),
    after: normalizeNonNegative(value?.after, rows)
  });
}

export function getScrollTopForRow(input: {
  readonly rowIndex: number;
  readonly rowCount: number;
  readonly rowHeight?: number;
  readonly viewportHeight?: number;
  readonly currentScrollTop?: number;
  readonly align?: ScrollToRowAlign;
}): number {
  const rowCount = normalizeCount(input.rowCount);
  if (rowCount === 0) {
    return 0;
  }

  const rowHeight = normalizePositive(input.rowHeight, DEFAULT_ROW_HEIGHT);
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const rowIndex = clamp(Math.trunc(input.rowIndex), 0, rowCount - 1);
  const rowTop = rowIndex * rowHeight;
  const rowBottom = rowTop + rowHeight;
  const maxScrollTop = Math.max(0, rowCount * rowHeight - viewportHeight);
  const currentScrollTop = normalizeScrollTop(input.currentScrollTop);

  if (input.align === "nearest") {
    if (rowTop >= currentScrollTop && rowBottom <= currentScrollTop + viewportHeight) {
      return clamp(currentScrollTop, 0, maxScrollTop);
    }

    return clamp(rowTop < currentScrollTop ? rowTop : rowBottom - viewportHeight, 0, maxScrollTop);
  }

  const target = input.align === "center"
    ? rowTop - Math.max(0, viewportHeight - rowHeight) / 2
    : input.align === "end"
      ? rowBottom - viewportHeight
      : rowTop;

  return clamp(target, 0, maxScrollTop);
}

function capLastRow(input: {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly visibleRowCount: number;
  readonly maxDomRows: number | undefined;
}): number {
  const maxDomRows = Math.max(
    input.visibleRowCount,
    normalizeNonNegative(input.maxDomRows, DEFAULT_MAX_DOM_ROWS)
  );
  const maxLastRow = input.firstRow + maxDomRows - 1;
  return Math.min(input.lastRow, maxLastRow);
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizeScrollTop(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : 0;
}

function normalizePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function normalizeNonNegative(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value >= 0 ? Math.trunc(value) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
