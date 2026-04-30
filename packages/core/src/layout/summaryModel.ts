import type { NormalizedDataColumn } from "../column/index.js";
import type { SummaryDef } from "../types/column.js";
import type { SummaryKind } from "../types/shared.js";

export interface SummaryCell {
  readonly columnId: string;
  readonly field: string;
  readonly label: string;
  readonly value: unknown;
}

export interface SummaryRow {
  readonly kind: "summary";
  readonly cells: readonly SummaryCell[];
}

export interface SummaryRowOptions {
  readonly aggregateValues?: Readonly<Record<string, unknown>>;
}

export function createSummaryRow<TData>(
  columns: readonly NormalizedDataColumn<TData>[],
  rows: readonly TData[],
  options: SummaryRowOptions = {}
): SummaryRow | undefined {
  const cells = columns
    .map((column) => createSummaryCell(column, rows, options))
    .filter((cell): cell is SummaryCell => cell !== undefined);

  if (cells.length === 0) {
    return undefined;
  }

  return Object.freeze({
    kind: "summary",
    cells: Object.freeze(cells)
  });
}

function createSummaryCell<TData>(
  column: NormalizedDataColumn<TData>,
  rows: readonly TData[],
  options: SummaryRowOptions
): SummaryCell | undefined {
  const summary = column.source.summary;
  if (!summary) {
    return undefined;
  }

  const aggregateValue = readAggregateValue(summary, column.field, options.aggregateValues);
  return Object.freeze({
    columnId: column.id,
    field: column.field,
    label: getSummaryLabel(summary),
    value: aggregateValue.found
      ? aggregateValue.value
      : calculateSummary(summary, rows, column.field)
  });
}

function calculateSummary<TData>(
  summary: SummaryKind | SummaryDef<TData>,
  rows: readonly TData[],
  field: string
): unknown {
  if (typeof summary === "object" && summary.kind === "custom") {
    return summary.calculate?.(rows);
  }

  const kind = typeof summary === "string" ? summary : summary.kind;
  const summaryField = typeof summary === "string" ? field : summary.field ?? field;
  const values = rows.map((row) => readField(row, summaryField));

  if (kind === "count") {
    return rows.length;
  }

  if (kind === "distinct-count") {
    return new Set(values).size;
  }

  const numbers = values.map(Number).filter(Number.isFinite);
  if (kind === "sum") {
    return numbers.reduce((sum, value) => sum + value, 0);
  }

  if (kind === "avg") {
    return numbers.length === 0
      ? undefined
      : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  }

  if (kind === "min") {
    return numbers.length === 0 ? undefined : Math.min(...numbers);
  }

  if (kind === "max") {
    return numbers.length === 0 ? undefined : Math.max(...numbers);
  }

  return undefined;
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

function readAggregateValue<TData>(
  summary: SummaryKind | SummaryDef<TData>,
  field: string,
  values: Readonly<Record<string, unknown>> | undefined
): { readonly found: boolean; readonly value?: unknown } {
  if (!values) {
    return { found: false };
  }

  for (const key of getAggregateKeys(summary, field)) {
    if (Object.hasOwn(values, key)) {
      return { found: true, value: values[key] };
    }
  }

  return { found: false };
}

function getAggregateKeys<TData>(
  summary: SummaryKind | SummaryDef<TData>,
  field: string
): readonly string[] {
  const kind = typeof summary === "string" ? summary : summary.kind;
  const summaryField = typeof summary === "string" ? field : summary.field ?? field;
  const keys = [
    ...(typeof summary === "object" && summary.aggregateKey ? [summary.aggregateKey] : []),
    `${kind}:${summaryField}`,
    `${summaryField}:${kind}`
  ];

  return Object.freeze(keys);
}

function getSummaryLabel<TData>(summary: SummaryKind | SummaryDef<TData>): string {
  if (typeof summary === "object" && summary.label) {
    return summary.label;
  }

  const kind = typeof summary === "string" ? summary : summary.kind;
  if (kind === "distinct-count") return "Distinct";
  if (kind === "count") return "Count";
  if (kind === "sum") return "Sum";
  if (kind === "avg") return "Avg";
  if (kind === "min") return "Min";
  if (kind === "max") return "Max";
  return "Summary";
}
