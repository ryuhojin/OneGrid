import type {
  GridApi,
  GridBatchEditSession,
  GridEditHistoryState,
  GridStateSnapshot,
  StartBatchEditSessionOptions
} from "@onegrid/core";
import { createSelectionState, freezeColumnUiState, freezeGridStateSnapshot } from "@onegrid/core";
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
    getState() {
      return getGrid()?.getState() ?? createFallbackStateSnapshot();
    },
    setState(state, options) {
      getGrid()?.setState(state, options);
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
    startBatchEditSession(options) {
      return getGrid()?.startBatchEditSession(options) ?? createFallbackBatchSession(options);
    },
    getBatchEditSession() {
      return getGrid()?.getBatchEditSession();
    },
    commitBatchEditSession(options) {
      return getGrid()?.commitBatchEditSession(options) ?? Promise.resolve(undefined);
    },
    cancelBatchEditSession() {
      return getGrid()?.cancelBatchEditSession();
    },
    undoEdit() {
      return getGrid()?.undoEdit();
    },
    redoEdit() {
      return getGrid()?.redoEdit();
    },
    getEditHistoryState() {
      return getGrid()?.getEditHistoryState() ?? createFallbackEditHistoryState();
    },
    clearEditHistory() {
      getGrid()?.clearEditHistory();
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
    getColumnState() {
      return getGrid()?.getColumnState() ?? freezeColumnUiState({});
    },
    setColumnState(state, options) {
      getGrid()?.setColumnState(state, options);
    },
    resetColumnState(options) {
      getGrid()?.resetColumnState(options);
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
    hasPlugin(pluginId) {
      return getGrid()?.hasPlugin(pluginId) ?? false;
    },
    getPluginExtensions(point) {
      return getGrid()?.getPluginExtensions(point) ?? [];
    },
    on(eventName, handler) {
      return getGrid()?.on(eventName, handler) ?? (() => undefined);
    },
    off(eventName, handler) {
      getGrid()?.off(eventName, handler);
    },
    onBefore(eventName, handler) {
      return getGrid()?.onBefore(eventName, handler) ?? (() => undefined);
    },
    offBefore(eventName, handler) {
      getGrid()?.offBefore(eventName, handler);
    }
  };
}

function createFallbackStateSnapshot(): GridStateSnapshot {
  return freezeGridStateSnapshot({
    selection: createSelectionState(),
    pagination: { page: 1, pageSize: 50 },
    scroll: { top: 0, left: 0 },
    locale: "en-US"
  });
}

function createFallbackEditHistoryState(): GridEditHistoryState<unknown> {
  return Object.freeze({
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0
  });
}

function createFallbackBatchSession(
  options: StartBatchEditSessionOptions | undefined
): GridBatchEditSession<unknown> {
  return Object.freeze({
    id: options?.id ?? "unmounted",
    ...(options?.label === undefined ? {} : { label: options.label }),
    ...(options?.metadata === undefined ? {} : { metadata: options.metadata }),
    status: "active",
    startedAt: Date.now(),
    editCount: 0,
    pendingEdits: Object.freeze([])
  });
}
