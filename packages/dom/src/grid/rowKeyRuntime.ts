import { resolveRowKey, resolveUniqueRowKey } from "@onegrid/core";
import type { DuplicateRowKeyPolicy, RowKey, RowKeyInput } from "@onegrid/core";

export function resolveDomDistinctRowKey<TData>(
  rows: readonly TData[] | undefined,
  row: TData,
  index: number,
  rowKey: RowKeyInput<TData> | undefined,
  duplicateRowKeyPolicy: DuplicateRowKeyPolicy | undefined
): RowKey {
  const baseKey = resolveRowKey(row, index, rowKey);
  if (duplicateRowKeyPolicy !== "suffix" || !Array.isArray(rows)) {
    return baseKey;
  }

  const usedKeys = new Map<RowKey, number>();
  for (let rowIndex = 0; rowIndex < index; rowIndex += 1) {
    const key = resolveUniqueRowKey(
      resolveRowKey(rows[rowIndex] as TData, rowIndex, rowKey),
      usedKeys,
      "suffix",
      rowIndex
    );
    usedKeys.set(key, rowIndex);
  }

  return resolveUniqueRowKey(baseKey, usedKeys, "suffix", index);
}
