import type {
  AggregateModel,
  ClientRowStore,
  ClientRowTransactionResult,
  ClientRowUpdate,
  ColumnDef,
  DuplicateRowKeyPolicy,
  FilterModel,
  GroupModel,
  RowKey,
  RowKeyInput,
  RowIdentityInput,
  SortModel,
  RowUpdate
} from "@onegrid/core";
import { createClientRowModel, setClientRows } from "@onegrid/core";

export function createClientTransactionStore<TData>(
  rows: readonly TData[],
  rowKey: RowKeyInput<TData> | undefined,
  duplicateRowKeyPolicy?: DuplicateRowKeyPolicy
): ClientRowStore<TData> {
  return setClientRows(rows, createRowIdentityInput(rowKey, duplicateRowKeyPolicy));
}

export function createRowIdentityInput<TData>(
  rowKey: RowKeyInput<TData> | undefined,
  duplicateRowKeyPolicy: DuplicateRowKeyPolicy | undefined
): RowIdentityInput<TData> {
  return {
    ...(rowKey === undefined ? {} : { rowKey }),
    ...(duplicateRowKeyPolicy === undefined ? {} : { duplicateRowKeyPolicy })
  };
}

export function getClientRowsFromTransaction<TData>(
  result: ClientRowTransactionResult<TData>
): readonly TData[] {
  return Object.freeze(result.store.rows.map((node) => node.data));
}

export function toClientRowUpdates<TData>(
  store: ClientRowStore<TData>,
  updates: readonly RowUpdate<TData>[]
): readonly ClientRowUpdate<TData>[] {
  return updates.map((update) => {
    const key = resolveClientStoreKey(store, update.rowKey);
    const current = store.byKey.get(key);
    return {
      key,
      data: current === undefined ? (update.row as TData) : mergeRowPatch(current.data, update.row)
    };
  });
}

export function resolveClientStoreKey<TData>(
  store: ClientRowStore<TData>,
  rowKey: RowKey
): RowKey {
  if (store.byKey.has(rowKey)) {
    return rowKey;
  }

  const target = String(rowKey);
  for (const key of store.byKey.keys()) {
    if (String(key) === target) {
      return key;
    }
  }

  return rowKey;
}

export function collectVisibleRowKeys(root: ParentNode): readonly RowKey[] {
  const rowKeys: RowKey[] = [];
  const seen = new Set<string>();
  for (const cell of root.querySelectorAll<HTMLElement>(
    '[data-layout-section="body"] [data-edit-row-key]'
  )) {
    const rowKey = cell.dataset.editRowKey;
    if (rowKey !== undefined && !seen.has(rowKey)) {
      seen.add(rowKey);
      rowKeys.push(rowKey);
    }
  }
  return Object.freeze(rowKeys);
}

export interface ResolveClientGroupKeysInput<TData> {
  readonly dataRows?: readonly TData[];
  readonly optionRows?: readonly TData[];
  readonly rowKey?: RowKeyInput<TData>;
  readonly duplicateRowKeyPolicy?: DuplicateRowKeyPolicy;
  readonly columns: readonly ColumnDef<TData>[];
  readonly filterModel: FilterModel;
  readonly sortModel: readonly SortModel[];
  readonly groupModel: GroupModel;
  readonly aggregateModel?: AggregateModel;
}

export function resolveClientGroupKeys<TData>(
  input: ResolveClientGroupKeysInput<TData>
): Set<string> {
  if (!Array.isArray(input.dataRows) && !Array.isArray(input.optionRows)) {
    return new Set<string>();
  }

  const rows = input.dataRows ?? input.optionRows ?? [];
  const model = createClientRowModel(rows, {
    ...(input.rowKey === undefined ? {} : { rowKey: input.rowKey }),
    ...(input.duplicateRowKeyPolicy === undefined
      ? {}
      : { duplicateRowKeyPolicy: input.duplicateRowKeyPolicy }),
    columns: input.columns,
    filterModel: input.filterModel,
    sortModel: input.sortModel,
    groupModel: input.groupModel,
    ...(input.aggregateModel === undefined ? {} : { aggregateModel: input.aggregateModel })
  });

  return new Set(
    model.visibleRows
      .filter((entry) => entry.kind === "group")
      .map((entry) => entry.key)
  );
}

export function findRowDataInEntries<TData>(
  rowKey: string,
  entries: readonly unknown[]
): TData | undefined {
  for (const entry of entries) {
    if (isRecord(entry) && "data" in entry && String(entry.key) === rowKey) {
      return entry.data as TData;
    }
  }
  return undefined;
}

export function mergeRowPatch<TData>(row: TData, patch: Partial<TData>): TData {
  if (isRecord(row) && isRecord(patch)) {
    return { ...row, ...patch } as TData;
  }

  return patch as TData;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
}
