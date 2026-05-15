import { resolveSegmentedVirtualRowWindow } from "@onegrid/core";
import type { FixedRowVirtualWindow } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";
import type { RowRenderState } from "./renderGridTypes.js";
import { createBodyRowHeightResolver } from "./rowHeightRuntime.js";
import {
  isRowVirtualizationEnabled,
  resolveVirtualRowHeight,
  resolveVirtualViewportHeight
} from "./virtualScrollRuntime.js";
import type { VirtualScrollRuntime } from "./virtualScrollRuntime.js";
import {
  replaceBodyRows
} from "./virtualBodyWindow.js";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { VirtualScrollAttachInput } from "./virtualBodyWindow.js";
import {
  clampScrollPosition,
  isWheelBoundaryHit,
  normalizeWheelDelta
} from "./wheelScroll.js";
import type { GridScrollCoordinator } from "./scrollCoordinator.js";
import {
  CONTROLLED_SCROLL_RESTORE,
  LOGICAL_SCROLL_EVENT
} from "./scrollCoordinator.js";
import { observeElementResize } from "./resizeObserver.js";

interface LogicalScrollDetail {
  readonly scrollTop?: unknown;
  readonly deferRemoteLoad?: unknown;
}

export function createViewportVirtualWindow<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined,
  virtualScrollRuntime: VirtualScrollRuntime | undefined
): FixedRowVirtualWindow | undefined {
  if (
    rowRenderState?.rowModel !== "viewport"
    || !isRowVirtualizationEnabled(options)
    || virtualScrollRuntime?.enabled === false
  ) {
    return undefined;
  }

  const rowHeight = resolveVirtualRowHeight(options);
  const viewportHeight = virtualScrollRuntime?.viewportHeight ?? resolveVirtualViewportHeight(options);
  const window = resolveSegmentedVirtualRowWindow({
    rowCount: rowRenderState.rowCount,
    rowHeight,
    viewportHeight,
    logicalScrollTop: virtualScrollRuntime?.scrollTop ?? 0,
    ...(options.viewport?.overscan === undefined ? {} : { overscan: options.viewport.overscan }),
    ...(options.virtualization?.maxDomRows === undefined ? {} : { maxDomRows: options.virtualization.maxDomRows }),
    ...(options.virtualization?.maxScrollHeight === undefined
      ? {}
        : { maxScrollHeight: options.virtualization.maxScrollHeight })
  });

  return Object.freeze({
    firstRow: window.firstVisibleRow,
    lastRow: window.lastVisibleRow,
    visibleFirstRow: window.firstVisibleRow,
    visibleLastRow: window.lastVisibleRow,
    rowHeight,
    offsetTop: -window.rowOffset,
    beforeHeight: 0,
    afterHeight: 0,
    totalHeight: Math.max(viewportHeight, window.visibleRowCount * rowHeight),
    renderedRowCount: window.visibleRowCount,
    visibleRowCount: window.visibleRowCount,
    overscanBefore: 0,
    overscanAfter: 0,
    scrollTop: 0,
    viewportHeight
  });
}

export function getRenderedViewportRows<TData>(
  rows: readonly BodyRowEntry<TData>[],
  virtualWindow: FixedRowVirtualWindow | undefined
): readonly BodyRowEntry<TData>[] {
  if (!virtualWindow) {
    return rows;
  }

  return rows.filter((row) => {
    if (!("rowIndex" in row)) {
      return false;
    }

    return row.rowIndex >= virtualWindow.visibleFirstRow
      && row.rowIndex <= virtualWindow.visibleLastRow;
  });
}

export function attachViewportVirtualScroll<TData>(input: VirtualScrollAttachInput<TData>): void {
  const {
    scrollElement,
    options,
    rowCount,
    panes,
    rowRenderState,
    centerOwnsTreeControls,
    virtualScrollRuntime
  } = input;
  const scrollCoordinator: GridScrollCoordinator | undefined = input.scrollCoordinator;
  if (
    rowRenderState?.rowModel !== "viewport"
    || !virtualScrollRuntime?.enabled
    || !virtualScrollRuntime.onLogicalRowScroll
  ) {
    return;
  }

  const onLogicalRowScroll = virtualScrollRuntime.onLogicalRowScroll;
  const rowHeight = resolveVirtualRowHeight(options);
  let logicalScrollTop = virtualScrollRuntime.scrollTop;
  const getViewportHeight = (): number => scrollElement.clientHeight || virtualScrollRuntime.viewportHeight;
  const getSegmentedWindow = (input: {
    readonly logicalScrollTop?: number;
    readonly physicalScrollTop?: number;
    readonly viewportHeight: number;
  }) => {
    return resolveSegmentedVirtualRowWindow({
      rowCount,
      rowHeight,
      viewportHeight: input.viewportHeight,
      ...(input.logicalScrollTop === undefined ? {} : { logicalScrollTop: input.logicalScrollTop }),
      ...(input.physicalScrollTop === undefined ? {} : { physicalScrollTop: input.physicalScrollTop }),
      ...(options.viewport?.overscan === undefined ? {} : { overscan: options.viewport.overscan }),
      ...(options.virtualization?.maxDomRows === undefined ? {} : { maxDomRows: options.virtualization.maxDomRows }),
      ...(options.virtualization?.maxScrollHeight === undefined
        ? {}
        : { maxScrollHeight: options.virtualization.maxScrollHeight })
    });
  };
  const setLogicalScrollMetadata = (scrollTop: number, viewportHeight: number): void => {
    const window = getSegmentedWindow({ logicalScrollTop: scrollTop, viewportHeight });
    scrollElement.dataset.logicalScrollTop = String(window.logicalScrollTop);
    scrollElement.dataset.logicalScrollMax = String(window.maxLogicalScrollTop);
    scrollElement.dataset.logicalScrollHeight = String(window.totalLogicalHeight);
    scrollElement.dataset.physicalScrollTop = String(window.physicalScrollTop);
    scrollElement.dataset.physicalScrollMax = String(window.maxPhysicalScrollTop);
    scrollCoordinator?.sync();
  };
  const createWindowForLogicalScroll = (
    scrollTop: number,
    viewportHeight = getViewportHeight()
  ): FixedRowVirtualWindow | undefined =>
    createViewportVirtualWindow(options, rowRenderState, {
      ...virtualScrollRuntime,
      scrollTop,
      viewportHeight
    });
  const updateRenderedViewportRows = (nextWindow: FixedRowVirtualWindow): void => {
    const rowHeightResolver = createBodyRowHeightResolver(options);
    replaceBodyRows({
      scrollElement,
      rows: getRenderedViewportRows(rowRenderState.entries, nextWindow),
      panes,
      rowRenderState,
      cellSpanModel: input.cellSpanModel,
      ...(options.locale === undefined ? {} : { locale: options.locale }),
      ...(input.rowIndexOffset === undefined ? {} : { rowIndexOffset: input.rowIndexOffset }),
      ...(rowHeightResolver === undefined ? {} : { rowHeight: rowHeightResolver }),
      centerOwnsTreeControls,
      virtualWindow: nextWindow
    });
    input.onWindowChange?.(nextWindow);
  };
  const applyLogicalScroll = (targetScrollTop: number, deferRemoteLoad = false): void => {
    const viewportHeight = getViewportHeight();
    const logicalWindow = getSegmentedWindow({ logicalScrollTop: targetScrollTop, viewportHeight });
    const nextLogicalScrollTop = logicalWindow.logicalScrollTop;
    logicalScrollTop = nextLogicalScrollTop;
    setLogicalScrollMetadata(nextLogicalScrollTop, viewportHeight);
    virtualScrollRuntime.onScroll(nextLogicalScrollTop, viewportHeight);

    const nextWindow = createWindowForLogicalScroll(nextLogicalScrollTop, viewportHeight);
    if (!nextWindow) {
      return;
    }

    const canReuseRows = isViewportRangeRendered(
      rowRenderState.entries,
      nextWindow.visibleFirstRow,
      nextWindow.visibleLastRow
    );
    if (canReuseRows) {
      updateRenderedViewportRows(nextWindow);
      scrollCoordinator?.sync();
      return;
    }

    if (deferRemoteLoad) {
      return;
    }

    onLogicalRowScroll(nextWindow.visibleFirstRow, nextLogicalScrollTop);
  };
  const updateViewportRows = (): void => {
    if (scrollElement.dataset.logicalScrollRestoring === CONTROLLED_SCROLL_RESTORE) {
      return;
    }

    const viewportHeight = getViewportHeight();
    const currentLogicalRow = Math.floor(logicalScrollTop / rowHeight);
    if (rowRenderState.loading && scrollElement.scrollTop <= 0 && currentLogicalRow > 0) {
      return;
    }

    const window = getSegmentedWindow({ physicalScrollTop: scrollElement.scrollTop, viewportHeight });
    logicalScrollTop = window.logicalScrollTop;
    setLogicalScrollMetadata(window.logicalScrollTop, viewportHeight);
    virtualScrollRuntime.onScroll(window.logicalScrollTop, viewportHeight);
    if (!isViewportRangeRendered(
      rowRenderState.entries,
      window.firstVisibleRow,
      window.lastVisibleRow
    )) {
      onLogicalRowScroll(window.firstVisibleRow, window.logicalScrollTop);
    }
  };

  scrollElement.addEventListener("wheel", (event) => {
    const deltaY = normalizeWheelDelta(event.deltaY, event.deltaMode, scrollElement.clientHeight);
    if (Math.abs(deltaY) < 1) {
      return;
    }

    const viewportHeight = getViewportHeight();
    const maxLogicalScrollTop = getSegmentedWindow({
      logicalScrollTop,
      viewportHeight
    }).maxLogicalScrollTop;
    const nextLogicalScrollTop = clampScrollPosition(
      logicalScrollTop + deltaY,
      maxLogicalScrollTop
    );
    if (
      Math.abs(nextLogicalScrollTop - logicalScrollTop) < 1
      && !isWheelBoundaryHit(logicalScrollTop, deltaY, maxLogicalScrollTop)
    ) {
      return;
    }

    event.preventDefault();
    applyLogicalScroll(nextLogicalScrollTop);
  }, { passive: false });

  const syncCurrentViewportWindow = (): void => {
    const viewportHeight = getViewportHeight();
    setLogicalScrollMetadata(logicalScrollTop, viewportHeight);
    virtualScrollRuntime.onScroll(logicalScrollTop, viewportHeight);
    const currentWindow = createWindowForLogicalScroll(logicalScrollTop, viewportHeight);
    if (!currentWindow) {
      return;
    }

    if (isViewportRangeRendered(
      rowRenderState.entries,
      currentWindow.visibleFirstRow,
      currentWindow.visibleLastRow
    )) {
      updateRenderedViewportRows(currentWindow);
      scrollCoordinator?.sync();
      return;
    }

    onLogicalRowScroll(currentWindow.visibleFirstRow, logicalScrollTop);
  };

  syncCurrentViewportWindow();
  requestAnimationFrame(syncCurrentViewportWindow);
  observeElementResize(scrollElement, syncCurrentViewportWindow);
  scrollElement.addEventListener(LOGICAL_SCROLL_EVENT, (event) => {
    const detail = (event as CustomEvent<LogicalScrollDetail>).detail;
    if (typeof detail?.scrollTop !== "number") {
      return;
    }

    applyLogicalScroll(detail.scrollTop, detail.deferRemoteLoad === true);
  });
  scrollElement.addEventListener("scroll", updateViewportRows, { passive: true });
}

function isViewportRangeRendered<TData>(
  entries: RowRenderState<TData>["entries"],
  firstVisibleRow: number,
  lastVisibleRow: number
): boolean {
  let first: number | undefined;
  let last: number | undefined;
  for (const entry of entries) {
    if (!("rowIndex" in entry)) {
      continue;
    }

    first ??= entry.rowIndex;
    last = entry.rowIndex;
  }
  if (first === undefined || last === undefined) {
    return false;
  }

  return first <= firstVisibleRow && last >= lastVisibleRow;
}
