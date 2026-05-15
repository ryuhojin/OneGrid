import type { CellSpan, CellSpanIndex, CellSpanRange, CellSpanWindow } from "./cellSpanTypes.js";

type IndexedRange = CellSpanRange | CellSpanWindow;

export function createCellSpanIndex(
  spans: readonly CellSpan[],
  indexedCells?: ReadonlyMap<string, CellSpan>
): CellSpanIndex {
  if (spans.length === 0) {
    return createEmptyCellSpanIndex();
  }

  const byAnchorCell = new Map<string, CellSpan>();
  const byRow = new Map<number, CellSpan[]>();
  const byColumn = new Map<number, CellSpan[]>();
  const coveredRowsBySpanId = new Map<string, Set<number>>();
  const coveredColumnsBySpanId = new Map<string, Set<number>>();

  for (const span of spans) {
    byAnchorCell.set(createCellKey(span.rowIndex, span.columnIndex), span);
  }

  indexCoveredCells(
    byRow,
    byColumn,
    coveredRowsBySpanId,
    coveredColumnsBySpanId,
    indexedCells ?? createAnchorCellMap(spans)
  );

  return Object.freeze({
    byAnchorCell,
    byRow: freezeSpanBucketMap(byRow),
    byColumn: freezeSpanBucketMap(byColumn),
    coveredRowsBySpanId: freezeNumberBucketMap(coveredRowsBySpanId),
    coveredColumnsBySpanId: freezeNumberBucketMap(coveredColumnsBySpanId)
  });
}

export function createEmptyCellSpanIndex(): CellSpanIndex {
  return Object.freeze({
    byAnchorCell: new Map<string, CellSpan>(),
    byRow: new Map<number, readonly CellSpan[]>(),
    byColumn: new Map<number, readonly CellSpan[]>(),
    coveredRowsBySpanId: new Map<string, readonly number[]>(),
    coveredColumnsBySpanId: new Map<string, readonly number[]>()
  });
}

export function createCellKey(rowIndex: number, columnIndex: number): string {
  return `${rowIndex}:${columnIndex}`;
}

export function getCellSpansForRow(
  index: CellSpanIndex,
  rowIndex: number
): readonly CellSpan[] {
  return index.byRow.get(rowIndex) ?? [];
}

export function getCellSpansForColumn(
  index: CellSpanIndex,
  columnIndex: number
): readonly CellSpan[] {
  return index.byColumn.get(columnIndex) ?? [];
}

export function getCellSpansForRange(
  index: CellSpanIndex,
  range: IndexedRange
): readonly CellSpan[] {
  const normalized = normalizeCellSpanRange(range);
  const rowCount = normalized.lastRow - normalized.firstRow + 1;
  const columnCount = normalized.lastColumn - normalized.firstColumn + 1;

  return rowCount <= columnCount
    ? collectIntersectingSpans(index, index.byRow, normalized.firstRow, normalized.lastRow, normalized)
    : collectIntersectingSpans(index, index.byColumn, normalized.firstColumn, normalized.lastColumn, normalized);
}

export function cellSpanToRange(span: CellSpan): CellSpanRange {
  return {
    firstRow: span.rowIndex,
    lastRow: span.rowIndex + span.rowSpan - 1,
    firstColumn: span.columnIndex,
    lastColumn: span.columnIndex + span.colSpan - 1
  };
}

export function normalizeCellSpanRange(range: IndexedRange): CellSpanRange {
  return {
    firstRow: Math.min(range.firstRow, range.lastRow),
    lastRow: Math.max(range.firstRow, range.lastRow),
    firstColumn: Math.min(range.firstColumn, range.lastColumn),
    lastColumn: Math.max(range.firstColumn, range.lastColumn)
  };
}

export function cellSpanRangesIntersect(left: IndexedRange, right: IndexedRange): boolean {
  const normalizedLeft = normalizeCellSpanRange(left);
  const normalizedRight = normalizeCellSpanRange(right);
  return normalizedLeft.firstRow <= normalizedRight.lastRow
    && normalizedLeft.lastRow >= normalizedRight.firstRow
    && normalizedLeft.firstColumn <= normalizedRight.lastColumn
    && normalizedLeft.lastColumn >= normalizedRight.firstColumn;
}

export function unionCellSpanRanges(left: IndexedRange, right: IndexedRange): CellSpanRange {
  const normalizedLeft = normalizeCellSpanRange(left);
  const normalizedRight = normalizeCellSpanRange(right);
  return {
    firstRow: Math.min(normalizedLeft.firstRow, normalizedRight.firstRow),
    lastRow: Math.max(normalizedLeft.lastRow, normalizedRight.lastRow),
    firstColumn: Math.min(normalizedLeft.firstColumn, normalizedRight.firstColumn),
    lastColumn: Math.max(normalizedLeft.lastColumn, normalizedRight.lastColumn)
  };
}

function indexCoveredCells(
  byRow: Map<number, CellSpan[]>,
  byColumn: Map<number, CellSpan[]>,
  coveredRowsBySpanId: Map<string, Set<number>>,
  coveredColumnsBySpanId: Map<string, Set<number>>,
  indexedCells: ReadonlyMap<string, CellSpan>
): void {
  const rowBuckets = new Map<number, Set<CellSpan>>();
  const columnBuckets = new Map<number, Set<CellSpan>>();

  for (const [key, span] of indexedCells) {
    const position = parseCellKey(key);
    if (!position) {
      continue;
    }
    addSpanToSet(rowBuckets, position.rowIndex, span);
    addSpanToSet(columnBuckets, position.columnIndex, span);
    addNumberToSet(coveredRowsBySpanId, span.id, position.rowIndex);
    addNumberToSet(coveredColumnsBySpanId, span.id, position.columnIndex);
  }

  for (const [rowIndex, spans] of rowBuckets) {
    byRow.set(rowIndex, [...spans]);
  }
  for (const [columnIndex, spans] of columnBuckets) {
    byColumn.set(columnIndex, [...spans]);
  }
}

function createAnchorCellMap(spans: readonly CellSpan[]): ReadonlyMap<string, CellSpan> {
  const anchors = new Map<string, CellSpan>();
  for (const span of spans) {
    anchors.set(createCellKey(span.rowIndex, span.columnIndex), span);
  }
  return anchors;
}

function parseCellKey(key: string): { readonly rowIndex: number; readonly columnIndex: number } | undefined {
  const separatorIndex = key.indexOf(":");
  if (separatorIndex <= 0 || separatorIndex === key.length - 1) {
    return undefined;
  }

  const rowIndex = Number(key.slice(0, separatorIndex));
  const columnIndex = Number(key.slice(separatorIndex + 1));
  return Number.isInteger(rowIndex) && Number.isInteger(columnIndex)
    ? { rowIndex, columnIndex }
    : undefined;
}

function addSpanToSet(map: Map<number, Set<CellSpan>>, key: number, span: CellSpan): void {
  const bucket = map.get(key);
  if (bucket) {
    bucket.add(span);
    return;
  }

  map.set(key, new Set([span]));
}

function addNumberToSet(map: Map<string, Set<number>>, key: string, value: number): void {
  const bucket = map.get(key);
  if (bucket) {
    bucket.add(value);
    return;
  }

  map.set(key, new Set([value]));
}

function freezeSpanBucketMap(map: Map<number, CellSpan[]>): ReadonlyMap<number, readonly CellSpan[]> {
  const frozen = new Map<number, readonly CellSpan[]>();
  for (const [key, spans] of map) {
    frozen.set(key, Object.freeze(sortSpans(spans)));
  }
  return frozen;
}

function collectIntersectingSpans(
  index: CellSpanIndex,
  map: ReadonlyMap<number, readonly CellSpan[]>,
  firstKey: number,
  lastKey: number,
  range: CellSpanRange
): readonly CellSpan[] {
  const matches = new Set<CellSpan>();
  for (let key = firstKey; key <= lastKey; key += 1) {
    for (const span of map.get(key) ?? []) {
      if (isSpanIndexedInRange(index, span, range)) {
        matches.add(span);
      }
    }
  }
  return Object.freeze(sortSpans([...matches]));
}

function freezeNumberBucketMap(map: Map<string, Set<number>>): ReadonlyMap<string, readonly number[]> {
  const frozen = new Map<string, readonly number[]>();
  for (const [key, values] of map) {
    frozen.set(key, Object.freeze([...values].sort((left, right) => left - right)));
  }
  return frozen;
}

function isSpanIndexedInRange(index: CellSpanIndex, span: CellSpan, range: CellSpanRange): boolean {
  const rows = index.coveredRowsBySpanId.get(span.id);
  const columns = index.coveredColumnsBySpanId.get(span.id);
  return hasNumberInRange(rows, range.firstRow, range.lastRow)
    && hasNumberInRange(columns, range.firstColumn, range.lastColumn);
}

function hasNumberInRange(values: readonly number[] | undefined, first: number, last: number): boolean {
  if (!values || values.length === 0) {
    return false;
  }

  let low = 0;
  let high = values.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const value = values[mid] ?? 0;
    if (value < first) {
      low = mid + 1;
    } else if (value > last) {
      high = mid - 1;
    } else {
      return true;
    }
  }
  return false;
}

function sortSpans(spans: readonly CellSpan[]): CellSpan[] {
  return [...spans].sort((left, right) => {
    if (left.rowIndex !== right.rowIndex) {
      return left.rowIndex - right.rowIndex;
    }
    if (left.columnIndex !== right.columnIndex) {
      return left.columnIndex - right.columnIndex;
    }
    return left.id.localeCompare(right.id);
  });
}
