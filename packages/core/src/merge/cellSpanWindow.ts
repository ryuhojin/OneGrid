import type {
  CellSpan,
  CellSpanAnchorPosition,
  CellSpanCellState,
  CellSpanModel,
  CellSpanRange,
  CellSpanWindow
} from "./cellSpanTypes.js";
import {
  cellSpanRangesIntersect,
  cellSpanToRange,
  createCellKey,
  getCellSpansForRange,
  normalizeCellSpanRange,
  unionCellSpanRanges
} from "./cellSpanIndex.js";

export interface CellSpanRangeEndpoint {
  readonly rowIndex: number;
  readonly columnIndex: number;
}

export function getCellSpanState(
  model: CellSpanModel,
  rowIndex: number,
  columnIndex: number,
  window: CellSpanWindow
): CellSpanCellState | undefined {
  const span = model.byCell.get(createCellKey(rowIndex, columnIndex));
  if (!span) {
    return undefined;
  }

  const clipped = clipSpanToWindow(span, window);
  if (!clipped) {
    return undefined;
  }

  if (rowIndex === clipped.firstRow && columnIndex === clipped.firstColumn) {
    return {
      kind: "anchor",
      span,
      rowSpan: clipped.lastRow - clipped.firstRow + 1,
      colSpan: clipped.lastColumn - clipped.firstColumn + 1,
      clippedTop: clipped.firstRow !== span.rowIndex,
      clippedLeft: clipped.firstColumn !== span.columnIndex
    };
  }

  return { kind: "covered", span };
}

export function resolveCellSpanAnchor(
  model: CellSpanModel,
  rowIndex: number,
  columnIndex: number
): CellSpanAnchorPosition | undefined {
  const span = model.byCell.get(createCellKey(rowIndex, columnIndex));
  if (!span) {
    return undefined;
  }

  return {
    rowIndex: span.rowIndex,
    columnIndex: span.columnIndex,
    ...(span.rowKey === undefined ? {} : { rowKey: span.rowKey }),
    columnId: span.columnId,
    field: span.field
  };
}

export function expandCellSpanRange(
  model: CellSpanModel,
  range: CellSpanRange
): CellSpanRange {
  let expanded = normalizeCellSpanRange(range);
  let changed = true;

  while (changed) {
    changed = false;
    for (const span of getCellSpansForRange(model.index, expanded)) {
      const next = unionCellSpanRanges(expanded, cellSpanToRange(span));
      changed = changed || !sameRange(expanded, next);
      expanded = next;
    }
  }

  return expanded;
}

export function expandCellSpanRangeFromEndpoints(
  model: CellSpanModel,
  range: CellSpanRange,
  endpoints: readonly CellSpanRangeEndpoint[]
): CellSpanRange {
  let expanded = normalizeCellSpanRange(range);
  for (const endpoint of endpoints) {
    const span = model.byCell.get(createCellKey(endpoint.rowIndex, endpoint.columnIndex));
    if (span) {
      expanded = unionCellSpanRanges(expanded, cellSpanToRange(span));
    }
  }
  return expanded;
}

function clipSpanToWindow(
  span: CellSpan,
  window: CellSpanWindow
): CellSpanRange | undefined {
  const range = cellSpanToRange(span);
  if (!cellSpanRangesIntersect(range, window)) {
    return undefined;
  }

  return {
    firstRow: Math.max(range.firstRow, window.firstRow),
    lastRow: Math.min(range.lastRow, window.lastRow),
    firstColumn: Math.max(range.firstColumn, window.firstColumn),
    lastColumn: Math.min(range.lastColumn, window.lastColumn)
  };
}

function sameRange(left: CellSpanRange, right: CellSpanRange): boolean {
  return left.firstRow === right.firstRow
    && left.lastRow === right.lastRow
    && left.firstColumn === right.firstColumn
    && left.lastColumn === right.lastColumn;
}
