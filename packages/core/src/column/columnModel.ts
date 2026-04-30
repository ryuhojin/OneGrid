import { allocateColumnId } from "./columnIds.js";
import { applyColumnOrder, splitPinnedLeafColumns } from "./columnOrder.js";
import { normalizeColumnSizingOptions, resolveColumnSizing } from "./columnSizing.js";
import type { ColumnDef, ColumnGroupDef, DataColumnDef } from "../types/column.js";
import type { PinnedSide } from "../types/shared.js";
import type { ResolvedColumnSizingOptions } from "./columnSizing.js";
import type { ColumnUiState } from "./columnUi.js";

export interface ColumnModelOptions {
  readonly defaultWidth?: number;
  readonly defaultMinWidth?: number;
  readonly defaultMaxWidth?: number;
  readonly columnOrder?: readonly string[];
  readonly columnState?: ColumnUiState;
}

export interface ColumnModel<TData = unknown> {
  readonly rootColumns: readonly NormalizedColumn<TData>[];
  readonly leafColumns: readonly NormalizedDataColumn<TData>[];
  readonly visibleLeafColumns: readonly NormalizedDataColumn<TData>[];
  readonly hiddenLeafColumns: readonly NormalizedDataColumn<TData>[];
  readonly pinnedLeafColumns: PinnedLeafColumns<TData>;
  readonly order: ColumnOrderModel;
  readonly byId: ReadonlyMap<string, NormalizedColumn<TData>>;
}

export type NormalizedColumn<TData = unknown> =
  | NormalizedDataColumn<TData>
  | NormalizedColumnGroup<TData>;

export interface NormalizedColumnBase<TData = unknown> {
  readonly id: string;
  readonly source: ColumnDef<TData>;
  readonly headerName: string;
  readonly depth: number;
  readonly parentId: string | undefined;
  readonly path: readonly string[];
  readonly pinned: PinnedSide | undefined;
}

export interface NormalizedDataColumn<TData = unknown> extends NormalizedColumnBase<TData> {
  readonly kind: "data";
  readonly source: DataColumnDef<TData>;
  readonly field: string;
  readonly width: number;
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly flex: number | undefined;
  readonly hidden: boolean;
  readonly visible: boolean;
  readonly leafIndex: number;
  readonly orderIndex: number;
}

export interface NormalizedColumnGroup<TData = unknown> extends NormalizedColumnBase<TData> {
  readonly kind: "group";
  readonly source: ColumnGroupDef<TData>;
  readonly children: readonly NormalizedColumn<TData>[];
  readonly leafIds: readonly string[];
}

export interface PinnedLeafColumns<TData = unknown> {
  readonly left: readonly NormalizedDataColumn<TData>[];
  readonly center: readonly NormalizedDataColumn<TData>[];
  readonly right: readonly NormalizedDataColumn<TData>[];
}

export interface ColumnOrderModel {
  readonly all: readonly string[];
  readonly visible: readonly string[];
  readonly hidden: readonly string[];
}

interface NormalizeContext<TData = unknown> {
  readonly options: ResolvedColumnSizingOptions;
  readonly columnState: ColumnUiState | undefined;
  readonly ids: Set<string>;
  readonly byId: Map<string, NormalizedColumn<TData>>;
  readonly leaves: NormalizedDataColumn<TData>[];
}

export function createColumnModel<TData>(
  columns: readonly ColumnDef<TData>[],
  options: ColumnModelOptions = {}
): ColumnModel<TData> {
  const context: NormalizeContext<TData> = {
    options: normalizeColumnSizingOptions(options),
    columnState: options.columnState,
    ids: new Set<string>(),
    byId: new Map<string, NormalizedColumn<TData>>(),
    leaves: []
  };
  const rootColumns = columns.map((column, index) =>
    normalizeColumn(column, context, {
      depth: 0,
      parentId: undefined,
      inheritedPinned: undefined,
      path: [String(index + 1)]
    })
  );
  const leafColumns = applyColumnOrder(
    context.leaves,
    options.columnState?.order ?? options.columnOrder
  );
  for (const leafColumn of leafColumns) {
    context.byId.set(leafColumn.id, leafColumn);
  }
  const visibleLeafColumns = leafColumns.filter((column) => column.visible);
  const hiddenLeafColumns = leafColumns.filter((column) => column.hidden);

  return freezeColumnModel({
    rootColumns,
    leafColumns,
    visibleLeafColumns,
    hiddenLeafColumns,
    pinnedLeafColumns: splitPinnedLeafColumns(visibleLeafColumns),
    order: {
      all: leafColumns.map((column) => column.id),
      visible: visibleLeafColumns.map((column) => column.id),
      hidden: hiddenLeafColumns.map((column) => column.id)
    },
    byId: context.byId
  });
}

function normalizeColumn<TData>(
  column: ColumnDef<TData>,
  context: NormalizeContext<TData>,
  parent: {
    readonly depth: number;
    readonly parentId: string | undefined;
    readonly inheritedPinned: PinnedSide | undefined;
    readonly path: readonly string[];
  }
): NormalizedColumn<TData> {
  if (isColumnGroup(column)) {
    return normalizeGroupColumn(column, context, parent);
  }

  return normalizeDataColumn(column, context, parent);
}

function normalizeGroupColumn<TData>(
  column: ColumnGroupDef<TData>,
  context: NormalizeContext<TData>,
  parent: {
    readonly depth: number;
    readonly parentId: string | undefined;
    readonly inheritedPinned: PinnedSide | undefined;
    readonly path: readonly string[];
  }
): NormalizedColumnGroup<TData> {
  const id = allocateColumnId(column.groupId ?? `group:${parent.path.join(".")}`, context.ids);
  const pinned = column.pinned ?? parent.inheritedPinned;
  const children = column.children.map((child, index) =>
    normalizeColumn(child, context, {
      depth: parent.depth + 1,
      parentId: id,
      inheritedPinned: pinned,
      path: [...parent.path, String(index + 1)]
    })
  );
  const group: NormalizedColumnGroup<TData> = Object.freeze({
    kind: "group",
    id,
    source: column,
    headerName: column.headerName,
    depth: parent.depth,
    parentId: parent.parentId,
    path: parent.path,
    pinned,
    children,
    leafIds: collectLeafColumns(children).map((leaf) => leaf.id)
  });

  context.byId.set(id, group);
  return group;
}

function normalizeDataColumn<TData>(
  column: DataColumnDef<TData>,
  context: NormalizeContext<TData>,
  parent: {
    readonly depth: number;
    readonly parentId: string | undefined;
    readonly inheritedPinned: PinnedSide | undefined;
    readonly path: readonly string[];
  }
): NormalizedDataColumn<TData> {
  const id = allocateColumnId(column.id ?? column.field, context.ids);
  const columnState = context.columnState?.columns?.[id];
  const sizing = resolveColumnSizing(column, context.options, columnState?.width);
  const leafIndex = context.leaves.length;
  const normalized: NormalizedDataColumn<TData> = Object.freeze({
    kind: "data",
    id,
    source: column,
    headerName: column.headerName ?? column.field,
    depth: parent.depth,
    parentId: parent.parentId,
    path: parent.path,
    pinned: resolvePinned(columnState?.pinned, column.pinned ?? parent.inheritedPinned),
    field: column.field,
    width: sizing.width,
    minWidth: sizing.minWidth,
    maxWidth: sizing.maxWidth,
    flex: sizing.flex,
    hidden: columnState?.hidden ?? column.hidden === true,
    visible: !(columnState?.hidden ?? column.hidden === true),
    leafIndex,
    orderIndex: leafIndex
  });

  context.leaves.push(normalized);
  context.byId.set(id, normalized);
  return normalized;
}

function resolvePinned(
  override: PinnedSide | null | undefined,
  fallback: PinnedSide | undefined
): PinnedSide | undefined {
  if (override === null) {
    return undefined;
  }

  return override ?? fallback;
}

export function collectLeafColumns<TData>(
  columns: readonly NormalizedColumn<TData>[]
): readonly NormalizedDataColumn<TData>[] {
  const leaves: NormalizedDataColumn<TData>[] = [];

  for (const column of columns) {
    if (column.kind === "group") {
      leaves.push(...collectLeafColumns(column.children));
    } else {
      leaves.push(column);
    }
  }

  return leaves;
}

function isColumnGroup<TData>(column: ColumnDef<TData>): column is ColumnGroupDef<TData> {
  return "children" in column;
}

function freezeColumnModel<TData>(model: ColumnModel<TData>): ColumnModel<TData> {
  Object.freeze(model.rootColumns);
  Object.freeze(model.leafColumns);
  Object.freeze(model.visibleLeafColumns);
  Object.freeze(model.hiddenLeafColumns);
  Object.freeze(model.order.all);
  Object.freeze(model.order.visible);
  Object.freeze(model.order.hidden);
  Object.freeze(model.order);
  return Object.freeze(model);
}
