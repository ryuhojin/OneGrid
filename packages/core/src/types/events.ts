import type {
  CellPosition,
  EditCancelReason,
  EditCommitTrigger,
  FilterModel,
  RowKey,
  SortModel,
  ValidationIssue
} from "./shared.js";
import type { SelectedCell, SelectedRange, ServerSelectionToken } from "../selection/index.js";

export type GridEventHandlers<TData = unknown> = {
  readonly [K in keyof GridEventMap<TData>]?: GridEventHandler<TData, K>;
};

export type GridEventHandler<
  TData = unknown,
  TEventName extends keyof GridEventMap<TData> = keyof GridEventMap<TData>
> = (event: GridEventMap<TData>[TEventName]) => void;

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
  readonly cellEditCommitted: GridCellEditCommittedEvent<TData>;
  readonly cellEditCancelled: GridCellEditCancelledEvent<TData>;
  readonly validationFailed: GridValidationFailedEvent<TData>;
  readonly error: GridErrorEvent;
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

export interface GridCellEditCancelledEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "cellEditCancelled";
  readonly reason: EditCancelReason;
}

export interface GridValidationFailedEvent<TData = unknown> extends GridCellEvent<TData> {
  readonly type: "validationFailed";
  readonly issues: readonly ValidationIssue[];
}

export interface GridErrorEvent {
  readonly type: "error";
  readonly error: unknown;
  readonly recoverable: boolean;
}
