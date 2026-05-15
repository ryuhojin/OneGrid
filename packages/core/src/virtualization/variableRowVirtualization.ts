import { resolveOverscan } from "./rowVirtualization.js";
import type {
  FixedRowVirtualWindow,
  OverscanOptions,
  ScrollToRowAlign
} from "./types.js";
import type { RowHeightIndex } from "./rowHeightIndex.js";

const DEFAULT_VIEWPORT_HEIGHT = 360;
const DEFAULT_MAX_DOM_ROWS = 240;

export interface VariableRowVirtualWindowInput {
  readonly rowHeightIndex: RowHeightIndex;
  readonly scrollTop?: number | undefined;
  readonly viewportHeight?: number | undefined;
  readonly overscan?: number | OverscanOptions | undefined;
  readonly maxDomRows?: number | undefined;
}

export function calculateVariableRowVirtualWindow(
  input: VariableRowVirtualWindowInput
): FixedRowVirtualWindow {
  const rowCount = input.rowHeightIndex.rowCount;
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const totalHeight = input.rowHeightIndex.totalHeight;
  const scrollTop = clamp(
    normalizeNonNegative(input.scrollTop),
    0,
    Math.max(0, totalHeight - viewportHeight)
  );
  const overscan = resolveOverscan(input.overscan);

  if (rowCount === 0) {
    return Object.freeze({
      firstRow: 0,
      lastRow: -1,
      visibleFirstRow: 0,
      visibleLastRow: -1,
      rowHeight: input.rowHeightIndex.estimatedRowHeight,
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

  const viewportEnd = Math.min(totalHeight, scrollTop + viewportHeight);
  const visibleFirstRow = input.rowHeightIndex.findRowAtOffset(scrollTop);
  const visibleLastRow = input.rowHeightIndex.findRowAtOffset(Math.max(scrollTop, viewportEnd - 0.0001));
  const visibleRowCount = visibleLastRow - visibleFirstRow + 1;
  const firstRow = Math.max(0, visibleFirstRow - overscan.before);
  const uncappedLastRow = Math.min(rowCount - 1, visibleLastRow + overscan.after);
  const lastRow = capLastRow({
    firstRow,
    lastRow: uncappedLastRow,
    visibleRowCount,
    maxDomRows: input.maxDomRows
  });
  const beforeHeight = input.rowHeightIndex.getRowOffset(firstRow);
  const afterStart = input.rowHeightIndex.getRowOffset(lastRow + 1);

  return Object.freeze({
    firstRow,
    lastRow,
    visibleFirstRow,
    visibleLastRow,
    rowHeight: input.rowHeightIndex.estimatedRowHeight,
    offsetTop: beforeHeight,
    beforeHeight,
    afterHeight: Math.max(0, totalHeight - afterStart),
    totalHeight,
    renderedRowCount: lastRow - firstRow + 1,
    visibleRowCount,
    overscanBefore: overscan.before,
    overscanAfter: overscan.after,
    scrollTop,
    viewportHeight
  });
}

export function getScrollTopForVariableRow(input: {
  readonly rowHeightIndex: RowHeightIndex;
  readonly rowIndex: number;
  readonly viewportHeight?: number;
  readonly currentScrollTop?: number;
  readonly align?: ScrollToRowAlign;
}): number {
  if (input.rowHeightIndex.rowCount === 0) {
    return 0;
  }

  const rowIndex = clamp(Math.trunc(input.rowIndex), 0, input.rowHeightIndex.rowCount - 1);
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const rowTop = input.rowHeightIndex.getRowOffset(rowIndex);
  const rowBottom = rowTop + input.rowHeightIndex.getRowHeight(rowIndex);
  const maxScrollTop = Math.max(0, input.rowHeightIndex.totalHeight - viewportHeight);
  const currentScrollTop = normalizeNonNegative(input.currentScrollTop);

  if (input.align === "nearest") {
    if (rowTop >= currentScrollTop && rowBottom <= currentScrollTop + viewportHeight) {
      return clamp(currentScrollTop, 0, maxScrollTop);
    }
    return clamp(rowTop < currentScrollTop ? rowTop : rowBottom - viewportHeight, 0, maxScrollTop);
  }

  const target = input.align === "center"
    ? rowTop - Math.max(0, viewportHeight - (rowBottom - rowTop)) / 2
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
  return Math.min(input.lastRow, input.firstRow + maxDomRows - 1);
}

function normalizePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function normalizeNonNegative(value: number | undefined, fallback = 0): number {
  return Number.isFinite(value) && value !== undefined && value >= 0 ? Math.trunc(value) : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
