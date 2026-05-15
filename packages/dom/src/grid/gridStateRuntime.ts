import {
  createInitialSortModel,
  createLocaleFormatter,
  createSelectionState,
  freezeGridStateSnapshot,
  isRowModelStateFor,
  normalizeFilterModel,
  normalizeSortModel
} from "@onegrid/core";
import { normalizePage, normalizePageSize } from "@onegrid/pagination";
import type {
  ColumnUiState,
  FilterModel,
  GridSelectionState,
  GridStateSnapshot,
  GroupModel,
  RowModelStateSnapshot,
  SortModel
} from "@onegrid/core";
import { applyFrozenColumnState } from "./frozenColumns.js";
import type { DomGridOptions } from "./oneGridTypes.js";

export interface DomGridRuntimeState {
  readonly columnState: ColumnUiState;
  readonly sortModel: readonly SortModel[];
  readonly filterModel: FilterModel;
  readonly groupModel: GroupModel;
  readonly rowModelState: RowModelStateSnapshot | undefined;
  readonly selectionState: GridSelectionState;
  readonly locale: string;
  readonly paginationPage: number;
  readonly paginationPageSize: number;
  readonly virtualScrollTop: number;
  readonly columnScrollLeft: number;
}

export interface DomGridStateSnapshotInput {
  readonly columnState: ColumnUiState;
  readonly sortModel: readonly SortModel[];
  readonly filterModel: FilterModel;
  readonly groupModel: GroupModel;
  readonly rowModelState?: RowModelStateSnapshot | undefined;
  readonly selectionState: GridSelectionState;
  readonly locale: string;
  readonly paginationPage: number;
  readonly paginationPageSize: number;
  readonly virtualScrollTop: number;
  readonly columnScrollLeft: number;
}

export function createInitialDomGridState<TData>(
  options: DomGridOptions<TData>
): DomGridRuntimeState {
  const snapshot = freezeGridStateSnapshot(options.initialState ?? {});
  const rowModel = options.rowModel ?? "client";
  return {
    columnState: applyFrozenColumnState(snapshot.columnState ?? options.columnState ?? {}, options.frozenColumns),
    sortModel: options.sorting?.enabled === false
      ? Object.freeze([])
      : getInitialSortModel(options, snapshot),
    filterModel: options.filtering?.enabled === false
      ? Object.freeze({})
      : normalizeFilterModel(snapshot.filterModel ?? options.filtering?.model),
    groupModel: snapshot.groupModel ?? options.grouping?.model ?? Object.freeze({}),
    rowModelState: isRowModelStateFor(snapshot.rowModelState, rowModel)
      ? snapshot.rowModelState
      : undefined,
    selectionState: snapshot.selection ?? createSelectionState(options.selection),
    locale: createLocaleFormatter(snapshot.locale ?? options.locale).locale,
    paginationPage: getInitialPage(options, snapshot),
    paginationPageSize: getInitialPageSize(options, snapshot),
    virtualScrollTop: normalizeScrollValue(snapshot.scroll?.top),
    columnScrollLeft: normalizeScrollValue(snapshot.scroll?.left)
  };
}

export function createDomGridStateSnapshot(
  input: DomGridStateSnapshotInput
): GridStateSnapshot {
  return freezeGridStateSnapshot({
    columnState: input.columnState,
    sortModel: input.sortModel,
    filterModel: input.filterModel,
    groupModel: input.groupModel,
    ...(input.rowModelState === undefined ? {} : { rowModelState: input.rowModelState }),
    selection: input.selectionState,
    pagination: {
      page: input.paginationPage,
      pageSize: input.paginationPageSize
    },
    scroll: {
      top: input.virtualScrollTop,
      left: input.columnScrollLeft
    },
    locale: input.locale
  });
}

export function getSnapshotRowIndex<TData>(
  options: DomGridOptions<TData>,
  snapshot: GridStateSnapshot
): number | undefined {
  const top = snapshot.scroll?.top;
  if (top === undefined) {
    return undefined;
  }

  const rowHeight = getEstimatedRowHeight(options);
  return Math.max(0, Math.floor(top / rowHeight));
}

function getInitialSortModel<TData>(
  options: DomGridOptions<TData>,
  snapshot: GridStateSnapshot
): readonly SortModel[] {
  return snapshot.sortModel === undefined
    ? createInitialSortModel(options.columns, options.sorting?.model)
    : normalizeSortModel(snapshot.sortModel);
}

function getInitialPage<TData>(
  options: DomGridOptions<TData>,
  snapshot: GridStateSnapshot
): number {
  return normalizePage(
    snapshot.pagination?.page
      ?? options.pagination?.page
      ?? (options.server?.initialPage === undefined ? undefined : options.server.initialPage + 1)
  );
}

function getInitialPageSize<TData>(
  options: DomGridOptions<TData>,
  snapshot: GridStateSnapshot
): number {
  return normalizePageSize(snapshot.pagination?.pageSize ?? options.pagination?.pageSize ?? options.server?.pageSize);
}

function getEstimatedRowHeight<TData>(options: DomGridOptions<TData>): number {
  const rowHeight = options.viewport?.rowHeight ?? options.virtualization?.rowHeight ?? options.rowHeight;
  return typeof rowHeight === "number" && Number.isFinite(rowHeight) && rowHeight > 0 ? rowHeight : 36;
}

function normalizeScrollValue(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined ? Math.max(0, value) : 0;
}
