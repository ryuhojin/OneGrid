import type { ColumnAutoSizeOptions } from "./columnUi.js";
import type { NormalizedDataColumn } from "./columnModel.js";

export function measureColumnWidth<TData>(
  column: NormalizedDataColumn<TData>,
  options: ColumnAutoSizeOptions<TData>
): number {
  const rows = options.rows ?? [];
  const maxRows = options.maxRows ?? 1_000;
  const charWidth = options.charWidth ?? 8;
  const horizontalPadding = options.horizontalPadding ?? 36;
  let longestText = column.headerName.length;

  for (const row of rows.slice(0, maxRows)) {
    longestText = Math.max(longestText, formatCellValue(readField(row, column.field)).length);
  }

  return longestText * charWidth + horizontalPadding;
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}
