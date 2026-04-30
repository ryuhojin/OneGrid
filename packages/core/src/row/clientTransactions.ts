import { createRowNodes, resolveRowKey } from "./rowIdentity.js";
import type { ClientRowNode, RowKeyInput } from "./rowIdentity.js";
import type { RowKey } from "../types/shared.js";

export interface ClientRowStore<TData = unknown> {
  readonly rows: readonly ClientRowNode<TData>[];
  readonly byKey: ReadonlyMap<RowKey, ClientRowNode<TData>>;
}

export interface ClientRowUpdate<TData = unknown> {
  readonly key: RowKey;
  readonly data: TData;
}

export function setClientRows<TData>(
  rows: readonly TData[],
  rowKey: RowKeyInput<TData> | undefined
): ClientRowStore<TData> {
  return createStore(createRowNodes(rows, rowKey));
}

export function appendClientRows<TData>(
  store: ClientRowStore<TData>,
  rows: readonly TData[],
  rowKey: RowKeyInput<TData> | undefined
): ClientRowStore<TData> {
  const nextRows = [...store.rows];
  const usedKeys = new Set(store.byKey.keys());

  rows.forEach((row, index) => {
    const sourceIndex = store.rows.length + index;
    const baseKey = resolveRowKey(row, sourceIndex, rowKey);
    const key = resolveAppendKey(baseKey, usedKeys);
    usedKeys.add(key);
    nextRows.push(Object.freeze({ key, data: row, sourceIndex }));
  });

  return createStore(nextRows);
}

export function updateClientRows<TData>(
  store: ClientRowStore<TData>,
  updates: readonly ClientRowUpdate<TData>[]
): ClientRowStore<TData> {
  if (updates.length === 0) {
    return store;
  }

  const updatesByKey = new Map(updates.map((update) => [update.key, update.data] as const));
  return createStore(
    store.rows.map((node) => {
      if (!updatesByKey.has(node.key)) {
        return node;
      }

      return Object.freeze({
        key: node.key,
        data: updatesByKey.get(node.key) as TData,
        sourceIndex: node.sourceIndex
      });
    })
  );
}

export function removeClientRows<TData>(
  store: ClientRowStore<TData>,
  keys: readonly RowKey[]
): ClientRowStore<TData> {
  if (keys.length === 0) {
    return store;
  }

  const keySet = new Set(keys);
  return createStore(store.rows.filter((node) => !keySet.has(node.key)));
}

function createStore<TData>(rows: readonly ClientRowNode<TData>[]): ClientRowStore<TData> {
  const frozenRows = Object.freeze([...rows]);
  return Object.freeze({
    rows: frozenRows,
    byKey: new Map(frozenRows.map((node) => [node.key, node] as const))
  });
}

function resolveAppendKey(key: RowKey, usedKeys: Set<RowKey>): RowKey {
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
