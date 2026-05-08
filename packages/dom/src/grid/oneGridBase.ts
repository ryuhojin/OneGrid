import {
  createPluginRegistry,
  createLocaleFormatter,
  freezeColumnUiState,
  readField
} from "@onegrid/core";
import type {
  ColumnModel,
  ColumnUiState,
  FilterModel,
  GridApi,
  GridPluginExtension,
  GridPluginExtensionPoint,
  GridPluginRegistry,
  GridSelectionState,
  AggregateResult,
  GroupModel,
  InfiniteRowEntry,
  InfiniteRowModel,
  MergeMeta,
  NormalizedDataColumn,
  SelectedCell,
  ServerRowEntry,
  ServerRowModel,
  SortModel,
  ThemeExtensionPayload,
  ThemeInput,
  ThemeOptions,
  TreeRowEntry,
  TreeRowModel,
  ViewportRowEntry,
  ViewportRowModel
} from "@onegrid/core";
import { createColumnUiRuntime as createColumnUiRuntimeFromState } from "./columnUiRuntimeFactory.js";
import type { ColumnUiRuntime } from "./columnControls.js";
import { createDomColumnModel } from "./domColumnModel.js";
import { EditBatchRuntime } from "./editBatchRuntime.js";
import { EditHistoryRuntime } from "./editHistoryRuntime.js";
import type { GridEditRuntime } from "./editRuntime.js";
import {
  isQuickFilterFocused,
  restoreHeaderFocus,
  restoreQuickFilterFocus
} from "./gridFocusRestore.js";
import { OneGridEventBase } from "./oneGridEventBase.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import { createInitialDomGridState, getSnapshotRowIndex } from "./gridStateRuntime.js";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import type { GridPaginationRuntime } from "./paginationRenderer.js";
import { disposeGridShell, renderGridShell } from "./renderGridShell.js";
import type { RowRenderState } from "./renderGridShell.js";
import { fullInvalidation, invalidate } from "./renderInvalidation.js";
import { DomRenderScheduler } from "./renderScheduler.js";
import { createRenderOptions } from "./renderOptionsFactory.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomTreeRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import { mergePluginThemeExtensions } from "./pluginThemeRuntime.js";
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

export abstract class OneGridBase<TData = unknown> extends OneGridEventBase<TData> {
  readonly root: HTMLElement;

  protected readonly instanceId = `og-${++nextGridInstanceId}`;
  protected readonly themeRuntime: GridThemeRuntime;
  protected columnState: ColumnUiState;
  protected dataRows: readonly TData[] | undefined;
  protected infiniteRowModel: InfiniteRowModel<TData> | undefined;
  protected serverRowModel: ServerRowModel<TData> | undefined;
  protected viewportRowModel: ViewportRowModel<TData> | undefined;
  protected readonly treeRowModel: TreeRowModel<TData> | undefined;
  protected readonly renderScheduler: DomRenderScheduler;
  protected readonly pluginRegistry: GridPluginRegistry<TData>;
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
  protected readonly editHistory = new EditHistoryRuntime<TData>();
  protected theme: ThemeOptions | undefined;
  protected renderError: unknown;
  protected destroyed = false;

  constructor(options: DomGridOptions<TData>) {
    super(options);
    this.dataRows = Array.isArray(options.data) ? options.data : undefined;
    const runtimeState = createInitialDomGridState(options);
    this.columnState = runtimeState.columnState;
    this.sortModel = runtimeState.sortModel;
    this.filterModel = runtimeState.filterModel;
    this.groupModel = runtimeState.groupModel;
    this.serverGroupKeys = options.server?.groupKeys ?? Object.freeze([]);
    this.selectionState = runtimeState.selectionState;
    this.locale = runtimeState.locale;
    this.paginationPage = runtimeState.paginationPage;
    this.paginationPageSize = runtimeState.paginationPageSize;
    this.virtualScrollTop = runtimeState.virtualScrollTop;
    this.columnScrollLeft = runtimeState.columnScrollLeft;
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
    this.pluginRegistry = createPluginRegistry({
      api: this as unknown as GridApi<TData>,
      gridOptions: options
    });
    this.pluginRegistry.setupAll();
    this.mount();
    this.resizeObserver = observeGridHostResize(this.root);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    disposeGridShell(this.root);
    this.pluginRegistry.disposeAll();
    this.clearEditRuntimeForDataChange();
    this.root.replaceChildren();
    this.themeRuntime.destroy();
    this.root.classList.remove("og-root-host");
    this.infiniteRowModel?.cancelAll("grid destroyed");
    this.renderScheduler.destroy();
    this.resizeObserver?.disconnect();
    this.destroyed = true;
  }

  protected clearEditRuntimeForDataChange(): void {
    this.activeEdit?.overlay.destroy();
    this.activeEdit = undefined;
    this.editBatch.clear();
    this.editHistory.clear();
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

  hasPlugin(pluginId: string): boolean {
    return this.pluginRegistry.has(pluginId);
  }

  getPluginExtensions<TPayload = unknown>(
    point?: GridPluginExtensionPoint
  ): readonly GridPluginExtension<TPayload>[] {
    return this.pluginRegistry.getExtensions<TPayload>(point);
  }

  applyTheme(theme: ThemeInput): void {
    if (this.destroyed) {
      return;
    }

    this.theme = normalizeThemeInput(theme);
    this.applyRuntimeTheme();
    void this.render(invalidate(["layout"], "theme"));
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
      void this.scrollViewportTo(getSnapshotRowIndex(this.options, this.options.initialState ?? {}) ?? 0);
    }
  }

  protected render(invalidation = fullInvalidation("render")): Promise<void> {
    return this.renderScheduler.request(invalidation);
  }

  protected renderNow(invalidation = fullInvalidation("render-now")): void {
    this.renderScheduler.flushNow(invalidation);
  }

  protected commitRender(invalidation = fullInvalidation("commit")): void {
    if (isQuickFilterFocused(this.root)) {
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
    if (this.pendingHeaderFocusField !== undefined) {
      const field = this.pendingHeaderFocusField;
      this.pendingHeaderFocusField = undefined;
      restoreHeaderFocus(this.root, field);
    }
    if (this.pendingQuickFilterFocus) {
      this.pendingQuickFilterFocus = false;
      restoreQuickFilterFocus(this.root);
    }
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
    this.themeRuntime.apply(this.getEffectiveTheme(), this.options.security);
  }

  protected getEffectiveTheme(): ThemeOptions | undefined {
    return mergePluginThemeExtensions(
      this.theme,
      this.getPluginExtensions<ThemeExtensionPayload>("theme")
    );
  }

  protected get mutableOptions(): MutableDomGridOptions<TData> {
    return this.options as MutableDomGridOptions<TData>;
  }

  protected createColumnUiRuntime(): ColumnUiRuntime {
    const runtime = createColumnUiRuntimeFromState({
      options: this.options,
      columnState: this.columnState,
      infiniteEntries: this.infiniteEntries,
      serverEntries: this.serverEntries,
      viewportEntries: this.viewportEntries,
      treeEntries: this.treeEntries,
      setColumnState: (state) => {
        this.applyColumnState(state, "column-state", ["columns", "layout"]);
      },
      updateColumnState: (updater) => {
        this.updateColumnState(updater);
      }
    });

    return {
      ...runtime,
      headerMenuExtensions: {
        getExtensions: () => this.getPluginExtensions("menu.header")
      }
    };
  }

  protected applyColumnState(
    state: ColumnUiState,
    reason: string,
    invalidationKeys: readonly ("columns" | "rows" | "layout" | "overlay")[],
    render = true
  ): boolean {
    const nextState = freezeColumnUiState(state);
    const before = this.emitGridBeforeEvent("beforeColumnStateChange", {
      type: "beforeColumnStateChange",
      previousColumnState: freezeColumnUiState(this.columnState),
      columnState: nextState,
      reason
    });
    if (before.defaultPrevented) {
      return false;
    }

    this.columnState = nextState;
    if (render) {
      void this.render(invalidate(invalidationKeys, reason));
    }
    return true;
  }

  protected updateColumnState(updater: (model: ColumnModel<TData>) => ColumnUiState): void {
    if (this.destroyed) {
      return;
    }

    const model = createDomColumnModel({ ...this.options, columnState: this.columnState });
    this.applyColumnState(updater(model), "column-state-update", ["columns", "layout"]);
  }

  protected findDataColumn(columnKey: string): NormalizedDataColumn<TData> | undefined {
    const model = createDomColumnModel({ ...this.options, columnState: this.columnState });
    return model.visibleLeafColumns.find((column) => column.id === columnKey || column.field === columnKey);
  }

  protected resolveDistinctRowKey(row: TData, index: number): string | number {
    const rowKey = this.options.rowKey;
    if (typeof rowKey === "function") {
      return rowKey(row, index);
    }
    const value = typeof rowKey === "string" ? readField(row, rowKey) : undefined;
    return typeof value === "string" || typeof value === "number" ? value : index;
  }

  protected abstract loadNextInfiniteBlock(): Promise<void>;
  protected abstract loadServerRows(refresh?: boolean, page?: number): Promise<void>;
  protected abstract resetRemoteRowModel(reason: string): boolean;
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
