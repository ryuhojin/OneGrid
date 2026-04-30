import { calculateFixedRowVirtualWindow } from "@onegrid/core";
import { createBodyPane } from "./bodyPaneRenderer.js";
import {
  isRowVirtualizationEnabled,
  resolveVirtualRowHeight,
  resolveVirtualViewportHeight
} from "./virtualScrollRuntime.js";
import {
  clampScrollPosition,
  getMaxScrollTop,
  isWheelBoundaryHit,
  normalizeWheelDelta
} from "./wheelScroll.js";
import type { CellSpanModel, FixedRowVirtualWindow, LayoutPane } from "@onegrid/core";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { DomGridOptions } from "./OneGrid.js";
import type { RowRenderState } from "./renderGridShell.js";
import type { VirtualScrollRuntime } from "./virtualScrollRuntime.js";

export function createVirtualWindow<TData>(
  options: DomGridOptions<TData>,
  rowCount: number,
  rowRenderState: RowRenderState<TData> | undefined,
  virtualScrollRuntime: VirtualScrollRuntime | undefined
): FixedRowVirtualWindow | undefined {
  const eligible = rowRenderState === undefined
    && isRowVirtualizationEnabled(options)
    && virtualScrollRuntime?.enabled !== false;
  if (!eligible) {
    return undefined;
  }

  return calculateFixedRowVirtualWindow({
    rowCount,
    rowHeight: resolveVirtualRowHeight(options),
    scrollTop: virtualScrollRuntime?.scrollTop ?? 0,
    viewportHeight: virtualScrollRuntime?.viewportHeight ?? resolveVirtualViewportHeight(options),
    overscan: options.virtualization?.overscan,
    maxDomRows: options.virtualization?.maxDomRows
  });
}

export function getRenderedRows<TData>(
  allRows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined
): readonly BodyRowEntry<TData>[] {
  return virtualWindow ? allRows.slice(virtualWindow.firstRow, virtualWindow.lastRow + 1) : allRows;
}

export interface VirtualScrollAttachInput<TData> {
  readonly scrollElement: HTMLElement;
  readonly options: DomGridOptions<TData>;
  readonly rowCount: number;
  readonly allRows: readonly BodyRowEntry<TData>[];
  readonly panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
  readonly rowRenderState: RowRenderState<TData> | undefined;
  readonly cellSpanModel: CellSpanModel;
  readonly centerOwnsTreeControls: boolean;
  readonly virtualScrollRuntime: VirtualScrollRuntime | undefined;
  readonly virtualWindow: FixedRowVirtualWindow | undefined;
  getPanes?(): Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
  onWindowChange?(window: FixedRowVirtualWindow): void;
}

export function attachVirtualScroll<TData>(input: VirtualScrollAttachInput<TData>): void {
  const {
    scrollElement,
    options,
    rowCount,
    allRows,
    panes,
    rowRenderState,
    centerOwnsTreeControls,
    virtualScrollRuntime,
    virtualWindow,
    getPanes,
    onWindowChange
  } = input;
  if (!virtualWindow || !virtualScrollRuntime?.enabled) {
    return;
  }

  let currentWindow = virtualWindow;
  const updateRows = (nextWindow: FixedRowVirtualWindow): void => {
    virtualScrollRuntime.onScroll(nextWindow.scrollTop, nextWindow.viewportHeight);
    if (sameRenderedWindow(currentWindow, nextWindow)) {
      currentWindow = nextWindow;
      onWindowChange?.(nextWindow);
      return;
    }

    replaceBodyRows({
      scrollElement,
      rows: getRenderedRows(allRows, nextWindow),
      panes: getPanes?.() ?? panes,
      rowRenderState,
      cellSpanModel: input.cellSpanModel,
      centerOwnsTreeControls,
      virtualWindow: nextWindow
    });
    currentWindow = nextWindow;
    onWindowChange?.(nextWindow);
  };
  const getWindowForScrollTop = (scrollTop: number): FixedRowVirtualWindow =>
    calculateFixedRowVirtualWindow({
      rowCount,
      rowHeight: resolveVirtualRowHeight(options),
      scrollTop,
      viewportHeight: scrollElement.clientHeight || virtualScrollRuntime.viewportHeight,
      overscan: options.virtualization?.overscan,
      maxDomRows: options.virtualization?.maxDomRows
    });

  scrollElement.addEventListener("wheel", (event) => {
    const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, scrollElement.clientHeight);
    if (Math.abs(deltaY) < 1) {
      return;
    }

    const maxScrollTop = getMaxScrollTop(scrollElement);
    const nextScrollTop = clampScrollPosition(scrollElement.scrollTop + deltaY, maxScrollTop);
    if (
      nextScrollTop === scrollElement.scrollTop
      && !isWheelBoundaryHit(scrollElement.scrollTop, deltaY, maxScrollTop)
    ) {
      return;
    }

    event.preventDefault();
    scrollElement.scrollTop = nextScrollTop;
    updateRows(getWindowForScrollTop(nextScrollTop));
  }, { passive: false });

  scrollElement.addEventListener("scroll", () => {
    const nextWindow = calculateFixedRowVirtualWindow({
      rowCount,
      rowHeight: resolveVirtualRowHeight(options),
      scrollTop: scrollElement.scrollTop,
      viewportHeight: scrollElement.clientHeight || virtualScrollRuntime.viewportHeight,
      overscan: options.virtualization?.overscan,
      maxDomRows: options.virtualization?.maxDomRows
    });
    updateRows(nextWindow);
  }, { passive: true });
}

export function restoreVirtualScroll(
  scrollElement: HTMLElement,
  markerElement: HTMLElement,
  virtualScrollRuntime: VirtualScrollRuntime | undefined,
  virtualWindow: FixedRowVirtualWindow | undefined
): void {
  if (!virtualWindow || !virtualScrollRuntime?.enabled) {
    return;
  }

  markerElement.dataset.virtualizedRows = "true";
  scrollElement.dataset.virtualizedRows = "true";
  markerElement.style.setProperty("--og-row-height", `${virtualWindow.rowHeight}px`);
  scrollElement.scrollTop = virtualScrollRuntime.scrollTop;
}

function replaceBodyRows<TData>(input: {
  readonly scrollElement: HTMLElement;
  readonly rows: readonly BodyRowEntry<TData>[];
  readonly panes: Readonly<Record<"left" | "center" | "right", LayoutPane<TData>>>;
  readonly rowRenderState: RowRenderState<TData> | undefined;
  readonly cellSpanModel: CellSpanModel;
  readonly centerOwnsTreeControls: boolean;
  readonly virtualWindow: FixedRowVirtualWindow;
}): void {
  const bodySection = input.scrollElement.querySelector<HTMLElement>('[data-layout-section="body"]');
  if (!bodySection) {
    return;
  }

  for (const key of ["left", "center", "right"] as const) {
    const paneElement = bodySection.querySelector<HTMLElement>(`[data-layout-pane="${key}"]`);
    if (!paneElement) {
      continue;
    }

    paneElement.replaceChildren(createBodyPane(
      input.panes[key],
      input.rows,
      {
        ...(input.rowRenderState?.treeRuntime === undefined
          ? {}
          : { treeRuntime: input.rowRenderState.treeRuntime }),
        ...(input.rowRenderState?.treeRuntime?.treeColumnField === undefined
          ? {}
          : { treeColumnField: input.rowRenderState.treeRuntime.treeColumnField }),
        cellSpanModel: input.cellSpanModel
      },
      input.centerOwnsTreeControls,
      input.virtualWindow
    ));
  }
}

function sameRenderedWindow(left: FixedRowVirtualWindow, right: FixedRowVirtualWindow): boolean {
  return left.firstRow === right.firstRow
    && left.lastRow === right.lastRow
    && left.beforeHeight === right.beforeHeight
    && left.afterHeight === right.afterHeight;
}
