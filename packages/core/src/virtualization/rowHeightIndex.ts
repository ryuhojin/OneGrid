const DEFAULT_ROW_HEIGHT = 36;

export interface RowHeightIndexInput {
  readonly rowCount: number;
  readonly estimatedRowHeight?: number;
  readonly getRowHeight?: (rowIndex: number) => number | undefined;
}

export interface RowHeightIndex {
  readonly rowCount: number;
  readonly estimatedRowHeight: number;
  readonly heights: readonly number[];
  readonly offsets: readonly number[];
  readonly totalHeight: number;
  getRowHeight(rowIndex: number): number;
  getRowOffset(rowIndex: number): number;
  findRowAtOffset(offset: number): number;
  sumRows(firstRow: number, lastRow: number): number;
}

export function createRowHeightIndex(input: RowHeightIndexInput): RowHeightIndex {
  const rowCount = normalizeCount(input.rowCount);
  const estimatedRowHeight = normalizePositive(input.estimatedRowHeight, DEFAULT_ROW_HEIGHT);
  const heights: number[] = [];
  const offsets: number[] = [];
  let totalHeight = 0;

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const height = normalizePositive(input.getRowHeight?.(rowIndex), estimatedRowHeight);
    offsets.push(totalHeight);
    heights.push(height);
    totalHeight += height;
  }
  offsets.push(totalHeight);

  return Object.freeze({
    rowCount,
    estimatedRowHeight,
    heights: Object.freeze(heights),
    offsets: Object.freeze(offsets),
    totalHeight,
    getRowHeight(rowIndex: number): number {
      return heights[clamp(Math.trunc(rowIndex), 0, Math.max(0, rowCount - 1))]
        ?? estimatedRowHeight;
    },
    getRowOffset(rowIndex: number): number {
      return offsets[clamp(Math.trunc(rowIndex), 0, rowCount)] ?? 0;
    },
    findRowAtOffset(offset: number): number {
      return findRowAtOffset(offsets, totalHeight, offset);
    },
    sumRows(firstRow: number, lastRow: number): number {
      const first = clamp(Math.trunc(firstRow), 0, rowCount);
      const last = clamp(Math.trunc(lastRow), first - 1, rowCount - 1);
      return last < first ? 0 : (offsets[last + 1] ?? totalHeight) - (offsets[first] ?? 0);
    }
  });
}

function findRowAtOffset(
  offsets: readonly number[],
  totalHeight: number,
  offset: number
): number {
  const rowCount = Math.max(0, offsets.length - 1);
  if (rowCount === 0) {
    return 0;
  }

  const normalizedOffset = clamp(normalizeNonNegative(offset), 0, Math.max(0, totalHeight - 0.0001));
  let low = 0;
  let high = rowCount - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const rowEnd = offsets[mid + 1] ?? totalHeight;
    if (rowEnd <= normalizedOffset) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
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
