import type { DomGridOptions } from "./OneGrid.js";

const DEFAULT_COLUMN_VIEWPORT_WIDTH = 800;

export interface ColumnVirtualScrollRuntime {
  readonly enabled: boolean;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  onScroll(scrollLeft: number, viewportWidth: number): void;
}

export function isColumnVirtualizationEnabled<TData>(options: DomGridOptions<TData>): boolean {
  return options.virtualization?.enabled !== false
    && options.virtualization?.columns?.enabled === true;
}

export function resolveColumnViewportWidth<TData>(options: DomGridOptions<TData>): number {
  return readNumericSize(options.layout?.width)
    ?? readNumericSize(options.width)
    ?? DEFAULT_COLUMN_VIEWPORT_WIDTH;
}

function readNumericSize(value: number | string | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined;
}
