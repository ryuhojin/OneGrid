import {
  createColumnModel,
  createInitialSortModel,
  createLocaleFormatter,
  createSelectionState,
  normalizeFilterModel,
  readField
} from "@onegrid/core";
import { normalizePage, normalizePageSize } from "@onegrid/pagination";
import type {
  ColumnModel,
  ColumnUiState,
  FilterModel,
  GridSelectionState,
  AggregateResult,
  GridEventHandler,
  GridEventMap,
  GroupModel,
  InfiniteRowEntry,
  InfiniteRowModel,
  MergeMeta,
  NormalizedDataColumn,
  SelectedCell,
  ServerRowEntry,
  ServerRowModel,
  SortModel,
  ThemeInput,
  ThemeOptions,
  TreeRowEntry,
  TreeRowModel,
  ViewportRowEntry,
  ViewportRowModel,
  Unsubscribe
} from "@onegrid/core";
import { createColumnUiRuntime as createColumnUiRuntimeFromState } from "./columnUiRuntimeFactory.js";
import type { ColumnUiRuntime } from "./columnControls.js";
import { EditBatchRuntime } from "./editBatchRuntime.js";
import type { GridEditRuntime } from "./editRuntime.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import { applyFrozenColumnState } from "./frozenColumns.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import type { GridPaginationRuntime } from "./paginationRenderer.js";
import { disposeGridShell, renderGridShell } from "./renderGridShell.js";
import type { RowRenderState } from "./renderGridShell.js";
import { fullInvalidation, invalidate } from "./renderInvalidation.js";
import { DomRenderScheduler } from "./renderScheduler.js";
import { createRenderOptions } from "./renderOptionsFactory.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomTreeRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import { observeGridHostResize } from "./resizeObserver.js";
import type { GridResizeObserverHandle } from "./resizeObserver.js";
import type { GridSelectionRuntime } from "./selectionRuntime.js";
import type { HeaderSortRuntime } from "./sortRuntime.js";
import { GridThemeRuntime, normalizeThemeInput } from "./themeRuntime.js";
import type { ColumnVirtualScrollRuntime } from "./columnVirtualScrollRuntime.js";
import type { VirtualScrollRuntime } from "./virtualScrollRuntime.js";
import type { ActiveDomEdit, DomGridOptions } from "./oneGridTypes.js";

let nextGridInstanceId = 0;
type MutableDomGridOptions<TData> = {
  -readonly [K in keyof DomGridOptions<TData>]: DomGridOptions<TData>[K];
};
type AnyGridEventHandler<TData> = GridEventHandler<TData, keyof GridEventMap<TData>>;

export abstract class OneGridBase<TData = unknown> {
  readonly root: HTMLElement;

  protected readonly options: DomGridOptions<TData>;
  protected readonly instanceId = `og-${++nextGridInstanceId}`;
  protected readonly themeRuntime: GridThemeRuntime;
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
  protected locale: string;
  protected paginationPage: number;
  protected paginationPageSize: number;
  protected pendingHeaderFocusField: string | undefined;
  protected pendingQuickFilterFocus = false;
  protected filterRequestSequence = 0;
  protected activeEdit: ActiveDomEdit<TData> | undefined;
  protected readonly editBatch = new EditBatchRuntime<TData>();
  protected theme: ThemeOptions | undefined;
  protected renderError: unknown;
  protected destroyed = false;
  private readonly apiEventHandlers = new Map<string, Set<AnyGridEventHandler<TData>>>();

  constructor(options: DomGridOptions<TData>) {
    this.options = options;
    this.dataRows = Array.isArray(options.data) ? options.data : undefined;
    this.columnState = applyFrozenColumnState(options.columnState ?? {}, options.frozenColumns);
    this.sortModel = options.sorting?.enabled === false
      ? Object.freeze([])
      : createInitialSortModel(options.columns, options.sorting?.model);
    this.filterModel = options.filtering?.enabled === false
      ? Object.freeze({})
      : normalizeFilterModel(options.filtering?.model);
    this.groupModel = options.grouping?.model ?? Object.freeze({});
    this.serverGroupKeys = options.server?.groupKeys ?? Object.freeze([]);
    this.selectionState = createSelectionState(options.selection);
    this.locale = createLocaleFormatter(options.locale).locale;
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
    this.theme = normalizeThemeInput(options.theme);
    this.themeRuntime = new GridThemeRuntime(this.root, this.instanceId);
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
    this.themeRuntime.destroy();
    this.root.classList.remove("og-root-host");
    this.infiniteRowModel?.cancelAll("grid destroyed");
    this.renderScheduler.destroy();
    this.resizeObserver?.disconnect();
    this.destroyed = true;
  }

  setLocale(locale: string): void {
    if (this.destroyed) {
      return;
    }

    const nextLocale = createLocaleFormatter(locale).locale;
    if (nextLocale === this.locale) {
      return;
    }

    this.locale = nextLocale;
    void this.render(invalidate(["rows", "columns", "layout", "overlay"], "locale"));
  }

  getLocale(): string {
    return this.locale;
  }

  applyTheme(theme: ThemeInput): void {
    if (this.destroyed) {
      return;
    }

    this.theme = normalizeThemeInput(theme);
    this.applyRuntimeTheme();
    void this.render(invalidate(["layout"], "theme"));
  }

  on<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): Unsubscribe {
    const key = String(eventName);
    const handlers = this.apiEventHandlers.get(key) ?? new Set<AnyGridEventHandler<TData>>();
    handlers.add(handler as AnyGridEventHandler<TData>);
    this.apiEventHandlers.set(key, handlers);
    return () => {
      this.off(eventName, handler);
    };
  }

  off<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): void {
    const handlers = this.apiEventHandlers.get(String(eventName));
    handlers?.delete(handler as AnyGridEventHandler<TData>);
  }

  protected mount(): void {
    this.root.classList.add("og-root-host");
    this.applyRuntimeTheme();
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

    this.applyRuntimeTheme();
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
    return createRenderOptions({
      options: this.options,
      ...(this.dataRows === undefined ? {} : { dataRows: this.dataRows }),
      columnState: this.columnState,
      sortModel: this.sortModel,
      filterModel: this.filterModel,
      groupModel: this.groupModel,
      serverGroupKeys: this.serverGroupKeys,
      paginationPage: this.paginationPage,
      paginationPageSize: this.paginationPageSize,
      locale: this.locale,
      ...(this.theme === undefined ? {} : { theme: this.theme })
    });
  }

  protected applyRuntimeTheme(): void {
    this.themeRuntime.apply(this.theme, this.options.security);
  }

  protected emitGridEvent<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    event: GridEventMap<TData>[K]
  ): void {
    const configured = this.options.events?.[eventName] as GridEventHandler<TData, K> | undefined;
    configured?.(event);
    const handlers = this.apiEventHandlers.get(String(eventName));
    handlers?.forEach((handler) => {
      (handler as GridEventHandler<TData, K>)(event);
    });
  }

  protected get mutableOptions(): MutableDomGridOptions<TData> {
    return this.options as MutableDomGridOptions<TData>;
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

  protected abstract loadNextInfiniteBlock(): Promise<void>;
  protected abstract loadServerRows(refresh?: boolean, page?: number): Promise<void>;
  protected abstract scrollViewportTo(rowIndex: number): Promise<void>;
  protected abstract createRowRenderState(): RowRenderState<TData> | undefined;
  protected abstract createVirtualScrollRuntime(): VirtualScrollRuntime;
  protected abstract createColumnVirtualScrollRuntime(): ColumnVirtualScrollRuntime;
  protected abstract createSortRuntime(): HeaderSortRuntime;
  protected abstract createFilterRuntime(): HeaderFilterRuntime;
  protected abstract createGroupRuntime(): GroupRowRuntime;
  protected abstract createEditRuntime(): GridEditRuntime;
  protected abstract createSelectionRuntime(): GridSelectionRuntime | undefined;
  protected abstract createPaginationRuntime(): GridPaginationRuntime | undefined;
}
