import { createRowNodes } from "./rowIdentity.js";
import type { DuplicateRowKeyPolicy, RowKeyInput } from "./rowIdentity.js";
import type {
  ServerGroupFooterRowEntry,
  ServerGroupRowEntry,
  ServerRowEntry
} from "./serverTypes.js";
import type { GroupMeta } from "../types/shared.js";

export function createServerEntries<TData>(
  rows: readonly TData[],
  startRow: number,
  rowKey: RowKeyInput<TData> | undefined,
  groupMeta: readonly GroupMeta[] | undefined = undefined,
  duplicateRowKeyPolicy?: DuplicateRowKeyPolicy
): readonly ServerRowEntry<TData>[] {
  if (groupMeta && groupMeta.length > 0) {
    return createGroupedServerEntries(rows, startRow, rowKey, groupMeta, duplicateRowKeyPolicy);
  }

  const rowIdentity = {
    ...(rowKey === undefined ? {} : { rowKey }),
    startIndex: startRow,
    ...(duplicateRowKeyPolicy === undefined ? {} : { duplicateRowKeyPolicy })
  };
  return Object.freeze(
    createRowNodes(rows, rowIdentity)
      .map<ServerRowEntry<TData>>((node) =>
      Object.freeze({
        kind: "data",
        rowIndex: node.sourceIndex,
        key: node.key,
        data: node.data
      })
    )
  );
}

function createGroupedServerEntries<TData>(
  rows: readonly TData[],
  startRow: number,
  rowKey: RowKeyInput<TData> | undefined,
  groupMeta: readonly GroupMeta[],
  duplicateRowKeyPolicy?: DuplicateRowKeyPolicy
): readonly ServerRowEntry<TData>[] {
  const headers = groupMeta.filter((meta) => meta.footer !== true).map(toServerGroupEntry);
  const footers = groupMeta.filter((meta) => meta.footer === true).map(toServerGroupFooterEntry);
  const dataEntries = createServerEntries(
    rows,
    startRow + headers.length,
    rowKey,
    undefined,
    duplicateRowKeyPolicy
  );
  return Object.freeze([...headers, ...dataEntries, ...footers]);
}

function toServerGroupEntry(meta: GroupMeta): ServerGroupRowEntry {
  return Object.freeze({
    kind: "group",
    key: meta.key,
    field: meta.field ?? "group",
    value: meta.value ?? meta.key,
    level: meta.level,
    childCount: meta.childCount ?? 0,
    expanded: meta.expanded === true,
    aggregateValues: meta.aggregateValues ?? {}
  });
}

function toServerGroupFooterEntry(meta: GroupMeta): ServerGroupFooterRowEntry {
  return Object.freeze({
    kind: "groupFooter",
    key: `${meta.key}:footer`,
    groupKey: meta.key,
    field: meta.field ?? "group",
    value: meta.value ?? meta.key,
    level: meta.level,
    childCount: meta.childCount ?? 0,
    aggregateValues: meta.aggregateValues ?? {}
  });
}
