import type {
  ColumnDef,
  PivotModel,
  PivotTotalMode,
  PivotValueField,
  PivotValueModel,
  SummaryKind
} from "@onegrid/core";

export type PivotBucketKey = "rows" | "columns" | "values";

export interface PivotFieldOption {
  readonly field: string;
  readonly label: string;
}

export const pivotAggregateOptions = Object.freeze([
  "sum",
  "avg",
  "min",
  "max",
  "count",
  "distinct-count"
] as const satisfies readonly SummaryKind[]);

export function collectPivotFieldOptions<TData>(
  columns: readonly ColumnDef<TData>[]
): readonly PivotFieldOption[] {
  const fields = new Map<string, PivotFieldOption>();
  for (const column of columns) {
    collectColumnFields(column, fields);
  }
  return Object.freeze([...fields.values()]);
}

export function clonePivotModel(model: PivotModel): PivotModel {
  return {
    rows: [...model.rows],
    columns: [...model.columns],
    values: model.values.map(clonePivotValue),
    ...(model.totals === undefined ? {} : { totals: model.totals }),
    ...(model.subtotals === undefined ? {} : { subtotals: model.subtotals })
  };
}

export function freezePivotModel(model: PivotModel): PivotModel {
  return Object.freeze({
    rows: Object.freeze([...model.rows]),
    columns: Object.freeze([...model.columns]),
    values: Object.freeze(model.values.map((value) =>
      typeof value === "string" ? value : Object.freeze({ ...value })
    )),
    ...(model.totals === undefined ? {} : { totals: model.totals }),
    ...(model.subtotals === undefined ? {} : { subtotals: model.subtotals })
  });
}

export function addPivotField(
  model: PivotModel,
  bucket: PivotBucketKey,
  field: string,
  label?: string
): PivotModel {
  return insertPivotField(model, bucket, field, label);
}

export function insertPivotField(
  model: PivotModel,
  bucket: PivotBucketKey,
  field: string,
  label?: string,
  targetIndex?: number
): PivotModel {
  if (bucket === "values") {
    if (model.values.some((value) => getPivotValueField(value) === field)) {
      return clonePivotModel(model);
    }
    const index = normalizeInsertIndex(model.values.length, targetIndex);
    return clonePivotModel({
      ...model,
      values: insertAt(model.values, index, createPivotValue(field, label))
    });
  }

  if (model[bucket].includes(field)) {
    return clonePivotModel(model);
  }
  const index = normalizeInsertIndex(model[bucket].length, targetIndex);
  return clonePivotModel({ ...model, [bucket]: insertAt(model[bucket], index, field) });
}

export function removePivotField(
  model: PivotModel,
  bucket: PivotBucketKey,
  index: number
): PivotModel {
  if (bucket === "values") {
    return clonePivotModel({ ...model, values: removeAt(model.values, index) });
  }
  return clonePivotModel({ ...model, [bucket]: removeAt(model[bucket], index) });
}

export function movePivotField(
  model: PivotModel,
  bucket: PivotBucketKey,
  index: number,
  delta: -1 | 1
): PivotModel {
  if (bucket === "values") {
    return clonePivotModel({ ...model, values: moveAt(model.values, index, delta) });
  }
  return clonePivotModel({ ...model, [bucket]: moveAt(model[bucket], index, delta) });
}

export function movePivotFieldToBucket(
  model: PivotModel,
  sourceBucket: PivotBucketKey,
  sourceIndex: number,
  targetBucket: PivotBucketKey,
  label?: string,
  targetIndex?: number
): PivotModel {
  const field = getBucketField(model, sourceBucket, sourceIndex);
  if (field === undefined) {
    return clonePivotModel(model);
  }
  const sourceRemoved = removePivotField(model, sourceBucket, sourceIndex);
  const adjustedIndex = sourceBucket === targetBucket && targetIndex !== undefined && sourceIndex < targetIndex
    ? targetIndex - 1
    : targetIndex;
  return insertPivotField(sourceRemoved, targetBucket, field, label, adjustedIndex);
}

export function setPivotValueAggregate(
  model: PivotModel,
  index: number,
  aggregate: SummaryKind
): PivotModel {
  const value = model.values[index];
  if (value === undefined) {
    return clonePivotModel(model);
  }
  const next = typeof value === "string"
    ? createPivotValue(value)
    : { ...value, function: aggregate };
  const values = [...model.values];
  values[index] = next;
  return clonePivotModel({ ...model, values });
}

export function setPivotTotals(model: PivotModel, totals: PivotTotalMode): PivotModel {
  return clonePivotModel({ ...model, totals });
}

export function setPivotSubtotals(model: PivotModel, subtotals: boolean): PivotModel {
  return clonePivotModel({ ...model, subtotals });
}

export function canDropPivotField(
  model: PivotModel,
  bucket: PivotBucketKey,
  field: string,
  sourceBucket?: PivotBucketKey
): boolean {
  return sourceBucket === bucket || !bucketHasField(model, bucket, field);
}

export function getPivotValueField(value: PivotValueModel): string {
  return typeof value === "string" ? value : value.field;
}

export function getPivotValueAggregate(value: PivotValueModel): SummaryKind {
  const aggregate = typeof value === "string" ? "sum" : value.function ?? "sum";
  return isSummaryKind(aggregate) ? aggregate : "sum";
}

function collectColumnFields<TData>(
  column: ColumnDef<TData>,
  fields: Map<string, PivotFieldOption>
): void {
  if ("children" in column) {
    for (const child of column.children) {
      collectColumnFields(child, fields);
    }
    return;
  }

  if (column.field && !fields.has(column.field)) {
    fields.set(column.field, {
      field: column.field,
      label: column.headerName ?? column.field
    });
  }
}

function clonePivotValue(value: PivotValueModel): PivotValueModel {
  return typeof value === "string" ? value : { ...value };
}

function createPivotValue(field: string, label?: string): PivotValueField {
  return {
    field,
    function: "sum",
    alias: `${field}Total`,
    label: label ?? field
  };
}

function getBucketField(
  model: PivotModel,
  bucket: PivotBucketKey,
  index: number
): string | undefined {
  if (bucket === "values") {
    const value = model.values[index];
    return value === undefined ? undefined : getPivotValueField(value);
  }
  return model[bucket][index];
}

function bucketHasField(model: PivotModel, bucket: PivotBucketKey, field: string): boolean {
  return bucket === "values"
    ? model.values.some((value) => getPivotValueField(value) === field)
    : model[bucket].includes(field);
}

function removeAt<T>(values: readonly T[], index: number): readonly T[] {
  return values.filter((_, currentIndex) => currentIndex !== index);
}

function insertAt<T>(values: readonly T[], index: number, value: T): readonly T[] {
  const next = [...values];
  next.splice(index, 0, value);
  return next;
}

function moveAt<T>(values: readonly T[], index: number, delta: -1 | 1): readonly T[] {
  const targetIndex = index + delta;
  if (index < 0 || targetIndex < 0 || targetIndex >= values.length) {
    return [...values];
  }
  const next = [...values];
  const [item] = next.splice(index, 1);
  if (item !== undefined) {
    next.splice(targetIndex, 0, item);
  }
  return next;
}

function normalizeInsertIndex(length: number, targetIndex: number | undefined): number {
  return Math.max(0, Math.min(targetIndex ?? length, length));
}

function isSummaryKind(value: string): value is SummaryKind {
  return pivotAggregateOptions.includes(value as SummaryKind);
}
