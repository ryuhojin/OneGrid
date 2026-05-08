import type {
  GroupModel,
  RefreshOptions,
  RowUpdate,
  RowKey
} from "@onegrid/core";
import { createClientRowModel } from "@onegrid/core";
import type { GroupRowRuntime } from "./groupRowRenderer.js";
import { isGroupKeyExpanded, setGroupKeyExpanded } from "./groupExpansionState.js";
import { invalidate } from "./renderInvalidation.js";
import { createRowRenderState } from "./rowRenderStateFactory.js";
import type { RowRenderState } from "./renderGridShell.js";
import { OneGridRemoteRows } from "./oneGridRemoteRows.js";

export abstract class OneGridRows<TData = unknown> extends OneGridRemoteRows<TData> {
  async refresh(options?: RefreshOptions): Promise<void> {
    if (this.destroyed) {
      return;
    }

    const reason = options?.reason ?? "refresh-api";
    if (options?.purgeCache === true && this.resetRemoteRowModel(reason)) {
      return;
    }

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

  setData(rows: readonly TData[]): void {
    if (this.destroyed) {
      return;
    }

    this.dataRows = Object.freeze([...rows]);
    this.clearEditRuntimeForDataChange();
    this.virtualScrollTop = 0;
    this.paginationPage = 1;
    void this.render(invalidate(["rows", "layout", "overlay"], "data-api-set"));
  }

  appendRows(rows: readonly TData[]): void {
    if (this.destroyed || rows.length === 0) {
      return;
    }

    this.setData([...(this.dataRows ?? this.options.data ?? []), ...rows]);
  }

  updateRows(updates: readonly RowUpdate<TData>[]): void {
    if (this.destroyed || updates.length === 0) {
      return;
    }

    if (this.serverRowModel) {
      void this.updateServerRows(updates);
      return;
    }

    const byKey = new Map(updates.map((update) => [String(update.rowKey), update.row]));
    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      this.setData(rows.map((row, index) => {
        const patch = byKey.get(String(this.resolveDistinctRowKey(row, index)));
        return patch === undefined ? row : mergeRowPatch(row, patch);
      }));
      return;
    }

    this.updateRemoteEntries(updates);
  }

  removeRows(rowKeys: readonly RowKey[]): void {
    if (this.destroyed || rowKeys.length === 0) {
      return;
    }

    const removals = new Set(rowKeys.map((rowKey) => String(rowKey)));
    const rows = this.dataRows ?? this.options.data;
    if (Array.isArray(rows)) {
      this.setData(rows.filter((row, index) => !removals.has(String(this.resolveDistinctRowKey(row, index)))));
      return;
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
    void this.render(invalidate(["rows", "layout", "overlay"], "data-api-update"));
  }

  private findRemoteRow(rowKey: string): TData | undefined {
    for (const entry of [
      ...this.serverEntries,
      ...this.infiniteEntries,
      ...this.viewportEntries,
      ...this.treeEntries
    ]) {
      if ("data" in entry && String(entry.key) === rowKey) {
        return entry.data;
      }
    }
    return undefined;
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

function mergeRowPatch<TData>(row: TData, patch: Partial<TData>): TData {
  if (isRecord(row) && isRecord(patch)) {
    return { ...row, ...patch } as TData;
  }

  return patch as TData;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
}
