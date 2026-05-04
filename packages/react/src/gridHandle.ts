import type { GridApi } from "@onegrid/core";
import { createSelectionState } from "@onegrid/core";
import type { OneGrid as DomOneGrid } from "@onegrid/dom";

export interface OneGridHandle<TData = unknown> extends GridApi<TData> {}

export function createGridHandle<TData>(
  getGrid: () => DomOneGrid<TData> | undefined
): OneGridHandle<TData> {
  return {
    destroy: () => getGrid()?.destroy(),
    refresh: (options) => getGrid()?.refresh(options) ?? Promise.resolve(),
    setData: (rows) => getGrid()?.setData(rows),
    appendRows: (rows) => getGrid()?.appendRows(rows),
    updateRows: (rows) => getGrid()?.updateRows(rows),
    removeRows: (rowKeys) => getGrid()?.removeRows(rowKeys),
    getRow: (rowKey) => getGrid()?.getRow(rowKey),
    scrollToRow: (rowIndex, align) => getGrid()?.scrollToRow(rowIndex, align),
    scrollToColumn: (field, align) => getGrid()?.scrollToColumn(field, align),
    startEdit: (position) => getGrid()?.startEdit(position),
    stopEdit: (options) => getGrid()?.stopEdit(options),
    getPendingEdits: () => getGrid()?.getPendingEdits() ?? [],
    commitPendingEdits: (options) => getGrid()?.commitPendingEdits(options) ?? Promise.resolve(),
    cancelPendingEdits: () => getGrid()?.cancelPendingEdits(),
    copyToClipboard: (options) => getGrid()?.copyToClipboard(options) ?? Promise.resolve(),
    pasteFromClipboard: (text) => getGrid()?.pasteFromClipboard(text) ?? Promise.resolve(),
    exportData: (options) => getGrid()?.exportData(options)
      ?? Promise.resolve({ content: "", mediaType: "text/plain" }),
    importData: (content, options) => getGrid()?.importData(content, options)
      ?? Promise.resolve({ rows: [], rowCount: 0, rejected: [] }),
    validate: () => getGrid()?.validate()
      ?? Object.freeze({ valid: true, issues: Object.freeze([]) }),
    setColumns: (columns) => getGrid()?.setColumns(columns),
    showColumn: (field) => getGrid()?.showColumn(field),
    hideColumn: (field) => getGrid()?.hideColumn(field),
    pinColumn: (field, side) => getGrid()?.pinColumn(field, side),
    autoSizeColumn: (field) => getGrid()?.autoSizeColumn(field),
    setFilterModel: (model) => getGrid()?.setFilterModel(model),
    getFilterModel: () => getGrid()?.getFilterModel() ?? Object.freeze({}),
    setSortModel: (model) => getGrid()?.setSortModel(model),
    getSortModel: () => getGrid()?.getSortModel() ?? Object.freeze([]),
    setGroupModel: (model) => getGrid()?.setGroupModel(model),
    getGroupModel: () => getGrid()?.getGroupModel() ?? Object.freeze({}),
    expandGroup: (groupKey) => getGrid()?.expandGroup(groupKey),
    collapseGroup: (groupKey) => getGrid()?.collapseGroup(groupKey),
    toggleGroup: (groupKey) => getGrid()?.toggleGroup(groupKey),
    expandTreeNode: (rowKey) => getGrid()?.expandTreeNode(rowKey) ?? Promise.resolve(),
    collapseTreeNode: (rowKey) => getGrid()?.collapseTreeNode(rowKey),
    toggleTreeNode: (rowKey) => getGrid()?.toggleTreeNode(rowKey) ?? Promise.resolve(),
    selectTreeNode: (rowKey, selected) => getGrid()?.selectTreeNode(rowKey, selected),
    getTreeSelection: () => getGrid()?.getTreeSelection() ?? [],
    getSelectionState: () => getGrid()?.getSelectionState() ?? createSelectionState(),
    getSelectedRows: () => getGrid()?.getSelectedRows() ?? [],
    selectRows: (rowKeys) => getGrid()?.selectRows(rowKeys),
    selectCell: (cell) => getGrid()?.selectCell(cell),
    selectCellRange: (anchor, focus) => getGrid()?.selectCellRange(anchor, focus),
    selectAllVisibleRows: () => getGrid()?.selectAllVisibleRows(),
    selectServerDataset: () => getGrid()?.selectServerDataset(),
    clearSelection: () => getGrid()?.clearSelection(),
    setPage: (page) => getGrid()?.setPage(page),
    getPage: () => getGrid()?.getPage() ?? 1,
    setPageSize: (pageSize) => getGrid()?.setPageSize(pageSize),
    getPageSize: () => getGrid()?.getPageSize() ?? 50,
    setLocale: (locale) => getGrid()?.setLocale(locale),
    getLocale: () => getGrid()?.getLocale() ?? "en-US",
    applyTheme: (theme) => getGrid()?.applyTheme(theme),
    on: (eventName, handler) => getGrid()?.on(eventName, handler) ?? (() => undefined),
    off: (eventName, handler) => getGrid()?.off(eventName, handler)
  };
}
