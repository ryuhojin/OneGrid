import type { ColumnModel, NormalizedDataColumn } from "./columnModel.js";
import type { DataColumnDef } from "../types/column.js";
import type { ColumnId, PinnedSide } from "../types/shared.js";

export interface ColumnUiState {
  readonly order?: readonly string[];
  readonly columns?: Readonly<Record<string, ColumnUiColumnState>>;
}

export interface ColumnUiColumnState {
  readonly width?: number;
  readonly hidden?: boolean;
  readonly pinned?: PinnedSide | null;
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

export type ColumnMenuExtensionPredicate<TData = unknown> =
  (context: ColumnMenuExtensionContext<TData>) => boolean;

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
  readonly groupPath: readonly string[];
}

export function resizeColumn<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  width: number
): ColumnUiState {
  const column = getDataColumn(model, columnId);
  if (!column || column.source.resizable === false) {
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
  if (!column || column.source.resizable === false) {
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
  const sourceIndex = order.indexOf(columnId);
  const column = getDataColumn(model, columnId);
  if (sourceIndex < 0 || !column || column.source.movable === false) {
    return state;
  }

  const withoutSource = order.filter((id) => id !== columnId);
  const nextIndex = clampIndex(targetIndex, withoutSource.length);
  const nextOrder = [
    ...withoutSource.slice(0, nextIndex),
    columnId,
    ...withoutSource.slice(nextIndex)
  ];

  return { ...state, order: Object.freeze(nextOrder) };
}

export function moveColumnBefore<TData>(
  model: ColumnModel<TData>,
  state: ColumnUiState,
  columnId: string,
  targetColumnId: string
): ColumnUiState {
  const order = getEffectiveOrder(model, state);
  const targetIndex = order.filter((id) => id !== columnId).indexOf(targetColumnId);
  return targetIndex < 0 ? state : moveColumn(model, state, columnId, targetIndex);
}

export function setColumnHidden(
  state: ColumnUiState,
  columnId: string,
  hidden: boolean
): ColumnUiState {
  return patchColumnState(state, columnId, { hidden });
}

export function pinColumn(
  state: ColumnUiState,
  columnId: string,
  pinned: PinnedSide | null
): ColumnUiState {
  return patchColumnState(state, columnId, { pinned });
}

export function freezeColumnUiState(state: ColumnUiState): ColumnUiState {
  const columns = Object.fromEntries(
    Object.entries(state.columns ?? {}).map(([columnId, column]) => [columnId, Object.freeze({ ...column })])
  );
  return Object.freeze({
    ...(state.order === undefined ? {} : { order: Object.freeze([...state.order]) }),
    ...(Object.keys(columns).length === 0 ? {} : { columns: Object.freeze(columns) })
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
  const movable = column.source.movable !== false;
  const resizable = column.source.resizable !== false;

  return Object.freeze({
    columnId,
    headerName: column.headerName,
    items: Object.freeze([
      createMenuItem("autoSize", `Auto size ${column.headerName}`, resizable),
      createMenuItem("hide", `Hide ${column.headerName}`, true),
      createMenuItem("pinLeft", `Pin ${column.headerName} left`, column.pinned !== "left"),
      createMenuItem("pinRight", `Pin ${column.headerName} right`, column.pinned !== "right"),
      createMenuItem("unpin", `Unpin ${column.headerName}`, column.pinned !== undefined),
      createMenuItem("moveLeft", `Move ${column.headerName} left`, movable && orderIndex > 0),
      createMenuItem(
        "moveRight",
        `Move ${column.headerName} right`,
        movable && orderIndex >= 0 && orderIndex < order.length - 1
      )
    ])
  });
}

export function createColumnsToolPanelModel<TData>(
  model: ColumnModel<TData>
): ColumnsToolPanelModel {
  return Object.freeze({
    columns: Object.freeze(
      model.leafColumns.map((column) =>
        Object.freeze({
          id: column.id,
          headerName: column.headerName,
          hidden: column.hidden,
          pinned: column.pinned,
          groupPath: Object.freeze(getGroupPath(model, column))
        })
      )
    )
  });
}

function getDataColumn<TData>(
  model: ColumnModel<TData>,
  columnId: string
): NormalizedDataColumn<TData> | undefined {
  const column = model.byId.get(columnId);
  return column?.kind === "data" ? column : undefined;
}

function getEffectiveOrder<TData>(model: ColumnModel<TData>, state: ColumnUiState): readonly string[] {
  return state.order ?? model.order.all;
}

function patchColumnState(
  state: ColumnUiState,
  columnId: string,
  patch: ColumnUiColumnState
): ColumnUiState {
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

function measureColumnWidth<TData>(
  column: NormalizedDataColumn<TData>,
  options: ColumnAutoSizeOptions<TData>
): number {
  const rows = options.rows ?? [];
  const maxRows = options.maxRows ?? 1_000;
  const charWidth = options.charWidth ?? 8;
  const horizontalPadding = options.horizontalPadding ?? 36;
  let longestText = column.headerName.length;

  for (const row of rows.slice(0, maxRows)) {
    longestText = Math.max(longestText, formatCellValue(readField(row, column.field)).length);
  }

  return longestText * charWidth + horizontalPadding;
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
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

function createMenuItem(
  action: ColumnMenuAction,
  label: string,
  enabled: boolean
): ColumnMenuItem {
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
