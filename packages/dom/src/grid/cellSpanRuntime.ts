import {
  createCellSpanModel,
  createColumnModel,
  resolveCellSpanAnchor
} from "@onegrid/core";
import type {
  CellPosition,
  CellSpanModel,
  NormalizedDataColumn,
  RowKey,
  SelectedCell
} from "@onegrid/core";
import { createCellSpanRows, getRows } from "./renderGridData.js";
import type { DomGridOptions } from "./oneGridTypes.js";
import type { RowRenderState } from "./renderGridTypes.js";

export interface DomCellSpanSnapshot<TData> {
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly cellSpanModel: CellSpanModel;
}

export function createDomCellSpanSnapshot<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined
): DomCellSpanSnapshot<TData> {
  const columnModel = createColumnModel(options.columns, {
    ...(options.columnOrder === undefined ? {} : { columnOrder: options.columnOrder }),
    ...(options.columnState === undefined ? {} : { columnState: options.columnState })
  });
  const rows = getRows(options, rowRenderState);
  return Object.freeze({
    columns: columnModel.visibleLeafColumns,
    cellSpanModel: createCellSpanModel({
      rows: createCellSpanRows(rows),
      columns: columnModel.visibleLeafColumns,
      ...(options.merge === undefined ? {} : { options: options.merge }),
      ...(rowRenderState?.mergeMeta === undefined ? {} : { serverMeta: rowRenderState.mergeMeta }),
      ...(options.locale === undefined ? {} : { locale: options.locale })
    })
  });
}

export function resolveMergedSelectedCell<TData>(
  snapshot: DomCellSpanSnapshot<TData>,
  cell: SelectedCell
): SelectedCell {
  const anchor = resolveCellSpanAnchor(snapshot.cellSpanModel, cell.rowIndex, cell.columnIndex);
  if (!anchor) {
    return cell;
  }

  return {
    rowIndex: anchor.rowIndex,
    rowKey: resolveAnchorRowKey(anchor.rowKey, cell.rowKey),
    field: anchor.field,
    columnIndex: anchor.columnIndex
  };
}

export function resolveMergedCellPosition<TData>(
  snapshot: DomCellSpanSnapshot<TData>,
  position: CellPosition
): CellPosition {
  const columnIndex = snapshot.columns.findIndex((column) =>
    column.field === position.field || column.id === position.field
  );
  if (columnIndex < 0) {
    return position;
  }

  const anchor = resolveCellSpanAnchor(snapshot.cellSpanModel, position.rowIndex, columnIndex);
  if (!anchor) {
    return position;
  }

  const rowKey = resolveAnchorRowKey(anchor.rowKey, position.rowKey);
  return {
    rowIndex: anchor.rowIndex,
    field: anchor.field,
    ...(rowKey === undefined ? {} : { rowKey })
  };
}

function resolveAnchorRowKey(anchorRowKey: RowKey | undefined, fallback: RowKey): RowKey;
function resolveAnchorRowKey(anchorRowKey: RowKey | undefined, fallback: RowKey | undefined): RowKey | undefined;
function resolveAnchorRowKey(
  anchorRowKey: RowKey | undefined,
  fallback: RowKey | undefined
): RowKey | undefined {
  return anchorRowKey ?? fallback;
}
