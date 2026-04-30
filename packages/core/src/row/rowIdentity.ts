import type { RowKey } from "../types/shared.js";

export type RowKeyInput<TData = unknown> = string | ((row: TData, index: number) => RowKey);

export interface ClientRowNode<TData = unknown> {
  readonly key: RowKey;
  readonly data: TData;
  readonly sourceIndex: number;
}

export function createRowNodes<TData>(
  rows: readonly TData[],
  rowKey: RowKeyInput<TData> | undefined
): readonly ClientRowNode<TData>[] {
  const usedKeys = new Set<RowKey>();
  return Object.freeze(
    rows.map((row, index) => {
      const key = resolveUniqueRowKey(resolveRowKey(row, index, rowKey), usedKeys);
      usedKeys.add(key);
      return Object.freeze({ key, data: row, sourceIndex: index });
    })
  );
}

export function resolveRowKey<TData>(
  row: TData,
  index: number,
  rowKey: RowKeyInput<TData> | undefined
): RowKey {
  if (typeof rowKey === "function") {
    return rowKey(row, index);
  }

  if (typeof rowKey === "string") {
    const value = readField(row, rowKey);
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return index;
}

export function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

function resolveUniqueRowKey(key: RowKey, usedKeys: ReadonlySet<RowKey>): RowKey {
  if (!usedKeys.has(key)) {
    return key;
  }

  let index = 2;
  let nextKey: RowKey = `${String(key)}__${index}`;
  while (usedKeys.has(nextKey)) {
    index += 1;
    nextKey = `${String(key)}__${index}`;
  }

  return nextKey;
}
