import type { GridImportBuildInput, GridImportBuildResult } from "./exportTypes.js";

export function buildImportedRows<TData = Record<string, unknown>>(
  input: GridImportBuildInput<TData>
): GridImportBuildResult<TData> {
  const rows = input.matrix.rows;
  const headerRowCount = resolveHeaderRowCount(rows.length, input.options);
  const header = headerRowCount > 0 ? rows[headerRowCount - 1] ?? [] : [];
  const body = headerRowCount > 0 ? rows.slice(headerRowCount) : rows;
  const fields = resolveImportFields(input, header);
  const imported: TData[] = [];
  const rejected: {
    rowIndex: number;
    reason: string;
    values: readonly unknown[];
  }[] = [];

  body.forEach((values, index) => {
    if (isBlankRow(values)) {
      return;
    }
    const record = createRecord(fields, values);
    const rowIndex = index + headerRowCount;
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

function resolveHeaderRowCount(
  rowCount: number,
  options: GridImportBuildInput["options"]
): number {
  if (options?.hasHeaders === false) {
    return 0;
  }
  if (options?.headerRowCount !== undefined) {
    return clampHeaderRowCount(options.headerRowCount, rowCount);
  }
  return rowCount === 0 ? 0 : 1;
}

function clampHeaderRowCount(value: number, rowCount: number): number {
  if (!Number.isFinite(value)) {
    return rowCount === 0 ? 0 : 1;
  }
  return Math.min(rowCount, Math.max(0, Math.trunc(value)));
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

function isBlankRow(values: readonly unknown[]): boolean {
  return values.every((value) => String(value ?? "").trim().length === 0);
}
