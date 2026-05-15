import type { CellSpanModel, LocaleFormatterBridge } from "@onegrid/core";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import type { DomGridOptions } from "./OneGrid.js";
import type { RowRenderState } from "./renderGridTypes.js";
import { createBodyRowHeightResolver, isAutoBodyRowHeight } from "./rowHeightRuntime.js";
import type { VirtualScrollRuntime } from "./virtualScrollRuntime.js";

export function createGridRoot<TData>(
  totalColumnWidth: number,
  columnCount: number,
  rowCount: number,
  options: DomGridOptions<TData>
): HTMLElement {
  const grid = document.createElement("div");
  grid.className = "og-grid";
  grid.setAttribute("role", options.rowModel === "tree" ? "treegrid" : "grid");
  grid.setAttribute("aria-colcount", String(columnCount));
  grid.setAttribute("aria-rowcount", String(rowCount));
  grid.style.setProperty("--og-layout-width", `${totalColumnWidth}px`);
  setGridRowHeight(grid, options);
  setSize(grid, "inlineSize", options.layout?.width ?? options.width);
  setSize(grid, "blockSize", options.layout?.height ?? options.height);
  setSize(grid, "maxBlockSize", options.layout?.bodyHeight ?? options.bodyHeight);
  return grid;
}

export function createBodyPaneRuntime<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined,
  cellSpanModel: CellSpanModel,
  groupRuntime: GroupRowRuntime | undefined,
  i18n: LocaleFormatterBridge,
  virtualScrollRuntime?: VirtualScrollRuntime
) {
  const rowHeight = createBodyRowHeightResolver(options, virtualScrollRuntime?.autoRowHeightCache);
  return {
    ...(rowRenderState?.treeRuntime === undefined ? {} : { treeRuntime: rowRenderState.treeRuntime }),
    ...(groupRuntime === undefined ? {} : { groupRuntime }),
    ...(options.tree?.treeColumnField === undefined ? {} : { treeColumnField: options.tree.treeColumnField }),
    cellSpanModel,
    i18n,
    ...(isAutoBodyRowHeight(options) && rowRenderState === undefined ? { autoRowHeight: true } : {}),
    ...(rowHeight === undefined ? {} : { rowHeight }),
    ...(options.editing === undefined ? {} : { editing: options.editing }),
    ...(options.security === undefined ? {} : { security: options.security })
  };
}

function setGridRowHeight<TData>(grid: HTMLElement, options: DomGridOptions<TData>): void {
  const rowHeight = typeof options.rowHeight === "number"
    ? options.rowHeight
    : options.virtualization?.rowHeight;
  if (rowHeight !== undefined && Number.isFinite(rowHeight) && rowHeight > 0) {
    grid.style.setProperty("--og-row-height", `${rowHeight}px`);
  }
}

function setSize(
  element: HTMLElement,
  property: "inlineSize" | "blockSize" | "maxBlockSize",
  value: number | string | undefined
): void {
  if (value === undefined) {
    return;
  }

  element.style[property] = typeof value === "number" ? `${value}px` : value;
}
