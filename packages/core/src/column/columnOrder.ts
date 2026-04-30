import type { NormalizedDataColumn, PinnedLeafColumns } from "./columnModel.js";

export function splitPinnedLeafColumns<TData>(
  columns: readonly NormalizedDataColumn<TData>[]
): PinnedLeafColumns<TData> {
  return Object.freeze({
    left: Object.freeze(columns.filter((column) => column.pinned === "left")),
    center: Object.freeze(columns.filter((column) => column.pinned === undefined)),
    right: Object.freeze(columns.filter((column) => column.pinned === "right"))
  });
}

export function applyColumnOrder<TData>(
  columns: readonly NormalizedDataColumn<TData>[],
  requestedOrder: readonly string[] | undefined
): readonly NormalizedDataColumn<TData>[] {
  if (!requestedOrder || requestedOrder.length === 0) {
    return Object.freeze(columns.map((column, orderIndex) => withOrderIndex(column, orderIndex)));
  }

  const byId = new Map(columns.map((column) => [column.id, column] as const));
  const ordered: NormalizedDataColumn<TData>[] = [];
  const used = new Set<string>();

  for (const id of requestedOrder) {
    const column = byId.get(id);
    if (column && !used.has(id)) {
      ordered.push(column);
      used.add(id);
    }
  }

  for (const column of columns) {
    if (!used.has(column.id)) {
      ordered.push(column);
    }
  }

  return Object.freeze(ordered.map((column, orderIndex) => withOrderIndex(column, orderIndex)));
}

function withOrderIndex<TData>(
  column: NormalizedDataColumn<TData>,
  orderIndex: number
): NormalizedDataColumn<TData> {
  if (column.orderIndex === orderIndex) {
    return column;
  }

  return Object.freeze({
    ...column,
    orderIndex
  });
}
