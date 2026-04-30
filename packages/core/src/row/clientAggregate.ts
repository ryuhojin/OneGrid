import { readField } from "./rowIdentity.js";
import type { ClientRowNode } from "./rowIdentity.js";
import type { AggregateModel } from "../types/shared.js";

export type ClientAggregateValues = Readonly<Record<string, unknown>>;

export function aggregateClientRows<TData>(
  rows: readonly ClientRowNode<TData>[],
  model: AggregateModel | undefined
): ClientAggregateValues {
  if (!model || model.fields.length === 0) {
    return Object.freeze({});
  }

  const values: Record<string, unknown> = {};
  for (const field of model.fields) {
    const alias = field.alias ?? `${field.function}:${field.field}`;
    values[alias] = calculateAggregate(rows, field.field, field.function);
  }

  return Object.freeze(values);
}

function calculateAggregate<TData>(
  rows: readonly ClientRowNode<TData>[],
  field: string,
  fn: string
): unknown {
  const values = rows.map((row) => readField(row.data, field));

  if (fn === "count") {
    return rows.length;
  }

  if (fn === "distinct-count") {
    return new Set(values).size;
  }

  const numbers = values.map(Number).filter(Number.isFinite);
  if (fn === "sum") {
    return numbers.reduce((sum, value) => sum + value, 0);
  }

  if (fn === "avg") {
    return numbers.length === 0
      ? undefined
      : numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
  }

  if (fn === "min") {
    return numbers.length === 0 ? undefined : Math.min(...numbers);
  }

  if (fn === "max") {
    return numbers.length === 0 ? undefined : Math.max(...numbers);
  }

  return undefined;
}
