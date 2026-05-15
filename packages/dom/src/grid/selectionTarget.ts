import type { SelectedCell } from "@onegrid/core";

export interface CellRenderedRange {
  readonly firstRow: number;
  readonly lastRow: number;
  readonly firstColumn: number;
  readonly lastColumn: number;
}

export function readCellSelectionTarget(cell: HTMLElement): SelectedCell | undefined {
  const rowKey = cell.dataset.editRowKey;
  const rowIndex = readNumber(cell.dataset.rowIndex);
  const field = cell.dataset.field;
  const columnId = cell.dataset.columnId;
  const ariaColIndex = readNumber(cell.getAttribute("aria-colindex"));
  if (rowKey === undefined || rowIndex === undefined || field === undefined || ariaColIndex === undefined) {
    return undefined;
  }

  return {
    rowKey,
    rowIndex,
    ...(columnId === undefined ? {} : { columnId }),
    field,
    columnIndex: ariaColIndex - 1
  };
}

export function getCellRenderedRange(target: SelectedCell, cell: HTMLElement): CellRenderedRange {
  const rowSpan = readPositiveInteger(cell.getAttribute("aria-rowspan")) ?? 1;
  const colSpan = readPositiveInteger(cell.getAttribute("aria-colspan")) ?? 1;
  return {
    firstRow: target.rowIndex,
    lastRow: target.rowIndex + rowSpan - 1,
    firstColumn: target.columnIndex,
    lastColumn: target.columnIndex + colSpan - 1
  };
}

function readNumber(value: string | undefined | null): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readPositiveInteger(value: string | undefined | null): number | undefined {
  const parsed = readNumber(value);
  return parsed === undefined || parsed < 1 ? undefined : Math.trunc(parsed);
}
