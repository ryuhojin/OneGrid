import {
  clipHeaderRowsToColumns,
  createLocaleFormatter
} from "@onegrid/core";
import { createBodyPane } from "./bodyPaneRenderer.js";
import { syncColumnScroll } from "./columnScrollSync.js";
import { createColumnVirtualWindowResolver } from "./columnVirtualWindowResolver.js";
import { replaceFrozenCenterPanes } from "./frozenColumnVirtualization.js";
import { createHeaderPane } from "./headerRenderer.js";
import { applyGridSelection } from "./selectionRuntime.js";
import { createSummaryPane } from "./summaryRenderer.js";
import { getRenderedRows } from "./virtualBodyWindow.js";
import {
  clampScrollPosition,
  getMaxScrollLeft,
  isWheelBoundaryHit,
  normalizeWheelDelta
} from "./wheelScroll.js";
import type {
  ColumnModel,
  CellSpanModel,
  ColumnUiState,
  FixedColumnVirtualWindow,
  FixedRowVirtualWindow,
  FrozenRowSlices,
  HeaderModel,
  HeaderRow,
  LayoutPane,
  LayoutPaneKey,
  SecurityOptions,
  SummaryRow
} from "@onegrid/core";
import type { BodyRowEntry } from "./bodyRowRenderer.js";
import type { ColumnUiRuntime, ResolvedColumnUiOptions } from "./columnControls.js";
import type { ColumnVirtualScrollRuntime } from "./columnVirtualScrollRuntime.js";
import type { DomGridOptions } from "./OneGrid.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import type { GridEditRuntime } from "./editRuntime.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import type { RowRenderState } from "./renderGridShell.js";
import { createBodyRowHeightResolver } from "./rowHeightRuntime.js";
import type { GridScrollCoordinator } from "./scrollCoordinator.js";
import type { HeaderSortRuntime } from "./sortRuntime.js";
import { observeElementResize } from "./resizeObserver.js";

type PaneRecord<TData> = Readonly<Record<LayoutPaneKey, LayoutPane<TData>>>;

export interface PaneRenderState<TData> {
  panes: PaneRecord<TData>;
}

export function createColumnVirtualWindow<TData>(
  options: DomGridOptions<TData>,
  pane: LayoutPane<TData>,
  runtime: ColumnVirtualScrollRuntime | undefined
): FixedColumnVirtualWindow | undefined {
  if (!runtime?.enabled) {
    return undefined;
  }

  return createColumnVirtualWindowResolver(options, pane)
    .resolve(runtime.scrollLeft, runtime.viewportWidth);
}

export function getRenderedPanes<TData>(
  panes: PaneRecord<TData>,
  columnWindow: FixedColumnVirtualWindow | undefined
): PaneRecord<TData> {
  if (!columnWindow) {
    return panes;
  }

  return Object.freeze({
    left: panes.left,
    center: createVirtualCenterPane(panes.center, columnWindow),
    right: panes.right
  });
}

export function getRenderedHeaderRows<TData>(
  rows: readonly HeaderRow[],
  pane: LayoutPane<TData>
): readonly HeaderRow[] {
  return pane.virtual
    ? clipHeaderRowsToColumns(rows, pane.key, pane.columns)
    : rows;
}

export interface ColumnVirtualScrollAttachInput<TData> {
  readonly grid: HTMLElement;
  readonly scrollElement: HTMLElement;
  readonly options: DomGridOptions<TData>;
  readonly columnModel: ColumnModel<TData>;
  readonly headerModel: HeaderModel<TData>;
  readonly panes: PaneRecord<TData>;
  readonly paneState: PaneRenderState<TData>;
  readonly allRows: readonly BodyRowEntry<TData>[];
  readonly frozenRows: FrozenRowSlices<BodyRowEntry<TData>>;
  readonly summary: SummaryRow | undefined;
  readonly rowRenderState: RowRenderState<TData> | undefined;
  readonly cellSpanModel: CellSpanModel;
  readonly rowIndexOffset: number;
  readonly centerOwnsTreeControls: boolean;
  getRowWindow(): FixedRowVirtualWindow | undefined;
  readonly columnState: ColumnUiState;
  readonly columnUi: ResolvedColumnUiOptions;
  readonly columnUiRuntime: ColumnUiRuntime | undefined;
  readonly sortRuntime?: HeaderSortRuntime;
  readonly filterRuntime?: HeaderFilterRuntime;
  readonly groupRuntime?: GroupRowRuntime;
  readonly editRuntime?: GridEditRuntime;
  readonly selectionRuntime?: GridSelectionRuntime;
  readonly columnVirtualScrollRuntime: ColumnVirtualScrollRuntime | undefined;
  readonly columnWindow: FixedColumnVirtualWindow | undefined;
  readonly scrollCoordinator?: GridScrollCoordinator;
  readonly security?: SecurityOptions;
}

export function attachColumnVirtualScroll<TData>(
  input: ColumnVirtualScrollAttachInput<TData>
): void {
  if (!input.columnWindow || !input.columnVirtualScrollRuntime?.enabled) {
    attachStaticColumnScrollSync(
      input.grid,
      input.scrollElement,
      input.columnVirtualScrollRuntime,
      input.scrollCoordinator
    );
    return;
  }

  const runtime = input.columnVirtualScrollRuntime;
  const columnWindowResolver = createColumnVirtualWindowResolver(input.options, input.panes.center);
  let currentWindow = input.columnWindow;
  const updateColumns = (nextWindow: FixedColumnVirtualWindow): void => {
    syncColumnScroll(input.grid, input.scrollElement);
    input.scrollCoordinator?.sync();
    runtime.onScroll(nextWindow.scrollLeft, nextWindow.viewportWidth);
    if (sameRenderedColumnWindow(currentWindow, nextWindow)) {
      currentWindow = nextWindow;
      return;
    }

    const panes = getRenderedPanes(input.panes, nextWindow);
    input.paneState.panes = panes;
    replaceCenterPanes({ ...input, panes, columnWindow: nextWindow });
    syncColumnScroll(input.grid, input.scrollElement);
    currentWindow = nextWindow;
  };
  const getWindowForScrollLeft = (scrollLeft: number): FixedColumnVirtualWindow =>
    columnWindowResolver.resolve(
      scrollLeft,
      resolveCenterViewportWidth(input.scrollElement, input.panes) || runtime.viewportWidth
    );

  input.scrollElement.addEventListener("wheel", (event) => {
    const wheelDeltaX = Math.abs(event.deltaX) >= 1 || !event.shiftKey
      ? event.deltaX
      : event.deltaY;
    const deltaX = normalizeWheelDelta(wheelDeltaX, event.deltaMode, input.scrollElement.clientWidth);
    if (Math.abs(deltaX) < 1) {
      return;
    }

    const maxScrollLeft = getMaxScrollLeft(input.scrollElement);
    const nextScrollLeft = clampScrollPosition(input.scrollElement.scrollLeft + deltaX, maxScrollLeft);
    if (
      nextScrollLeft === input.scrollElement.scrollLeft
      && !isWheelBoundaryHit(input.scrollElement.scrollLeft, deltaX, maxScrollLeft)
    ) {
      return;
    }

    event.preventDefault();
    if (input.scrollCoordinator) {
      input.scrollCoordinator.setScroll("horizontal", nextScrollLeft);
    } else {
      input.scrollElement.scrollLeft = nextScrollLeft;
    }
    updateColumns(getWindowForScrollLeft(nextScrollLeft));
  }, { passive: false });

  input.scrollElement.addEventListener("scroll", () => {
    input.scrollCoordinator?.sync();
    const nextWindow = columnWindowResolver.resolve(
      input.scrollElement.scrollLeft,
      resolveCenterViewportWidth(input.scrollElement, input.panes) || runtime.viewportWidth
    );
    updateColumns(nextWindow);
  }, { passive: true });
  observeElementResize(input.scrollElement, () => {
    updateColumns(getWindowForScrollLeft(input.scrollElement.scrollLeft));
  });
}

function attachStaticColumnScrollSync(
  grid: HTMLElement,
  scrollElement: HTMLElement,
  runtime?: ColumnVirtualScrollRuntime,
  scrollCoordinator?: GridScrollCoordinator
): void {
  const sync = (): void => {
    syncColumnScroll(grid, scrollElement);
    scrollCoordinator?.sync();
    runtime?.onScroll(scrollElement.scrollLeft, scrollElement.clientWidth);
  };
  sync();
  scrollElement.addEventListener("scroll", sync, { passive: true });
  observeElementResize(scrollElement, sync);
}

export function restoreColumnVirtualScroll(
  scrollElement: HTMLElement,
  markerElement: HTMLElement,
  runtime: ColumnVirtualScrollRuntime | undefined,
  columnWindow: FixedColumnVirtualWindow | undefined
): void {
  if (!columnWindow || !runtime?.enabled) {
    if (runtime) {
      scrollElement.scrollLeft = runtime.scrollLeft;
      syncColumnScroll(markerElement, scrollElement);
    }
    return;
  }

  markerElement.dataset.virtualizedColumns = "true";
  scrollElement.dataset.virtualizedColumns = "true";
  scrollElement.scrollLeft = runtime.scrollLeft;
  syncColumnScroll(markerElement, scrollElement);
}

function createVirtualCenterPane<TData>(
  pane: LayoutPane<TData>,
  columnWindow: FixedColumnVirtualWindow
): LayoutPane<TData> {
  const columns = Object.freeze(
    pane.columns.slice(columnWindow.firstColumn, columnWindow.lastColumn + 1)
  );

  return Object.freeze({
    ...pane,
    columns,
    ariaColumnOffset: pane.ariaColumnOffset + columnWindow.firstColumn,
    columnTemplate: columns.map((column) => `${column.width}px`).join(" "),
    virtual: {
      firstColumn: columnWindow.firstColumn,
      lastColumn: columnWindow.lastColumn,
      offsetLeft: columnWindow.offsetLeft,
      renderedWidth: columnWindow.renderedWidth,
      totalWidth: columnWindow.totalWidth
    }
  });
}

function replaceCenterPanes<TData>(
  input: ColumnVirtualScrollAttachInput<TData> & {
    readonly panes: PaneRecord<TData>;
    readonly columnWindow: FixedColumnVirtualWindow;
  }
): void {
  const rowHeight = createBodyRowHeightResolver(input.options);
  replacePane(
    input.grid,
    "header",
    createHeaderPane({
      rows: getRenderedHeaderRows(input.headerModel.regions.center.rows, input.panes.center),
      columnTemplate: input.panes.center.columnTemplate,
      ariaColumnOffset: input.panes.center.ariaColumnOffset,
      rowCount: input.headerModel.depth,
      columnModel: input.columnModel,
      columnState: input.columnState,
      columnUi: input.columnUi,
      runtime: input.columnUiRuntime,
      ...(input.options.sorting === undefined ? {} : { sorting: input.options.sorting }),
      ...(input.sortRuntime === undefined ? {} : { sortRuntime: input.sortRuntime }),
      ...(input.filterRuntime === undefined ? {} : { filterRuntime: input.filterRuntime }),
      pane: input.panes.center,
      ...(input.security === undefined ? {} : { security: input.security })
    })
  );

  replacePane(
    input.grid,
    "body",
    createBodyPane(
      input.panes.center,
      getRenderedRows(input.allRows, input.getRowWindow()),
      {
        ...(input.rowRenderState?.treeRuntime === undefined
          ? {}
          : { treeRuntime: input.rowRenderState.treeRuntime }),
        ...(input.rowRenderState?.treeRuntime?.treeColumnField === undefined
          ? {}
          : { treeColumnField: input.rowRenderState.treeRuntime.treeColumnField }),
        ...(input.groupRuntime === undefined ? {} : { groupRuntime: input.groupRuntime }),
        cellSpanModel: input.cellSpanModel,
        i18n: createLocaleFormatter(input.options.locale),
        ...(rowHeight === undefined ? {} : { rowHeight }),
        rowIndexOffset: input.rowIndexOffset,
        ...(input.options.editing === undefined ? {} : { editing: input.options.editing }),
        ...(input.security === undefined ? {} : { security: input.security })
      },
      input.centerOwnsTreeControls,
      input.getRowWindow()
    )
  );

  if (input.summary) {
    replaceSummaryPanes(input.grid, input.panes.center, input.summary);
  }
  replaceFrozenCenterPanes({
    grid: input.grid,
    options: input.options,
    pane: input.panes.center,
    paneState: input.paneState,
    frozenRows: input.frozenRows,
    rowRenderState: input.rowRenderState,
    cellSpanModel: input.cellSpanModel,
    ...(input.groupRuntime === undefined ? {} : { groupRuntime: input.groupRuntime }),
    centerOwnsTreeControls: input.centerOwnsTreeControls,
    ...(input.security === undefined ? {} : { security: input.security })
  });
  if (input.selectionRuntime) {
    applyGridSelection(input.grid, input.selectionRuntime);
  }
}

function replacePane(
  grid: HTMLElement,
  section: "header" | "frozen" | "body" | "summary",
  content: HTMLElement
): void {
  const paneElement = grid.querySelector<HTMLElement>(
    `[data-layout-section="${section}"] [data-layout-pane="center"]`
  );
  paneElement?.replaceChildren(content);
}

function replaceSummaryPanes<TData>(
  grid: HTMLElement,
  pane: LayoutPane<TData>,
  summary: SummaryRow
): void {
  grid
    .querySelectorAll<HTMLElement>('[data-layout-section="summary"] [data-layout-pane="center"]')
    .forEach((paneElement) => {
      const rowIndex = readAriaRowIndex(paneElement);
      paneElement.replaceChildren(createSummaryPane(pane, summary, rowIndex));
    });
}

function readAriaRowIndex(paneElement: HTMLElement): number {
  const current = paneElement.querySelector<HTMLElement>(".og-grid__summary-row");
  const parsed = Number(current?.getAttribute("aria-rowindex") ?? "1");
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function sameRenderedColumnWindow(
  left: FixedColumnVirtualWindow,
  right: FixedColumnVirtualWindow
): boolean {
  return left.firstColumn === right.firstColumn
    && left.lastColumn === right.lastColumn
    && left.offsetLeft === right.offsetLeft
    && left.renderedWidth === right.renderedWidth;
}

function resolveCenterViewportWidth<TData>(
  viewport: HTMLElement,
  panes: PaneRecord<TData>
): number {
  return Math.max(0, viewport.clientWidth - panes.left.width - panes.right.width);
}
