import { resolveOverscan } from "./rowVirtualization.js";
import type {
  FixedColumnVirtualWindow,
  OverscanOptions,
  ScrollToColumnAlign
} from "./types.js";

const DEFAULT_COLUMN_WIDTH = 120;
const DEFAULT_VIEWPORT_WIDTH = 800;
const DEFAULT_MAX_DOM_COLUMNS = 80;

export interface FixedColumnVirtualWindowInput {
  readonly columnWidths: readonly number[];
  readonly scrollLeft?: number | undefined;
  readonly viewportWidth?: number | undefined;
  readonly overscan?: number | OverscanOptions | undefined;
  readonly maxDomColumns?: number | undefined;
}

export function calculateFixedColumnVirtualWindow(
  input: FixedColumnVirtualWindowInput
): FixedColumnVirtualWindow {
  const widths = normalizeWidths(input.columnWidths);
  const columnCount = widths.length;
  const viewportWidth = normalizePositive(input.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
  const scrollLeft = normalizeNonNegative(input.scrollLeft);
  const offsets = calculateOffsets(widths);
  const totalWidth = offsets[columnCount] ?? 0;
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

  const visibleFirstColumn = findVisibleFirstColumn(widths, offsets, scrollLeft);
  const visibleLastColumn = findVisibleLastColumn(widths, offsets, visibleFirstColumn, scrollLeft + viewportWidth);
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
  const renderedWidth = sumWidths(widths, windowRange.firstColumn, windowRange.lastColumn);
  const afterStart = offsets[windowRange.lastColumn + 1] ?? totalWidth;

  return freezeColumnWindow({
    firstColumn: windowRange.firstColumn,
    lastColumn: windowRange.lastColumn,
    visibleFirstColumn,
    visibleLastColumn,
    offsetLeft: offsets[windowRange.firstColumn] ?? 0,
    beforeWidth: offsets[windowRange.firstColumn] ?? 0,
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
  readonly columnIndex: number;
  readonly viewportWidth?: number;
  readonly currentScrollLeft?: number;
  readonly align?: ScrollToColumnAlign;
}): number {
  const widths = normalizeWidths(input.columnWidths);
  if (widths.length === 0) {
    return 0;
  }

  const columnIndex = clamp(Math.trunc(input.columnIndex), 0, widths.length - 1);
  const viewportWidth = normalizePositive(input.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
  const offsets = calculateOffsets(widths);
  const totalWidth = offsets[offsets.length - 1] ?? 0;
  const columnLeft = offsets[columnIndex] ?? 0;
  const columnRight = columnLeft + (widths[columnIndex] ?? DEFAULT_COLUMN_WIDTH);
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

function findVisibleFirstColumn(
  widths: readonly number[],
  offsets: readonly number[],
  scrollLeft: number
): number {
  for (let index = 0; index < widths.length; index += 1) {
    if ((offsets[index] ?? 0) + (widths[index] ?? DEFAULT_COLUMN_WIDTH) > scrollLeft) {
      return index;
    }
  }
  return Math.max(0, widths.length - 1);
}

function findVisibleLastColumn(
  widths: readonly number[],
  offsets: readonly number[],
  firstColumn: number,
  viewportEnd: number
): number {
  let lastColumn = firstColumn;
  for (let index = firstColumn; index < widths.length; index += 1) {
    if ((offsets[index] ?? 0) < viewportEnd) {
      lastColumn = index;
    } else {
      break;
    }
  }
  return lastColumn;
}

function normalizeWidths(widths: readonly number[]): readonly number[] {
  return Object.freeze(widths.map((width) => normalizePositive(width, DEFAULT_COLUMN_WIDTH)));
}

function calculateOffsets(widths: readonly number[]): readonly number[] {
  const offsets: number[] = [];
  let total = 0;
  for (const width of widths) {
    offsets.push(total);
    total += width;
  }
  offsets.push(total);
  return Object.freeze(offsets);
}

function sumWidths(widths: readonly number[], first: number, last: number): number {
  return widths.slice(first, last + 1).reduce((total, width) => total + width, 0);
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
