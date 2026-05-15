import { appendClientRowsWithResult, type ClientRowTransactionResult, type GroupModel, removeClientRowsWithResult, type RefreshOptions, type RowKey, type RowUpdate, setClientRowsWithResult, updateClientRowsWithResult } from "@onegrid/core";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { isGroupKeyExpanded, setGroupKeyExpanded } from "./groupExpansionState.js";
import { invalidate } from "./renderInvalidation.js";
import { createRowRenderState } from "./rowRenderStateFactory.js";
import type { RowRenderState } from "./renderGridShell.js";
import { OneGridPivot } from "./oneGridPivot.js";
import { collectVisibleRowKeys, createClientTransactionStore, createRowIdentityInput, findRowDataInEntries, getClientRowsFromTransaction, mergeRowPatch, resolveClientGroupKeys, resolveClientStoreKey, toClientRowUpdates } from "./rowDataMutationRuntime.js";

export abstract class OneGridRows<TData = unknown> extends OneGridPivot<TData> {
  async refresh(options?: RefreshOptions): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const reason = options?.reason ?? "refresh-api";
    if (options?.purgeCache === true && this.resetRemoteRowModel(reason)) {
      return;
    }
    this.clearAutoRowHeightCache();

    if (this.serverRowModel) {
      await this.loadServerRows(true);
      return;
    }
    if (this.viewportRowModel) {
      await this.scrollViewportTo(0);
      return;
    }

    await this.render(invalidate(["rows", "columns", "layout", "overlay"], reason));
  }

  setData(rows: readonly TData[]): ClientRowTransactionResult<TData> | undefined {
    if (this.destroyed) {
      return undefined;
    }

    const result = setClientRowsWithResult(rows, this.getRowIdentityInput(), this.getClientRowStore());
    this.applyClientTransactionResult(result, "data-api-set", true);
    return result;
  }

  appendRows(rows: readonly TData[]): ClientRowTransactionResult<TData> | undefined {
    if (this.destroyed) {
      return undefined;
    }

    const result = appendClientRowsWithResult(this.getClientRowStore(), rows, this.getRowIdentityInput());
    this.applyClientTransactionResult(result, "data-api-append");
    return result;
  }

  updateRows(updates: readonly RowUpdate<TData>[]): ClientRowTransactionResult<TData> | undefined {
    if (this.destroyed || updates.length === 0) {
      return undefined;
    }

    if (this.serverRowModel) {
      void this.updateServerRows(updates);
      return undefined;
    }

    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      const store = this.getClientRowStore(rows);
      const result = updateClientRowsWithResult(store, toClientRowUpdates(store, updates));
      this.applyClientTransactionResult(result, "data-api-update");
      return result;
    }

    this.updateRemoteEntries(updates);
    return undefined;
  }

  removeRows(rowKeys: readonly RowKey[]): ClientRowTransactionResult<TData> | undefined {
    if (this.destroyed || rowKeys.length === 0) {
      return undefined;
    }

    const removals = new Set(rowKeys.map((rowKey) => String(rowKey)));
    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      const store = this.getClientRowStore(rows);
      const result = removeClientRowsWithResult(
        store,
        rowKeys.map((rowKey) => resolveClientStoreKey(store, rowKey))
      );
      this.applyClientTransactionResult(result, "data-api-remove");
      return result;
    }

    this.serverEntries = this.serverEntries.filter((entry) =>
      !("data" in entry && removals.has(String(entry.key)))
    );
    this.infiniteEntries = this.infiniteEntries.filter((entry) =>
      !("data" in entry && removals.has(String(entry.key)))
    );
    this.viewportEntries = this.viewportEntries.filter((entry) =>
      entry.kind === "skeleton" || !removals.has(String(entry.key))
    );
    this.treeEntries = this.treeEntries.filter((entry) => !removals.has(String(entry.key)));
    void this.render(invalidate(["rows", "layout", "overlay"], "data-api-remove"));
    return undefined;
  }

  getRow(rowKey: RowKey): TData | undefined {
    const targetKey = String(rowKey);
    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      return rows.find((row, index) => String(this.resolveDistinctRowKey(row, index)) === targetKey);
    }

    return this.findRemoteRow(targetKey);
  }

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
    this.clearAutoRowHeightCache();
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

  async expandTreeNode(key: string | number): Promise<void> {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    const pending = this.treeRowModel.expand(key);
    this.emitRemoteDataRequested(this.treeRowModel.status);
    this.treeEntries = this.treeRowModel.visibleRows;
    await this.render(invalidate(["rows", "overlay"], "tree-expand"));
    try {
      await pending;
      await this.refreshTreeRows("tree-expanded");
    } catch (error) {
      await this.handleTreeLoadError(error, "tree-expand-error");
    }
  }

  collapseTreeNode(key: string | number): void {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    this.treeRowModel.collapse(key);
    this.treeEntries = this.treeRowModel.visibleRows;
    void this.render(invalidate(["rows", "overlay"], "tree-collapse"));
  }

  async toggleTreeNode(key: string | number): Promise<void> {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    const pending = this.treeRowModel.toggle(key);
    this.emitRemoteDataRequested(this.treeRowModel.status);
    this.treeEntries = this.treeRowModel.visibleRows;
    await this.render(invalidate(["rows", "overlay"], "tree-toggle"));
    try {
      await pending;
      if (!this.destroyed) {
        this.treeEntries = this.treeRowModel.visibleRows;
        await this.render(invalidate(["rows", "overlay"], "tree-children-loaded"));
      }
    } catch (error) {
      await this.handleTreeLoadError(error, "tree-toggle-error");
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

  protected async handleTreeLoadError(error: unknown, reason: string): Promise<void> {
    if (!this.treeRowModel || this.destroyed) {
      return;
    }

    this.renderError = error;
    this.emitRemoteError(error);
    this.treeEntries = this.treeRowModel.visibleRows;
    await this.render(invalidate(["rows", "overlay"], reason));
  }

  protected setGroupExpanded(groupKey: string, expanded: boolean, reason: string): void {
    if (this.destroyed) {
      return;
    }

    if (this.serverRowModel) {
      this.groupModel = setGroupKeyExpanded(this.groupModel, groupKey, expanded);
      void this.setServerGroupExpanded(groupKey, expanded, reason);
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
    this.clearAutoRowHeightCache();
    void this.render(invalidate(["rows", "layout", "overlay"], reason));
  }

  protected isGroupExpanded(groupKey: string): boolean {
    if (this.serverRowModel) {
      return isGroupKeyExpanded(this.groupModel, groupKey);
    }

    return this.getResolvedClientGroupKeys().has(groupKey);
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

  protected getCurrentVisibleRowKeys(): readonly RowKey[] {
    return collectVisibleRowKeys(this.root);
  }

  private updateRemoteEntries(updates: readonly RowUpdate<TData>[]): void {
    const byKey = new Map(updates.map((update) => [String(update.rowKey), update.row]));
    this.serverEntries = this.serverEntries.map((entry) =>
      "data" in entry && byKey.has(String(entry.key))
        ? { ...entry, data: mergeRowPatch(entry.data, byKey.get(String(entry.key)) ?? {}) }
        : entry
    );
    this.infiniteEntries = this.infiniteEntries.map((entry) =>
      "data" in entry && byKey.has(String(entry.key))
        ? { ...entry, data: mergeRowPatch(entry.data, byKey.get(String(entry.key)) ?? {}) }
        : entry
    );
    this.viewportEntries = this.viewportEntries.map((entry) =>
      entry.kind === "data" && byKey.has(String(entry.key))
        ? { ...entry, data: mergeRowPatch(entry.data, byKey.get(String(entry.key)) ?? {}) }
        : entry
    );
    this.treeEntries = this.treeEntries.map((entry) =>
      byKey.has(String(entry.key))
        ? { ...entry, data: mergeRowPatch(entry.data, byKey.get(String(entry.key)) ?? {}) }
        : entry
    );
    this.clearAutoRowHeightCache();
    void this.render(invalidate(["rows", "layout", "overlay"], "data-api-update"));
  }

  private applyClientTransactionResult(
    result: ClientRowTransactionResult<TData>,
    reason: string,
    resetScroll = false
  ): void {
    if (!result.changed && result.kind !== "set") {
      return;
    }

    this.dataRows = getClientRowsFromTransaction(result);
    this.clearEditRuntimeForDataChange();
    this.clearAutoRowHeightCache();
    if (resetScroll) {
      this.virtualScrollTop = 0;
      this.paginationPage = 1;
    }
    void this.render(invalidate(["rows", "layout", "overlay"], reason));
  }

  private getClientRowStore(rows: readonly TData[] = this.dataRows ?? this.options.data ?? []) {
    return createClientTransactionStore(rows, this.options.rowKey, this.options.duplicateRowKeyPolicy);
  }

  private findRemoteRow(rowKey: string): TData | undefined {
    return findRowDataInEntries<TData>(rowKey, [
      ...this.serverEntries,
      ...this.infiniteEntries,
      ...this.viewportEntries,
      ...this.treeEntries
    ]);
  }

  private getResolvedClientGroupKeys(): Set<string> {
    if (this.groupModel.expandedKeys) {
      return new Set(this.groupModel.expandedKeys);
    }

    return resolveClientGroupKeys({
      ...(this.dataRows === undefined ? {} : { dataRows: this.dataRows }),
      ...(this.options.data === undefined ? {} : { optionRows: this.options.data }),
      ...(this.options.rowKey === undefined ? {} : { rowKey: this.options.rowKey }),
      ...(this.options.duplicateRowKeyPolicy === undefined
        ? {}
        : { duplicateRowKeyPolicy: this.options.duplicateRowKeyPolicy }),
      columns: this.options.columns,
      filterModel: this.filterModel,
      sortModel: this.sortModel,
      groupModel: this.groupModel,
      ...(this.options.aggregation?.model === undefined
        ? {}
        : { aggregateModel: this.options.aggregation.model })
    });
  }

  private getRowIdentityInput() {
    return createRowIdentityInput(this.options.rowKey, this.options.duplicateRowKeyPolicy);
  }
}
