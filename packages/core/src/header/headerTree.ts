import { createHeaderAriaLabel } from "./headerAria.js";
import type {
  ColumnModel,
  NormalizedColumn,
  NormalizedColumnGroup,
  NormalizedDataColumn
} from "../column/index.js";
import type { HeaderTreeNode } from "./headerTypes.js";

export function createHeaderTree<TData>(
  columnModel: ColumnModel<TData>
): readonly HeaderTreeNode<TData>[] {
  return Object.freeze(
    columnModel.rootColumns
      .map((column) => toHeaderTreeNode(column, columnModel))
      .filter((node): node is HeaderTreeNode<TData> => node !== undefined)
  );
}

function toHeaderTreeNode<TData>(
  column: NormalizedColumn<TData>,
  columnModel: ColumnModel<TData>
): HeaderTreeNode<TData> | undefined {
  if (column.kind === "data") {
    return toDataHeaderNode(column);
  }

  return toGroupHeaderNode(column, columnModel);
}

function toDataHeaderNode<TData>(
  column: NormalizedDataColumn<TData>
): HeaderTreeNode<TData> | undefined {
  if (!column.visible) {
    return undefined;
  }

  return Object.freeze({
    id: column.id,
    kind: "column",
    headerName: column.headerName,
    depth: column.depth,
    columnIds: Object.freeze([column.id]),
    pinned: column.pinned,
    sourceId: column.id,
    ariaLabel: createHeaderAriaLabel(column.headerName, 1, "column"),
    children: Object.freeze([])
  });
}

function toGroupHeaderNode<TData>(
  column: NormalizedColumnGroup<TData>,
  columnModel: ColumnModel<TData>
): HeaderTreeNode<TData> | undefined {
  const children = column.children
    .map((child) => toHeaderTreeNode(child, columnModel))
    .filter((node): node is HeaderTreeNode<TData> => node !== undefined);
  const columnIds = children.flatMap((child) => child.columnIds);

  if (columnIds.length === 0) {
    return undefined;
  }

  return Object.freeze({
    id: column.id,
    kind: "group",
    headerName: column.headerName,
    depth: column.depth,
    columnIds: Object.freeze(columnIds),
    pinned: resolveGroupPinnedState(columnIds, columnModel),
    sourceId: column.id,
    ariaLabel: createHeaderAriaLabel(column.headerName, columnIds.length, "group"),
    children: Object.freeze(children)
  });
}

function resolveGroupPinnedState<TData>(
  columnIds: readonly string[],
  columnModel: ColumnModel<TData>
) {
  const pinnedStates = new Set(
    columnIds.map((columnId) => {
      const column = columnModel.byId.get(columnId);
      return column?.kind === "data" ? column.pinned : undefined;
    })
  );

  return pinnedStates.size === 1 ? [...pinnedStates][0] : undefined;
}
