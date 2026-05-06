import type {
  CellSpan,
  CellSpanAnchorPosition,
  CellSpanCellState,
  CellSpanModel,
  CellSpanRange,
  CellSpanWindow
} from "./cellSpanTypes.js";
import { createCellKey } from "./cellSpanModel.js";

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
  let expanded = normalizeRange(range);
  let changed = true;

  while (changed) {
    changed = false;
    for (const span of model.spans) {
      if (!intersects(expanded, toRange(span))) {
        continue;
      }

      const next = union(expanded, toRange(span));
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
  let expanded = normalizeRange(range);
  for (const endpoint of endpoints) {
    const span = model.byCell.get(createCellKey(endpoint.rowIndex, endpoint.columnIndex));
    if (span) {
      expanded = union(expanded, toRange(span));
    }
  }
  return expanded;
}

function clipSpanToWindow(
  span: CellSpan,
  window: CellSpanWindow
): CellSpanRange | undefined {
  const range = toRange(span);
  if (!intersects(range, window)) {
    return undefined;
  }

  return {
    firstRow: Math.max(range.firstRow, window.firstRow),
    lastRow: Math.min(range.lastRow, window.lastRow),
    firstColumn: Math.max(range.firstColumn, window.firstColumn),
    lastColumn: Math.min(range.lastColumn, window.lastColumn)
  };
}

function toRange(span: CellSpan): CellSpanRange {
  return {
    firstRow: span.rowIndex,
    lastRow: span.rowIndex + span.rowSpan - 1,
    firstColumn: span.columnIndex,
    lastColumn: span.columnIndex + span.colSpan - 1
  };
}

function normalizeRange(range: CellSpanRange): CellSpanRange {
  return {
    firstRow: Math.min(range.firstRow, range.lastRow),
    lastRow: Math.max(range.firstRow, range.lastRow),
    firstColumn: Math.min(range.firstColumn, range.lastColumn),
    lastColumn: Math.max(range.firstColumn, range.lastColumn)
  };
}

function intersects(
  left: CellSpanRange,
  right: CellSpanRange | CellSpanWindow
): boolean {
  return left.firstRow <= right.lastRow
    && left.lastRow >= right.firstRow
    && left.firstColumn <= right.lastColumn
    && left.lastColumn >= right.firstColumn;
}

function union(left: CellSpanRange, right: CellSpanRange): CellSpanRange {
  return {
    firstRow: Math.min(left.firstRow, right.firstRow),
    lastRow: Math.max(left.lastRow, right.lastRow),
    firstColumn: Math.min(left.firstColumn, right.firstColumn),
    lastColumn: Math.max(left.lastColumn, right.lastColumn)
  };
}

function sameRange(left: CellSpanRange, right: CellSpanRange): boolean {
  return left.firstRow === right.firstRow
    && left.lastRow === right.lastRow
    && left.firstColumn === right.firstColumn
    && left.lastColumn === right.lastColumn;
}
