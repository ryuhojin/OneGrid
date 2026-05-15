import type { RowKey } from "../types/shared.js";

export type RowKeyInput<TData = unknown> = string | ((row: TData, index: number) => RowKey);
export type DuplicateRowKeyPolicy = "error" | "suffix";
export type RowIdentityInput<TData = unknown> =
  | RowKeyInput<TData>
  | RowIdentityOptions<TData>
  | undefined;

export interface RowIdentityOptions<TData = unknown> {
  readonly rowKey?: RowKeyInput<TData>;
  readonly duplicateRowKeyPolicy?: DuplicateRowKeyPolicy;
  readonly startIndex?: number;
}

export interface DuplicateRowKeyIssue {
  readonly key: RowKey;
  readonly rowIndex: number;
  readonly firstRowIndex: number;
}

export class DuplicateRowKeyError extends Error {
  readonly key: RowKey;
  readonly rowIndex: number;
  readonly firstRowIndex: number;

  constructor(issue: DuplicateRowKeyIssue) {
    super(
      `Duplicate row key "${String(issue.key)}" at row ${issue.rowIndex}; first seen at row ${issue.firstRowIndex}.`
    );
    this.name = "DuplicateRowKeyError";
    this.key = issue.key;
    this.rowIndex = issue.rowIndex;
    this.firstRowIndex = issue.firstRowIndex;
  }
}

export interface ClientRowNode<TData = unknown> {
  readonly key: RowKey;
  readonly data: TData;
  readonly sourceIndex: number;
}

export function createRowNodes<TData>(
  rows: readonly TData[],
  rowIdentity: RowIdentityInput<TData>
): readonly ClientRowNode<TData>[] {
  const options = normalizeRowIdentityOptions(rowIdentity);
  const policy = resolveDuplicateRowKeyPolicy(options);
  const usedKeys = new Map<RowKey, number>();
  const startIndex = options.startIndex ?? 0;
  return Object.freeze(
    rows.map((row, index) => {
      const sourceIndex = startIndex + index;
      const key = resolveUniqueRowKey(
        resolveRowKey(row, sourceIndex, options.rowKey),
        usedKeys,
        policy,
        sourceIndex
      );
      usedKeys.set(key, sourceIndex);
      return Object.freeze({ key, data: row, sourceIndex });
    })
  );
}

export function normalizeRowIdentityOptions<TData>(
  rowIdentity: RowIdentityInput<TData>
): RowIdentityOptions<TData> {
  if (rowIdentity === undefined) {
    return {};
  }
  return typeof rowIdentity === "string" || typeof rowIdentity === "function"
    ? { rowKey: rowIdentity }
    : rowIdentity;
}

export function resolveDuplicateRowKeyPolicy<TData>(
  options: RowIdentityOptions<TData>
): DuplicateRowKeyPolicy {
  return options.duplicateRowKeyPolicy ?? (options.rowKey === undefined ? "suffix" : "error");
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

export function resolveUniqueRowKey(
  key: RowKey,
  usedKeys: ReadonlyMap<RowKey, number>,
  policy: DuplicateRowKeyPolicy,
  rowIndex: number
): RowKey {
  const firstRowIndex = usedKeys.get(key);
  if (firstRowIndex === undefined) {
    return key;
  }

  if (policy === "error") {
    throw new DuplicateRowKeyError({ key, rowIndex, firstRowIndex });
  }

  let index = 2;
  let nextKey: RowKey = `${String(key)}__${index}`;
  while (usedKeys.has(nextKey)) {
    index += 1;
    nextKey = `${String(key)}__${index}`;
  }

  return nextKey;
}

export function createUsedRowKeyMap<TData>(
  nodes: readonly ClientRowNode<TData>[]
): Map<RowKey, number> {
  return new Map(nodes.map((node) => [node.key, node.sourceIndex] as const));
}
