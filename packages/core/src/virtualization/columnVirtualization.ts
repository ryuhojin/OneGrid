import { resolveOverscan } from "./rowVirtualization.js";
import {
  createColumnVirtualizationIndex
} from "./columnVirtualizationIndex.js";
import type {
  FixedColumnVirtualWindow,
  OverscanOptions,
  ScrollToColumnAlign
} from "./types.js";
import type { ColumnVirtualizationIndex } from "./columnVirtualizationIndex.js";

const DEFAULT_VIEWPORT_WIDTH = 800;
const DEFAULT_MAX_DOM_COLUMNS = 80;

export interface FixedColumnVirtualWindowInput {
  readonly columnWidths: readonly number[];
  readonly columnVirtualizationIndex?: ColumnVirtualizationIndex | undefined;
  readonly scrollLeft?: number | undefined;
  readonly viewportWidth?: number | undefined;
  readonly overscan?: number | OverscanOptions | undefined;
  readonly maxDomColumns?: number | undefined;
}

export function calculateFixedColumnVirtualWindow(
  input: FixedColumnVirtualWindowInput
): FixedColumnVirtualWindow {
  const index = input.columnVirtualizationIndex
    ?? createColumnVirtualizationIndex({ columnWidths: input.columnWidths });
  const columnCount = index.columnCount;
  const viewportWidth = normalizePositive(input.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
  const totalWidth = index.totalWidth;
  const scrollLeft = clamp(
    normalizeNonNegative(input.scrollLeft),
    0,
    Math.max(0, totalWidth - viewportWidth)
  );
  const overscan = resolveOverscan(input.overscan);

  if (columnCount === 0) {
    return freezeColumnWindow({
      firstColumn: 0,
      lastColumn: -1,
      visibleFirstColumn: 0,
      visibleLastColumn: -1,
      offsetLeft: 0,
      beforeWidth: 0,
      afterWidth: 0,
      totalWidth: 0,
      renderedWidth: 0,
      renderedColumnCount: 0,
      visibleColumnCount: 0,
      overscanBefore: overscan.before,
      overscanAfter: overscan.after,
      scrollLeft,
      viewportWidth
    });
  }

  const viewportEnd = Math.min(totalWidth, scrollLeft + viewportWidth);
  const visibleFirstColumn = index.findColumnAtOffset(scrollLeft);
  const visibleLastColumn = index.findColumnAtOffset(Math.max(scrollLeft, viewportEnd - 0.0001));
  const visibleColumnCount = visibleLastColumn - visibleFirstColumn + 1;
  const maxRenderedColumns = normalizeMaxRendered(input.maxDomColumns, visibleColumnCount);
  const windowRange = resolveRenderedColumnRange({
    columnCount,
    visibleFirstColumn,
    visibleLastColumn,
    overscanBefore: overscan.before,
    overscanAfter: overscan.after,
    maxRenderedColumns
  });
  const renderedWidth = index.sumColumns(windowRange.firstColumn, windowRange.lastColumn);
  const offsetLeft = index.getColumnOffset(windowRange.firstColumn);
  const afterStart = index.getColumnOffset(windowRange.lastColumn + 1);

  return freezeColumnWindow({
    firstColumn: windowRange.firstColumn,
    lastColumn: windowRange.lastColumn,
    visibleFirstColumn,
    visibleLastColumn,
    offsetLeft,
    beforeWidth: offsetLeft,
    afterWidth: Math.max(0, totalWidth - afterStart),
    totalWidth,
    renderedWidth,
    renderedColumnCount: windowRange.lastColumn - windowRange.firstColumn + 1,
    visibleColumnCount,
    overscanBefore: overscan.before,
    overscanAfter: overscan.after,
    scrollLeft,
    viewportWidth
  });
}

export function getScrollLeftForColumn(input: {
  readonly columnWidths: readonly number[];
  readonly columnVirtualizationIndex?: ColumnVirtualizationIndex;
  readonly columnIndex: number;
  readonly viewportWidth?: number;
  readonly currentScrollLeft?: number;
  readonly align?: ScrollToColumnAlign;
}): number {
  const index = input.columnVirtualizationIndex
    ?? createColumnVirtualizationIndex({ columnWidths: input.columnWidths });
  if (index.columnCount === 0) {
    return 0;
  }

  const columnIndex = clamp(Math.trunc(input.columnIndex), 0, index.columnCount - 1);
  const viewportWidth = normalizePositive(input.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
  const totalWidth = index.totalWidth;
  const columnLeft = index.getColumnOffset(columnIndex);
  const columnRight = columnLeft + index.getColumnWidth(columnIndex);
  const currentScrollLeft = normalizeNonNegative(input.currentScrollLeft);
  const maxScrollLeft = Math.max(0, totalWidth - viewportWidth);

  if (input.align === "nearest") {
    if (columnLeft >= currentScrollLeft && columnRight <= currentScrollLeft + viewportWidth) {
      return clamp(currentScrollLeft, 0, maxScrollLeft);
    }
    return clamp(columnLeft < currentScrollLeft ? columnLeft : columnRight - viewportWidth, 0, maxScrollLeft);
  }

  if (input.align === "center") {
    return clamp(columnLeft - Math.max(0, viewportWidth - (columnRight - columnLeft)) / 2, 0, maxScrollLeft);
  }

  if (input.align === "end") {
    return clamp(columnRight - viewportWidth, 0, maxScrollLeft);
  }

  return clamp(columnLeft, 0, maxScrollLeft);
}

function resolveRenderedColumnRange(input: {
  readonly columnCount: number;
  readonly visibleFirstColumn: number;
  readonly visibleLastColumn: number;
  readonly overscanBefore: number;
  readonly overscanAfter: number;
  readonly maxRenderedColumns: number;
}): { readonly firstColumn: number; readonly lastColumn: number } {
  const spareColumns = Math.max(0, input.maxRenderedColumns - (input.visibleLastColumn - input.visibleFirstColumn + 1));
  const before = Math.min(input.overscanBefore, spareColumns);
  const after = Math.min(input.overscanAfter, spareColumns - before);
  let firstColumn = Math.max(0, input.visibleFirstColumn - before);
  let lastColumn = Math.min(input.columnCount - 1, input.visibleLastColumn + after);

  if (lastColumn - firstColumn + 1 > input.maxRenderedColumns) {
    lastColumn = Math.min(input.columnCount - 1, firstColumn + input.maxRenderedColumns - 1);
  }
  if (lastColumn < input.visibleLastColumn) {
    lastColumn = input.visibleLastColumn;
    firstColumn = Math.max(0, lastColumn - input.maxRenderedColumns + 1);
  }

  return { firstColumn, lastColumn };
}

function normalizeMaxRendered(value: number | undefined, visibleColumnCount: number): number {
  return Math.max(visibleColumnCount, Math.trunc(normalizePositive(value, DEFAULT_MAX_DOM_COLUMNS)));
}

function normalizePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function normalizeNonNegative(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function freezeColumnWindow(window: FixedColumnVirtualWindow): FixedColumnVirtualWindow {
  return Object.freeze(window);
}
