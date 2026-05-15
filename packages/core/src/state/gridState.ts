import type { ColumnDef } from "../types/column.js";
import { freezeColumnUiState } from "../column/columnUi.js";
import type { ColumnUiState } from "../column/columnUi.js";
import { freezeRowModelStateSnapshot } from "../row/rowModelState.js";
import type { RowModelStateSnapshot } from "../row/rowModelState.js";
import type { GridSelectionState } from "../selection/selectionModel.js";
import type { FilterModel, GroupModel, RowKey, RowModelKind, SortModel } from "../types/shared.js";

export const GRID_STATE_SNAPSHOT_VERSION = 1;

export interface GridStateSnapshot {
  readonly version?: number;
  readonly columnState?: ColumnUiState;
  readonly sortModel?: readonly SortModel[];
  readonly filterModel?: FilterModel;
  readonly groupModel?: GroupModel;
  readonly rowModelState?: RowModelStateSnapshot;
  readonly selection?: GridSelectionState;
  readonly pagination?: GridStatePaginationSnapshot;
  readonly scroll?: GridStateScrollSnapshot;
  readonly locale?: string;
}

export interface GridStatePaginationSnapshot {
  readonly page?: number;
  readonly pageSize?: number;
}

export interface GridStateScrollSnapshot {
  readonly top?: number;
  readonly left?: number;
}

export interface SetGridStateOptions {
  readonly render?: boolean;
  readonly reason?: string;
}

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

export function freezeGridStateSnapshot(snapshot: GridStateSnapshot): GridStateSnapshot {
  return Object.freeze({
    version: snapshot.version ?? GRID_STATE_SNAPSHOT_VERSION,
    ...(snapshot.columnState === undefined ? {} : { columnState: freezeColumnUiState(snapshot.columnState) }),
    ...(snapshot.sortModel === undefined ? {} : { sortModel: cloneSortModel(snapshot.sortModel) }),
    ...(snapshot.filterModel === undefined ? {} : { filterModel: cloneFilterModel(snapshot.filterModel) }),
    ...(snapshot.groupModel === undefined ? {} : { groupModel: cloneGroupModel(snapshot.groupModel) }),
    ...(snapshot.rowModelState === undefined
      ? {}
      : { rowModelState: freezeRowModelStateSnapshot(snapshot.rowModelState) }),
    ...(snapshot.selection === undefined ? {} : { selection: cloneSelection(snapshot.selection) }),
    ...(snapshot.pagination === undefined ? {} : { pagination: clonePagination(snapshot.pagination) }),
    ...(snapshot.scroll === undefined ? {} : { scroll: cloneScroll(snapshot.scroll) }),
    ...(snapshot.locale === undefined ? {} : { locale: snapshot.locale })
  });
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

function cloneSortModel(model: readonly SortModel[]): readonly SortModel[] {
  return Object.freeze(model.map((sort) => Object.freeze({ ...sort })));
}

function cloneFilterModel(model: FilterModel): FilterModel {
  return Object.freeze({
    ...(model.conditions === undefined
      ? {}
      : {
          conditions: Object.freeze(
            model.conditions.map((condition) =>
              Object.freeze({ ...condition, value: cloneSnapshotValue(condition.value) })
            )
          )
        }),
    ...(model.quickText === undefined ? {} : { quickText: model.quickText }),
    ...(model.custom === undefined ? {} : { custom: Object.freeze({ ...model.custom }) })
  });
}

function cloneGroupModel(model: GroupModel): GroupModel {
  return Object.freeze({
    ...(model.fields === undefined ? {} : { fields: Object.freeze([...model.fields]) }),
    ...(model.expandedKeys === undefined ? {} : { expandedKeys: Object.freeze([...model.expandedKeys]) })
  });
}

function cloneSelection(selection: GridSelectionState): GridSelectionState {
  return Object.freeze({
    mode: selection.mode,
    rowKeys: Object.freeze([...selection.rowKeys]),
    cells: Object.freeze(selection.cells.map((cell) => Object.freeze({ ...cell }))),
    ranges: Object.freeze(selection.ranges.map((range) =>
      Object.freeze({
        ...range,
        anchor: Object.freeze({ ...range.anchor }),
        focus: Object.freeze({ ...range.focus })
      })
    )),
    ...(selection.allRowsToken === undefined
      ? {}
      : { allRowsToken: Object.freeze({ ...selection.allRowsToken }) })
  });
}

function clonePagination(pagination: GridStatePaginationSnapshot): GridStatePaginationSnapshot {
  return Object.freeze({ ...pagination });
}

function cloneScroll(scroll: GridStateScrollSnapshot): GridStateScrollSnapshot {
  return Object.freeze({ ...scroll });
}

function cloneSnapshotValue(value: unknown): unknown {
  return Array.isArray(value) ? Object.freeze([...value]) : value;
}
