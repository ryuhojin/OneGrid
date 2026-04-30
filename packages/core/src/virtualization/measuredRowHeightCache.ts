const DEFAULT_ROW_HEIGHT = 36;

export interface MeasuredRowHeightCache {
  readonly defaultRowHeight: number;
  readonly size: number;
  get(rowIndex: number): number | undefined;
  set(rowIndex: number, height: number): void;
  delete(rowIndex: number): boolean;
  clear(): void;
  estimateOffset(rowIndex: number): number;
  estimateTotalHeight(rowCount: number): number;
  entries(): readonly MeasuredRowHeightEntry[];
}

export interface MeasuredRowHeightEntry {
  readonly rowIndex: number;
  readonly height: number;
}

export function createMeasuredRowHeightCache(defaultRowHeight = DEFAULT_ROW_HEIGHT): MeasuredRowHeightCache {
  const normalizedDefault = normalizePositive(defaultRowHeight, DEFAULT_ROW_HEIGHT);
  const heights = new Map<number, number>();

  return {
    defaultRowHeight: normalizedDefault,
    get size() {
      return heights.size;
    },
    get(rowIndex) {
      return heights.get(normalizeRowIndex(rowIndex));
    },
    set(rowIndex, height) {
      heights.set(normalizeRowIndex(rowIndex), normalizePositive(height, normalizedDefault));
    },
    delete(rowIndex) {
      return heights.delete(normalizeRowIndex(rowIndex));
    },
    clear() {
      heights.clear();
    },
    estimateOffset(rowIndex) {
      const normalizedIndex = normalizeRowIndex(rowIndex);
      let offset = normalizedIndex * normalizedDefault;
      for (const [measuredIndex, height] of heights) {
        if (measuredIndex < normalizedIndex) {
          offset += height - normalizedDefault;
        }
      }
      return offset;
    },
    estimateTotalHeight(rowCount) {
      const normalizedCount = normalizeRowCount(rowCount);
      let total = normalizedCount * normalizedDefault;
      for (const [measuredIndex, height] of heights) {
        if (measuredIndex < normalizedCount) {
          total += height - normalizedDefault;
        }
      }
      return total;
    },
    entries() {
      return Object.freeze(
        [...heights.entries()]
          .sort(([left], [right]) => left - right)
          .map(([rowIndex, height]) => Object.freeze({ rowIndex, height }))
      );
    }
  };
}

function normalizeRowIndex(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizeRowCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

function normalizePositive(value: number, fallback: number): number {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
