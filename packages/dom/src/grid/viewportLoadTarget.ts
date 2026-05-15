import {
  getSegmentedScrollTopForRow,
  resolveSegmentedVirtualRowWindow
} from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export interface ViewportLoadTarget {
  readonly rowIndex: number;
  readonly scrollTop: number;
}

export function resolveViewportLoadTarget<TData>(input: {
  readonly options: DomGridOptions<TData>;
  readonly rowCount: number;
  readonly rowHeight: number;
  readonly viewportHeight: number;
  readonly rowIndex: number;
  readonly scrollTop?: number;
}): ViewportLoadTarget {
  const logicalScrollTop = input.scrollTop ?? getSegmentedScrollTopForRow({
    rowCount: input.rowCount,
    rowHeight: input.rowHeight,
    viewportHeight: input.viewportHeight,
    rowIndex: input.rowIndex,
    align: "start",
    ...(input.options.virtualization?.maxScrollHeight === undefined
      ? {}
      : { maxScrollHeight: input.options.virtualization.maxScrollHeight })
  });
  const window = resolveSegmentedVirtualRowWindow({
    rowCount: input.rowCount,
    rowHeight: input.rowHeight,
    viewportHeight: input.viewportHeight,
    logicalScrollTop,
    ...(input.options.viewport?.overscan === undefined ? {} : { overscan: input.options.viewport.overscan }),
    ...(input.options.virtualization?.maxDomRows === undefined
      ? {}
      : { maxDomRows: input.options.virtualization.maxDomRows }),
    ...(input.options.virtualization?.maxScrollHeight === undefined
      ? {}
      : { maxScrollHeight: input.options.virtualization.maxScrollHeight })
  });

  return Object.freeze({
    rowIndex: window.firstVisibleRow,
    scrollTop: window.logicalScrollTop
  });
}
