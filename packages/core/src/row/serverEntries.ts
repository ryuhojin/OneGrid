import { resolveRowKey } from "./rowIdentity.js";
import type { RowKeyInput } from "./rowIdentity.js";
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
  groupMeta: readonly GroupMeta[] | undefined = undefined
): readonly ServerRowEntry<TData>[] {
  if (groupMeta && groupMeta.length > 0) {
    return createGroupedServerEntries(rows, startRow, rowKey, groupMeta);
  }

  return Object.freeze(
    rows.map<ServerRowEntry<TData>>((row, index) =>
      Object.freeze({
        kind: "data",
        rowIndex: startRow + index,
        key: resolveRowKey(row, startRow + index, rowKey),
        data: row
      })
    )
  );
}

function createGroupedServerEntries<TData>(
  rows: readonly TData[],
  startRow: number,
  rowKey: RowKeyInput<TData> | undefined,
  groupMeta: readonly GroupMeta[]
): readonly ServerRowEntry<TData>[] {
  const headers = groupMeta.filter((meta) => meta.footer !== true).map(toServerGroupEntry);
  const footers = groupMeta.filter((meta) => meta.footer === true).map(toServerGroupFooterEntry);
  const dataEntries = createServerEntries(rows, startRow + headers.length, rowKey);
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
