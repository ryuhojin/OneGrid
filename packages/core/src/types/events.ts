import type {
  CellPosition,
  EditCancelReason,
  EditCommitTrigger,
  EditStartMode,
  FilterModel,
  RowKey,
  SortModel,
  ValidationIssue
} from "./shared.js";
import type {
  GridBatchEditSession,
  GridEditHistoryEntry,
  GridEditHistoryState,
  GridPendingEdit
} from "./grid-api.js";
import type { CancellableEvent } from "../events/eventBus.js";
import type { SelectedCell, SelectedRange, ServerSelectionToken } from "../selection/index.js";
import type { ColumnUiState } from "../column/columnUi.js";

export type GridEventHandlers<TData = unknown> = {
  readonly [K in keyof GridEventMap<TData>]?: GridEventHandler<TData, K>;
};

export type GridBeforeEventHandlers<TData = unknown> = {
  readonly [K in keyof GridBeforeEventMap<TData>]?: GridBeforeEventHandler<TData, K>;
};

export type GridEventHandler<
  TData = unknown,
  TEventName extends keyof GridEventMap<TData> = keyof GridEventMap<TData>
> = (event: GridEventMap<TData>[TEventName]) => void;

export type GridBeforeEventHandler<
  TData = unknown,
  TEventName extends keyof GridBeforeEventMap<TData> = keyof GridBeforeEventMap<TData>
> = (event: GridBeforeEventMap<TData>[TEventName]) => void;

export type GridCancellableEvent<TEvent> = CancellableEvent<TEvent>;

export type GridBeforeEventPayload<
  TData,
  TEventName extends keyof GridBeforeEventMap<TData>
> = GridBeforeEventMap<TData>[TEventName] extends GridCancellableEvent<infer TEvent>
  ? TEvent
  : never;

export interface GridEventMap<TData = unknown> {
  readonly ready: GridReadyEvent;
  readonly destroyed: GridDestroyedEvent;
  readonly dataRequested: GridDataRequestedEvent;
  readonly dataLoaded: GridDataLoadedEvent<TData>;
  readonly rowClicked: GridRowEvent<TData>;
  readonly cellClicked: GridCellEvent<TData>;
  readonly selectionChanged: GridSelectionChangedEvent<TData>;
  readonly sortChanged: GridSortChangedEvent;
  readonly filterChanged: GridFilterChangedEvent;
  readonly pageChanged: GridPageChangedEvent;
  readonly cellEditStarted: GridCellEvent<TData>;
  readonly cellEditStaged: GridCellEditStagedEvent<TData>;
  readonly cellEditRequested: GridCellEditRequestedEvent<TData>;
  readonly cellEditCommitted: GridCellEditCommittedEvent<TData>;
  readonly cellEditCancelled: GridCellEditCancelledEvent<TData>;
  readonly batchEditSessionStarted: GridBatchEditSessionEvent<TData>;
  readonly batchEditSessionCommitted: GridBatchEditSessionEvent<TData>;
  readonly batchEditSessionCancelled: GridBatchEditSessionEvent<TData>;
  readonly editUndo: GridEditHistoryEvent<TData>;
  readonly editRedo: GridEditHistoryEvent<TData>;
  readonly editHistoryChanged: GridEditHistoryChangedEvent<TData>;
  readonly validationFailed: GridValidationFailedEvent<TData>;
  readonly error: GridErrorEvent;
}

export interface GridBeforeEventMap<TData = unknown> {
  readonly beforeCellEditStart: GridCancellableEvent<GridBeforeCellEditStartEvent<TData>>;
  readonly beforeCellEditCommit: GridCancellableEvent<GridBeforeCellEditCommitEvent<TData>>;
  readonly beforeSelectionChange: GridCancellableEvent<GridBeforeSelectionChangeEvent<TData>>;
  readonly beforeSortChange: GridCancellableEvent<GridBeforeSortChangeEvent>;
  readonly beforeFilterChange: GridCancellableEvent<GridBeforeFilterChangeEvent>;
  readonly beforePageChange: GridCancellableEvent<GridBeforePageChangeEvent>;
  readonly beforeColumnStateChange: GridCancellableEvent<GridBeforeColumnStateChangeEvent>;
}

export interface GridReadyEvent {
  readonly type: "ready";
}

export interface GridDestroyedEvent {
  readonly type: "destroyed";
}

export interface GridDataRequestedEvent {
  readonly type: "dataRequested";
  readonly requestId: string;
}

export interface GridDataLoadedEvent<TData = unknown> {
  readonly type: "dataLoaded";
  readonly requestId: string;
  readonly rows: readonly TData[];
}

export interface GridRowEvent<TData = unknown> {
  readonly type: "rowClicked";
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly rowIndex: number;
}

export interface GridCellEvent<TData = unknown> {
  readonly type:
    | "cellClicked"
    | "cellEditStarted"
    | "cellEditStaged"
    | "cellEditRequested"
    | "cellEditCommitted"
    | "cellEditCancelled"
    | "validationFailed";
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly position: CellPosition;
  readonly value: unknown;
}

export interface GridSelectionChangedEvent<TData = unknown> {
  readonly type: "selectionChanged";
  readonly rows: readonly TData[];
  readonly rowKeys: readonly RowKey[];
  readonly cells: readonly SelectedCell[];
  readonly ranges: readonly SelectedRange[];
  readonly allRowsToken?: ServerSelectionToken;
}

export interface GridSortChangedEvent {
  readonly type: "sortChanged";
  readonly sortModel: readonly SortModel[];
}

export interface GridFilterChangedEvent {
  readonly type: "filterChanged";
  readonly filterModel: FilterModel;
}

export interface GridPageChangedEvent {
  readonly type: "pageChanged";
  readonly page: number;
  readonly pageSize: number;
}

export interface GridCellEditCommittedEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "cellEditCommitted";
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly trigger: EditCommitTrigger;
}

export interface GridCellEditStagedEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "cellEditStaged";
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly trigger: EditCommitTrigger;
}

export interface GridCellEditRequestedEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "cellEditRequested";
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly nextRow: TData;
  readonly trigger: EditCommitTrigger;
}

export interface GridCellEditCancelledEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "cellEditCancelled";
  readonly reason: EditCancelReason;
}

export interface GridValidationFailedEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "validationFailed";
  readonly issues: readonly ValidationIssue[];
}

export interface GridBatchEditSessionEvent<TData = unknown> {
  readonly type:
    | "batchEditSessionStarted"
    | "batchEditSessionCommitted"
    | "batchEditSessionCancelled";
  readonly session: GridBatchEditSession<TData>;
  readonly edits: readonly GridPendingEdit<TData>[];
}

export type GridEditHistoryChangeAction = "push" | "undo" | "redo" | "clear";

export interface GridEditHistoryEvent<TData = unknown> {
  readonly type: "editUndo" | "editRedo";
  readonly entry: GridEditHistoryEntry<TData>;
  readonly state: GridEditHistoryState<TData>;
}

export interface GridEditHistoryChangedEvent<TData = unknown> {
  readonly type: "editHistoryChanged";
  readonly action: GridEditHistoryChangeAction;
  readonly entry?: GridEditHistoryEntry<TData>;
  readonly state: GridEditHistoryState<TData>;
}

export interface GridErrorEvent {
  readonly type: "error";
  readonly error: unknown;
  readonly recoverable: boolean;
}

export type GridEditStartTrigger = "api" | "keyboard" | "pointer";

export type GridEditCommitMode = "cell" | "batch" | "readOnly";

export interface GridBeforeCellEditStartEvent<TData = unknown> {
  readonly type: "beforeCellEditStart";
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly position: CellPosition;
  readonly value: unknown;
  readonly trigger: GridEditStartTrigger;
  readonly startMode?: EditStartMode;
}

export interface GridBeforeCellEditCommitEvent<TData = unknown> {
  readonly type: "beforeCellEditCommit";
  readonly row: TData;
  readonly rowKey: RowKey;
  readonly position: CellPosition;
  readonly value: unknown;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly nextRow: TData;
  readonly trigger: EditCommitTrigger;
  readonly commitMode: GridEditCommitMode;
}

export interface GridBeforeSelectionChangeEvent<TData = unknown> {
  readonly type: "beforeSelectionChange";
  readonly previousSelection: GridSelectionChangedEvent<TData>;
  readonly nextSelection: GridSelectionChangedEvent<TData>;
  readonly reason: string;
}

export interface GridBeforeSortChangeEvent {
  readonly type: "beforeSortChange";
  readonly previousSortModel: readonly SortModel[];
  readonly sortModel: readonly SortModel[];
  readonly reason: string;
}

export interface GridBeforeFilterChangeEvent {
  readonly type: "beforeFilterChange";
  readonly previousFilterModel: FilterModel;
  readonly filterModel: FilterModel;
  readonly reason: string;
}

export interface GridBeforePageChangeEvent {
  readonly type: "beforePageChange";
  readonly previousPage: number;
  readonly previousPageSize: number;
  readonly page: number;
  readonly pageSize: number;
  readonly reason: string;
}

export interface GridBeforeColumnStateChangeEvent {
  readonly type: "beforeColumnStateChange";
  readonly previousColumnState: ColumnUiState;
  readonly columnState: ColumnUiState;
  readonly reason: string;
}
