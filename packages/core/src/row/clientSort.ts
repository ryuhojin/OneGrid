import { normalizeSortModel } from "../sorting/index.js";
import { resolveDataColumnId } from "../column/index.js";
import { readField } from "./rowIdentity.js";
import type { ColumnDef, DataColumnDef } from "../types/column.js";
import type { ClientRowNode } from "./rowIdentity.js";
import type { SortModel } from "../types/shared.js";

export interface ClientSortOptions<TData = unknown> {
  readonly columns?: readonly ColumnDef<TData>[];
}

export function sortClientRows<TData>(
  rows: readonly ClientRowNode<TData>[],
  model: readonly SortModel[] | undefined,
  options: ClientSortOptions<TData> = {}
): readonly ClientRowNode<TData>[] {
  if (!model || model.length === 0) {
    return rows;
  }

  const sortModel = normalizeSortModel(model);
  const columnMap = createSortColumnMap(options.columns);
  const sorted = [...rows].sort((left, right) =>
    compareRows(left, right, sortModel, columnMap) || left.sourceIndex - right.sourceIndex
  );
  return Object.freeze(sorted);
}

function compareRows<TData>(
  left: ClientRowNode<TData>,
  right: ClientRowNode<TData>,
  sortModel: readonly SortModel[],
  columnMap: ReadonlyMap<string, DataColumnDef<TData>>
): number {
  for (const sort of sortModel) {
    const direction = sort.direction === "desc" ? -1 : 1;
    const column = columnMap.get(sort.columnId ?? sort.field);
    const field = column?.field ?? sort.field;
    const columnId = column === undefined ? sort.columnId : resolveDataColumnId(column);
    const leftValue = readSortValue(left, field, column);
    const rightValue = readSortValue(right, field, column);
    const result = compareSortValues(leftValue, rightValue, {
      ...(columnId === undefined ? {} : { columnId }),
      field,
      leftRow: left.data,
      rightRow: right.data,
      leftRowIndex: left.sourceIndex,
      rightRowIndex: right.sourceIndex
    }, column);
    if (result !== 0) {
      return result * direction;
    }
  }

  return 0;
}

function readSortValue<TData>(
  node: ClientRowNode<TData>,
  field: string | undefined,
  column: DataColumnDef<TData> | undefined
): unknown {
  return column?.valueGetter
    ? column.valueGetter({ row: node.data, rowIndex: node.sourceIndex, rowKey: node.key })
    : field === undefined ? undefined : readField(node.data, field);
}

function compareSortValues<TData>(
  leftValue: unknown,
  rightValue: unknown,
  context: {
    readonly field: string;
    readonly leftRow: TData;
    readonly rightRow: TData;
    readonly leftRowIndex: number;
    readonly rightRowIndex: number;
  },
  column: DataColumnDef<TData> | undefined
): number {
  const customResult = column?.sortComparator?.(leftValue, rightValue, context);
  return typeof customResult === "number" && Number.isFinite(customResult)
    ? customResult
    : compareValues(leftValue, rightValue);
}

function compareValues(left: unknown, right: unknown): number {
  if (left === right) {
    return 0;
  }

  if (left === null || left === undefined) {
    return 1;
  }

  if (right === null || right === undefined) {
    return -1;
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);
  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function createSortColumnMap<TData>(
  columns: readonly ColumnDef<TData>[] | undefined
): ReadonlyMap<string, DataColumnDef<TData>> {
  const map = new Map<string, DataColumnDef<TData>>();
  if (!columns) {
    return map;
  }

  for (const column of collectDataColumns(columns)) {
    if (column.field) {
      map.set(column.field, column);
    }
    if (column.columnId) {
      map.set(column.columnId, column);
    }
    if (column.id) {
      map.set(column.id, column);
    }
  }

  return map;
}

function collectDataColumns<TData>(
  columns: readonly ColumnDef<TData>[]
): readonly DataColumnDef<TData>[] {
  return columns.flatMap((column) =>
    "children" in column ? collectDataColumns(column.children) : [column]
  );
}
