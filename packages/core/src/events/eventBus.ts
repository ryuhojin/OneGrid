export type EventKey<TEventMap extends object> = Extract<keyof TEventMap, string>;

export type EventHandler<TEvent> = (event: TEvent) => void;

export type BeforeEventHandler<TEvent> = (event: CancellableEvent<TEvent>) => void;

export interface CancellableEvent<TEvent> {
  readonly event: TEvent;
  readonly defaultPrevented: boolean;
  readonly reason: string | undefined;
  preventDefault(reason?: string): void;
}

export interface EventBus<TEventMap extends object> {
  on<K extends EventKey<TEventMap>>(eventName: K, handler: EventHandler<TEventMap[K]>): () => void;
  once<K extends EventKey<TEventMap>>(
    eventName: K,
    handler: EventHandler<TEventMap[K]>
  ): () => void;
  off<K extends EventKey<TEventMap>>(eventName: K, handler: EventHandler<TEventMap[K]>): void;
  emit<K extends EventKey<TEventMap>>(eventName: K, event: TEventMap[K]): void;
  onBefore<K extends EventKey<TEventMap>>(
    eventName: K,
    handler: BeforeEventHandler<TEventMap[K]>
  ): () => void;
  emitBefore<K extends EventKey<TEventMap>>(
    eventName: K,
    event: TEventMap[K]
  ): CancellableEvent<TEventMap[K]>;
  clear(): void;
}

export function createEventBus<TEventMap extends object>(): EventBus<TEventMap> {
  const handlers = new Map<string, Set<EventHandler<unknown>>>();
  const beforeHandlers = new Map<string, Set<BeforeEventHandler<unknown>>>();

  return {
    on(eventName, handler) {
      return addHandler(handlers, eventName, handler as EventHandler<unknown>);
    },
    once(eventName, handler) {
      const unsubscribe = addHandler(handlers, eventName, (event) => {
        unsubscribe();
        (handler as EventHandler<unknown>)(event);
      });
      return unsubscribe;
    },
    off(eventName, handler) {
      handlers.get(eventName)?.delete(handler as EventHandler<unknown>);
    },
    emit(eventName, event) {
      for (const handler of handlers.get(eventName) ?? []) {
        handler(event);
      }
    },
    onBefore(eventName, handler) {
      return addHandler(beforeHandlers, eventName, handler as BeforeEventHandler<unknown>);
    },
    emitBefore(eventName, event) {
      const cancellableEvent = createCancellableEvent(event);
      for (const handler of beforeHandlers.get(eventName) ?? []) {
        handler(cancellableEvent);
        if (cancellableEvent.defaultPrevented) {
          break;
        }
      }
      return cancellableEvent as CancellableEvent<TEventMap[typeof eventName]>;
    },
    clear() {
      handlers.clear();
      beforeHandlers.clear();
    }
  };
}

function addHandler<THandler>(
  registry: Map<string, Set<THandler>>,
  eventName: string,
  handler: THandler
): () => void {
  const eventHandlers = registry.get(eventName) ?? new Set<THandler>();
  eventHandlers.add(handler);
  registry.set(eventName, eventHandlers);

  return () => {
    eventHandlers.delete(handler);
  };
}

export function createCancellableEvent<TEvent>(event: TEvent): CancellableEvent<TEvent> {
  let prevented = false;
  let reason: string | undefined;

  return {
    event,
    get defaultPrevented() {
      return prevented;
    },
    get reason() {
      return reason;
    },
    preventDefault(nextReason?: string) {
      prevented = true;
      reason = nextReason;
    }
  };
}
