import type { ColumnModel, NormalizedDataColumn } from "./columnModel.js";
import type { DataColumnDef } from "../types/column.js";
import type { ColumnId } from "../types/shared.js";

export function canResizeColumn<TData>(column: NormalizedDataColumn<TData>): boolean {
  return column.source.resizable !== false;
}

export function canMoveColumn<TData>(column: NormalizedDataColumn<TData>): boolean {
  return column.source.movable !== false && column.source.lockPosition !== true;
}

export function canChangeColumnVisibility<TData>(column: NormalizedDataColumn<TData>): boolean {
  return canChangeColumnVisibilityDef(column.source);
}

export function canChangeColumnPinning<TData>(column: NormalizedDataColumn<TData>): boolean {
  return canChangeColumnPinningDef(column.source);
}

export function canChangeColumnVisibilityDef<TData>(column: DataColumnDef<TData>): boolean {
  return column.hideable !== false && column.lockVisible !== true;
}

export function canChangeColumnPinningDef<TData>(column: DataColumnDef<TData>): boolean {
  return column.pinnable !== false && column.lockPinned !== true;
}

export function enforceColumnPositionPolicy<TData>(
  model: ColumnModel<TData>,
  currentOrder: readonly ColumnId[],
  requestedOrder: readonly ColumnId[]
): readonly ColumnId[] {
  const lockedIds = new Set(
    model.leafColumns.filter((column) => !canMoveColumn(column)).map((column) => column.id)
  );
  if (lockedIds.size === 0) {
    return Object.freeze([...requestedOrder]);
  }

  const movableIds = requestedOrder.filter((columnId) => !lockedIds.has(columnId));
  const movableQueue = [...movableIds];
  const nextOrder = currentOrder.map((columnId) =>
    lockedIds.has(columnId) ? columnId : movableQueue.shift()
  );

  return Object.freeze([
    ...nextOrder.filter((columnId): columnId is ColumnId => columnId !== undefined),
    ...movableQueue
  ]);
}
