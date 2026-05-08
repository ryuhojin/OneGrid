import type { DomGridOptions } from "./OneGrid.js";

export type BodyRowHeightResolver<TData> = (row: TData, rowIndex: number) => number | undefined;

export function createBodyRowHeightResolver<TData>(
  options: DomGridOptions<TData>
): BodyRowHeightResolver<TData> | undefined {
  const rowHeight = options.rowHeight;
  if (typeof rowHeight !== "function") {
    return undefined;
  }

  return (row, rowIndex) => normalizeRowHeight(rowHeight(row, rowIndex));
}

function normalizeRowHeight(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}
