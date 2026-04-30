import {
  createColumnModel,
  createInitialSortModel,
  createSelectionState,
  isFilterModelEmpty,
  normalizeFilterModel,
  readField
} from "@onegrid/core";
import {
  normalizePage,
  normalizePageSize
} from "@onegrid/pagination";
import type {
  ColumnModel,
  ColumnUiState,
  FilterModel,
  GridSelectionState,
  AggregateResult,
  GroupModel,
  InfiniteRowEntry,
  InfiniteRowModel,
  MergeMeta,
  NormalizedDataColumn,
  ScrollAlign,
  SelectedCell,
  ServerRowEntry,
  ServerRowModel,
  SortModel,
  TreeRowEntry,
  TreeRowModel,
  ViewportRowEntry,
  ViewportRowModel
} from "@onegrid/core";
import { createColumnUiRuntime as createColumnUiRuntimeFromState } from "./columnUiRuntimeFactory.js";
import type { ColumnUiRuntime } from "./columnControls.js";
import { EditBatchRuntime } from "./editBatchRuntime.js";
import type { GridEditRuntime } from "./editRuntime.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import type { GridPaginationRuntime } from "./paginationRenderer.js";
import { disposeGridShell, renderGridShell } from "./renderGridShell.js";
import type { RowRenderState } from "./renderGridShell.js";
import { fullInvalidation, invalidate } from "./renderInvalidation.js";
import { DomRenderScheduler } from "./renderScheduler.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomTreeRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import { observeGridHostResize } from "./resizeObserver.js";
import type { GridResizeObserverHandle } from "./resizeObserver.js";
import { resolveScrollLeftForField } from "./scrollPosition.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import type { HeaderSortRuntime } from "./sortRuntime.js";
import { isColumnVirtualizationEnabled, resolveColumnViewportWidth } from "./columnVirtualScrollRuntime.js";
import type { ColumnVirtualScrollRuntime } from "./columnVirtualScrollRuntime.js";
import { isRowVirtualizationEnabled, resolveVirtualViewportHeight } from "./virtualScrollRuntime.js";
import type { VirtualScrollRuntime } from "./virtualScrollRuntime.js";
import type { ActiveDomEdit, DomGridOptions } from "./oneGridTypes.js";

export abstract class OneGridBase<TData = unknown> {
  readonly root: HTMLElement;

  protected readonly options: DomGridOptions<TData>;
  protected columnState: ColumnUiState;
  protected dataRows: readonly TData[] | undefined;
  protected infiniteRowModel: InfiniteRowModel<TData> | undefined;
  protected serverRowModel: ServerRowModel<TData> | undefined;
  protected viewportRowModel: ViewportRowModel<TData> | undefined;
  protected readonly treeRowModel: TreeRowModel<TData> | undefined;
  protected readonly renderScheduler: DomRenderScheduler;
  protected sortModel: readonly SortModel[];
  protected filterModel: FilterModel;
  protected groupModel: GroupModel;
  protected serverGroupKeys: readonly string[];
  protected selectionState: GridSelectionState;
  protected selectionAnchor: SelectedCell | undefined;
  protected infiniteEntries: readonly InfiniteRowEntry<TData>[] = [];
  protected serverEntries: readonly ServerRowEntry<TData>[] = [];
  protected serverMergeMeta: readonly MergeMeta[] = [];
  protected serverAggregate: AggregateResult | undefined;
  protected viewportEntries: readonly ViewportRowEntry<TData>[] = [];
  protected treeEntries: readonly TreeRowEntry<TData>[] = [];
  protected resizeObserver: GridResizeObserverHandle | undefined;
  protected virtualScrollTop = 0;
  protected virtualViewportHeight: number | undefined;
  protected infiniteLoading = false;
  protected serverLoading = false;
  protected viewportLoading = false;
  protected columnScrollLeft = 0;
  protected columnViewportWidth: number | undefined;
  protected paginationPage: number;
  protected paginationPageSize: number;
  protected pendingHeaderFocusField: string | undefined;
  protected pendingQuickFilterFocus = false;
  protected filterRequestSequence = 0;
  protected activeEdit: ActiveDomEdit<TData> | undefined;
  protected readonly editBatch = new EditBatchRuntime<TData>();
  protected renderError: unknown;
  protected destroyed = false;

  constructor(options: DomGridOptions<TData>) {
    this.options = options;
    this.dataRows = Array.isArray(options.data) ? options.data : undefined;
    this.columnState = options.columnState ?? {};
    this.sortModel = options.sorting?.enabled === false
      ? Object.freeze([])
      : createInitialSortModel(options.columns, options.sorting?.model);
    this.filterModel = options.filtering?.enabled === false
      ? Object.freeze({})
      : normalizeFilterModel(options.filtering?.model);
    this.groupModel = options.grouping?.model ?? Object.freeze({});
    this.serverGroupKeys = options.server?.groupKeys ?? Object.freeze([]);
    this.selectionState = createSelectionState(options.selection);
    this.paginationPage = normalizePage(
      options.pagination?.page ?? (options.server?.initialPage === undefined
        ? undefined
        : options.server.initialPage + 1)
    );
    this.paginationPageSize = normalizePageSize(options.pagination?.pageSize ?? options.server?.pageSize);
    this.infiniteRowModel = createDomInfiniteRowModel(this.getRenderOptions());
    this.serverRowModel = createDomServerRowModel(this.getRenderOptions());
    this.viewportRowModel = createDomViewportRowModel(this.getRenderOptions());
    this.treeRowModel = createDomTreeRowModel(this.getRenderOptions());
    this.infiniteEntries = this.infiniteRowModel?.getAppendRows() ?? [];
    this.treeEntries = this.treeRowModel?.visibleRows ?? [];
    this.root = options.el;
    this.renderScheduler = new DomRenderScheduler((invalidation) => {
      this.commitRender(invalidation);
    });
    this.mount();
    this.resizeObserver = observeGridHostResize(this.root);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    disposeGridShell(this.root);
    this.activeEdit?.overlay.destroy();
    this.activeEdit = undefined;
    this.root.replaceChildren();
    this.root.classList.remove("og-root-host");
    this.infiniteRowModel?.cancelAll("grid destroyed");
    this.renderScheduler.destroy();
    this.resizeObserver?.disconnect();
    this.destroyed = true;
  }

  async scrollToColumn(field: string, align: ScrollAlign = "start"): Promise<void> {
    this.setColumnScrollToField(field, align);
    await this.render(invalidate(["columns"], "scroll-column"));
  }

  protected mount(): void {
    this.root.classList.add("og-root-host");
    this.renderNow(fullInvalidation("mount"));
    if (this.infiniteRowModel) {
      void this.loadNextInfiniteBlock();
    }
    if (this.serverRowModel) {
      void this.loadServerRows();
    }
    if (this.viewportRowModel) {
      void this.scrollViewportTo(0);
    }
  }

  protected render(invalidation = fullInvalidation("render")): Promise<void> {
    return this.renderScheduler.request(invalidation);
  }

  protected renderNow(invalidation = fullInvalidation("render-now")): void {
    this.renderScheduler.flushNow(invalidation);
  }

  protected commitRender(invalidation = fullInvalidation("commit")): void {
    if (this.isQuickFilterFocused()) {
      this.pendingQuickFilterFocus = true;
    }

    const renderOptions = this.getRenderOptions();
    renderGridShell(
      this.root,
      renderOptions,
      this.createColumnUiRuntime(),
      this.createRowRenderState(),
      this.createVirtualScrollRuntime(),
      this.createColumnVirtualScrollRuntime(),
      this.createSortRuntime(),
      renderOptions.filtering === undefined ? undefined : this.createFilterRuntime(),
      this.createGroupRuntime(),
      this.createEditRuntime(),
      this.createSelectionRuntime(),
      this.createPaginationRuntime(),
      invalidation
    );
    this.restorePendingHeaderFocus();
    this.restorePendingQuickFilterFocus();
  }

  protected getRenderOptions(): DomGridOptions<TData> {
    const sorting = this.getSortingOptions();
    const filtering = this.getFilteringOptions();
    const grouping = this.getGroupingOptions();
    const server = this.getServerOptions();
    const pagination = this.getPaginationOptions();
    return {
      ...this.options,
      ...(this.dataRows === undefined ? {} : { data: this.dataRows }),
      columnState: this.columnState,
      ...(sorting === undefined ? {} : { sorting }),
      ...(filtering === undefined ? {} : { filtering }),
      ...(grouping === undefined ? {} : { grouping }),
      ...(server === undefined ? {} : { server }),
      ...(pagination === undefined ? {} : { pagination })
    };
  }

  protected getSortingOptions(): DomGridOptions<TData>["sorting"] {
    if (this.options.sorting === undefined && this.sortModel.length === 0) {
      return undefined;
    }

    return { ...this.options.sorting, model: this.sortModel };
  }

  protected getFilteringOptions(): DomGridOptions<TData>["filtering"] {
    if (this.options.filtering === undefined && isFilterModelEmpty(this.filterModel)) {
      return undefined;
    }

    return { ...this.options.filtering, model: this.filterModel };
  }

  protected getGroupingOptions(): DomGridOptions<TData>["grouping"] {
    if (this.options.grouping === undefined && this.groupModel.fields === undefined) {
      return undefined;
    }

    return { ...this.options.grouping, model: this.groupModel };
  }

  protected getServerOptions(): DomGridOptions<TData>["server"] {
    if (this.options.server === undefined && this.serverGroupKeys.length === 0) {
      return undefined;
    }

    const paginationMode = this.options.pagination?.mode;
    const usesPagination = paginationMode === "server" || paginationMode === "cursor";
    return {
      ...this.options.server,
      groupKeys: this.serverGroupKeys,
      ...(usesPagination ? { pageSize: this.paginationPageSize } : {})
    };
  }

  protected getPaginationOptions(): DomGridOptions<TData>["pagination"] {
    if (this.options.pagination === undefined) {
      return undefined;
    }

    return {
      ...this.options.pagination,
      page: this.paginationPage,
      pageSize: this.paginationPageSize
    };
  }

  setPage(page: number): void {
    if (this.destroyed || this.options.pagination === undefined) {
      return;
    }

    const nextPage = normalizePage(page);
    if (nextPage === this.paginationPage) {
      return;
    }

    this.paginationPage = nextPage;
    this.virtualScrollTop = 0;
    this.options.events?.pageChanged?.({
      type: "pageChanged",
      page: this.paginationPage,
      pageSize: this.paginationPageSize
    });
    if (this.serverRowModel) {
      void this.loadServerRows(false, this.paginationPage - 1);
      return;
    }

    void this.render(invalidate(["rows", "layout", "overlay"], "pagination-page"));
  }

  getPage(): number {
    return this.paginationPage;
  }

  setPageSize(pageSize: number): void {
    if (this.destroyed || this.options.pagination === undefined) {
      return;
    }

    const nextPageSize = normalizePageSize(pageSize);
    if (nextPageSize === this.paginationPageSize) {
      return;
    }

    this.paginationPageSize = nextPageSize;
    this.paginationPage = 1;
    this.virtualScrollTop = 0;
    this.options.events?.pageChanged?.({
      type: "pageChanged",
      page: this.paginationPage,
      pageSize: this.paginationPageSize
    });

    if (this.serverRowModel) {
      this.serverRowModel = createDomServerRowModel(this.getRenderOptions());
      this.serverEntries = [];
      this.serverMergeMeta = [];
      this.serverAggregate = undefined;
      void this.loadServerRows(true);
      return;
    }

    void this.render(invalidate(["rows", "layout", "overlay"], "pagination-page-size"));
  }

  getPageSize(): number {
    return this.paginationPageSize;
  }

  protected createPaginationRuntime(): GridPaginationRuntime | undefined {
    if (this.options.pagination === undefined) {
      return undefined;
    }

    return {
      setPage: (page) => this.setPage(page),
      setPageSize: (pageSize) => this.setPageSize(pageSize),
      loadNextPage: () => {
        if (this.infiniteRowModel) {
          void this.loadNextInfiniteBlock();
        } else {
          this.setPage(this.paginationPage + 1);
        }
      }
    };
  }

  protected createColumnUiRuntime(): ColumnUiRuntime {
    return createColumnUiRuntimeFromState({
      options: this.options,
      columnState: this.columnState,
      infiniteEntries: this.infiniteEntries,
      serverEntries: this.serverEntries,
      viewportEntries: this.viewportEntries,
      treeEntries: this.treeEntries,
      setColumnState: (state) => {
        this.columnState = state;
        void this.render(invalidate(["columns", "layout"], "column-state"));
      },
      updateColumnState: (updater) => {
        this.updateColumnState(updater);
      }
    });
  }

  protected updateColumnState(updater: (model: ColumnModel<TData>) => ColumnUiState): void {
    if (this.destroyed) {
      return;
    }

    const model = createColumnModel(this.options.columns, {
      ...(this.options.columnOrder === undefined ? {} : { columnOrder: this.options.columnOrder }),
      columnState: this.columnState
    });
    this.columnState = updater(model);
    void this.render(invalidate(["columns", "layout"], "column-state-update"));
  }

  protected findDataColumn(field: string): NormalizedDataColumn<TData> | undefined {
    const model = createColumnModel(this.options.columns, {
      ...(this.options.columnOrder === undefined ? {} : { columnOrder: this.options.columnOrder }),
      columnState: this.columnState
    });
    return model.visibleLeafColumns.find((column) => column.field === field || column.id === field);
  }

  protected resolveDistinctRowKey(row: TData, index: number): string | number {
    const rowKey = this.options.rowKey;
    if (typeof rowKey === "function") {
      return rowKey(row, index);
    }
    const value = typeof rowKey === "string" ? readField(row, rowKey) : undefined;
    return typeof value === "string" || typeof value === "number" ? value : index;
  }

  protected restorePendingHeaderFocus(): void {
    const field = this.pendingHeaderFocusField;
    if (field === undefined) {
      return;
    }

    this.pendingHeaderFocusField = undefined;
    for (const header of this.root.querySelectorAll<HTMLElement>('[role="columnheader"][data-source-id]')) {
      if (header.dataset.sourceId === field) {
        header.focus({ preventScroll: true });
        return;
      }
    }
  }

  protected restorePendingQuickFilterFocus(): void {
    if (!this.pendingQuickFilterFocus) {
      return;
    }

    this.pendingQuickFilterFocus = false;
    const input = this.root.querySelector<HTMLInputElement>(".og-grid__quick-filter-input");
    input?.focus({ preventScroll: true });
    const end = input?.value.length ?? 0;
    input?.setSelectionRange(end, end);
  }

  protected isQuickFilterFocused(): boolean {
    return document.activeElement instanceof HTMLElement
      && this.root.contains(document.activeElement)
      && document.activeElement.classList.contains("og-grid__quick-filter-input");
  }

  protected createVirtualScrollRuntime(): VirtualScrollRuntime {
    return {
      enabled: isRowVirtualizationEnabled(this.options),
      scrollTop: this.virtualScrollTop,
      viewportHeight: this.virtualViewportHeight ?? resolveVirtualViewportHeight(this.options),
      onScroll: (scrollTop, viewportHeight) => {
        this.updateVirtualScroll(scrollTop, viewportHeight);
      }
    };
  }

  protected createColumnVirtualScrollRuntime(): ColumnVirtualScrollRuntime {
    return {
      enabled: isColumnVirtualizationEnabled(this.options),
      scrollLeft: this.columnScrollLeft,
      viewportWidth: this.columnViewportWidth ?? resolveColumnViewportWidth(this.options),
      onScroll: (scrollLeft, viewportWidth) => {
        this.updateColumnVirtualScroll(scrollLeft, viewportWidth);
      }
    };
  }

  protected updateVirtualScroll(scrollTop: number, viewportHeight: number): void {
    const nextScrollTop = Math.max(0, scrollTop);
    const nextViewportHeight = viewportHeight > 0
      ? viewportHeight
      : this.virtualViewportHeight ?? resolveVirtualViewportHeight(this.options);
    if (
      Math.abs(nextScrollTop - this.virtualScrollTop) < 1
      && Math.abs(nextViewportHeight - (this.virtualViewportHeight ?? nextViewportHeight)) < 1
    ) {
      return;
    }

    this.virtualScrollTop = nextScrollTop;
    this.virtualViewportHeight = nextViewportHeight;
  }

  protected updateColumnVirtualScroll(scrollLeft: number, viewportWidth: number): void {
    const nextScrollLeft = Math.max(0, scrollLeft);
    const nextViewportWidth = viewportWidth > 0
      ? viewportWidth
      : this.columnViewportWidth ?? resolveColumnViewportWidth(this.options);
    if (
      Math.abs(nextScrollLeft - this.columnScrollLeft) < 1
      && Math.abs(nextViewportWidth - (this.columnViewportWidth ?? nextViewportWidth)) < 1
    ) {
      return;
    }

    this.columnScrollLeft = nextScrollLeft;
    this.columnViewportWidth = nextViewportWidth;
  }

  protected setColumnScrollToField(field: string, align: ScrollAlign): void {
    const nextScrollLeft = resolveScrollLeftForField({
      options: this.options,
      columnState: this.columnState,
      field,
      align,
      currentScrollLeft: this.columnScrollLeft,
      viewportWidth: this.columnViewportWidth
    });
    if (nextScrollLeft !== undefined) {
      this.columnScrollLeft = nextScrollLeft;
    }
  }

  protected abstract loadNextInfiniteBlock(): Promise<void>;
  protected abstract loadServerRows(refresh?: boolean, page?: number): Promise<void>;
  protected abstract scrollViewportTo(rowIndex: number): Promise<void>;
  protected abstract createRowRenderState(): RowRenderState<TData> | undefined;
  protected abstract createSortRuntime(): HeaderSortRuntime;
  protected abstract createFilterRuntime(): HeaderFilterRuntime;
  protected abstract createGroupRuntime(): GroupRowRuntime;
  protected abstract createEditRuntime(): GridEditRuntime;
  protected abstract createSelectionRuntime(): GridSelectionRuntime | undefined;
}
