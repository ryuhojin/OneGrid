import { aggregateClientRows } from "./clientAggregate.js";
import { readField } from "./rowIdentity.js";
import type { ClientAggregateValues } from "./clientAggregate.js";
import type { ClientRowNode } from "./rowIdentity.js";
import type {
  AggregateModel,
  GroupFooterPosition,
  GroupModel,
  RowKey
} from "../types/shared.js";

export type ClientRowModelEntry<TData = unknown> =
  | ClientDataRowEntry<TData>
  | ClientGroupRowEntry
  | ClientGroupFooterRowEntry;

export interface ClientDataRowEntry<TData = unknown> {
  readonly kind: "data";
  readonly key: RowKey;
  readonly data: TData;
  readonly sourceIndex: number;
}

export interface ClientGroupRowEntry {
  readonly kind: "group";
  readonly key: string;
  readonly field: string;
  readonly value: unknown;
  readonly level: number;
  readonly childCount: number;
  readonly expanded: boolean;
  readonly aggregateValues: ClientAggregateValues;
}

export interface ClientGroupFooterRowEntry {
  readonly kind: "groupFooter";
  readonly key: string;
  readonly groupKey: string;
  readonly field: string;
  readonly value: unknown;
  readonly level: number;
  readonly childCount: number;
  readonly aggregateValues: ClientAggregateValues;
}

export function groupClientRows<TData>(
  rows: readonly ClientRowNode<TData>[],
  groupModel: GroupModel | undefined,
  aggregateModel: AggregateModel | undefined,
  footer: GroupFooterPosition = "none"
): readonly ClientRowModelEntry<TData>[] {
  const fields = groupModel?.fields ?? [];
  if (fields.length === 0) {
    return Object.freeze(rows.map(toDataEntry));
  }

  const entries = flattenGroups(rows, fields, groupModel?.expandedKeys, aggregateModel, footer, 0, []);
  return Object.freeze(entries);
}

function flattenGroups<TData>(
  rows: readonly ClientRowNode<TData>[],
  fields: readonly string[],
  expandedKeys: readonly string[] | undefined,
  aggregateModel: AggregateModel | undefined,
  footer: GroupFooterPosition,
  level: number,
  path: readonly string[]
): ClientRowModelEntry<TData>[] {
  const field = fields[level];
  if (field === undefined) {
    return rows.map(toDataEntry);
  }

  const entries: ClientRowModelEntry<TData>[] = [];
  const groupedRows = groupByField(rows, field);
  for (const group of groupedRows) {
    const groupKey = createGroupKey([...path, `${field}=${String(group.value)}`]);
    const expanded = expandedKeys === undefined || expandedKeys.includes(groupKey);
    const aggregateValues = aggregateClientRows(group.rows, aggregateModel);
    entries.push(
      Object.freeze({
        kind: "group",
        key: groupKey,
        field,
        value: group.value,
        level,
        childCount: group.rows.length,
        expanded,
        aggregateValues
      })
    );

    if (expanded) {
      entries.push(
        ...flattenGroups(group.rows, fields, expandedKeys, aggregateModel, footer, level + 1, [
          ...path,
          `${field}=${String(group.value)}`
        ])
      );
      if (footer === "bottom") {
        entries.push(
          Object.freeze({
            kind: "groupFooter",
            key: `${groupKey}:footer`,
            groupKey,
            field,
            value: group.value,
            level,
            childCount: group.rows.length,
            aggregateValues
          })
        );
      }
    }
  }

  return entries;
}

function groupByField<TData>(
  rows: readonly ClientRowNode<TData>[],
  field: string
): readonly { readonly value: unknown; readonly rows: readonly ClientRowNode<TData>[] }[] {
  const order: unknown[] = [];
  const groups = new Map<unknown, ClientRowNode<TData>[]>();

  for (const row of rows) {
    const value = readField(row.data, field);
    if (!groups.has(value)) {
      groups.set(value, []);
      order.push(value);
    }

    groups.get(value)?.push(row);
  }

  return Object.freeze(
    order.map((value) =>
      Object.freeze({
        value,
        rows: Object.freeze(groups.get(value) ?? [])
      })
    )
  );
}

function toDataEntry<TData>(node: ClientRowNode<TData>): ClientDataRowEntry<TData> {
  return Object.freeze({
    kind: "data",
    key: node.key,
    data: node.data,
    sourceIndex: node.sourceIndex
  });
}

function createGroupKey(path: readonly string[]): string {
  return `group:${path.join("/")}`;
}
