import type { ColumnDef } from "./column.js";
import type { RowUpdate } from "./data.js";
import type { GridEventHandler, GridEventMap } from "./events.js";
import type { ExportOptions, ImportOptions, ThemeInput } from "./grid-options.js";
import type { GridSelectionState, SelectedCell } from "../selection/index.js";
import type {
  CellPosition,
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
  getPendingEdits(): readonly GridPendingEdit<TData>[];
  commitPendingEdits(options?: CommitPendingEditsOptions): Promise<void>;
  cancelPendingEdits(): void;
  validate(): ValidationResult;
  setColumns(columns: readonly ColumnDef<TData>[]): void;
  showColumn(field: string): void;
  hideColumn(field: string): void;
  pinColumn(field: string, side: "left" | "right" | null): void;
  autoSizeColumn(field: string): void;
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
  scrollToColumn(field: string, align?: ScrollAlign): void;
  exportData(options?: ExportOptions): Promise<GridExportResult>;
  importData(content: string | Uint8Array, options?: ImportOptions<TData>): Promise<GridImportResult<TData>>;
  copyToClipboard(options?: ClipboardCopyOptions): Promise<void>;
  pasteFromClipboard(text: string): Promise<void>;
  applyTheme(theme: ThemeInput): void;
  on<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): Unsubscribe;
  off<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
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

export interface GridPendingEdit<TData = unknown> {
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly position: CellPosition;
  readonly sourceIndex?: number;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly stagedAt: number;
}

export interface ClipboardCopyOptions {
  readonly includeHeaders?: boolean;
  readonly selectedOnly?: boolean;
}
