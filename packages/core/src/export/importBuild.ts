import type { GridImportBuildInput, GridImportBuildResult } from "./exportTypes.js";

export function buildImportedRows<TData = Record<string, unknown>>(
  input: GridImportBuildInput<TData>
): GridImportBuildResult<TData> {
  const rows = input.matrix.rows;
  const hasHeaders = input.options?.hasHeaders ?? true;
  const header = hasHeaders ? rows[0] ?? [] : [];
  const body = hasHeaders ? rows.slice(1) : rows;
  const fields = resolveImportFields(input, header);
  const imported: TData[] = [];
  const rejected: {
    rowIndex: number;
    reason: string;
    values: readonly unknown[];
  }[] = [];

  body.forEach((values, index) => {
    const record = createRecord(fields, values);
    const rowIndex = hasHeaders ? index + 1 : index;
    try {
      imported.push(input.options?.parseRow
        ? input.options.parseRow(record, rowIndex)
        : record as TData);
    } catch (error) {
      rejected.push({
        rowIndex,
        values,
        reason: error instanceof Error ? error.message : "Row parser rejected the import row."
      });
    }
  });

  return Object.freeze({
    rows: Object.freeze(imported),
    rejected: Object.freeze(rejected)
  });
}

function resolveImportFields<TData>(
  input: GridImportBuildInput<TData>,
  header: readonly string[]
): readonly string[] {
  if (input.options?.columns && input.options.columns.length > 0) {
    return input.options.columns;
  }
  if (header.length > 0) {
    return header.map((item) => item.trim()).filter(Boolean);
  }
  return (input.fallbackColumns ?? []).map((column) => column.field);
}

function createRecord(
  fields: readonly string[],
  values: readonly unknown[]
): Readonly<Record<string, unknown>> {
  const record: Record<string, unknown> = {};
  fields.forEach((field, index) => {
    record[field] = values[index] ?? "";
  });
  return Object.freeze(record);
}
