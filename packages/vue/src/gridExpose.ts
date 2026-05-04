import type { GridApi } from "@onegrid/core";
import { createSelectionState } from "@onegrid/core";
import type { OneGrid as DomOneGrid } from "@onegrid/dom";

export interface OneGridExpose extends GridApi<unknown> {}

export function createGridExpose(
  getGrid: () => DomOneGrid<unknown> | undefined
): OneGridExpose {
  return {
    destroy() {
      getGrid()?.destroy();
    },
    refresh(options) {
      return getGrid()?.refresh(options) ?? Promise.resolve();
    },
    setData(rows) {
      getGrid()?.setData(rows);
    },
    appendRows(rows) {
      getGrid()?.appendRows(rows);
    },
    updateRows(rows) {
      getGrid()?.updateRows(rows);
    },
    removeRows(rowKeys) {
      getGrid()?.removeRows(rowKeys);
    },
    getRow(rowKey) {
      return getGrid()?.getRow(rowKey);
    },
    scrollToRow(rowIndex, align) {
      return getGrid()?.scrollToRow(rowIndex, align);
    },
    scrollToColumn(field, align) {
      return getGrid()?.scrollToColumn(field, align);
    },
    startEdit(position) {
      getGrid()?.startEdit(position);
    },
    stopEdit(options) {
      getGrid()?.stopEdit(options);
    },
    getPendingEdits() {
      return getGrid()?.getPendingEdits() ?? [];
    },
    commitPendingEdits(options) {
      return getGrid()?.commitPendingEdits(options) ?? Promise.resolve();
    },
    cancelPendingEdits() {
      getGrid()?.cancelPendingEdits();
    },
    copyToClipboard(options) {
      return getGrid()?.copyToClipboard(options) ?? Promise.resolve();
    },
    pasteFromClipboard(text) {
      return getGrid()?.pasteFromClipboard(text) ?? Promise.resolve();
    },
    exportData(options) {
      return getGrid()?.exportData(options)
        ?? Promise.resolve({ content: "", mediaType: "text/plain" });
    },
    importData(content, options) {
      return getGrid()?.importData(content, options)
        ?? Promise.resolve({ rows: [], rowCount: 0, rejected: [] });
    },
    validate() {
      return getGrid()?.validate()
        ?? Object.freeze({ valid: true, issues: Object.freeze([]) });
    },
    setColumns(columns) {
      getGrid()?.setColumns(columns);
    },
    showColumn(field) {
      getGrid()?.showColumn(field);
    },
    hideColumn(field) {
      getGrid()?.hideColumn(field);
    },
    pinColumn(field, side) {
      getGrid()?.pinColumn(field, side);
    },
    autoSizeColumn(field) {
      getGrid()?.autoSizeColumn(field);
    },
    setFilterModel(model) {
      getGrid()?.setFilterModel(model);
    },
    getFilterModel() {
      return getGrid()?.getFilterModel() ?? Object.freeze({});
    },
    setSortModel(model) {
      getGrid()?.setSortModel(model);
    },
    getSortModel() {
      return getGrid()?.getSortModel() ?? Object.freeze([]);
    },
    setGroupModel(model) {
      getGrid()?.setGroupModel(model);
    },
    getGroupModel() {
      return getGrid()?.getGroupModel() ?? Object.freeze({});
    },
    expandGroup(groupKey) {
      getGrid()?.expandGroup(groupKey);
    },
    collapseGroup(groupKey) {
      getGrid()?.collapseGroup(groupKey);
    },
    toggleGroup(groupKey) {
      getGrid()?.toggleGroup(groupKey);
    },
    expandTreeNode(rowKey) {
      return getGrid()?.expandTreeNode(rowKey) ?? Promise.resolve();
    },
    collapseTreeNode(rowKey) {
      getGrid()?.collapseTreeNode(rowKey);
    },
    toggleTreeNode(rowKey) {
      return getGrid()?.toggleTreeNode(rowKey) ?? Promise.resolve();
    },
    selectTreeNode(rowKey, selected) {
      getGrid()?.selectTreeNode(rowKey, selected);
    },
    getTreeSelection() {
      return getGrid()?.getTreeSelection() ?? [];
    },
    getSelectionState() {
      return getGrid()?.getSelectionState() ?? createSelectionState();
    },
    getSelectedRows() {
      return getGrid()?.getSelectedRows() ?? [];
    },
    selectRows(rowKeys) {
      getGrid()?.selectRows(rowKeys);
    },
    selectCell(cell) {
      getGrid()?.selectCell(cell);
    },
    selectCellRange(anchor, focus) {
      getGrid()?.selectCellRange(anchor, focus);
    },
    selectAllVisibleRows() {
      getGrid()?.selectAllVisibleRows();
    },
    selectServerDataset() {
      getGrid()?.selectServerDataset();
    },
    clearSelection() {
      getGrid()?.clearSelection();
    },
    setPage(page) {
      getGrid()?.setPage(page);
    },
    getPage() {
      return getGrid()?.getPage() ?? 1;
    },
    setPageSize(pageSize) {
      getGrid()?.setPageSize(pageSize);
    },
    getPageSize() {
      return getGrid()?.getPageSize() ?? 50;
    },
    setLocale(locale) {
      getGrid()?.setLocale(locale);
    },
    getLocale() {
      return getGrid()?.getLocale() ?? "en-US";
    },
    applyTheme(theme) {
      getGrid()?.applyTheme(theme);
    },
    on(eventName, handler) {
      return getGrid()?.on(eventName, handler) ?? (() => undefined);
    },
    off(eventName, handler) {
      getGrid()?.off(eventName, handler);
    }
  };
}
