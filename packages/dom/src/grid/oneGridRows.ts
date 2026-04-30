import type {
  GroupModel,
  RowKey,
  RowUpdate,
  ScrollToRowAlign,
  ViewportLiveUpdate
} from "@onegrid/core";
import { createClientRowModel } from "@onegrid/core";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { invalidate } from "./renderInvalidation.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import {
  getViewportHeight,
  getViewportRowHeight
} from "./rowModelOptions.js";
import { createRowRenderState } from "./rowRenderStateFactory.js";
import type { RowRenderState } from "./renderGridShell.js";
import { resolveScrollTopForRow } from "./scrollPosition.js";
import { OneGridBase } from "./oneGridBase.js";

interface PendingServerLoad {
  readonly refresh: boolean;
  readonly page: number;
}

export abstract class OneGridRows<TData = unknown> extends OneGridBase<TData> {
  private pendingServerLoad: PendingServerLoad | undefined;

  setGroupModel(model: GroupModel): void {
    if (this.destroyed) {
      return;
    }

    this.groupModel = Object.freeze({
      ...(model.fields === undefined ? {} : { fields: Object.freeze([...model.fields]) }),
      ...(model.expandedKeys === undefined
        ? {}
        : { expandedKeys: Object.freeze([...model.expandedKeys]) })
    });
    this.virtualScrollTop = 0;
    if (this.resetRemoteRowModel("group-model")) {
      return;
    }

    void this.render(invalidate(["rows", "layout", "overlay"], "group-model"));
  }

  getGroupModel(): GroupModel {
    return this.groupModel;
  }

  expandGroup(groupKey: string): void {
    this.setGroupExpanded(groupKey, true, "group-expand-api");
  }

  collapseGroup(groupKey: string): void {
    this.setGroupExpanded(groupKey, false, "group-collapse-api");
  }

  toggleGroup(groupKey: string): void {
    this.setGroupExpanded(groupKey, !this.isGroupExpanded(groupKey), "group-toggle-api");
  }

  async refreshServerRows(): Promise<void> {
    await this.loadServerRows(true);
  }

  async updateServerRows(updates: readonly RowUpdate<TData>[]): Promise<void> {
    if (!this.serverRowModel || this.destroyed) {
      return;
    }

    await this.serverRowModel.applyTransaction(updates);
    this.serverEntries = this.serverRowModel.entries;
    await this.render(invalidate(["rows", "overlay"], "server-transaction"));
  }

  async scrollViewportTo(rowIndex: number): Promise<void> {
    this.setVirtualScrollToRow(rowIndex, "start");
    await this.loadViewportRows(rowIndex);
  }

  async scrollToRow(rowIndex: number, align: ScrollToRowAlign = "start"): Promise<void> {
    this.setVirtualScrollToRow(rowIndex, align);
    if (this.viewportRowModel) {
      await this.loadViewportRows(rowIndex);
      return;
    }

    await this.render(invalidate(["rows"], "scroll-row"));
  }

  async expandTreeNode(key: string | number): Promise<void> {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    const pending = this.treeRowModel.expand(key);
    this.treeEntries = this.treeRowModel.visibleRows;
    await this.render(invalidate(["rows", "overlay"], "tree-expand"));
    await pending;
    await this.refreshTreeRows("tree-expanded");
  }

  collapseTreeNode(key: string | number): void {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    this.treeRowModel.collapse(key);
    this.treeEntries = this.treeRowModel.visibleRows;
    void this.render(invalidate(["rows", "overlay"], "tree-collapse"));
  }

  applyViewportLiveUpdate(update: ViewportLiveUpdate<TData>): void {
    if (!this.viewportRowModel || this.destroyed) {
      return;
    }

    this.viewportEntries = this.viewportRowModel.applyLiveUpdate(update);
    void this.render(invalidate(["rows", "overlay"], "viewport-live-update"));
  }

  async toggleTreeNode(key: string | number): Promise<void> {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    const pending = this.treeRowModel.toggle(key);
    this.treeEntries = this.treeRowModel.visibleRows;
    await this.render(invalidate(["rows", "overlay"], "tree-toggle"));
    await pending;
    if (!this.destroyed) {
      this.treeEntries = this.treeRowModel.visibleRows;
      await this.render(invalidate(["rows", "overlay"], "tree-children-loaded"));
    }
  }

  selectTreeNode(key: string | number, selected: boolean): void {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    this.treeRowModel.select(key, selected);
    this.treeEntries = this.treeRowModel.visibleRows;
    void this.render(invalidate(["rows"], "tree-selection"));
  }

  getTreeSelection(): readonly RowKey[] {
    return this.treeRowModel?.selected ?? [];
  }

  protected createGroupRuntime(): GroupRowRuntime {
    return {
      onToggleGroup: (groupKey, expanded) => {
        this.setGroupExpanded(groupKey, !expanded, "group-toggle");
      }
    };
  }

  protected async refreshTreeRows(reason: string): Promise<void> {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    this.treeEntries = this.treeRowModel.visibleRows;
    await this.render(invalidate(["rows", "overlay"], reason));
  }

  protected setGroupExpanded(groupKey: string, expanded: boolean, reason: string): void {
    if (this.destroyed) {
      return;
    }

    if (this.serverRowModel) {
      this.serverGroupKeys = expanded ? Object.freeze([groupKey]) : Object.freeze([]);
      this.resetRemoteRowModel(reason);
      return;
    }

    const expandedKeys = this.getResolvedClientGroupKeys();
    if (expanded) {
      expandedKeys.add(groupKey);
    } else {
      expandedKeys.delete(groupKey);
    }

    this.groupModel = Object.freeze({
      ...(this.groupModel.fields === undefined ? {} : { fields: this.groupModel.fields }),
      expandedKeys: Object.freeze([...expandedKeys])
    });
    void this.render(invalidate(["rows", "layout", "overlay"], reason));
  }

  protected isGroupExpanded(groupKey: string): boolean {
    if (this.serverRowModel) {
      return this.serverGroupKeys.includes(groupKey);
    }

    return this.getResolvedClientGroupKeys().has(groupKey);
  }

  protected resetRemoteRowModel(reason: string): boolean {
    this.renderError = undefined;
    if (this.infiniteRowModel) {
      this.infiniteRowModel.cancelAll(reason);
      this.infiniteRowModel = createDomInfiniteRowModel(this.getRenderOptions());
      this.infiniteLoading = false;
      this.infiniteEntries = this.infiniteRowModel?.getAppendRows() ?? [];
      void this.render(invalidate(["rows", "columns", "overlay"], reason));
      void this.loadNextInfiniteBlock();
      return true;
    }

    if (this.serverRowModel) {
      this.serverRowModel = createDomServerRowModel(this.getRenderOptions());
      this.serverLoading = false;
      this.serverEntries = [];
      this.serverMergeMeta = [];
      this.serverAggregate = undefined;
      void this.loadServerRows(true);
      return true;
    }

    if (this.viewportRowModel) {
      this.viewportRowModel = createDomViewportRowModel(this.getRenderOptions());
      this.viewportLoading = false;
      this.viewportEntries = [];
      void this.scrollViewportTo(0);
      return true;
    }

    return false;
  }

  protected createRowRenderState(): RowRenderState<TData> | undefined {
    const state = createRowRenderState({
      infiniteRowModel: this.infiniteRowModel,
      infiniteEntries: this.infiniteEntries,
      infiniteLoading: this.infiniteLoading,
      loadNextInfiniteBlock: () => {
        void this.loadNextInfiniteBlock();
      },
      serverRowModel: this.serverRowModel,
      serverEntries: this.serverEntries,
      serverMergeMeta: this.serverMergeMeta,
      serverAggregate: this.serverAggregate,
      serverLoading: this.serverLoading,
      viewportRowModel: this.viewportRowModel,
      viewportEntries: this.viewportEntries,
      viewportLoading: this.viewportLoading,
      treeRowModel: this.treeRowModel,
      treeEntries: this.treeEntries,
      ...(this.options.tree?.treeColumnField === undefined
        ? {}
        : { treeColumnField: this.options.tree.treeColumnField }),
      toggleTreeNode: (key) => {
        void this.toggleTreeNode(key);
      },
      selectTreeNode: (key, selected) => {
        this.selectTreeNode(key, selected);
      }
    });

    return state && this.renderError === undefined
      ? state
      : state
        ? { ...state, error: this.renderError }
        : undefined;
  }

  protected setVirtualScrollToRow(rowIndex: number, align: ScrollToRowAlign): void {
    this.virtualScrollTop = resolveScrollTopForRow({
      options: this.options,
      rowIndex,
      align,
      currentScrollTop: this.virtualScrollTop,
      viewportHeight: this.virtualViewportHeight,
      infiniteRowModel: this.infiniteRowModel,
      infiniteEntries: this.infiniteEntries,
      serverRowModel: this.serverRowModel,
      viewportRowModel: this.viewportRowModel,
      treeRowModel: this.treeRowModel
    });
  }

  protected async loadNextInfiniteBlock(): Promise<void> {
    if (!this.infiniteRowModel || this.infiniteLoading || !this.infiniteRowModel.hasMore) {
      return;
    }

    this.infiniteLoading = true;
    this.renderError = undefined;
    this.infiniteEntries = this.infiniteRowModel.getAppendRows();
    await this.render(invalidate(["rows", "overlay"], "infinite-loading"));

    try {
      await this.infiniteRowModel.loadNextAppendBlock();
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.infiniteEntries = this.infiniteRowModel.getAppendRows();
        this.infiniteLoading = false;
        await this.render(invalidate(["rows", "overlay"], "infinite-loaded"));
      }
    }
  }

  protected async loadServerRows(refresh = false, page = this.paginationPage - 1): Promise<void> {
    const rowModel = this.serverRowModel;
    if (!rowModel) {
      return;
    }

    if (this.serverLoading) {
      this.pendingServerLoad = {
        refresh: refresh || this.pendingServerLoad?.refresh === true,
        page
      };
      return;
    }

    this.serverLoading = true;
    this.renderError = undefined;
    await this.render(invalidate(["rows", "overlay"], "server-loading"));

    try {
      const result = refresh
        ? await rowModel.refresh()
        : await rowModel.loadPage(page);
      if (this.serverRowModel !== rowModel) {
        return;
      }
      this.serverEntries = result.entries;
      this.serverMergeMeta = result.mergeMeta ?? [];
      this.serverAggregate = result.aggregate;
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.serverLoading = false;
        await this.render(invalidate(["rows", "overlay"], "server-loaded"));
        const pending = this.pendingServerLoad;
        this.pendingServerLoad = undefined;
        if (pending) {
          await this.loadServerRows(pending.refresh, pending.page);
        }
      }
    }
  }

  protected async loadViewportRows(rowIndex: number): Promise<void> {
    if (!this.viewportRowModel || this.viewportLoading) {
      return;
    }

    this.viewportLoading = true;
    this.renderError = undefined;
    await this.render(invalidate(["rows", "overlay"], "viewport-loading"));

    try {
      const result = await this.viewportRowModel.loadViewport({
        scrollTop: Math.max(0, Math.trunc(rowIndex)) * getViewportRowHeight(this.options),
        viewportHeight: getViewportHeight(this.options)
      });
      if (!result.stale) {
        this.viewportEntries = result.entries;
      }
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.viewportLoading = false;
        await this.render(invalidate(["rows", "overlay"], "viewport-loaded"));
      }
    }
  }

  protected getCurrentVisibleRowKeys(): readonly RowKey[] {
    const rowKeys: RowKey[] = [];
    const seen = new Set<string>();
    for (const cell of this.root.querySelectorAll<HTMLElement>(
      '[data-layout-section="body"] [data-edit-row-key]'
    )) {
      const rowKey = cell.dataset.editRowKey;
      if (rowKey !== undefined && !seen.has(rowKey)) {
        seen.add(rowKey);
        rowKeys.push(rowKey);
      }
    }
    return Object.freeze(rowKeys);
  }

  private getResolvedClientGroupKeys(): Set<string> {
    if (this.groupModel.expandedKeys) {
      return new Set(this.groupModel.expandedKeys);
    }

    if (!Array.isArray(this.dataRows) && !Array.isArray(this.options.data)) {
      return new Set<string>();
    }

    const rows = this.dataRows ?? this.options.data ?? [];
    const model = createClientRowModel(rows, {
      ...(this.options.rowKey === undefined ? {} : { rowKey: this.options.rowKey }),
      columns: this.options.columns,
      filterModel: this.filterModel,
      sortModel: this.sortModel,
      groupModel: this.groupModel,
      ...(this.options.aggregation?.model === undefined
        ? {}
        : { aggregateModel: this.options.aggregation.model })
    });

    return new Set(
      model.visibleRows
        .filter((entry) => entry.kind === "group")
        .map((entry) => entry.key)
    );
  }
}
