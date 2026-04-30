import type { ColumnDef } from "../types/column.js";
import type { FilterModel, RowKey, RowModelKind, SortModel } from "../types/shared.js";

export interface GridState<TData = unknown> {
  readonly version: number;
  readonly rowModel: RowModelKind;
  readonly columns: readonly ColumnDef<TData>[];
  readonly rows: readonly TData[];
  readonly selection: SelectionState;
  readonly sortModel: readonly SortModel[];
  readonly filterModel: FilterModel;
  readonly pagination: PaginationState;
  readonly status: GridStatus;
}

export interface SelectionState {
  readonly rowKeys: readonly RowKey[];
}

export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly rowCount?: number;
}

export interface GridStatus {
  readonly loading: boolean;
  readonly error?: unknown;
}

export interface InitialGridStateOptions<TData = unknown> {
  readonly rowModel?: RowModelKind;
  readonly columns?: readonly ColumnDef<TData>[];
  readonly rows?: readonly TData[];
  readonly pageSize?: number;
}

export type GridStateUpdater<TData = unknown> = (state: GridState<TData>) => GridState<TData>;

export function createInitialGridState<TData = unknown>(
  options: InitialGridStateOptions<TData> = {}
): GridState<TData> {
  return freezeGridState({
    version: 0,
    rowModel: options.rowModel ?? "client",
    columns: [...(options.columns ?? [])],
    rows: [...(options.rows ?? [])],
    selection: { rowKeys: [] },
    sortModel: [],
    filterModel: {},
    pagination: {
      page: 1,
      pageSize: options.pageSize ?? 100
    },
    status: {
      loading: false
    }
  });
}

export function freezeGridState<TData>(state: GridState<TData>): GridState<TData> {
  Object.freeze(state.selection.rowKeys);
  Object.freeze(state.selection);
  Object.freeze(state.columns);
  Object.freeze(state.rows);
  Object.freeze(state.sortModel);
  Object.freeze(state.filterModel);
  Object.freeze(state.pagination);
  Object.freeze(state.status);
  return Object.freeze(state);
}

export function nextGridState<TData>(
  state: GridState<TData>,
  patch: Omit<Partial<GridState<TData>>, "version">
): GridState<TData> {
  return freezeGridState({
    ...state,
    ...patch,
    version: state.version + 1
  });
}
