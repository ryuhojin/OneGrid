import type {
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
  readonly onCellEditCommitted?: GridEventHandler<TData, "cellEditCommitted">;
  readonly onCellEditCancelled?: GridEventHandler<TData, "cellEditCancelled">;
  readonly onValidationFailed?: GridEventHandler<TData, "validationFailed">;
  readonly onError?: GridEventHandler<TData, "error">;
}

export type ReactGridEventName = keyof GridEventMap<unknown> & string;
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
  ["cellEditCommitted", "onCellEditCommitted"],
  ["cellEditCancelled", "onCellEditCancelled"],
  ["validationFailed", "onValidationFailed"],
  ["error", "onError"]
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

export function emitGridEvent<TData, TEventName extends keyof GridEventMap<TData> & string>(
  handlers: GridEventHandlers<TData> | undefined,
  eventName: TEventName,
  event: GridEventMap<TData>[TEventName]
): void {
  handlers?.[eventName]?.(event);
}

export function getEventPropDeps<TData>(props: OneGridEventProps<TData>): readonly unknown[] {
  return reactGridEventPropEntries.map(([, propName]) => props[propName]);
}
