import { createHeaderAriaLabel } from "./headerAria.js";
import type {
  ColumnModel,
  NormalizedColumn,
  NormalizedColumnGroup,
  NormalizedDataColumn
} from "../column/index.js";
import type { HeaderCell, HeaderRow } from "./headerTypes.js";

export function createHeaderMatrixRows<TData>(
  columnModel: ColumnModel<TData>
): readonly HeaderRow[] {
  const maxDepth = getMaxLeafDepth(columnModel.visibleLeafColumns);
  const rows: HeaderRow[] = [];

  for (let depth = 0; depth <= maxDepth; depth += 1) {
    rows.push(Object.freeze({
      depth,
      cells: Object.freeze(createHeaderRowCells(columnModel, depth, maxDepth))
    }));
  }

  return Object.freeze(rows);
}

export function offsetHeaderRows(
  rows: readonly HeaderRow[],
  depthOffset: number
): readonly HeaderRow[] {
  if (depthOffset === 0) {
    return rows;
  }

  return Object.freeze(rows.map((row) =>
    Object.freeze({
      depth: row.depth + depthOffset,
      cells: Object.freeze(row.cells.map((cell) => offsetHeaderCell(cell, depthOffset)))
    })
  ));
}

function createHeaderRowCells<TData>(
  columnModel: ColumnModel<TData>,
  depth: number,
  maxDepth: number
): readonly HeaderCell[] {
  const cells: HeaderCell[] = [];
  let index = 0;

  while (index < columnModel.visibleLeafColumns.length) {
    const leaf = columnModel.visibleLeafColumns[index];
    if (!leaf) {
      break;
    }

    const headerColumn = getHeaderColumnAtDepth(leaf, depth, columnModel);
    if (!headerColumn) {
      index += 1;
      continue;
    }

    const startLeafIndex = index;
    while (index + 1 < columnModel.visibleLeafColumns.length) {
      const nextLeaf = columnModel.visibleLeafColumns[index + 1];
      const nextColumn = nextLeaf
        ? getHeaderColumnAtDepth(nextLeaf, depth, columnModel)
        : undefined;
      if (!nextColumn || nextColumn.id !== headerColumn.id) {
        break;
      }
      index += 1;
    }

    cells.push(createHeaderCell(headerColumn, depth, maxDepth, startLeafIndex, index, columnModel));
    index += 1;
  }

  return cells;
}

function createHeaderCell<TData>(
  column: NormalizedColumn<TData>,
  depth: number,
  maxDepth: number,
  startLeafIndex: number,
  endLeafIndex: number,
  columnModel: ColumnModel<TData>
): HeaderCell {
  const columnIds = getLeafIdsInRange(columnModel, startLeafIndex, endLeafIndex);
  const kind = column.kind === "group" ? "group" : "column";
  const rowSpan = kind === "column" ? maxDepth - depth + 1 : 1;

  return Object.freeze({
    id: `${column.id}@${depth}:${startLeafIndex}`,
    kind,
    sourceId: column.id,
    headerName: column.headerName,
    depth,
    rowSpan,
    colSpan: columnIds.length,
    startLeafIndex,
    endLeafIndex,
    columnIds,
    pinned: column.pinned,
    ariaLabel: createHeaderAriaLabel(column.headerName, columnIds.length, kind)
  });
}

function getHeaderColumnAtDepth<TData>(
  leaf: NormalizedDataColumn<TData>,
  depth: number,
  columnModel: ColumnModel<TData>
): NormalizedColumn<TData> | undefined {
  if (depth === leaf.depth) {
    return leaf;
  }

  if (depth > leaf.depth) {
    return undefined;
  }

  return getAncestorAtDepth(leaf, depth, columnModel);
}

function getAncestorAtDepth<TData>(
  column: NormalizedDataColumn<TData>,
  depth: number,
  columnModel: ColumnModel<TData>
): NormalizedColumnGroup<TData> | undefined {
  let parentId = column.parentId;

  while (parentId) {
    const parent = columnModel.byId.get(parentId);
    if (!parent || parent.kind !== "group") {
      return undefined;
    }

    if (parent.depth === depth) {
      return parent;
    }

    parentId = parent.parentId;
  }

  return undefined;
}

function getLeafIdsInRange<TData>(
  columnModel: ColumnModel<TData>,
  startLeafIndex: number,
  endLeafIndex: number
): readonly string[] {
  return Object.freeze(
    columnModel.visibleLeafColumns
      .slice(startLeafIndex, endLeafIndex + 1)
      .map((column) => column.id)
  );
}

function offsetHeaderCell(cell: HeaderCell, depthOffset: number): HeaderCell {
  return Object.freeze({
    ...cell,
    id: `${cell.id}+${depthOffset}`,
    depth: cell.depth + depthOffset
  });
}

function getMaxLeafDepth<TData>(columns: readonly NormalizedDataColumn<TData>[]): number {
  return Math.max(0, ...columns.map((column) => column.depth));
}
