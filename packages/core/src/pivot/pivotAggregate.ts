import { readField } from "../row/rowIdentity.js";

export function calculatePivotAggregate<TData>(
  rows: readonly TData[],
  field: string,
  fn: string
): unknown {
  const values = rows.map((row) => readField(row, field));
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
