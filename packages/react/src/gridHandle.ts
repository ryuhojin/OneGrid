import type {
  GridApi,
  GridBatchEditSession,
  GridEditHistoryState,
  GridStateSnapshot,
  StartBatchEditSessionOptions
} from "@onegrid/core";
import { createSelectionState, freezeColumnUiState, freezeGridStateSnapshot } from "@onegrid/core";
import type { OneGrid as DomOneGrid } from "@onegrid/dom";

export interface OneGridHandle<TData = unknown> extends GridApi<TData> {}

export function createGridHandle<TData>(
  getGrid: () => DomOneGrid<TData> | undefined
): OneGridHandle<TData> {
  return {
    destroy: () => getGrid()?.destroy(),
    refresh: (options) => getGrid()?.refresh(options) ?? Promise.resolve(),
    getState: () => getGrid()?.getState() ?? createFallbackStateSnapshot(),
    setState: (state, options) => getGrid()?.setState(state, options),
    setData: (rows) => getGrid()?.setData(rows),
    appendRows: (rows) => getGrid()?.appendRows(rows),
    updateRows: (rows) => getGrid()?.updateRows(rows),
    removeRows: (rowKeys) => getGrid()?.removeRows(rowKeys),
    getRow: (rowKey) => getGrid()?.getRow(rowKey),
    scrollToRow: (rowIndex, align) => getGrid()?.scrollToRow(rowIndex, align),
    scrollToColumn: (field, align) => getGrid()?.scrollToColumn(field, align),
    startEdit: (position) => getGrid()?.startEdit(position),
    stopEdit: (options) => getGrid()?.stopEdit(options),
    startBatchEditSession: (options) => getGrid()?.startBatchEditSession(options)
      ?? createFallbackBatchSession(options),
    getBatchEditSession: () => getGrid()?.getBatchEditSession(),
    commitBatchEditSession: (options) => getGrid()?.commitBatchEditSession(options) ?? Promise.resolve(undefined),
    cancelBatchEditSession: () => getGrid()?.cancelBatchEditSession(),
    undoEdit: () => getGrid()?.undoEdit(),
    redoEdit: () => getGrid()?.redoEdit(),
    getEditHistoryState: () => getGrid()?.getEditHistoryState() ?? createFallbackEditHistoryState(),
    clearEditHistory: () => getGrid()?.clearEditHistory(),
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
    getColumnState: (options) => getGrid()?.getColumnState(options) ?? freezeColumnUiState({}),
    setColumnState: (state, options) => getGrid()?.setColumnState(state, options),
    applyColumnState: (params, options) => getGrid()?.applyColumnState(params, options)
      ?? Object.freeze({
        applied: false,
        state: freezeColumnUiState({}),
        appliedColumnIds: Object.freeze([]),
        appliedGroupIds: Object.freeze([]),
        missingColumnIds: Object.freeze([]),
        missingGroupIds: Object.freeze([])
      }),
    resetColumnState: (options) => getGrid()?.resetColumnState(options),
    setColumnGroupOpen: (groupId, open, options) => getGrid()?.setColumnGroupOpen(groupId, open, options),
    toggleColumnGroup: (groupId, options) => getGrid()?.toggleColumnGroup(groupId, options),
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
    setPivotModel: (model) => getGrid()?.setPivotModel(model),
    getPivotModel: () => getGrid()?.getPivotModel(),
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
    hasPlugin: (pluginId) => getGrid()?.hasPlugin(pluginId) ?? false,
    getPluginExtensions: (point) => getGrid()?.getPluginExtensions(point) ?? [],
    on: (eventName, handler) => getGrid()?.on(eventName, handler) ?? (() => undefined),
    off: (eventName, handler) => getGrid()?.off(eventName, handler),
    onBefore: (eventName, handler) => getGrid()?.onBefore(eventName, handler) ?? (() => undefined),
    offBefore: (eventName, handler) => getGrid()?.offBefore(eventName, handler)
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

function createFallbackEditHistoryState<TData>(): GridEditHistoryState<TData> {
  return Object.freeze({
    canUndo: false,
    canRedo: false,
    undoCount: 0,
    redoCount: 0
  });
}

function createFallbackBatchSession<TData>(
  options: StartBatchEditSessionOptions | undefined
): GridBatchEditSession<TData> {
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
