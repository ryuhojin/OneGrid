import type { ScrollAlign } from "../types/shared.js";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_VIEWPORT_HEIGHT = 360;
const DEFAULT_MAX_SCROLL_HEIGHT = 24_000_000;

export interface SegmentedVirtualScrollInput {
  readonly rowCount: number;
  readonly rowHeight?: number;
  readonly viewportHeight?: number;
  readonly logicalScrollTop?: number;
  readonly physicalScrollTop?: number;
  readonly maxScrollHeight?: number;
}

export interface SegmentedVirtualScrollState {
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly viewportHeight: number;
  readonly totalLogicalHeight: number;
  readonly physicalScrollHeight: number;
  readonly maxLogicalScrollTop: number;
  readonly maxPhysicalScrollTop: number;
  readonly logicalScrollTop: number;
  readonly physicalScrollTop: number;
  readonly scale: number;
  readonly segmentCount: number;
  readonly segmentSizeRows: number;
  readonly activeSegmentIndex: number;
  readonly activeSegmentStartRow: number;
  readonly activeSegmentEndRow: number;
}

export interface SegmentedVirtualRowWindowInput extends SegmentedVirtualScrollInput {
  readonly overscan?: number;
  readonly maxDomRows?: number;
}

export interface SegmentedVirtualRowWindow extends SegmentedVirtualScrollState {
  readonly firstVisibleRow: number;
  readonly lastVisibleRow: number;
  readonly visibleRowCount: number;
  readonly rowOffset: number;
  readonly firstRenderedRow: number;
  readonly lastRenderedRow: number;
  readonly renderedRowCount: number;
}

export interface SegmentedScrollToRowInput extends SegmentedVirtualScrollInput {
  readonly rowIndex: number;
  readonly align?: ScrollAlign;
  readonly currentLogicalScrollTop?: number;
}

export function createSegmentedVirtualScroll(
  input: SegmentedVirtualScrollInput
): SegmentedVirtualScrollState {
  const rowCount = normalizeCount(input.rowCount);
  const rowHeight = normalizePositive(input.rowHeight, DEFAULT_ROW_HEIGHT);
  const viewportHeight = normalizePositive(input.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
  const maxScrollHeight = normalizePositive(input.maxScrollHeight, DEFAULT_MAX_SCROLL_HEIGHT);
  const totalLogicalHeight = rowCount * rowHeight;
  const physicalScrollHeight = Math.min(totalLogicalHeight, maxScrollHeight);
  const maxLogicalScrollTop = getScrollableHeight(totalLogicalHeight, viewportHeight);
  const maxPhysicalScrollTop = getScrollableHeight(physicalScrollHeight, viewportHeight);
  const logicalScrollTop = resolveLogicalScrollTop({
    logicalScrollTop: input.logicalScrollTop,
    physicalScrollTop: input.physicalScrollTop,
    totalLogicalHeight,
    physicalScrollHeight,
    viewportHeight
  });
  const physicalScrollTop = toPhysicalScrollTop({
    logicalScrollTop,
    totalLogicalHeight,
    physicalScrollHeight,
    viewportHeight
  });
  const segmentSizeRows = Math.max(1, Math.floor(maxScrollHeight / rowHeight));
  const activeRowIndex = clampInteger(logicalScrollTop / rowHeight, 0, Math.max(0, rowCount - 1));
  const activeSegmentIndex = Math.min(
    Math.max(0, Math.floor(activeRowIndex / segmentSizeRows)),
    Math.max(0, Math.ceil(rowCount / segmentSizeRows) - 1)
  );
  const activeSegmentStartRow = activeSegmentIndex * segmentSizeRows;
  const activeSegmentEndRow = Math.max(
    activeSegmentStartRow,
    Math.min(rowCount - 1, activeSegmentStartRow + segmentSizeRows - 1)
  );

  return Object.freeze({
    rowCount,
    rowHeight,
    viewportHeight,
    totalLogicalHeight,
    physicalScrollHeight,
    maxLogicalScrollTop,
    maxPhysicalScrollTop,
    logicalScrollTop,
    physicalScrollTop,
    scale: calculateScale(totalLogicalHeight, physicalScrollHeight, viewportHeight),
    segmentCount: rowCount === 0 ? 0 : Math.ceil(rowCount / segmentSizeRows),
    segmentSizeRows,
    activeSegmentIndex,
    activeSegmentStartRow,
    activeSegmentEndRow
  });
}

export function resolveSegmentedVirtualRowWindow(
  input: SegmentedVirtualRowWindowInput
): SegmentedVirtualRowWindow {
  const scroll = createSegmentedVirtualScroll(input);
  if (scroll.rowCount === 0) {
    return Object.freeze({
      ...scroll,
      firstVisibleRow: 0,
      lastVisibleRow: -1,
      visibleRowCount: 0,
      rowOffset: 0,
      firstRenderedRow: 0,
      lastRenderedRow: -1,
      renderedRowCount: 0
    });
  }

  const firstVisibleRow = clampInteger(
    scroll.logicalScrollTop / scroll.rowHeight,
    0,
    scroll.rowCount - 1
  );
  const rowOffset = scroll.logicalScrollTop - firstVisibleRow * scroll.rowHeight;
  const visibleRowCount = Math.max(1, Math.ceil((scroll.viewportHeight + rowOffset) / scroll.rowHeight));
  const lastVisibleRow = Math.min(scroll.rowCount - 1, firstVisibleRow + visibleRowCount - 1);
  const overscan = normalizeNonNegative(input.overscan, 0);
  const maxDomRows = Math.max(visibleRowCount, normalizeNonNegative(input.maxDomRows, Number.MAX_SAFE_INTEGER));
  const firstRenderedRow = Math.max(0, firstVisibleRow - overscan);
  const uncappedLastRenderedRow = Math.min(scroll.rowCount - 1, lastVisibleRow + overscan);
  const lastRenderedRow = Math.min(uncappedLastRenderedRow, firstRenderedRow + maxDomRows - 1);

  return Object.freeze({
    ...scroll,
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

export function getSegmentedScrollTopForRow(input: SegmentedScrollToRowInput): number {
  const state = createSegmentedVirtualScroll(input);
  if (state.rowCount === 0) {
    return 0;
  }

  const rowIndex = clampInteger(input.rowIndex, 0, state.rowCount - 1);
  const rowTop = rowIndex * state.rowHeight;
  const rowBottom = rowTop + state.rowHeight;
  const currentLogicalScrollTop = clamp(
    normalizeNonNegative(input.currentLogicalScrollTop ?? input.logicalScrollTop, 0),
    0,
    state.maxLogicalScrollTop
  );

  if (input.align === "center") {
    return clamp(rowTop - Math.max(0, state.viewportHeight - state.rowHeight) / 2, 0, state.maxLogicalScrollTop);
  }
  if (input.align === "end") {
    return clamp(rowBottom - state.viewportHeight, 0, state.maxLogicalScrollTop);
  }
  if (input.align === "nearest") {
    if (rowTop < currentLogicalScrollTop) {
      return rowTop;
    }
    if (rowBottom > currentLogicalScrollTop + state.viewportHeight) {
      return clamp(rowBottom - state.viewportHeight, 0, state.maxLogicalScrollTop);
    }
    return currentLogicalScrollTop;
  }

  return clamp(rowTop, 0, state.maxLogicalScrollTop);
}

export function toPhysicalScrollTop(input: {
  readonly logicalScrollTop: number;
  readonly totalLogicalHeight: number;
  readonly physicalScrollHeight: number;
  readonly viewportHeight: number;
}): number {
  const logicalScrollable = getScrollableHeight(input.totalLogicalHeight, input.viewportHeight);
  const physicalScrollable = getScrollableHeight(input.physicalScrollHeight, input.viewportHeight);
  if (logicalScrollable === 0 || physicalScrollable === 0) {
    return 0;
  }

  return clamp(input.logicalScrollTop, 0, logicalScrollable) / logicalScrollable * physicalScrollable;
}

export function toLogicalScrollTop(input: {
  readonly physicalScrollTop: number;
  readonly totalLogicalHeight: number;
  readonly physicalScrollHeight: number;
  readonly viewportHeight: number;
}): number {
  const logicalScrollable = getScrollableHeight(input.totalLogicalHeight, input.viewportHeight);
  const physicalScrollable = getScrollableHeight(input.physicalScrollHeight, input.viewportHeight);
  if (logicalScrollable === 0 || physicalScrollable === 0) {
    return 0;
  }

  return clamp(input.physicalScrollTop, 0, physicalScrollable) / physicalScrollable * logicalScrollable;
}

function resolveLogicalScrollTop(input: {
  readonly logicalScrollTop: number | undefined;
  readonly physicalScrollTop: number | undefined;
  readonly totalLogicalHeight: number;
  readonly physicalScrollHeight: number;
  readonly viewportHeight: number;
}): number {
  if (Number.isFinite(input.logicalScrollTop) && input.logicalScrollTop !== undefined) {
    return clamp(
      input.logicalScrollTop,
      0,
      getScrollableHeight(input.totalLogicalHeight, input.viewportHeight)
    );
  }

  return toLogicalScrollTop({
    physicalScrollTop: input.physicalScrollTop ?? 0,
    totalLogicalHeight: input.totalLogicalHeight,
    physicalScrollHeight: input.physicalScrollHeight,
    viewportHeight: input.viewportHeight
  });
}

function calculateScale(totalLogicalHeight: number, physicalScrollHeight: number, viewportHeight: number): number {
  const physicalScrollable = getScrollableHeight(physicalScrollHeight, viewportHeight);
  return physicalScrollable === 0
    ? 1
    : getScrollableHeight(totalLogicalHeight, viewportHeight) / physicalScrollable;
}

function getScrollableHeight(totalHeight: number, viewportHeight: number): number {
  return Math.max(0, totalHeight - viewportHeight);
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function normalizeNonNegative(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value >= 0 ? Math.trunc(value) : fallback;
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.trunc(clamp(value, min, max));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
