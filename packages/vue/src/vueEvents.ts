import type {
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
  "cellEditCommitted",
  "cellEditCancelled",
  "validationFailed",
  "error"
] as const;

type EventName = typeof vueGridEmits[number];

export type VueGridEmit<TData = unknown> = <TEventName extends keyof GridEventMap<TData> & EventName>(
  eventName: TEventName,
  event: GridEventMap<TData>[TEventName]
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

export function emitVueGridEvent<TData, TEventName extends keyof GridEventMap<TData> & EventName>(
  handlers: GridEventHandlers<TData> | undefined,
  eventName: TEventName,
  event: GridEventMap<TData>[TEventName]
): void {
  handlers?.[eventName]?.(event);
}
