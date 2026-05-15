import {
  calculateFixedColumnVirtualWindow,
  createColumnVirtualizationIndex
} from "@onegrid/core";
import type {
  ColumnVirtualizationIndex,
  FixedColumnVirtualWindow,
  LayoutPane
} from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export interface ColumnVirtualWindowResolver {
  readonly index: ColumnVirtualizationIndex;
  readonly columnWidths: readonly number[];
  resolve(scrollLeft: number, viewportWidth: number): FixedColumnVirtualWindow;
}

export function createColumnVirtualWindowResolver<TData>(
  options: DomGridOptions<TData>,
  pane: LayoutPane<TData>
): ColumnVirtualWindowResolver {
  const columnWidths = Object.freeze(pane.columns.map((column) => column.width));
  const index = createColumnVirtualizationIndex({ columnWidths });
  const overscan = options.virtualization?.columns?.overscan;
  const maxDomColumns = options.virtualization?.columns?.maxDomColumns;

  return Object.freeze({
    index,
    columnWidths,
    resolve(scrollLeft: number, viewportWidth: number): FixedColumnVirtualWindow {
      return calculateFixedColumnVirtualWindow({
        columnWidths,
        columnVirtualizationIndex: index,
        scrollLeft,
        viewportWidth,
        overscan,
        maxDomColumns
      });
    }
  });
}
