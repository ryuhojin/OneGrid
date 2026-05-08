import type { GridOptions } from "@onegrid/core";

const DEFAULT_ROW_HEIGHT = 36;
const DEFAULT_VIEWPORT_HEIGHT = 360;

export interface VirtualScrollRuntime {
  readonly enabled: boolean;
  readonly scrollTop: number;
  readonly viewportHeight: number;
  onScroll(scrollTop: number, viewportHeight: number): void;
  onLogicalRowScroll?(rowIndex: number, scrollTop?: number): void;
}

export function resolveVirtualRowHeight<TData>(options: GridOptions<TData>): number {
  if (isPositiveNumber(options.virtualization?.rowHeight)) {
    return options.virtualization.rowHeight;
  }

  if (typeof options.rowHeight === "number" && isPositiveNumber(options.rowHeight)) {
    return options.rowHeight;
  }

  if (isPositiveNumber(options.viewport?.rowHeight)) {
    return options.viewport.rowHeight;
  }

  if (isPositiveNumber(options.virtualization?.estimatedRowHeight)) {
    return options.virtualization.estimatedRowHeight;
  }

  return DEFAULT_ROW_HEIGHT;
}

export function resolveVirtualViewportHeight<TData>(options: GridOptions<TData>): number {
  const numericSize = getNumericSize(options.layout?.bodyHeight)
    ?? getNumericSize(options.layout?.height)
    ?? getNumericSize(options.bodyHeight)
    ?? getNumericSize(options.height);

  return numericSize ?? DEFAULT_VIEWPORT_HEIGHT;
}

export function isRowVirtualizationEnabled<TData>(options: GridOptions<TData>): boolean {
  const virtualization = options.virtualization;
  if (!virtualization || virtualization.enabled === false) {
    return false;
  }

  return virtualization.columns?.enabled !== true
    || virtualization.rowHeight !== undefined
    || virtualization.estimatedRowHeight !== undefined
    || virtualization.overscan !== undefined
    || virtualization.maxDomRows !== undefined
    || virtualization.segmented === true
    || virtualization.maxScrollHeight !== undefined;
}

function getNumericSize(value: number | string | undefined): number | undefined {
  return typeof value === "number" && isPositiveNumber(value) ? value : undefined;
}

function isPositiveNumber(value: number | undefined): value is number {
  return Number.isFinite(value) && value !== undefined && value > 0;
}
