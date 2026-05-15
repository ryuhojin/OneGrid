import type { ColumnModel, NormalizedDataColumn } from "./columnModel.js";
import { enforceMarriedColumnOrder, getMarriedColumnBlock } from "./columnOrder.js";
import { measureColumnWidth } from "./columnMeasure.js";
import {
  canChangeColumnPinning,
  canChangeColumnVisibility,
  canMoveColumn,
  canResizeColumn,
  enforceColumnPositionPolicy
} from "./columnPolicy.js";
import type { DataColumnDef } from "../types/column.js";
import type { ColumnId, PinnedSide } from "../types/shared.js";

export interface ColumnUiState {
  readonly order?: readonly string[];
  readonly columns?: Readonly<Record<string, ColumnUiColumnState>>;
  readonly groups?: Readonly<Record<string, ColumnUiGroupState>>;
}

export interface ColumnUiColumnState {
  readonly width?: number;
  readonly hidden?: boolean;
  readonly pinned?: PinnedSide | null;
}

export interface ColumnUiGroupState {
  readonly open?: boolean;
}

export interface SetColumnStateOptions {
  readonly render?: boolean;
  readonly reason?: string;
}

export interface ColumnAutoSizeOptions<TData = unknown> {
  readonly rows?: readonly TData[];
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly charWidth?: number;
  readonly horizontalPadding?: number;
  readonly maxRows?: number;
}

export type ColumnMenuAction =
  | "autoSize"
  | "hide"
  | "pinLeft"
  | "pinRight"
  | "unpin"
  | "moveLeft"
  | "moveRight";

export interface ColumnMenuItem {
  readonly action: ColumnMenuAction;
  readonly label: string;
  readonly enabled: boolean;
}

export interface ColumnMenuModel {
  readonly columnId: string;
  readonly headerName: string;
  readonly items: readonly ColumnMenuItem[];
}

export interface ColumnMenuExtensionContext<TData = unknown> {
  readonly columnId: ColumnId;
  readonly headerName: string;
  readonly column: DataColumnDef<TData>;
}

export type ColumnMenuExtensionPredicate<TData = unknown> = (context: ColumnMenuExtensionContext<TData>) => boolean;

export interface ColumnMenuExtensionPayload<TData = unknown> {
  readonly label: string;
  readonly visible?: boolean | ColumnMenuExtensionPredicate<TData>;
  readonly disabled?: boolean | ColumnMenuExtensionPredicate<TData>;
  onSelect?(context: ColumnMenuExtensionContext<TData>): void;
}

export interface ColumnsToolPanelModel {
  readonly columns: readonly ColumnsToolPanelColumn[];
}

export interface ColumnsToolPanelColumn {
  readonly id: string;
  readonly headerName: string;
  readonly hidden: boolean;
  readonly pinned: PinnedSide | undefined;
  readonly hideable: boolean;
  readonly pinnable: boolean;
  readonly groupPath: readonly string[];
}

export function resizeColumn<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  width: number
): ColumnUiState {
  const column = getDataColumn(model, columnId);
  if (!column || !canResizeColumn(column)) {
    return state;
  }

  return patchColumnState(state, columnId, { width: clampWidth(width, column) });
}

export function autoSizeColumn<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  options: ColumnAutoSizeOptions<TData> = {}
): ColumnUiState {
  const column = getDataColumn(model, columnId);
  if (!column || !canResizeColumn(column)) {
    return state;
  }

  const measuredWidth = measureColumnWidth(column, options);
  return patchColumnState(state, columnId, { width: clampWidth(measuredWidth, column) });
}

export function moveColumn<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  targetIndex: number
): ColumnUiState {
  const order = getEffectiveOrder(model, state);
  const movingIds = getMovableBlockIds(model, order, columnId);
  const sourceIndex = order.findIndex((id) => movingIds.includes(id));
  if (sourceIndex < 0 || movingIds.length === 0) {
    return state;
  }

  const movingIdSet = new Set(movingIds);
  const withoutSource = order.filter((id) => !movingIdSet.has(id));
  const nextIndex = clampIndex(targetIndex, withoutSource.length);
  const nextOrder = enforceColumnPositionPolicy(
    model,
    order,
    enforceMarriedColumnOrder(model, [
      ...withoutSource.slice(0, nextIndex),
      ...movingIds,
      ...withoutSource.slice(nextIndex)
    ])
  );

  return { ...state, order: Object.freeze(nextOrder) };
}

export function moveColumnBefore<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  targetColumnId: string
): ColumnUiState {
  const order = getEffectiveOrder(model, state);
  const movingIds = new Set(getMarriedColumnBlock(model, columnId));
  if (movingIds.has(targetColumnId)) {
    return state;
  }

  const targetBlock = getMarriedColumnBlock(model, targetColumnId).filter((id) => order.includes(id));
  const targetAnchorId = targetBlock[0] ?? targetColumnId;
  const targetIndex = order.filter((id) => !movingIds.has(id)).indexOf(targetAnchorId);
  return targetIndex < 0 ? state : moveColumn(model, state, columnId, targetIndex);
}

export function setColumnHidden<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  hidden: boolean
): ColumnUiState {
  const column = getDataColumn(model, columnId);
  if (!column || !canChangeColumnVisibility(column)) {
    return state;
  }

  return patchColumnState(state, columnId, { hidden });
}

export function pinColumn<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  pinned: PinnedSide | null
): ColumnUiState {
  const column = getDataColumn(model, columnId);
  if (!column || !canChangeColumnPinning(column)) {
    return state;
  }

  return patchColumnState(state, columnId, { pinned });
}

export function freezeColumnUiState(state: ColumnUiState): ColumnUiState {
  const columns = Object.fromEntries(
    Object.entries(state.columns ?? {}).map(([columnId, column]) => [columnId, Object.freeze({ ...column })])
  );
  const groups = Object.fromEntries(
    Object.entries(state.groups ?? {}).map(([groupId, group]) => [groupId, Object.freeze({ ...group })])
  );
  return Object.freeze({
    ...(state.order === undefined ? {} : { order: Object.freeze([...state.order]) }),
    ...(Object.keys(columns).length === 0 ? {} : { columns: Object.freeze(columns) }),
    ...(Object.keys(groups).length === 0 ? {} : { groups: Object.freeze(groups) })
  });
}

export function createColumnMenuModel<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string
): ColumnMenuModel | undefined {
  const column = getDataColumn(model, columnId);
  if (!column) {
    return undefined;
  }

  const order = getEffectiveOrder(model, state);
  const orderIndex = order.indexOf(columnId);
  const movable = getMovableBlockIds(model, order, columnId).length > 0;
  const resizable = canResizeColumn(column);
  const hideable = canChangeColumnVisibility(column);
  const pinnable = canChangeColumnPinning(column);

  return Object.freeze({
    columnId,
    headerName: column.headerName,
    items: Object.freeze([
      createMenuItem("autoSize", `Auto size ${column.headerName}`, resizable),
      createMenuItem("hide", `Hide ${column.headerName}`, hideable),
      createMenuItem("pinLeft", `Pin ${column.headerName} left`, pinnable && column.pinned !== "left"),
      createMenuItem("pinRight", `Pin ${column.headerName} right`, pinnable && column.pinned !== "right"),
      createMenuItem("unpin", `Unpin ${column.headerName}`, pinnable && column.pinned !== undefined),
      createMenuItem("moveLeft", `Move ${column.headerName} left`, movable && orderIndex > 0),
      createMenuItem(
        "moveRight",
        `Move ${column.headerName} right`,
        movable && orderIndex >= 0 && orderIndex < order.length - 1
      )
    ])
  });
}

export function createColumnsToolPanelModel<TData>(model: ColumnModel<TData>): ColumnsToolPanelModel {
  return Object.freeze({
    columns: Object.freeze(
      model.leafColumns.map((column) =>
        Object.freeze({
          id: column.id,
          headerName: column.headerName,
          hidden: column.hidden,
          pinned: column.pinned,
          hideable: canChangeColumnVisibility(column),
          pinnable: canChangeColumnPinning(column),
          groupPath: Object.freeze(getGroupPath(model, column))
        })
      )
    )
  });
}

function getDataColumn<TData>(model: ColumnModel<TData>, columnId: string): NormalizedDataColumn<TData> | undefined {
  const column = model.byId.get(columnId);
  return column?.kind === "data" ? column : undefined;
}

function getEffectiveOrder<TData>(model: ColumnModel<TData>, state: ColumnUiState): readonly string[] {
  return state.order ?? model.order.all;
}

function patchColumnState(state: ColumnUiState, columnId: string, patch: ColumnUiColumnState): ColumnUiState {
  const columns = state.columns ?? {};
  const previous = columns[columnId] ?? {};

  return Object.freeze({
    ...state,
    columns: Object.freeze({
      ...columns,
      [columnId]: Object.freeze({
        ...previous,
        ...patch
      })
    })
  });
}

function getMovableBlockIds<TData>(
  model: ColumnModel<TData>,
  order: readonly string[],
  columnId: string
): readonly string[] {
  const blockIds = getMarriedColumnBlock(model, columnId).filter((id) => order.includes(id));
  const allMovable = blockIds.every((id) => {
    const column = getDataColumn(model, id);
    return column !== undefined && canMoveColumn(column);
  });

  return allMovable ? Object.freeze(blockIds) : Object.freeze([]);
}

function clampWidth<TData>(width: number, column: NormalizedDataColumn<TData>): number {
  const numericWidth = Number.isFinite(width) ? width : column.width;
  const lowerBoundedWidth = Math.max(numericWidth, column.minWidth);
  return column.maxWidth === undefined
    ? lowerBoundedWidth
    : Math.min(lowerBoundedWidth, column.maxWidth);
}

function clampIndex(index: number, maxIndex: number): number {
  if (!Number.isFinite(index)) {
    return maxIndex;
  }

  return Math.max(0, Math.min(Math.trunc(index), maxIndex));
}

function createMenuItem(action: ColumnMenuAction, label: string, enabled: boolean): ColumnMenuItem {
  return Object.freeze({ action, label, enabled });
}

function getGroupPath<TData>(
  model: ColumnModel<TData>,
  column: NormalizedDataColumn<TData>
): readonly string[] {
  const path: string[] = [];
  let parentId = column.parentId;

  while (parentId !== undefined) {
    const parent = model.byId.get(parentId);
    if (!parent || parent.kind !== "group") {
      break;
    }

    path.unshift(parent.headerName);
    parentId = parent.parentId;
  }

  return path;
}
