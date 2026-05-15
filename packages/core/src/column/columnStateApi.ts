import type { ColumnModel, NormalizedDataColumn } from "./columnModel.js";
import type { ColumnUiColumnState, ColumnUiGroupState, ColumnUiState } from "./columnUi.js";
import { freezeColumnUiState } from "./columnUi.js";
import { createColumnGroupStateSnapshot, isGroupColumn } from "./columnGroupState.js";
import { enforceMarriedColumnOrder } from "./columnOrder.js";
import {
  canChangeColumnPinning,
  canChangeColumnVisibility,
  enforceColumnPositionPolicy
} from "./columnPolicy.js";
import type { ColumnId } from "../types/shared.js";

export interface GetColumnStateOptions {
  readonly includeDefaults?: boolean;
}

export interface ApplyColumnStateParams {
  readonly state?: ColumnUiState;
  readonly defaultState?: ColumnUiColumnState;
  readonly applyOrder?: boolean;
  readonly ignoreMissingColumns?: boolean;
}

export interface ColumnStateApplyResult {
  readonly applied: boolean;
  readonly state: ColumnUiState;
  readonly appliedColumnIds: readonly ColumnId[];
  readonly appliedGroupIds: readonly ColumnId[];
  readonly missingColumnIds: readonly ColumnId[];
  readonly missingGroupIds: readonly ColumnId[];
}

export function createColumnStateSnapshot<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  options: GetColumnStateOptions = {}
): ColumnUiState {
  if (options.includeDefaults !== true) {
    return freezeColumnUiState(state);
  }

  const columns = Object.fromEntries(
    model.leafColumns.map((column) => [
      column.id,
      Object.freeze({
        width: column.width,
        hidden: column.hidden,
        pinned: column.pinned ?? null
      })
    ])
  );

  const groups = createColumnGroupStateSnapshot(model);
  return freezeColumnUiState({
    order: model.order.all,
    columns,
    ...(groups === undefined ? {} : { groups })
  });
}

export function constrainColumnUiState<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  currentOrder: readonly ColumnId[] = model.order.all
): ColumnUiState {
  const frozenState = freezeColumnUiState(state);
  const order = frozenState.order === undefined
    ? undefined
    : enforceColumnPositionPolicy(
        model,
        currentOrder,
        enforceMarriedColumnOrder(model, frozenState.order)
      );
  const columns = constrainColumnPatches(model, frozenState.columns);
  const groups = constrainGroupPatches(model, frozenState.groups);
  return freezeColumnUiState({
    ...(order === undefined ? {} : { order }),
    ...(columns === undefined ? {} : { columns }),
    ...(groups === undefined ? {} : { groups })
  });
}

export function applyColumnUiState<TData>(
  model: ColumnModel<TData>,
  currentState: ColumnUiState,
  params: ApplyColumnStateParams
): ColumnStateApplyResult {
  const requestedState = params.state ?? {};
  const missingColumnIds = collectMissingColumnIds(model, requestedState);
  const missingGroupIds = collectMissingGroupIds(model, requestedState);
  if ((missingColumnIds.length > 0 || missingGroupIds.length > 0) && params.ignoreMissingColumns !== true) {
    return createApplyResult(false, currentState, [], [], missingColumnIds, missingGroupIds);
  }

  const order = resolveAppliedOrder(model, currentState, requestedState, params);
  const columns = applyColumnPatches(model, currentState, requestedState, params);
  const groups = applyGroupPatches(model, currentState, requestedState);
  const nextState = freezeColumnUiState({
    ...(order === undefined ? {} : { order }),
    ...(columns === undefined ? {} : { columns }),
    ...(groups === undefined ? {} : { groups })
  });

  return createApplyResult(
    true,
    nextState,
    collectAppliedColumnIds(model, requestedState, params),
    collectAppliedGroupIds(model, requestedState),
    missingColumnIds,
    missingGroupIds
  );
}

function collectMissingColumnIds<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState
): readonly ColumnId[] {
  const missing = new Set<ColumnId>();
  for (const columnId of state.order ?? []) {
    if (!isDataColumn(model, columnId)) {
      missing.add(columnId);
    }
  }
  for (const columnId of Object.keys(state.columns ?? {})) {
    if (!isDataColumn(model, columnId)) {
      missing.add(columnId);
    }
  }
  return Object.freeze([...missing]);
}

function collectMissingGroupIds<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState
): readonly ColumnId[] {
  return Object.freeze(
    Object.keys(state.groups ?? {}).filter((groupId) => !isGroupColumn(model, groupId))
  );
}

function resolveAppliedOrder<TData>(
  model: ColumnModel<TData>,
  currentState: ColumnUiState,
  requestedState: ColumnUiState,
  params: ApplyColumnStateParams
): readonly ColumnId[] | undefined {
  if (params.applyOrder !== true || requestedState.order === undefined) {
    return currentState.order;
  }

  const validRequestedIds = requestedState.order.filter((columnId) => isDataColumn(model, columnId));
  const requested = new Set(validRequestedIds);
  const currentOrder = currentState.order ?? model.order.all;
  const tail = currentOrder.filter((columnId) => !requested.has(columnId));
  return enforceColumnPositionPolicy(
    model,
    currentOrder,
    enforceMarriedColumnOrder(model, [...validRequestedIds, ...tail])
  );
}

function applyColumnPatches<TData>(
  model: ColumnModel<TData>,
  currentState: ColumnUiState,
  requestedState: ColumnUiState,
  params: ApplyColumnStateParams
): Readonly<Record<string, ColumnUiColumnState>> | undefined {
  const currentColumns = currentState.columns ?? {};
  const requestedColumns = requestedState.columns ?? {};
  const nextColumns: Record<string, ColumnUiColumnState> = { ...currentColumns };
  const requestedIds = new Set(Object.keys(requestedColumns));

  if (params.defaultState !== undefined) {
    for (const column of model.leafColumns) {
      if (!requestedIds.has(column.id)) {
        nextColumns[column.id] = mergeColumnState(
          nextColumns[column.id],
          normalizeColumnPatch(column, params.defaultState)
        );
      }
    }
  }

  for (const [columnId, patch] of Object.entries(requestedColumns)) {
    const column = getDataColumn(model, columnId);
    if (column !== undefined) {
      nextColumns[columnId] = mergeColumnState(
        nextColumns[columnId],
        normalizeColumnPatch(column, patch)
      );
    }
  }

  return Object.keys(nextColumns).length === 0 ? undefined : Object.freeze(nextColumns);
}

function applyGroupPatches<TData>(
  model: ColumnModel<TData>,
  currentState: ColumnUiState,
  requestedState: ColumnUiState
): Readonly<Record<string, ColumnUiGroupState>> | undefined {
  const nextGroups = { ...(currentState.groups ?? {}) };
  for (const [groupId, patch] of Object.entries(requestedState.groups ?? {})) {
    if (isGroupColumn(model, groupId) && patch.open !== undefined) {
      nextGroups[groupId] = Object.freeze({ open: patch.open });
    }
  }

  return Object.keys(nextGroups).length === 0 ? undefined : Object.freeze(nextGroups);
}

function collectAppliedColumnIds<TData>(
  model: ColumnModel<TData>,
  requestedState: ColumnUiState,
  params: ApplyColumnStateParams
): readonly ColumnId[] {
  const applied = new Set<ColumnId>();
  for (const columnId of Object.keys(requestedState.columns ?? {})) {
    if (isDataColumn(model, columnId)) {
      applied.add(columnId);
    }
  }
  if (params.defaultState !== undefined) {
    for (const column of model.leafColumns) {
      if (requestedState.columns?.[column.id] === undefined) {
        applied.add(column.id);
      }
    }
  }
  return Object.freeze([...applied]);
}

function collectAppliedGroupIds<TData>(
  model: ColumnModel<TData>,
  requestedState: ColumnUiState
): readonly ColumnId[] {
  return Object.freeze(
    Object.keys(requestedState.groups ?? {}).filter((groupId) => isGroupColumn(model, groupId))
  );
}

function normalizeColumnPatch<TData>(
  column: NormalizedDataColumn<TData>,
  patch: ColumnUiColumnState
): ColumnUiColumnState {
  return Object.freeze({
    ...("width" in patch && patch.width !== undefined ? { width: clampWidth(patch.width, column) } : {}),
    ...("hidden" in patch && patch.hidden !== undefined && canChangeColumnVisibility(column)
      ? { hidden: patch.hidden }
      : {}),
    ...("pinned" in patch && patch.pinned !== undefined && canChangeColumnPinning(column)
      ? { pinned: patch.pinned }
      : {})
  });
}

function constrainColumnPatches<TData>(
  model: ColumnModel<TData>,
  columns: Readonly<Record<string, ColumnUiColumnState>> | undefined
): Readonly<Record<string, ColumnUiColumnState>> | undefined {
  if (columns === undefined) {
    return undefined;
  }

  const constrained = Object.fromEntries(
    Object.entries(columns).flatMap(([columnId, patch]) => {
      const column = getDataColumn(model, columnId);
      if (column === undefined) {
        return [];
      }

      const nextPatch = normalizeColumnPatch(column, patch);
      return Object.keys(nextPatch).length === 0 ? [] : [[columnId, nextPatch]];
    })
  );

  return Object.keys(constrained).length === 0 ? undefined : Object.freeze(constrained);
}

function constrainGroupPatches<TData>(
  model: ColumnModel<TData>,
  groups: Readonly<Record<string, ColumnUiGroupState>> | undefined
): Readonly<Record<string, ColumnUiGroupState>> | undefined {
  if (groups === undefined) {
    return undefined;
  }

  const constrained = Object.fromEntries(
    Object.entries(groups).flatMap(([groupId, patch]) =>
      isGroupColumn(model, groupId) && patch.open !== undefined
        ? [[groupId, Object.freeze({ open: patch.open })]]
        : []
    )
  );

  return Object.keys(constrained).length === 0 ? undefined : Object.freeze(constrained);
}

function mergeColumnState(
  previous: ColumnUiColumnState | undefined,
  patch: ColumnUiColumnState
): ColumnUiColumnState {
  return Object.freeze({
    ...(previous ?? {}),
    ...patch
  });
}

function createApplyResult(
  applied: boolean,
  state: ColumnUiState,
  appliedColumnIds: readonly ColumnId[],
  appliedGroupIds: readonly ColumnId[],
  missingColumnIds: readonly ColumnId[],
  missingGroupIds: readonly ColumnId[]
): ColumnStateApplyResult {
  return Object.freeze({
    applied,
    state: freezeColumnUiState(state),
    appliedColumnIds: Object.freeze([...appliedColumnIds]),
    appliedGroupIds: Object.freeze([...appliedGroupIds]),
    missingColumnIds: Object.freeze([...missingColumnIds]),
    missingGroupIds: Object.freeze([...missingGroupIds])
  });
}

function isDataColumn<TData>(model: ColumnModel<TData>, columnId: string): boolean {
  return getDataColumn(model, columnId) !== undefined;
}

function getDataColumn<TData>(
  model: ColumnModel<TData>,
  columnId: string
): NormalizedDataColumn<TData> | undefined {
  const column = model.byId.get(columnId);
  return column?.kind === "data" ? column : undefined;
}

function clampWidth<TData>(width: number, column: NormalizedDataColumn<TData>): number {
  const numericWidth = Number.isFinite(width) ? width : column.width;
  const lowerBoundedWidth = Math.max(numericWidth, column.minWidth);
  return column.maxWidth === undefined
    ? lowerBoundedWidth
    : Math.min(lowerBoundedWidth, column.maxWidth);
}
