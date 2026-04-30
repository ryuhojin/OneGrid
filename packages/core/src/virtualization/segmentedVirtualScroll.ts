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
  readonly logicalScrollTop: number;
  readonly physicalScrollTop: number;
  readonly scale: number;
  readonly segmentCount: number;
  readonly segmentSizeRows: number;
  readonly activeSegmentIndex: number;
  readonly activeSegmentStartRow: number;
  readonly activeSegmentEndRow: number;
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
  const activeSegmentIndex = Math.min(
    Math.max(0, Math.floor(Math.floor(logicalScrollTop / rowHeight) / segmentSizeRows)),
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
