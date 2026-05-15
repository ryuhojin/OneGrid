import type { ColumnGroupDef, DataColumnDef } from "../types/column.js";
import type { ColumnId } from "../types/shared.js";

export type ColumnIdResolutionSource = "columnId" | "id" | "groupId" | "field" | "fallback";

export interface ColumnIdResolution {
  readonly id: ColumnId;
  readonly source: ColumnIdResolutionSource;
  readonly explicit: boolean;
}

export function resolveDataColumnId<TData>(
  column: Pick<DataColumnDef<TData>, "columnId" | "id" | "field">,
  fallbackId = "column"
): ColumnId {
  return normalizeColumnId(resolveDataColumnIdCandidate(column, fallbackId).id);
}

export function resolveGroupColumnId<TData>(
  column: Pick<ColumnGroupDef<TData>, "columnId" | "groupId">,
  fallbackId: string
): ColumnId {
  return normalizeColumnId(resolveGroupColumnIdCandidate(column, fallbackId).id);
}

export function resolveDataColumnIdCandidate<TData>(
  column: Pick<DataColumnDef<TData>, "columnId" | "id" | "field">,
  fallbackId = "column"
): ColumnIdResolution {
  if (column.columnId !== undefined) return resolveExplicitId(column.columnId, "columnId");
  if (column.id !== undefined) return resolveExplicitId(column.id, "id");
  if (column.field !== undefined) return { id: column.field, source: "field", explicit: false };
  return { id: fallbackId, source: "fallback", explicit: false };
}

export function resolveGroupColumnIdCandidate<TData>(
  column: Pick<ColumnGroupDef<TData>, "columnId" | "groupId">,
  fallbackId: string
): ColumnIdResolution {
  if (column.columnId !== undefined) return resolveExplicitId(column.columnId, "columnId");
  if (column.groupId !== undefined) return resolveExplicitId(column.groupId, "groupId");
  return { id: fallbackId, source: "fallback", explicit: false };
}

export function reserveColumnId(
  resolution: ColumnIdResolution,
  ids: Set<string>,
  reservedExplicitIds: ReadonlySet<string> = new Set<string>()
): ColumnId {
  const normalizedBaseId = normalizeColumnId(resolution.id);

  if (resolution.explicit && normalizedBaseId.length === 0) {
    throw new Error(`Column ${resolution.source} must not be empty.`);
  }

  if (resolution.explicit) {
    if (ids.has(normalizedBaseId)) {
      throw new Error(
        `Duplicate columnId "${normalizedBaseId}". Column identifiers must be unique across data and group columns.`
      );
    }

    ids.add(normalizedBaseId);
    return normalizedBaseId;
  }

  const reservedIds = new Set([...ids, ...reservedExplicitIds]);
  const allocatedId = allocateColumnId(normalizedBaseId, reservedIds);
  ids.add(allocatedId);
  return allocatedId;
}

export function allocateColumnId(baseId: ColumnId, ids: Set<string>): ColumnId {
  const normalizedBaseId = normalizeColumnId(baseId) || "column";
  let candidate = normalizedBaseId;
  let suffix = 2;

  while (ids.has(candidate)) {
    candidate = `${normalizedBaseId}__${suffix}`;
    suffix += 1;
  }

  ids.add(candidate);
  return candidate;
}

function resolveExplicitId(id: ColumnId, source: ColumnIdResolutionSource): ColumnIdResolution {
  return { id, source, explicit: true };
}

function normalizeColumnId(id: ColumnId): ColumnId {
  return id.trim();
}
