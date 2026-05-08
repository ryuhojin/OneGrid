import type {
  GridBeforeEventHandler,
  GridBeforeEventHandlers,
  GridBeforeEventMap,
  GridEventHandler,
  GridEventHandlers,
  GridEventMap
} from "@onegrid/core";

export const vueGridEmits = [
  "ready",
  "destroyed",
  "dataRequested",
  "dataLoaded",
  "rowClicked",
  "cellClicked",
  "selectionChanged",
  "sortChanged",
  "filterChanged",
  "pageChanged",
  "cellEditStarted",
  "cellEditStaged",
  "cellEditRequested",
  "cellEditCommitted",
  "cellEditCancelled",
  "batchEditSessionStarted",
  "batchEditSessionCommitted",
  "batchEditSessionCancelled",
  "editUndo",
  "editRedo",
  "editHistoryChanged",
  "validationFailed",
  "error"
] as const;

export const vueGridBeforeEmits = [
  "beforeCellEditStart",
  "beforeCellEditCommit",
  "beforeSelectionChange",
  "beforeSortChange",
  "beforeFilterChange",
  "beforePageChange",
  "beforeColumnStateChange"
] as const;

type EventName = typeof vueGridEmits[number];
type BeforeEventName = typeof vueGridBeforeEmits[number];

export type VueGridEmit<TData = unknown> = <TEventName extends keyof GridEventMap<TData> & EventName>(
  eventName: TEventName,
  event: GridEventMap<TData>[TEventName]
) => void;

export type VueGridBeforeEmit<TData = unknown> = <
  TEventName extends keyof GridBeforeEventMap<TData> & BeforeEventName
>(
  eventName: TEventName,
  event: GridBeforeEventMap<TData>[TEventName]
) => void;

export function createVueGridEventHandlers<TData>(
  coreEvents: GridEventHandlers<TData> | undefined,
  emit: VueGridEmit<TData> | undefined
): GridEventHandlers<TData> | undefined {
  type AnyGridHandler = GridEventHandler<TData, keyof GridEventMap<TData>>;
  const handlers: Partial<Record<EventName, AnyGridHandler>> = {};

  for (const eventName of vueGridEmits) {
    const fromOptions = coreEvents?.[eventName as keyof GridEventHandlers<TData>] as
      | AnyGridHandler
      | undefined;
    if (fromOptions || emit) {
      handlers[eventName] = (event) => {
        fromOptions?.(event);
        emit?.(eventName as keyof GridEventMap<TData> & EventName, event);
      };
    }
  }

  return Object.keys(handlers).length === 0
    ? undefined
    : handlers as GridEventHandlers<TData>;
}

export function createVueGridBeforeEventHandlers<TData>(
  coreEvents: GridBeforeEventHandlers<TData> | undefined,
  emit: VueGridBeforeEmit<TData> | undefined
): GridBeforeEventHandlers<TData> | undefined {
  type AnyGridHandler = GridBeforeEventHandler<TData, keyof GridBeforeEventMap<TData>>;
  const handlers: Partial<Record<BeforeEventName, AnyGridHandler>> = {};

  for (const eventName of vueGridBeforeEmits) {
    const fromOptions = coreEvents?.[eventName as keyof GridBeforeEventHandlers<TData>] as
      | AnyGridHandler
      | undefined;
    if (fromOptions || emit) {
      handlers[eventName] = (event) => {
        fromOptions?.(event);
        if (!event.defaultPrevented) {
          emit?.(eventName as keyof GridBeforeEventMap<TData> & BeforeEventName, event);
        }
      };
    }
  }

  return Object.keys(handlers).length === 0
    ? undefined
    : handlers as GridBeforeEventHandlers<TData>;
}

export function emitVueGridEvent<TData, TEventName extends keyof GridEventMap<TData> & EventName>(
  handlers: GridEventHandlers<TData> | undefined,
  eventName: TEventName,
  event: GridEventMap<TData>[TEventName]
): void {
  handlers?.[eventName]?.(event);
}
