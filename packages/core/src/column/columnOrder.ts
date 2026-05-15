import type {
  ColumnModel,
  NormalizedColumn,
  NormalizedDataColumn,
  PinnedLeafColumns
} from "./columnModel.js";

interface MarriedGroupDescriptor {
  readonly depth: number;
  readonly leafIds: readonly string[];
}

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
  requestedOrder: readonly string[] | undefined,
  rootColumns: readonly NormalizedColumn<TData>[] = []
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

  const constrained = applyMarriedGroupConstraints(ordered, rootColumns);
  return Object.freeze(constrained.map((column, orderIndex) => withOrderIndex(column, orderIndex)));
}

export function enforceMarriedColumnOrder<TData>(
  model: ColumnModel<TData>,
  order: readonly string[]
): readonly string[] {
  if (order.length === 0) {
    return Object.freeze([]);
  }

  const byId = new Map(model.leafColumns.map((column) => [column.id, column] as const));
  const ordered = order
    .map((columnId) => byId.get(columnId))
    .filter((column): column is NormalizedDataColumn<TData> => column !== undefined);
  const constrained = applyMarriedGroupConstraints(ordered, model.rootColumns);
  return Object.freeze(constrained.map((column) => column.id));
}

export function getMarriedColumnBlock<TData>(
  model: ColumnModel<TData>,
  columnId: string
): readonly string[] {
  const matchingGroups = collectMarriedGroups(model.rootColumns)
    .filter((group) => group.leafIds.includes(columnId))
    .sort((left, right) => left.depth - right.depth);

  return matchingGroups[0]?.leafIds ?? Object.freeze([columnId]);
}

function applyMarriedGroupConstraints<TData>(
  columns: readonly NormalizedDataColumn<TData>[],
  rootColumns: readonly NormalizedColumn<TData>[]
): readonly NormalizedDataColumn<TData>[] {
  const groups = collectMarriedGroups(rootColumns)
    .filter((group) => group.leafIds.length > 1)
    .sort((left, right) => right.depth - left.depth);
  let next = [...columns];

  for (const group of groups) {
    next = makeGroupContiguous(next, group);
  }

  return Object.freeze(next);
}

function collectMarriedGroups<TData>(
  columns: readonly NormalizedColumn<TData>[]
): readonly MarriedGroupDescriptor[] {
  const groups: MarriedGroupDescriptor[] = [];

  for (const column of columns) {
    if (column.kind !== "group") {
      continue;
    }
    if (column.source.marryChildren === true) {
      groups.push({
        depth: column.depth,
        leafIds: column.leafIds
      });
    }
    groups.push(...collectMarriedGroups(column.children));
  }

  return Object.freeze(groups);
}

function makeGroupContiguous<TData>(
  columns: readonly NormalizedDataColumn<TData>[],
  group: MarriedGroupDescriptor
): NormalizedDataColumn<TData>[] {
  const groupIds = new Set(group.leafIds);
  const firstIndex = columns.findIndex((column) => groupIds.has(column.id));
  if (firstIndex < 0 || isContiguousGroup(columns, groupIds)) {
    return [...columns];
  }

  const groupColumns = columns.filter((column) => groupIds.has(column.id));
  const before = columns.slice(0, firstIndex).filter((column) => !groupIds.has(column.id));
  const after = columns.slice(firstIndex).filter((column) => !groupIds.has(column.id));
  return [...before, ...groupColumns, ...after];
}

function isContiguousGroup<TData>(
  columns: readonly NormalizedDataColumn<TData>[],
  groupIds: ReadonlySet<string>
): boolean {
  const indexes = columns
    .map((column, index) => groupIds.has(column.id) ? index : undefined)
    .filter((index): index is number => index !== undefined);

  return indexes.every((index, offset) => offset === 0 || index === (indexes[offset - 1] ?? index) + 1);
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
