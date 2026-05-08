import type { ColumnGroupDef, DataColumnDef } from "../types/column.js";
import type { ColumnId } from "../types/shared.js";

export function resolveDataColumnId<TData>(
  column: Pick<DataColumnDef<TData>, "columnId" | "id" | "field">,
  fallbackId = "column"
): ColumnId {
  return column.columnId ?? column.id ?? column.field ?? fallbackId;
}

export function resolveGroupColumnId<TData>(
  column: Pick<ColumnGroupDef<TData>, "columnId" | "groupId">,
  fallbackId: string
): ColumnId {
  return column.columnId ?? column.groupId ?? fallbackId;
}

export function allocateColumnId(baseId: ColumnId, ids: Set<string>): ColumnId {
  const normalizedBaseId = baseId.trim().length > 0 ? baseId.trim() : "column";
  let candidate = normalizedBaseId;
  let suffix = 2;

  while (ids.has(candidate)) {
    candidate = `${normalizedBaseId}__${suffix}`;
    suffix += 1;
  }

  ids.add(candidate);
  return candidate;
}
