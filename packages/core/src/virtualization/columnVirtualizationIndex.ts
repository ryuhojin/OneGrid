export const DEFAULT_COLUMN_WIDTH = 120;

export interface ColumnVirtualizationIndexInput {
  readonly columnWidths: readonly number[];
}

export interface ColumnVirtualizationIndex {
  readonly widths: readonly number[];
  readonly offsets: readonly number[];
  readonly columnCount: number;
  readonly totalWidth: number;
  getColumnOffset(index: number): number;
  getColumnWidth(index: number): number;
  findColumnAtOffset(offset: number): number;
  sumColumns(firstColumn: number, lastColumn: number): number;
}

export function createColumnVirtualizationIndex(
  input: ColumnVirtualizationIndexInput
): ColumnVirtualizationIndex {
  const widths = normalizeWidths(input.columnWidths);
  const offsets = calculateOffsets(widths);
  const columnCount = widths.length;
  const totalWidth = offsets[columnCount] ?? 0;

  return Object.freeze({
    widths,
    offsets,
    columnCount,
    totalWidth,
    getColumnOffset(index: number): number {
      return offsets[clamp(Math.trunc(index), 0, columnCount)] ?? 0;
    },
    getColumnWidth(index: number): number {
      return widths[clamp(Math.trunc(index), 0, Math.max(0, columnCount - 1))]
        ?? DEFAULT_COLUMN_WIDTH;
    },
    findColumnAtOffset(offset: number): number {
      return findColumnAtOffset(widths, offsets, totalWidth, offset);
    },
    sumColumns(firstColumn: number, lastColumn: number): number {
      const first = clamp(Math.trunc(firstColumn), 0, columnCount);
      const last = clamp(Math.trunc(lastColumn), first - 1, columnCount - 1);
      return last < first ? 0 : (offsets[last + 1] ?? totalWidth) - (offsets[first] ?? 0);
    }
  });
}

function findColumnAtOffset(
  widths: readonly number[],
  offsets: readonly number[],
  totalWidth: number,
  offset: number
): number {
  if (widths.length === 0) {
    return 0;
  }

  const normalizedOffset = clamp(normalizeNonNegative(offset), 0, Math.max(0, totalWidth - 0.0001));
  let low = 0;
  let high = widths.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const columnEnd = offsets[mid + 1] ?? totalWidth;
    if (columnEnd <= normalizedOffset) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function normalizeWidths(widths: readonly number[]): readonly number[] {
  return Object.freeze(widths.map((width) => normalizePositive(width, DEFAULT_COLUMN_WIDTH)));
}

function calculateOffsets(widths: readonly number[]): readonly number[] {
  const offsets: number[] = [];
  let total = 0;
  for (const width of widths) {
    offsets.push(total);
    total += width;
  }
  offsets.push(total);
  return Object.freeze(offsets);
}

function normalizePositive(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : fallback;
}

function normalizeNonNegative(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
