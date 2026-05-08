import type { ColumnDef } from "./column.js";
import type { RowUpdate } from "./data.js";
import type {
  GridBeforeEventHandler,
  GridBeforeEventMap,
  GridEventHandler,
  GridEventMap
} from "./events.js";
import type { ExportOptions, ImportOptions, ThemeInput } from "./grid-options.js";
import type { GridPluginExtension, GridPluginExtensionPoint } from "./plugin.js";
import type { ColumnUiState, SetColumnStateOptions } from "../column/index.js";
import type { GridSelectionState, SelectedCell } from "../selection/index.js";
import type { GridStateSnapshot, SetGridStateOptions } from "../state/index.js";
import type {
  CellPosition,
  ColumnId,
  FilterModel,
  GridExportResult,
  GridImportResult,
  GroupModel,
  RowKey,
  ScrollAlign,
  SortModel,
  Unsubscribe,
  ValidationResult
} from "./shared.js";

export interface GridApi<TData = unknown> {
  destroy(): void;
  refresh(options?: RefreshOptions): Promise<void>;
  getState(): GridStateSnapshot;
  setState(state: GridStateSnapshot, options?: SetGridStateOptions): void;
  setData(rows: readonly TData[]): void;
  appendRows(rows: readonly TData[]): void;
  updateRows(rows: readonly RowUpdate<TData>[]): void;
  removeRows(rowKeys: readonly RowKey[]): void;
  getRow(rowKey: RowKey): TData | undefined;
  getSelectionState(): GridSelectionState;
  getSelectedRows(): readonly TData[];
  selectRows(rowKeys: readonly RowKey[]): void;
  selectCell(cell: SelectedCell): void;
  selectCellRange(anchor: SelectedCell, focus: SelectedCell): void;
  selectAllVisibleRows(): void;
  selectServerDataset(): void;
  clearSelection(): void;
  startEdit(position: CellPosition): void;
  stopEdit(options?: StopEditOptions): void;
  startBatchEditSession(options?: StartBatchEditSessionOptions): GridBatchEditSession<TData>;
  getBatchEditSession(): GridBatchEditSession<TData> | undefined;
  commitBatchEditSession(options?: CommitPendingEditsOptions): Promise<GridBatchEditSession<TData> | undefined>;
  cancelBatchEditSession(): GridBatchEditSession<TData> | undefined;
  undoEdit(): GridEditHistoryEntry<TData> | undefined;
  redoEdit(): GridEditHistoryEntry<TData> | undefined;
  getEditHistoryState(): GridEditHistoryState<TData>;
  clearEditHistory(): void;
  getPendingEdits(): readonly GridPendingEdit<TData>[];
  commitPendingEdits(options?: CommitPendingEditsOptions): Promise<void>;
  cancelPendingEdits(): void;
  validate(): ValidationResult;
  setColumns(columns: readonly ColumnDef<TData>[]): void;
  getColumnState(): ColumnUiState;
  setColumnState(state: ColumnUiState, options?: SetColumnStateOptions): void;
  resetColumnState(options?: SetColumnStateOptions): void;
  showColumn(columnId: ColumnId): void;
  hideColumn(columnId: ColumnId): void;
  pinColumn(columnId: ColumnId, side: "left" | "right" | null): void;
  autoSizeColumn(columnId: ColumnId): void;
  setFilterModel(model: FilterModel): void;
  getFilterModel(): FilterModel;
  setSortModel(model: readonly SortModel[]): void;
  getSortModel(): readonly SortModel[];
  setGroupModel(model: GroupModel): void;
  getGroupModel(): GroupModel;
  expandGroup(groupKey: string): void;
  collapseGroup(groupKey: string): void;
  toggleGroup(groupKey: string): void;
  expandTreeNode(rowKey: RowKey): Promise<void>;
  collapseTreeNode(rowKey: RowKey): void;
  toggleTreeNode(rowKey: RowKey): Promise<void>;
  selectTreeNode(rowKey: RowKey, selected: boolean): void;
  getTreeSelection(): readonly RowKey[];
  setPage(page: number): void;
  getPage(): number;
  setPageSize(pageSize: number): void;
  getPageSize(): number;
  scrollToRow(rowIndex: number, align?: ScrollAlign): void;
  scrollToColumn(columnId: ColumnId, align?: ScrollAlign): void;
  exportData(options?: ExportOptions): Promise<GridExportResult>;
  importData(content: string | Uint8Array, options?: ImportOptions<TData>): Promise<GridImportResult<TData>>;
  copyToClipboard(options?: ClipboardCopyOptions): Promise<void>;
  pasteFromClipboard(text: string): Promise<void>;
  applyTheme(theme: ThemeInput): void;
  setLocale(locale: string): void;
  getLocale(): string;
  hasPlugin(pluginId: string): boolean;
  getPluginExtensions<TPayload = unknown>(
    point?: GridPluginExtensionPoint
  ): readonly GridPluginExtension<TPayload>[];
  on<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): Unsubscribe;
  off<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): void;
  onBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    handler: GridBeforeEventHandler<TData, K>
  ): Unsubscribe;
  offBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    handler: GridBeforeEventHandler<TData, K>
  ): void;
}

export interface RefreshOptions {
  readonly purgeCache?: boolean;
  readonly reason?: string;
}

export interface StopEditOptions {
  readonly commit?: boolean;
  readonly validate?: boolean;
}

export interface CommitPendingEditsOptions {
  readonly validate?: boolean;
}

export interface StartBatchEditSessionOptions {
  readonly id?: string;
  readonly label?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type GridBatchEditSessionStatus = "active" | "committed" | "cancelled";

export interface GridBatchEditSession<TData = unknown> {
  readonly id: string;
  readonly label?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly status: GridBatchEditSessionStatus;
  readonly startedAt: number;
  readonly completedAt?: number;
  readonly editCount: number;
  readonly pendingEdits: readonly GridPendingEdit<TData>[];
}

export interface GridPendingEdit<TData = unknown> {
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly position: CellPosition;
  readonly sourceIndex?: number;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly stagedAt: number;
}

export interface GridEditHistoryEntry<TData = unknown> {
  readonly id: string;
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly position: CellPosition;
  readonly sourceIndex?: number;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly rowBefore: TData;
  readonly rowAfter: TData;
  readonly createdAt: number;
}

export interface GridEditHistoryState<TData = unknown> {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoCount: number;
  readonly redoCount: number;
  readonly lastUndo?: GridEditHistoryEntry<TData>;
  readonly lastRedo?: GridEditHistoryEntry<TData>;
}

export interface ClipboardCopyOptions {
  readonly includeHeaders?: boolean;
  readonly selectedOnly?: boolean;
}
