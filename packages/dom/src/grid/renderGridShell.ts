import {
  createCellSpanModel,
  createFrozenRowSlices,
  createGridLayoutModel,
  createHeaderModel,
  createLocaleFormatter,
  resolveEditKeyboardPolicy,
  createSummaryRow
} from "@onegrid/core";
import type { CellSpanModel, LocaleFormatterBridge } from "@onegrid/core";
import { createBodyPane } from "./bodyPaneRenderer.js";
import type { ColumnVirtualScrollRuntime } from "./columnVirtualScrollRuntime.js";
import { resolveColumnUiOptions } from "./columnControls.js";
import type { ColumnUiRuntime } from "./columnControls.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import { attachEditorScrollSyncForHost, disposeEditorScrollSync } from "./editorScrollSync.js";
import { createFooterSection, createOverlayLayer } from "./footerRenderer.js";
import { appendFrozenRowsSections } from "./frozenRowRenderer.js";
import { applyGridAccessibility } from "./gridAccessibility.js";
import { attachGridFocusForHost, disposeGridFocus } from "./gridFocus.js";
import { attachGridScrollbarsForHost, disposeGridScrollbars } from "./gridScrollbars.js";
import { createBodyShell, createBodyViewport, createSection } from "./gridSections.js";
import { appendBottomPagination, appendTopToolbars } from "./gridToolbarRenderer.js";
import { createDomColumnModel } from "./domColumnModel.js";
import { createHeaderPane } from "./headerRenderer.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { attachInfiniteScroll } from "./infiniteScrollTrigger.js";
import type { GridEditRuntime } from "./editRuntime.js";
import type { DomGridOptions } from "./OneGrid.js";
import { createPivotRenderData } from "./pivotRenderData.js";
import {
  createPaginationRenderModel,
} from "./paginationRenderer.js";
import type { GridPaginationRuntime } from "./paginationRenderer.js";
import type { RenderInvalidation } from "./renderInvalidation.js";
import {
  createCellSpanRows,
  getGridRowData,
  getSummaryRows
} from "./renderGridData.js";
import type { RowRenderState } from "./renderGridTypes.js";
import { createBodyRowHeightResolver } from "./rowHeightRuntime.js";
import { attachGridSelectionForHost, disposeGridSelection } from "./selectionRuntime.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import type { HeaderSortRuntime } from "./sortRuntime.js";
import { createSummarySection, getSummaryPlacements } from "./summarySections.js";
import {
  attachColumnVirtualScroll,
  createColumnVirtualWindow,
  getRenderedHeaderRows,
  getRenderedPanes,
  restoreColumnVirtualScroll
} from "./virtualColumnWindow.js";
import {
  attachVirtualScroll,
  createVirtualWindow,
  getRenderedRows,
  restoreVirtualScroll
} from "./virtualBodyWindow.js";
import {
  attachViewportVirtualScroll,
  createViewportVirtualWindow,
  getRenderedViewportRows
} from "./viewportVirtualBodyWindow.js";
import type { VirtualScrollRuntime } from "./virtualScrollRuntime.js";
import { attachWheelBoundaryGuard } from "./wheelScroll.js";

export type { RowRenderState } from "./renderGridTypes.js";

export function disposeGridShell(host: HTMLElement): void {
  disposeGridScrollbars(host);
  disposeGridFocus(host);
  disposeGridSelection(host);
  disposeEditorScrollSync(host);
}

export function renderGridShell<TData>(
  host: HTMLElement,
  options: DomGridOptions<TData>,
  runtime?: ColumnUiRuntime,
  rowRenderState?: RowRenderState<TData>,
  virtualScrollRuntime?: VirtualScrollRuntime,
  columnVirtualScrollRuntime?: ColumnVirtualScrollRuntime,
  sortRuntime?: HeaderSortRuntime,
  filterRuntime?: HeaderFilterRuntime,
  groupRuntime?: GroupRowRuntime,
  editRuntime?: GridEditRuntime,
  selectionRuntime?: GridSelectionRuntime,
  paginationRuntime?: GridPaginationRuntime,
  invalidation?: RenderInvalidation
): void {
  disposeGridShell(host);
  host.replaceChildren();

  const pivotRenderData = createPivotRenderData(options, rowRenderState !== undefined);
  const renderOptions = pivotRenderData.options;
  const columnModel = createDomColumnModel(renderOptions);
  const headerModel = createHeaderModel(
    columnModel,
    renderOptions.headerMerge === undefined ? {} : { merge: renderOptions.headerMerge }
  );
  const rowData = getGridRowData(renderOptions, rowRenderState);
  const allRows = rowData.rows;
  const rowCount = rowRenderState?.rowCount ?? allRows.length;
  const i18n = createLocaleFormatter(renderOptions.locale);
  const frozenRows = createFrozenRowSlices(allRows, {
    ...(renderOptions.frozenRows === undefined ? {} : renderOptions.frozenRows),
    totalRowCount: rowCount
  });
  const paginationModel = createPaginationRenderModel(
    renderOptions,
    rowData.totalRowCount,
    rowRenderState
  );
  const virtualWindow = createVirtualWindow(
    renderOptions,
    frozenRows.scrollableRowCount,
    rowRenderState,
    virtualScrollRuntime
  );
  const viewportVirtualWindow = createViewportVirtualWindow(renderOptions, rowRenderState, virtualScrollRuntime);
  const activeRowWindow = virtualWindow ?? viewportVirtualWindow;
  const rowWindowState: { window: typeof activeRowWindow } = { window: activeRowWindow };
  const rows = virtualWindow
    ? getRenderedRows(frozenRows.bodyRows, virtualWindow)
    : viewportVirtualWindow
      ? getRenderedViewportRows(frozenRows.bodyRows, viewportVirtualWindow)
    : frozenRows.bodyRows;
  const cellSpanModel = createCellSpanModel({
    rows: createCellSpanRows(allRows),
    columns: columnModel.visibleLeafColumns,
    ...(renderOptions.merge === undefined ? {} : { options: renderOptions.merge }),
    ...(rowRenderState?.mergeMeta === undefined ? {} : { serverMeta: rowRenderState.mergeMeta }),
    ...(renderOptions.locale === undefined ? {} : { locale: renderOptions.locale })
  });
  const summary = createSummaryRow(
    columnModel.visibleLeafColumns,
    getSummaryRows(renderOptions, allRows, rowRenderState),
    rowRenderState?.aggregate === undefined ? {} : { aggregateValues: rowRenderState.aggregate.values }
  );
  const summaryPlacements = getSummaryPlacements(renderOptions, summary);
  const layout = createGridLayoutModel(columnModel, {
    hasSummary: summaryPlacements.length > 0,
    hasFooter: true,
    hasOverlay: true
  });
  const columnWindow = createColumnVirtualWindow(
    renderOptions,
    layout.panes.center,
    columnVirtualScrollRuntime
  );
  const paneState = { panes: getRenderedPanes(layout.panes, columnWindow) };
  const columnUi = resolveColumnUiOptions(renderOptions.columnUi);
  const shell = document.createElement("div");
  shell.className = "og-grid-shell";
  if (invalidation) {
    shell.dataset.renderInvalidation = invalidation.scopes.join(",");
  }

  appendTopToolbars({
    shell,
    columnModel,
    columnUi,
    ...(runtime === undefined ? {} : { columnUiRuntime: runtime }),
    options: renderOptions,
    ...(selectionRuntime === undefined ? {} : { selectionRuntime }),
    ...(filterRuntime === undefined ? {} : { filterRuntime }),
    ...(pivotRenderData.meta === undefined ? {} : { pivotMeta: pivotRenderData.meta }),
    ...(paginationRuntime === undefined ? {} : { paginationRuntime }),
    ...(paginationModel === undefined ? {} : { paginationModel })
  });
  const grid = createGridRoot(
    layout.totalColumnWidth,
    columnModel.visibleLeafColumns.length,
    rowCount,
    renderOptions
  );
  applyGridAccessibility(shell, grid, renderOptions.accessibility, {
    rowCount,
    columnCount: columnModel.visibleLeafColumns.length,
    loading: rowRenderState?.loading ?? false,
    ...(rowRenderState?.error === undefined ? {} : { error: rowRenderState.error })
  }, i18n);
  const bodyViewport = createBodyViewport();
  const bodyShell = createBodyShell(bodyViewport);
  const bodyRuntime = createBodyPaneRuntime(renderOptions, rowRenderState, cellSpanModel, groupRuntime, i18n);
  const centerOwnsTreeControls = paneState.panes.left.columns.length === 0;
  attachWheelBoundaryGuard(bodyViewport);
  attachInfiniteScroll(bodyViewport, rowRenderState);
  attachVirtualScroll({
    scrollElement: bodyViewport,
    options: renderOptions,
    rowCount: frozenRows.scrollableRowCount,
    allRows: frozenRows.bodyRows,
    panes: paneState.panes,
    rowRenderState,
    cellSpanModel,
    rowIndexOffset: frozenRows.bodyOffset,
    centerOwnsTreeControls,
    virtualScrollRuntime,
    virtualWindow,
    getPanes: () => paneState.panes,
    onWindowChange: (nextWindow) => {
      rowWindowState.window = nextWindow;
    }
  });
  attachViewportVirtualScroll({
    scrollElement: bodyViewport,
    options: renderOptions,
    rowCount: frozenRows.scrollableRowCount,
    allRows: frozenRows.bodyRows,
    panes: paneState.panes,
    rowRenderState,
    cellSpanModel,
    rowIndexOffset: frozenRows.bodyOffset,
    centerOwnsTreeControls,
    virtualScrollRuntime,
    virtualWindow: viewportVirtualWindow,
    getPanes: () => paneState.panes,
    onWindowChange: (nextWindow) => {
      rowWindowState.window = nextWindow;
    }
  });
  bodyViewport.append(createSection("body", paneState.panes, (pane) =>
      createBodyPane(
        pane,
        rows,
        { ...bodyRuntime, rowIndexOffset: frozenRows.bodyOffset },
      centerOwnsTreeControls,
      activeRowWindow
    )
  ));

  grid.append(
    createSection("header", paneState.panes, (pane) =>
      createHeaderPane({
        rows: getRenderedHeaderRows(headerModel.regions[pane.key].rows, pane),
        columnTemplate: pane.columnTemplate,
        ariaColumnOffset: pane.ariaColumnOffset,
        rowCount: headerModel.depth,
        columnModel,
        columnState: renderOptions.columnState ?? {},
        columnUi,
        runtime,
        ...(renderOptions.sorting === undefined ? {} : { sorting: renderOptions.sorting }),
        ...(sortRuntime === undefined ? {} : { sortRuntime }),
        ...(filterRuntime === undefined ? {} : { filterRuntime }),
        pane,
        ...(renderOptions.security === undefined ? {} : { security: renderOptions.security })
      })
    )
  );

  if (summaryPlacements.includes("top")) {
    grid.append(createSummarySection(paneState.panes, summary, "top", headerModel.depth + 1));
  }

  appendFrozenRowsSections({
    grid,
    panes: paneState.panes,
    topRows: frozenRows.topRows,
    bottomRows: [],
    bottomOffset: frozenRows.bottomOffset,
    runtime: bodyRuntime,
    centerOwnsTreeControls
  });

  grid.append(bodyShell);

  appendFrozenRowsSections({
    grid,
    panes: paneState.panes,
    topRows: [],
    bottomRows: frozenRows.bottomRows,
    bottomOffset: frozenRows.bottomOffset,
    runtime: bodyRuntime,
    centerOwnsTreeControls
  });

  if (summaryPlacements.includes("bottom")) {
    grid.append(createSummarySection(
      paneState.panes,
      summary,
      "bottom",
      headerModel.depth + rowCount + 1
    ));
  }

  if (layout.sections.footer) {
    grid.append(createFooterSection({
      rowCount,
      loading: rowRenderState?.loading ?? false,
      hasMore: rowRenderState?.hasMore ?? false,
      onLoadMore: rowRenderState?.onLoadMore ?? (() => undefined)
    }, i18n));
  }

  grid.append(createOverlayLayer({
    rowCount,
    renderedRowCount: frozenRows.topRows.length + rows.length + frozenRows.bottomRows.length,
    loading: rowRenderState?.loading ?? false,
    ...(rowRenderState?.error === undefined ? {} : { error: rowRenderState.error })
  }, i18n));
  attachColumnVirtualScroll({
    grid,
    scrollElement: bodyViewport,
    options: renderOptions,
    columnModel,
    headerModel,
    panes: layout.panes,
    paneState,
    allRows: frozenRows.bodyRows,
    frozenRows,
    summary,
    rowRenderState,
    cellSpanModel,
    rowIndexOffset: frozenRows.bodyOffset,
    centerOwnsTreeControls,
    getRowWindow: () => rowWindowState.window,
    columnState: renderOptions.columnState ?? {},
    columnUi,
    columnUiRuntime: runtime,
    ...(sortRuntime === undefined ? {} : { sortRuntime }),
    ...(filterRuntime === undefined ? {} : { filterRuntime }),
    ...(groupRuntime === undefined ? {} : { groupRuntime }),
    ...(editRuntime === undefined ? {} : { editRuntime }),
    ...(selectionRuntime === undefined ? {} : { selectionRuntime }),
    columnVirtualScrollRuntime,
    columnWindow,
    ...(renderOptions.security === undefined ? {} : { security: renderOptions.security })
  });
  attachEditorScrollSyncForHost(host, bodyViewport, editRuntime);
  shell.append(grid);
  appendBottomPagination({
    shell,
    columnModel,
    columnUi,
    ...(runtime === undefined ? {} : { columnUiRuntime: runtime }),
    options: renderOptions,
    ...(selectionRuntime === undefined ? {} : { selectionRuntime }),
    ...(filterRuntime === undefined ? {} : { filterRuntime }),
    ...(pivotRenderData.meta === undefined ? {} : { pivotMeta: pivotRenderData.meta }),
    ...(paginationRuntime === undefined ? {} : { paginationRuntime }),
    ...(paginationModel === undefined ? {} : { paginationModel })
  });
  host.append(shell);
  restoreVirtualScroll(bodyViewport, grid, virtualScrollRuntime, activeRowWindow);
  restoreColumnVirtualScroll(bodyViewport, grid, columnVirtualScrollRuntime, columnWindow);
  attachGridScrollbarsForHost(host, { grid: bodyShell, viewport: bodyViewport, panes: layout.panes });
  attachGridFocusForHost(host, {
    grid,
    viewport: bodyViewport,
    ...(editRuntime === undefined ? {} : { editRuntime }),
    editKeyboardPolicy: resolveEditKeyboardPolicy(renderOptions.editing),
    ...(selectionRuntime === undefined ? {} : { selectionRuntime })
  });
  if (selectionRuntime) {
    attachGridSelectionForHost(host, { grid, runtime: selectionRuntime });
  }
}

function createGridRoot<TData>(
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

function createBodyPaneRuntime<TData>(
  options: DomGridOptions<TData>,
  rowRenderState: RowRenderState<TData> | undefined,
  cellSpanModel: CellSpanModel,
  groupRuntime: GroupRowRuntime | undefined,
  i18n: LocaleFormatterBridge
) {
  const rowHeight = createBodyRowHeightResolver(options);
  return {
    ...(rowRenderState?.treeRuntime === undefined ? {} : { treeRuntime: rowRenderState.treeRuntime }),
    ...(groupRuntime === undefined ? {} : { groupRuntime }),
    ...(options.tree?.treeColumnField === undefined ? {} : { treeColumnField: options.tree.treeColumnField }),
    cellSpanModel,
    i18n,
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
