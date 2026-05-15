import { collectHeaderAriaLabels } from "./headerAria.js";
import { applyHeaderLabels } from "./headerLabels.js";
import { createHeaderMatrixRows, offsetHeaderRows } from "./headerMatrix.js";
import { createHeaderMergeRows } from "./headerMerge.js";
import { assertValidHeaderMergeRules } from "./headerMergeValidation.js";
import { createHeaderRegions } from "./headerRegions.js";
import { createHeaderTree } from "./headerTree.js";
import type { ColumnModel } from "../column/index.js";
import type { HeaderMergeOptions } from "../types/grid-options.js";
import type { HeaderCell, HeaderModel, HeaderRow } from "./headerTypes.js";

export interface HeaderModelOptions {
  readonly merge?: HeaderMergeOptions;
}

export function createHeaderModel<TData>(
  columnModel: ColumnModel<TData>,
  options: HeaderModelOptions = {}
): HeaderModel<TData> {
  const tree = createHeaderTree(columnModel);
  const matrixRows = createHeaderMatrixRows(columnModel);
  assertValidHeaderMergeRules(columnModel, options.merge, matrixRows);
  const mergeRows = createHeaderMergeRows(columnModel, options.merge);
  const rows = applyHeaderLabels(composeHeaderRows(mergeRows, matrixRows), options.merge);

  return Object.freeze({
    depth: rows.length,
    tree,
    rows,
    regions: createHeaderRegions(rows, columnModel),
    leafColumns: columnModel.visibleLeafColumns,
    ariaLabels: collectHeaderAriaLabels(rows)
  });
}

function composeHeaderRows(
  mergeRows: readonly HeaderRow[],
  matrixRows: readonly HeaderRow[]
): readonly HeaderRow[] {
  if (mergeRows.length === 0) {
    return matrixRows;
  }

  const promotedCells = promoteTopLevelLeafCells(mergeRows, matrixRows, mergeRows.length);
  const promotedSourceIds = new Set(promotedCells.map((cell) => cell.sourceId));
  const adjustedMergeRows = mergeRows.map((row, index) =>
    index === 0
      ? freezeRow({
          depth: row.depth,
          cells: [...row.cells, ...promotedCells].sort(byLeafIndex)
        })
      : row
  );
  const adjustedMatrixRows = offsetHeaderRows(matrixRows, mergeRows.length).map((row) =>
    row.depth === mergeRows.length
      ? freezeRow({
          depth: row.depth,
          cells: row.cells.filter((cell) => !promotedSourceIds.has(cell.sourceId))
        })
      : row
  );

  return freezeRows([...adjustedMergeRows, ...adjustedMatrixRows]);
}

function promoteTopLevelLeafCells(
  mergeRows: readonly HeaderRow[],
  matrixRows: readonly HeaderRow[],
  depthOffset: number
): readonly HeaderCell[] {
  const firstMatrixRow = matrixRows[0];
  if (!firstMatrixRow) {
    return Object.freeze([]);
  }

  const coveredColumnIds = new Set(
    mergeRows.flatMap((row) => row.cells.flatMap((cell) => cell.columnIds))
  );

  return Object.freeze(
    firstMatrixRow.cells
      .filter((cell) => cell.kind === "column")
      .filter((cell) => !cell.columnIds.some((columnId) => coveredColumnIds.has(columnId)))
      .map((cell) =>
        Object.freeze({
          ...cell,
          id: `${cell.id}:promoted`,
          depth: 0,
          rowSpan: cell.rowSpan + depthOffset
        })
      )
  );
}

function freezeRow(row: HeaderRow): HeaderRow {
  return Object.freeze({
    depth: row.depth,
    cells: Object.freeze(row.cells)
  });
}

function freezeRows(rows: readonly HeaderRow[]): readonly HeaderRow[] {
  return Object.freeze(rows);
}

function byLeafIndex(
  left: { readonly startLeafIndex: number },
  right: { readonly startLeafIndex: number }
): number {
  return left.startLeafIndex - right.startLeafIndex;
}
