import {
  createRowNodes,
  createUsedRowKeyMap,
  normalizeRowIdentityOptions,
  resolveDuplicateRowKeyPolicy,
  resolveRowKey,
  resolveUniqueRowKey
} from "./rowIdentity.js";
import type { ClientRowNode, RowIdentityInput } from "./rowIdentity.js";
import type { RowKey } from "../types/shared.js";

export interface ClientRowStore<TData = unknown> {
  readonly rows: readonly ClientRowNode<TData>[];
  readonly byKey: ReadonlyMap<RowKey, ClientRowNode<TData>>;
}

export interface ClientRowUpdate<TData = unknown> {
  readonly key: RowKey;
  readonly data: TData;
}

export type ClientRowTransactionKind = "set" | "append" | "update" | "remove";
export type ClientRowTransactionRejectReason = "missingKey" | "duplicateKey";

export interface ClientRowTransactionRow<TData = unknown> {
  readonly key: RowKey;
  readonly rowIndex: number;
  readonly sourceIndex: number;
  readonly data: TData;
  readonly requestedKey?: RowKey;
}

export interface ClientRowTransactionUpdate<TData = unknown> {
  readonly key: RowKey;
  readonly rowIndex: number;
  readonly sourceIndex: number;
  readonly previousData: TData;
  readonly data: TData;
}

export interface ClientRowTransactionReject<TData = unknown> {
  readonly reason: ClientRowTransactionRejectReason;
  readonly key: RowKey;
  readonly requestIndex: number;
  readonly data?: TData | Partial<TData>;
}

export interface ClientRowTransactionResult<TData = unknown> {
  readonly kind: ClientRowTransactionKind;
  readonly store: ClientRowStore<TData>;
  readonly changed: boolean;
  readonly rowCountBefore: number;
  readonly rowCountAfter: number;
  readonly requestedRowCount: number;
  readonly acceptedRowCount: number;
  readonly rejectedRowCount: number;
  readonly added: readonly ClientRowTransactionRow<TData>[];
  readonly updated: readonly ClientRowTransactionUpdate<TData>[];
  readonly removed: readonly ClientRowTransactionRow<TData>[];
  readonly rejected: readonly ClientRowTransactionReject<TData>[];
}

export function setClientRows<TData>(
  rows: readonly TData[],
  rowIdentity: RowIdentityInput<TData>
): ClientRowStore<TData> {
  return setClientRowsWithResult(rows, rowIdentity).store;
}

export function setClientRowsWithResult<TData>(
  rows: readonly TData[],
  rowIdentity: RowIdentityInput<TData>,
  previousStore?: ClientRowStore<TData>
): ClientRowTransactionResult<TData> {
  const store = createStore(createRowNodes(rows, rowIdentity));
  const added = store.rows.map(toTransactionRow);
  const removed = previousStore?.rows.map(toTransactionRow) ?? [];

  return createResult({
    kind: "set",
    store,
    rowCountBefore: previousStore?.rows.length ?? 0,
    requestedRowCount: rows.length,
    acceptedRowCount: rows.length,
    added,
    removed
  });
}

export function appendClientRows<TData>(
  store: ClientRowStore<TData>,
  rows: readonly TData[],
  rowIdentity: RowIdentityInput<TData>
): ClientRowStore<TData> {
  return appendClientRowsWithResult(store, rows, rowIdentity).store;
}

export function appendClientRowsWithResult<TData>(
  store: ClientRowStore<TData>,
  rows: readonly TData[],
  rowIdentity: RowIdentityInput<TData>
): ClientRowTransactionResult<TData> {
  const nextRows = [...store.rows];
  const options = normalizeRowIdentityOptions(rowIdentity);
  const policy = resolveDuplicateRowKeyPolicy(options);
  const usedKeys = createUsedRowKeyMap(store.rows);
  const added: ClientRowTransactionRow<TData>[] = [];

  rows.forEach((row, index) => {
    const sourceIndex = store.rows.length + index;
    const baseKey = resolveRowKey(row, sourceIndex, options.rowKey);
    const key = resolveUniqueRowKey(baseKey, usedKeys, policy, sourceIndex);
    usedKeys.set(key, sourceIndex);
    const node = Object.freeze({ key, data: row, sourceIndex });
    nextRows.push(node);
    added.push({
      key,
      rowIndex: nextRows.length - 1,
      sourceIndex,
      data: row,
      ...(key === baseKey ? {} : { requestedKey: baseKey })
    });
  });

  return createResult({
    kind: "append",
    store: createStore(nextRows),
    rowCountBefore: store.rows.length,
    requestedRowCount: rows.length,
    acceptedRowCount: added.length,
    added
  });
}

export function updateClientRows<TData>(
  store: ClientRowStore<TData>,
  updates: readonly ClientRowUpdate<TData>[]
): ClientRowStore<TData> {
  return updateClientRowsWithResult(store, updates).store;
}

export function updateClientRowsWithResult<TData>(
  store: ClientRowStore<TData>,
  updates: readonly ClientRowUpdate<TData>[]
): ClientRowTransactionResult<TData> {
  const { latestByKey, latestRequestIndexByKey, rejected } = normalizeUpdateRequests(updates);
  const updated: ClientRowTransactionUpdate<TData>[] = [];

  const nextRows = store.rows.map((node, rowIndex) => {
    if (!latestByKey.has(node.key)) {
      return node;
    }

    const nextData = latestByKey.get(node.key) as TData;
    updated.push({
      key: node.key,
      rowIndex,
      sourceIndex: node.sourceIndex,
      previousData: node.data,
      data: nextData
    });

    return Object.freeze({
      key: node.key,
      data: nextData,
      sourceIndex: node.sourceIndex
    });
  });

  latestByKey.forEach((data, key) => {
    if (!store.byKey.has(key)) {
      rejected.push({
        reason: "missingKey",
        key,
        requestIndex: latestRequestIndexByKey.get(key) ?? -1,
        data
      });
    }
  });

  return createResult({
    kind: "update",
    store: createStore(nextRows),
    rowCountBefore: store.rows.length,
    requestedRowCount: updates.length,
    acceptedRowCount: updated.length,
    updated,
    rejected
  });
}

export function removeClientRows<TData>(
  store: ClientRowStore<TData>,
  keys: readonly RowKey[]
): ClientRowStore<TData> {
  return removeClientRowsWithResult(store, keys).store;
}

export function removeClientRowsWithResult<TData>(
  store: ClientRowStore<TData>,
  keys: readonly RowKey[]
): ClientRowTransactionResult<TData> {
  const { keySet, rejected } = normalizeRemoveRequests(store, keys);
  const removed: ClientRowTransactionRow<TData>[] = [];
  const nextRows = store.rows.filter((node, rowIndex) => {
    if (!keySet.has(node.key)) {
      return true;
    }

    removed.push({
      key: node.key,
      rowIndex,
      sourceIndex: node.sourceIndex,
      data: node.data
    });
    return false;
  });

  return createResult({
    kind: "remove",
    store: createStore(nextRows),
    rowCountBefore: store.rows.length,
    requestedRowCount: keys.length,
    acceptedRowCount: removed.length,
    removed,
    rejected
  });
}

function createStore<TData>(rows: readonly ClientRowNode<TData>[]): ClientRowStore<TData> {
  const frozenRows = Object.freeze([...rows]);
  return Object.freeze({
    rows: frozenRows,
    byKey: new Map(frozenRows.map((node) => [node.key, node] as const))
  });
}

interface ResultInput<TData> {
  readonly kind: ClientRowTransactionKind;
  readonly store: ClientRowStore<TData>;
  readonly rowCountBefore: number;
  readonly requestedRowCount: number;
  readonly acceptedRowCount: number;
  readonly added?: readonly ClientRowTransactionRow<TData>[];
  readonly updated?: readonly ClientRowTransactionUpdate<TData>[];
  readonly removed?: readonly ClientRowTransactionRow<TData>[];
  readonly rejected?: readonly ClientRowTransactionReject<TData>[];
}

function createResult<TData>(input: ResultInput<TData>): ClientRowTransactionResult<TData> {
  const added = Object.freeze([...(input.added ?? [])]);
  const updated = Object.freeze([...(input.updated ?? [])]);
  const removed = Object.freeze([...(input.removed ?? [])]);
  const rejected = Object.freeze([...(input.rejected ?? [])]);
  const changed = added.length > 0 || updated.length > 0 || removed.length > 0;

  return Object.freeze({
    kind: input.kind,
    store: input.store,
    changed,
    rowCountBefore: input.rowCountBefore,
    rowCountAfter: input.store.rows.length,
    requestedRowCount: input.requestedRowCount,
    acceptedRowCount: input.acceptedRowCount,
    rejectedRowCount: rejected.length,
    added,
    updated,
    removed,
    rejected
  });
}

function toTransactionRow<TData>(
  node: ClientRowNode<TData>,
  rowIndex: number
): ClientRowTransactionRow<TData> {
  return {
    key: node.key,
    rowIndex,
    sourceIndex: node.sourceIndex,
    data: node.data
  };
}

function normalizeUpdateRequests<TData>(
  updates: readonly ClientRowUpdate<TData>[]
): {
  readonly latestByKey: Map<RowKey, TData>;
  readonly latestRequestIndexByKey: Map<RowKey, number>;
  readonly rejected: ClientRowTransactionReject<TData>[];
} {
  const latestByKey = new Map<RowKey, TData>();
  const latestRequestIndexByKey = new Map<RowKey, number>();
  const rejected: ClientRowTransactionReject<TData>[] = [];

  updates.forEach((update, requestIndex) => {
    const previousRequestIndex = latestRequestIndexByKey.get(update.key);
    if (previousRequestIndex !== undefined) {
      const previousData = latestByKey.get(update.key) as TData;
      rejected.push({
        reason: "duplicateKey",
        key: update.key,
        requestIndex: previousRequestIndex,
        data: previousData
      });
    }
    latestByKey.set(update.key, update.data);
    latestRequestIndexByKey.set(update.key, requestIndex);
  });

  return { latestByKey, latestRequestIndexByKey, rejected };
}

function normalizeRemoveRequests<TData>(
  store: ClientRowStore<TData>,
  keys: readonly RowKey[]
): {
  readonly keySet: Set<RowKey>;
  readonly rejected: ClientRowTransactionReject<TData>[];
} {
  const keySet = new Set<RowKey>();
  const rejected: ClientRowTransactionReject<TData>[] = [];

  keys.forEach((key, requestIndex) => {
    if (keySet.has(key)) {
      rejected.push({ reason: "duplicateKey", key, requestIndex });
      return;
    }

    if (!store.byKey.has(key)) {
      rejected.push({ reason: "missingKey", key, requestIndex });
      return;
    }

    keySet.add(key);
  });

  return { keySet, rejected };
}
