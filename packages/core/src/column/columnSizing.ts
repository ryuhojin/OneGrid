import type { DataColumnDef } from "../types/column.js";

const DEFAULT_WIDTH = 120;
const DEFAULT_MIN_WIDTH = 40;

export interface ColumnSizingOptions {
  readonly defaultWidth?: number;
  readonly defaultMinWidth?: number;
  readonly defaultMaxWidth?: number;
}

export interface ResolvedColumnSizingOptions {
  readonly defaultWidth: number;
  readonly defaultMinWidth: number;
  readonly defaultMaxWidth: number | undefined;
}

export interface ResolvedColumnSizing {
  readonly width: number;
  readonly minWidth: number;
  readonly maxWidth: number | undefined;
  readonly flex: number | undefined;
}

export function normalizeColumnSizingOptions(
  options: ColumnSizingOptions
): ResolvedColumnSizingOptions {
  return {
    defaultWidth: normalizePositiveNumber(options.defaultWidth, DEFAULT_WIDTH),
    defaultMinWidth: normalizePositiveNumber(options.defaultMinWidth, DEFAULT_MIN_WIDTH),
    defaultMaxWidth: normalizeOptionalPositiveNumber(options.defaultMaxWidth)
  };
}

export function resolveColumnSizing<TData>(
  column: DataColumnDef<TData>,
  options: ResolvedColumnSizingOptions,
  widthOverride?: number
): ResolvedColumnSizing {
  const minWidth = normalizePositiveNumber(column.minWidth, options.defaultMinWidth);
  const maxWidth = normalizeMaxWidth(column.maxWidth, options.defaultMaxWidth, minWidth);
  const width = clampWidth(
    normalizePositiveNumber(widthOverride ?? column.width, options.defaultWidth),
    minWidth,
    maxWidth
  );

  return {
    width,
    minWidth,
    maxWidth,
    flex: normalizeFlex(column.flex)
  };
}

function normalizePositiveNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizeOptionalPositiveNumber(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
}

function normalizeMaxWidth(
  columnMaxWidth: number | undefined,
  defaultMaxWidth: number | undefined,
  minWidth: number
): number | undefined {
  const maxWidth = normalizeOptionalPositiveNumber(columnMaxWidth) ?? defaultMaxWidth;
  return maxWidth === undefined ? undefined : Math.max(maxWidth, minWidth);
}

function clampWidth(width: number, minWidth: number, maxWidth: number | undefined): number {
  const lowerBoundedWidth = Math.max(width, minWidth);
  return maxWidth === undefined ? lowerBoundedWidth : Math.min(lowerBoundedWidth, maxWidth);
}

function normalizeFlex(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return value;
}
