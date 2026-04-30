import { normalizeFilterModel } from "../filtering/index.js";
import { readField } from "./rowIdentity.js";
import type { ColumnDef, DataColumnDef } from "../types/column.js";
import type { ClientRowNode } from "./rowIdentity.js";
import type { FilterCondition, FilterModel } from "../types/shared.js";

export interface ClientFilterOptions<TData = unknown> {
  readonly columns?: readonly ColumnDef<TData>[];
}

export function filterClientRows<TData>(
  rows: readonly ClientRowNode<TData>[],
  model: FilterModel | undefined,
  options: ClientFilterOptions<TData> = {}
): readonly ClientRowNode<TData>[] {
  const filterModel = normalizeFilterModel(model);
  if (!filterModel.quickText && !filterModel.conditions?.length) {
    return rows;
  }

  const columnMap = createFilterColumnMap(options.columns);
  const filtered = rows.filter((node) => {
    if (filterModel.quickText && !matchesQuickText(node, filterModel.quickText, columnMap)) {
      return false;
    }

    return (filterModel.conditions ?? []).every((condition) =>
      matchesCondition(node, condition, columnMap, filterModel.custom)
    );
  });

  return Object.freeze(filtered);
}

function matchesQuickText<TData>(
  node: ClientRowNode<TData>,
  quickText: string,
  columnMap: ReadonlyMap<string, DataColumnDef<TData>>
): boolean {
  const needle = quickText.trim().toLocaleLowerCase();
  if (!needle) {
    return true;
  }

  if (columnMap.size > 0) {
    return [...columnMap.values()].some((column) =>
      String(readFilterValue(node, column.field, column) ?? "")
        .toLocaleLowerCase()
        .includes(needle)
    );
  }

  if (node.data === null || typeof node.data !== "object") {
    return String(node.data ?? "").toLocaleLowerCase().includes(needle);
  }

  return Object.values(node.data as Readonly<Record<string, unknown>>).some((value) =>
    String(value ?? "").toLocaleLowerCase().includes(needle)
  );
}

function matchesCondition<TData>(
  node: ClientRowNode<TData>,
  condition: FilterCondition,
  columnMap: ReadonlyMap<string, DataColumnDef<TData>>,
  custom: Readonly<Record<string, unknown>> | undefined
): boolean {
  const column = columnMap.get(condition.field);
  if (isServerOnlyFilter(column)) {
    return true;
  }

  const value = readFilterValue(node, condition.field, column);

  if (condition.kind === "custom") {
    return column?.filter && typeof column.filter === "object" && column.filter.predicate
      ? column.filter.predicate({
          row: node.data,
          rowIndex: node.sourceIndex,
          rowKey: node.key,
          field: condition.field,
          column: column,
          value,
          filterValue: condition.value,
          operator: condition.operator,
          ...(custom === undefined ? {} : { custom })
        })
      : false;
  }

  if (condition.kind === "set") {
    const allowed = Array.isArray(condition.value) ? condition.value : [condition.value];
    return allowed.some((item) => Object.is(item, value));
  }

  if (condition.kind === "number") {
    return compareNumber(value, condition.operator, condition.value);
  }

  if (condition.kind === "boolean") {
    return Object.is(Boolean(value), Boolean(condition.value));
  }

  if (condition.kind === "date") {
    return compareNumber(toTimestamp(value), condition.operator, toTimestamp(condition.value));
  }

  return compareText(value, condition.operator, condition.value);
}

function readFilterValue<TData>(
  node: ClientRowNode<TData>,
  field: string,
  column: DataColumnDef<TData> | undefined
): unknown {
  return column?.valueGetter
    ? column.valueGetter({ row: node.data, rowIndex: node.sourceIndex, rowKey: node.key })
    : readField(node.data, field);
}

function isServerOnlyFilter<TData>(column: DataColumnDef<TData> | undefined): boolean {
  return column?.filter !== undefined
    && typeof column.filter === "object"
    && column.filter.serverOnly === true;
}

function compareText(value: unknown, operator: string, expected: unknown): boolean {
  const text = String(value ?? "").toLocaleLowerCase();
  const expectedText = String(expected ?? "").toLocaleLowerCase();

  if (operator === "equals" || operator === "=") {
    return text === expectedText;
  }

  if (operator === "startsWith") {
    return text.startsWith(expectedText);
  }

  if (operator === "endsWith") {
    return text.endsWith(expectedText);
  }

  return text.includes(expectedText);
}

function compareNumber(value: unknown, operator: string, expected: unknown): boolean {
  const numericValue = Number(value);
  const numericExpected = Number(expected);
  if (!Number.isFinite(numericValue) || !Number.isFinite(numericExpected)) {
    return false;
  }

  if (operator === ">" || operator === "gt") {
    return numericValue > numericExpected;
  }

  if (operator === ">=" || operator === "gte") {
    return numericValue >= numericExpected;
  }

  if (operator === "<" || operator === "lt") {
    return numericValue < numericExpected;
  }

  if (operator === "<=" || operator === "lte") {
    return numericValue <= numericExpected;
  }

  if (operator === "!=" || operator === "notEquals") {
    return numericValue !== numericExpected;
  }

  return numericValue === numericExpected;
}

function toTimestamp(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(String(value ?? "")).getTime();
}

function createFilterColumnMap<TData>(
  columns: readonly ColumnDef<TData>[] | undefined
): ReadonlyMap<string, DataColumnDef<TData>> {
  const map = new Map<string, DataColumnDef<TData>>();
  if (!columns) {
    return map;
  }

  for (const column of collectDataColumns(columns)) {
    map.set(column.field, column);
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
