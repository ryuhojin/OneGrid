import type {
  ColumnDef,
  ColumnGroupDef,
  ColumnTypeRegistry,
  DataColumnDef,
  DataColumnDefaults
} from "../types/column.js";
import type {
  ColumnType,
  ColumnTypeName,
  ColumnTypeReference
} from "../types/shared.js";

const BUILT_IN_COLUMN_TYPES = new Set<ColumnType>([
  "text",
  "number",
  "date",
  "datetime",
  "boolean",
  "custom"
]);

export interface ColumnDefinitionDefaults<TData = unknown> {
  readonly defaultColumnDef?: DataColumnDefaults<TData>;
  readonly columnTypes?: ColumnTypeRegistry<TData>;
}

export function resolveColumnDefinitions<TData>(
  columns: readonly ColumnDef<TData>[],
  defaults: ColumnDefinitionDefaults<TData> = {}
): readonly ColumnDef<TData>[] {
  return Object.freeze(columns.map((column) => resolveColumnDefinition(column, defaults)));
}

function resolveColumnDefinition<TData>(
  column: ColumnDef<TData>,
  defaults: ColumnDefinitionDefaults<TData>
): ColumnDef<TData> {
  if (isColumnGroup(column)) {
    return Object.freeze({
      ...column,
      children: resolveColumnDefinitions(column.children, defaults)
    });
  }

  return resolveDataColumnDefinition(column, defaults);
}

function resolveDataColumnDefinition<TData>(
  column: DataColumnDef<TData>,
  defaults: ColumnDefinitionDefaults<TData>
): DataColumnDef<TData> {
  const defaultTypeDefaults = resolveTypeDefaults(defaults.defaultColumnDef?.type, defaults.columnTypes);
  const columnTypeDefaults = resolveTypeDefaults(column.type, defaults.columnTypes);
  const resolvedType = columnTypeDefaults.resolvedType
    ?? defaultTypeDefaults.resolvedType
    ?? getLastTypeName(column.type)
    ?? getLastTypeName(defaults.defaultColumnDef?.type);
  return Object.freeze({
    ...defaults.defaultColumnDef,
    ...defaultTypeDefaults.defaults,
    ...columnTypeDefaults.defaults,
    ...column,
    ...(resolvedType === undefined ? {} : { type: resolvedType })
  });
}

function resolveTypeDefaults<TData>(
  type: ColumnTypeReference | undefined,
  registry: ColumnTypeRegistry<TData> | undefined,
  seen: ReadonlySet<string> = new Set()
): {
  readonly defaults: DataColumnDefaults<TData>;
  readonly resolvedType?: ColumnTypeName;
} {
  let merged: DataColumnDefaults<TData> = {};
  let resolvedType: ColumnTypeName | undefined;

  for (const typeName of normalizeTypeReferences(type)) {
    if (isBuiltInColumnType(typeName)) {
      resolvedType = typeName;
    }

    const typeDefaults = registry?.[typeName];
    if (typeDefaults === undefined || seen.has(typeName)) {
      if (!isBuiltInColumnType(typeName)) {
        resolvedType = typeName;
      }
      continue;
    }

    const nested = resolveTypeDefaults(typeDefaults.type, registry, new Set([...seen, typeName]));
    merged = {
      ...merged,
      ...nested.defaults,
      ...withoutType(typeDefaults)
    };
    resolvedType = nested.resolvedType ?? resolvedType ?? typeName;
  }

  return { defaults: merged, ...(resolvedType === undefined ? {} : { resolvedType }) };
}

function normalizeTypeReferences(type: ColumnTypeReference | undefined): readonly ColumnTypeName[] {
  if (type === undefined) {
    return [];
  }

  return typeof type === "string" ? [type] : type;
}

function withoutType<TData>(defaults: DataColumnDefaults<TData>): DataColumnDefaults<TData> {
  const { type, ...rest } = defaults;
  void type;
  return rest;
}

function getLastTypeName(type: ColumnTypeReference | undefined): ColumnTypeName | undefined {
  const types = normalizeTypeReferences(type);
  return types.at(-1);
}

function isBuiltInColumnType(type: string): type is ColumnType {
  return BUILT_IN_COLUMN_TYPES.has(type as ColumnType);
}

function isColumnGroup<TData>(column: ColumnDef<TData>): column is ColumnGroupDef<TData> {
  return "children" in column;
}
