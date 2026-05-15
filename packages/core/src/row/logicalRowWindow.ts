import type { ScrollAlign } from "../types/shared.js";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_VIEWPORT_HEIGHT = 360;

export interface LogicalRowWindowInput {
  readonly rowCount: number;
  readonly rowHeight?: number;
  readonly viewportHeight?: number;
  readonly scrollTop?: number;
  readonly overscan?: number;
}

export interface LogicalRowScrollInput extends LogicalRowWindowInput {
  readonly rowIndex: number;
  readonly align?: ScrollAlign;
  readonly currentScrollTop?: number;
}

export interface LogicalRowWindow {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly viewportHeight: number;
  readonly totalHeight: number;
  readonly maxScrollTop: number;
  readonly scrollTop: number;
  readonly firstVisibleRow: number;
  readonly lastVisibleRow: number;
  readonly visibleRowCount: number;
  readonly rowOffset: number;
  readonly firstRenderedRow: number;
  readonly lastRenderedRow: number;
  readonly renderedRowCount: number;
}

export function resolveLogicalRowWindow(input: LogicalRowWindowInput): LogicalRowWindow {
  const rowCount = normalizeCount(input.rowCount);
  const rowHeight = normalizePositive(input.rowHeight, DEFAULT_ROW_HEIGHT);
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const totalHeight = rowCount * rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
  const scrollTop = clamp(normalizeNonNegative(input.scrollTop), 0, maxScrollTop);
  const visibleRowCount = rowCount === 0
    ? 0
    : Math.max(1, Math.ceil(viewportHeight / rowHeight));
  const firstVisibleRow = rowCount === 0
    ? 0
    : clampInteger(Math.floor(scrollTop / rowHeight), 0, rowCount - 1);
  const rowOffset = rowCount === 0 ? 0 : scrollTop - firstVisibleRow * rowHeight;
  const lastVisibleRow = rowCount === 0
    ? -1
    : Math.min(rowCount - 1, firstVisibleRow + visibleRowCount - 1);
  const overscan = Math.max(0, Math.trunc(input.overscan ?? 0));
  const firstRenderedRow = rowCount === 0
    ? 0
    : Math.max(0, firstVisibleRow - overscan);
  const lastRenderedRow = rowCount === 0
    ? -1
    : Math.min(rowCount - 1, lastVisibleRow + overscan);

  return Object.freeze({
    rowCount,
    rowHeight,
    viewportHeight,
    totalHeight,
    maxScrollTop,
    scrollTop,
    firstVisibleRow,
    lastVisibleRow,
    visibleRowCount,
    rowOffset,
    firstRenderedRow,
    lastRenderedRow,
    renderedRowCount: lastRenderedRow >= firstRenderedRow
      ? lastRenderedRow - firstRenderedRow + 1
      : 0
  });
}

export function resolveLogicalRowScrollTop(input: LogicalRowScrollInput): number {
  const rowCount = normalizeCount(input.rowCount);
  if (rowCount === 0) {
    return 0;
  }

  const rowHeight = normalizePositive(input.rowHeight, DEFAULT_ROW_HEIGHT);
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const totalHeight = rowCount * rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
  const rowIndex = clampInteger(input.rowIndex, 0, rowCount - 1);
  const rowTop = rowIndex * rowHeight;
  const rowBottom = rowTop + rowHeight;
  const currentScrollTop = clamp(normalizeNonNegative(input.currentScrollTop), 0, maxScrollTop);

  if (input.align === "center") {
    return clamp(rowTop - (viewportHeight - rowHeight) / 2, 0, maxScrollTop);
  }
  if (input.align === "end") {
    return clamp(rowBottom - viewportHeight, 0, maxScrollTop);
  }
  if (input.align === "nearest") {
    if (rowTop < currentScrollTop) {
      return rowTop;
    }
    if (rowBottom > currentScrollTop + viewportHeight) {
      return clamp(rowBottom - viewportHeight, 0, maxScrollTop);
    }
    return currentScrollTop;
  }

  return clamp(rowTop, 0, maxScrollTop);
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function normalizeNonNegative(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : 0;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.trunc(clamp(value, min, max));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
