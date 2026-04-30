import type { ColumnDef, DataColumnDef } from "../types/column.js";
import type { SortCycleItem, SortDirection, SortModel } from "../types/shared.js";

const DEFAULT_SORT_ORDER: readonly SortCycleItem[] = Object.freeze(["asc", "desc", null]);

export interface NextSortModelOptions {
  readonly multiSort?: boolean;
  readonly additive?: boolean;
  readonly sortOrder?: readonly SortCycleItem[];
}

export function normalizeSortModel(
  model: readonly SortModel[] | undefined
): readonly SortModel[] {
  if (!model || model.length === 0) {
    return Object.freeze([]);
  }

  const seen = new Set<string>();
  return Object.freeze(
    [...model]
      .map((sort, index) => ({ ...sort, priority: sort.priority ?? index }))
      .sort((left, right) => (left.priority ?? 0) - (right.priority ?? 0))
      .filter((sort) => {
        if (seen.has(sort.field)) {
          return false;
        }
        seen.add(sort.field);
        return true;
      })
      .map((sort, index) => Object.freeze({
        field: sort.field,
        direction: sort.direction,
        priority: index
      }))
  );
}

export function createInitialSortModel<TData>(
  columns: readonly ColumnDef<TData>[],
  model: readonly SortModel[] | undefined
): readonly SortModel[] {
  if (model !== undefined) {
    return normalizeSortModel(model);
  }

  const initial = collectDataColumns(columns)
    .filter((column) => column.sortable !== false && column.sort !== undefined)
    .map((column, index) => Object.freeze({
      field: column.field,
      direction: column.sort as SortDirection,
      priority: index
    }));

  return Object.freeze(initial);
}

export function getNextSortModel(
  currentModel: readonly SortModel[] | undefined,
  field: string,
  options: NextSortModelOptions = {}
): readonly SortModel[] {
  const current = normalizeSortModel(currentModel);
  const currentSort = current.find((sort) => sort.field === field);
  const nextDirection = getNextDirection(currentSort?.direction, options.sortOrder);
  const base = options.multiSort === true && options.additive === true
    ? current.filter((sort) => sort.field !== field)
    : [];

  return normalizeSortModel(
    nextDirection === null
      ? base
      : [...base, { field, direction: nextDirection }]
  );
}

function getNextDirection(
  current: SortDirection | undefined,
  sortOrder: readonly SortCycleItem[] | undefined
): SortCycleItem {
  const order = normalizeSortOrder(sortOrder);
  const currentIndex = order.findIndex((direction) => direction === (current ?? null));
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % order.length
    : 0;
  return order[nextIndex] ?? null;
}

function normalizeSortOrder(
  sortOrder: readonly SortCycleItem[] | undefined
): readonly SortCycleItem[] {
  const order = sortOrder?.length ? sortOrder : DEFAULT_SORT_ORDER;
  return order.some((direction) => direction !== null)
    ? order
    : DEFAULT_SORT_ORDER;
}

function collectDataColumns<TData>(
  columns: readonly ColumnDef<TData>[]
): readonly DataColumnDef<TData>[] {
  return columns.flatMap((column) =>
    "children" in column ? collectDataColumns(column.children) : [column]
  );
}
