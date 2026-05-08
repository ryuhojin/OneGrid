import type {
  GridBeforeEventHandler,
  GridBeforeEventHandlers,
  GridBeforeEventMap,
  GridEventHandler,
  GridEventHandlers,
  GridEventMap
} from "@onegrid/core";

export interface OneGridEventProps<TData = unknown> {
  readonly onReady?: GridEventHandler<TData, "ready">;
  readonly onDestroyed?: GridEventHandler<TData, "destroyed">;
  readonly onDataRequested?: GridEventHandler<TData, "dataRequested">;
  readonly onDataLoaded?: GridEventHandler<TData, "dataLoaded">;
  readonly onRowClicked?: GridEventHandler<TData, "rowClicked">;
  readonly onCellClicked?: GridEventHandler<TData, "cellClicked">;
  readonly onSelectionChanged?: GridEventHandler<TData, "selectionChanged">;
  readonly onSortChanged?: GridEventHandler<TData, "sortChanged">;
  readonly onFilterChanged?: GridEventHandler<TData, "filterChanged">;
  readonly onPageChanged?: GridEventHandler<TData, "pageChanged">;
  readonly onCellEditStarted?: GridEventHandler<TData, "cellEditStarted">;
  readonly onCellEditStaged?: GridEventHandler<TData, "cellEditStaged">;
  readonly onCellEditRequested?: GridEventHandler<TData, "cellEditRequested">;
  readonly onCellEditCommitted?: GridEventHandler<TData, "cellEditCommitted">;
  readonly onCellEditCancelled?: GridEventHandler<TData, "cellEditCancelled">;
  readonly onBatchEditSessionStarted?: GridEventHandler<TData, "batchEditSessionStarted">;
  readonly onBatchEditSessionCommitted?: GridEventHandler<TData, "batchEditSessionCommitted">;
  readonly onBatchEditSessionCancelled?: GridEventHandler<TData, "batchEditSessionCancelled">;
  readonly onEditUndo?: GridEventHandler<TData, "editUndo">;
  readonly onEditRedo?: GridEventHandler<TData, "editRedo">;
  readonly onEditHistoryChanged?: GridEventHandler<TData, "editHistoryChanged">;
  readonly onValidationFailed?: GridEventHandler<TData, "validationFailed">;
  readonly onError?: GridEventHandler<TData, "error">;
  readonly onBeforeCellEditStart?: GridBeforeEventHandler<TData, "beforeCellEditStart">;
  readonly onBeforeCellEditCommit?: GridBeforeEventHandler<TData, "beforeCellEditCommit">;
  readonly onBeforeSelectionChange?: GridBeforeEventHandler<TData, "beforeSelectionChange">;
  readonly onBeforeSortChange?: GridBeforeEventHandler<TData, "beforeSortChange">;
  readonly onBeforeFilterChange?: GridBeforeEventHandler<TData, "beforeFilterChange">;
  readonly onBeforePageChange?: GridBeforeEventHandler<TData, "beforePageChange">;
  readonly onBeforeColumnStateChange?: GridBeforeEventHandler<TData, "beforeColumnStateChange">;
}

export type ReactGridEventName = keyof GridEventMap<unknown> & string;
export type ReactGridBeforeEventName = keyof GridBeforeEventMap<unknown> & string;
type EventPropName = keyof OneGridEventProps<unknown>;

export const reactGridEventPropEntries: readonly [ReactGridEventName, EventPropName][] = [
  ["ready", "onReady"],
  ["destroyed", "onDestroyed"],
  ["dataRequested", "onDataRequested"],
  ["dataLoaded", "onDataLoaded"],
  ["rowClicked", "onRowClicked"],
  ["cellClicked", "onCellClicked"],
  ["selectionChanged", "onSelectionChanged"],
  ["sortChanged", "onSortChanged"],
  ["filterChanged", "onFilterChanged"],
  ["pageChanged", "onPageChanged"],
  ["cellEditStarted", "onCellEditStarted"],
  ["cellEditStaged", "onCellEditStaged"],
  ["cellEditRequested", "onCellEditRequested"],
  ["cellEditCommitted", "onCellEditCommitted"],
  ["cellEditCancelled", "onCellEditCancelled"],
  ["batchEditSessionStarted", "onBatchEditSessionStarted"],
  ["batchEditSessionCommitted", "onBatchEditSessionCommitted"],
  ["batchEditSessionCancelled", "onBatchEditSessionCancelled"],
  ["editUndo", "onEditUndo"],
  ["editRedo", "onEditRedo"],
  ["editHistoryChanged", "onEditHistoryChanged"],
  ["validationFailed", "onValidationFailed"],
  ["error", "onError"]
];

export const reactGridBeforeEventPropEntries: readonly [ReactGridBeforeEventName, EventPropName][] = [
  ["beforeCellEditStart", "onBeforeCellEditStart"],
  ["beforeCellEditCommit", "onBeforeCellEditCommit"],
  ["beforeSelectionChange", "onBeforeSelectionChange"],
  ["beforeSortChange", "onBeforeSortChange"],
  ["beforeFilterChange", "onBeforeFilterChange"],
  ["beforePageChange", "onBeforePageChange"],
  ["beforeColumnStateChange", "onBeforeColumnStateChange"]
];

export function createGridEventHandlers<TData>(
  coreEvents: GridEventHandlers<TData> | undefined,
  props: OneGridEventProps<TData>
): GridEventHandlers<TData> | undefined {
  type AnyGridHandler = GridEventHandler<TData, keyof GridEventMap<TData>>;
  const handlers: Partial<Record<ReactGridEventName, AnyGridHandler>> = {};

  for (const [eventName, propName] of reactGridEventPropEntries) {
    const fromOptions = coreEvents?.[eventName as keyof GridEventHandlers<TData>] as
      | AnyGridHandler
      | undefined;
    const fromProps = props[propName] as AnyGridHandler | undefined;
    if (fromOptions || fromProps) {
      handlers[eventName] = (event) => {
        fromOptions?.(event);
        fromProps?.(event);
      };
    }
  }

  return Object.keys(handlers).length === 0
    ? undefined
    : handlers as GridEventHandlers<TData>;
}

export function createGridBeforeEventHandlers<TData>(
  coreEvents: GridBeforeEventHandlers<TData> | undefined,
  props: OneGridEventProps<TData>
): GridBeforeEventHandlers<TData> | undefined {
  type AnyGridHandler = GridBeforeEventHandler<TData, keyof GridBeforeEventMap<TData>>;
  const handlers: Partial<Record<ReactGridBeforeEventName, AnyGridHandler>> = {};

  for (const [eventName, propName] of reactGridBeforeEventPropEntries) {
    const fromOptions = coreEvents?.[eventName as keyof GridBeforeEventHandlers<TData>] as
      | AnyGridHandler
      | undefined;
    const fromProps = props[propName] as AnyGridHandler | undefined;
    if (fromOptions || fromProps) {
      handlers[eventName] = (event) => {
        fromOptions?.(event);
        if (!event.defaultPrevented) {
          fromProps?.(event);
        }
      };
    }
  }

  return Object.keys(handlers).length === 0
    ? undefined
    : handlers as GridBeforeEventHandlers<TData>;
}

export function emitGridEvent<TData, TEventName extends keyof GridEventMap<TData> & string>(
  handlers: GridEventHandlers<TData> | undefined,
  eventName: TEventName,
  event: GridEventMap<TData>[TEventName]
): void {
  handlers?.[eventName]?.(event);
}

export function getEventPropDeps<TData>(props: OneGridEventProps<TData>): readonly unknown[] {
  return [
    ...reactGridEventPropEntries.map(([, propName]) => props[propName]),
    ...reactGridBeforeEventPropEntries.map(([, propName]) => props[propName])
  ];
}
