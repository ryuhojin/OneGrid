import { readField } from "../row/rowIdentity.js";
import { calculatePivotAggregate } from "./pivotAggregate.js";
import type { ColumnDef, DataColumnDef } from "../types/column.js";
import type { PivotModel, PivotTotalMode, PivotValueModel } from "../types/shared.js";

export type PivotRow = Readonly<Record<string, unknown>>;

export interface ClientPivotResult {
  readonly columns: readonly ColumnDef<PivotRow>[];
  readonly rows: readonly PivotRow[];
  readonly rowKey: string;
  readonly meta: ClientPivotMeta;
}

export interface ClientPivotMeta {
  readonly rowFields: readonly string[];
  readonly columnFields: readonly string[];
  readonly valueFields: readonly string[];
  readonly pivotColumnCount: number;
  readonly dataRowCount: number;
  readonly subtotalRowCount: number;
}

interface ValueSpec {
  readonly field: string;
  readonly fn: string;
  readonly alias: string;
  readonly label: string;
}

interface PivotBucket<TData> {
  readonly key: string;
  readonly label: string;
  readonly values: readonly unknown[];
  readonly rows: TData[];
}

interface RowGroup<TData> {
  readonly key: string;
  readonly values: readonly unknown[];
  readonly rows: TData[];
}

const PIVOT_ROW_KEY = "__ogPivotKey";

export function createClientPivotModel<TData>(
  rows: readonly TData[],
  sourceColumns: readonly ColumnDef<TData>[],
  model: PivotModel | undefined
): ClientPivotResult | undefined {
  if (!model || model.rows.length === 0 || model.values.length === 0) {
    return undefined;
  }

  const values = normalizeValues(model.values);
  const buckets = createPivotBuckets(rows, model.columns);
  const rowGroups = createRowGroups(rows, model.rows);
  const includeColumnTotals = includesTotals(model.totals, "columns");
  const includeRowTotals = includesTotals(model.totals, "rows");
  const dataRows = createPivotRows(rowGroups, buckets, values, model, includeColumnTotals);
  const subtotalRows = model.subtotals === true
    ? createSubtotalRows(rowGroups, buckets, values, model, includeColumnTotals)
    : [];
  const totalRows = includeRowTotals
    ? [createTotalRow(rows, buckets, values, model, includeColumnTotals)]
    : [];

  return Object.freeze({
    columns: createPivotColumns(model, sourceColumns, buckets, values, includeColumnTotals),
    rows: Object.freeze([...dataRows, ...subtotalRows, ...totalRows]),
    rowKey: PIVOT_ROW_KEY,
    meta: Object.freeze({
      rowFields: Object.freeze([...model.rows]),
      columnFields: Object.freeze([...model.columns]),
      valueFields: Object.freeze(values.map((value) => value.field)),
      pivotColumnCount: buckets.length,
      dataRowCount: dataRows.length,
      subtotalRowCount: subtotalRows.length
    })
  });
}

function createPivotColumns<TData>(
  model: PivotModel,
  sourceColumns: readonly ColumnDef<TData>[],
  buckets: readonly PivotBucket<TData>[],
  values: readonly ValueSpec[],
  includeColumnTotals: boolean
): readonly ColumnDef<PivotRow>[] {
  const rowColumns = model.rows.map((field, index) => ({
    field,
    headerName: getHeaderName(sourceColumns, field),
    width: index === 0 ? 150 : 180,
    ...(index === 0 ? { pinned: "left" as const } : {})
  }));
  const pivotGroups = buckets.map((bucket) => ({
    groupId: `pivot:${bucket.key}`,
    headerName: bucket.label,
    children: values.map((value) => createValueColumn(bucket.key, value))
  }));
  const totalGroup = includeColumnTotals
    ? [{
        groupId: "pivot:total",
        headerName: "Total",
        children: values.map((value) => createValueColumn("total", value))
      }]
    : [];

  return Object.freeze([...rowColumns, ...pivotGroups, ...totalGroup]);
}

function createPivotRows<TData>(
  groups: readonly RowGroup<TData>[],
  buckets: readonly PivotBucket<TData>[],
  values: readonly ValueSpec[],
  model: PivotModel,
  includeColumnTotals: boolean
): readonly PivotRow[] {
  return Object.freeze(
    groups.map((group) => createPivotRow(group.key, "data", group.values, group.rows, buckets, values, model, includeColumnTotals))
  );
}

function createSubtotalRows<TData>(
  groups: readonly RowGroup<TData>[],
  buckets: readonly PivotBucket<TData>[],
  values: readonly ValueSpec[],
  model: PivotModel,
  includeColumnTotals: boolean
): readonly PivotRow[] {
  const firstFieldGroups = groupRowsByFirstField(groups);
  return Object.freeze(
    firstFieldGroups.map((group) =>
      createPivotRow(
        `subtotal:${group.label}`,
        "subtotal",
        [group.label, ...model.rows.slice(1).map(() => "Subtotal")],
        group.rows,
        buckets,
        values,
        model,
        includeColumnTotals
      )
    )
  );
}

function createTotalRow<TData>(
  rows: readonly TData[],
  buckets: readonly PivotBucket<TData>[],
  values: readonly ValueSpec[],
  model: PivotModel,
  includeColumnTotals: boolean
): PivotRow {
  return createPivotRow(
    "grand-total",
    "total",
    ["Grand total", ...model.rows.slice(1).map(() => "")],
    rows,
    buckets,
    values,
    model,
    includeColumnTotals
  );
}

function createPivotRow<TData>(
  key: string,
  kind: "data" | "subtotal" | "total",
  rowValues: readonly unknown[],
  sourceRows: readonly TData[],
  buckets: readonly PivotBucket<TData>[],
  values: readonly ValueSpec[],
  model: PivotModel,
  includeColumnTotals: boolean
): PivotRow {
  const row: Record<string, unknown> = { [PIVOT_ROW_KEY]: key, __ogPivotKind: kind };
  model.rows.forEach((field, index) => {
    row[field] = rowValues[index];
  });
  for (const bucket of buckets) {
    const bucketRows = sourceRows.filter((item) => matchesBucket(item, model.columns, bucket.values));
    for (const value of values) {
      row[getValueField(bucket.key, value.alias)] =
        calculatePivotAggregate(bucketRows, value.field, value.fn);
    }
  }
  if (includeColumnTotals) {
    for (const value of values) {
      row[getValueField("total", value.alias)] =
        calculatePivotAggregate(sourceRows, value.field, value.fn);
    }
  }
  return Object.freeze(row);
}

function createPivotBuckets<TData>(
  rows: readonly TData[],
  columnFields: readonly string[]
): readonly PivotBucket<TData>[] {
  if (columnFields.length === 0) {
    return [Object.freeze({ key: "all", label: "All", values: Object.freeze([]), rows: [...rows] })];
  }

  const buckets = new Map<string, PivotBucket<TData>>();
  for (const row of rows) {
    const values = columnFields.map((field) => readField(row, field));
    const key = createKey(values);
    const current = buckets.get(key);
    if (current) {
      current.rows.push(row);
      continue;
    }
    buckets.set(key, {
      key,
      label: values.map(formatValue).join(" / "),
      values: Object.freeze(values),
      rows: [row]
    });
  }

  return Object.freeze([...buckets.values()].map((bucket) => Object.freeze(bucket)));
}

function createRowGroups<TData>(
  rows: readonly TData[],
  rowFields: readonly string[]
): readonly RowGroup<TData>[] {
  const groups = new Map<string, RowGroup<TData>>();
  for (const row of rows) {
    const values = rowFields.map((field) => readField(row, field));
    const key = createKey(values);
    const current = groups.get(key);
    if (current) {
      current.rows.push(row);
      continue;
    }
    groups.set(key, { key, values: Object.freeze(values), rows: [row] });
  }

  return Object.freeze([...groups.values()].map((group) => Object.freeze(group)));
}

function groupRowsByFirstField<TData>(
  groups: readonly RowGroup<TData>[]
): readonly { readonly label: unknown; readonly rows: readonly TData[] }[] {
  const order: unknown[] = [];
  const rowsByValue = new Map<unknown, TData[]>();
  for (const group of groups) {
    const label = group.values[0];
    if (!rowsByValue.has(label)) {
      rowsByValue.set(label, []);
      order.push(label);
    }
    rowsByValue.get(label)?.push(...group.rows);
  }
  return Object.freeze(order.map((label) => Object.freeze({ label, rows: rowsByValue.get(label) ?? [] })));
}

function normalizeValues(values: readonly PivotValueModel[]): readonly ValueSpec[] {
  return Object.freeze(values.map((value) => {
    const field = typeof value === "string" ? value : value.field;
    const fn = typeof value === "string" ? "sum" : value.function ?? "sum";
    const alias = typeof value === "string" ? field : value.alias ?? field;
    const label = typeof value === "string" ? getTitle(field) : value.label ?? getTitle(alias);
    return Object.freeze({ field, fn, alias, label });
  }));
}

function createValueColumn(bucketKey: string, value: ValueSpec): DataColumnDef<PivotRow> {
  return Object.freeze({
    id: getValueField(bucketKey, value.alias),
    field: getValueField(bucketKey, value.alias),
    headerName: value.label,
    type: "number",
    width: 118
  });
}

function getValueField(bucketKey: string, alias: string): string {
  return `pivot:${bucketKey}:${alias}`;
}

function matchesBucket<TData>(
  row: TData,
  fields: readonly string[],
  values: readonly unknown[]
): boolean {
  return fields.every((field, index) => Object.is(readField(row, field), values[index]));
}

function includesTotals(mode: PivotTotalMode | undefined, target: "rows" | "columns"): boolean {
  return mode === "both" || mode === target;
}

function getHeaderName<TData>(columns: readonly ColumnDef<TData>[], field: string): string {
  const column = findColumn(columns, field);
  return column?.headerName ?? getTitle(field);
}

function findColumn<TData>(
  columns: readonly ColumnDef<TData>[],
  field: string
): DataColumnDef<TData> | undefined {
  for (const column of columns) {
    if ("children" in column) {
      const match = findColumn(column.children, field);
      if (match) {
        return match;
      }
    } else if (column.field === field || column.id === field) {
      return column;
    }
  }
  return undefined;
}

function createKey(values: readonly unknown[]): string {
  return values.map((value) => encodeURIComponent(formatValue(value))).join("|") || "all";
}

function formatValue(value: unknown): string {
  return value === undefined || value === null || value === "" ? "(blank)" : String(value);
}

function getTitle(field: string): string {
  return field
    .replace(/[-_:.]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
