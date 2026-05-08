import { createCancellableEvent } from "@onegrid/core";
import type {
  GridBeforeEventHandler,
  GridBeforeEventMap,
  GridBeforeEventPayload,
  GridEventHandler,
  GridEventMap,
  Unsubscribe
} from "@onegrid/core";

type AnyGridEventHandler<TData> = GridEventHandler<TData, keyof GridEventMap<TData>>;
type AnyGridBeforeEventHandler<TData> =
  GridBeforeEventHandler<TData, keyof GridBeforeEventMap<TData>>;

export class GridEventRegistry<TData = unknown> {
  private readonly eventHandlers = new Map<string, Set<AnyGridEventHandler<TData>>>();
  private readonly beforeEventHandlers = new Map<string, Set<AnyGridBeforeEventHandler<TData>>>();

  on<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): Unsubscribe {
    const handlers = this.getEventHandlers(eventName);
    handlers.add(handler as AnyGridEventHandler<TData>);
    return () => {
      this.off(eventName, handler);
    };
  }

  off<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): void {
    this.eventHandlers.get(eventName)?.delete(handler as AnyGridEventHandler<TData>);
  }

  onBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    handler: GridBeforeEventHandler<TData, K>
  ): Unsubscribe {
    const handlers = this.getBeforeEventHandlers(eventName);
    handlers.add(handler as AnyGridBeforeEventHandler<TData>);
    return () => {
      this.offBefore(eventName, handler);
    };
  }

  offBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    handler: GridBeforeEventHandler<TData, K>
  ): void {
    this.beforeEventHandlers.get(eventName)?.delete(handler as AnyGridBeforeEventHandler<TData>);
  }

  emit<K extends keyof GridEventMap<TData> & string>(
    configured: GridEventHandler<TData, K> | undefined,
    eventName: K,
    event: GridEventMap<TData>[K]
  ): void {
    configured?.(event);
    this.eventHandlers.get(eventName)?.forEach((handler) => {
      (handler as GridEventHandler<TData, K>)(event);
    });
  }

  emitBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    configured: GridBeforeEventHandler<TData, K> | undefined,
    eventName: K,
    event: GridBeforeEventPayload<TData, K>
  ): GridBeforeEventMap<TData>[K] {
    const cancellable = createCancellableEvent(event) as unknown as GridBeforeEventMap<TData>[K];
    configured?.(cancellable);
    if (cancellable.defaultPrevented) {
      return cancellable;
    }

    for (const handler of this.beforeEventHandlers.get(eventName) ?? []) {
      (handler as GridBeforeEventHandler<TData, K>)(cancellable);
      if (cancellable.defaultPrevented) {
        break;
      }
    }
    return cancellable;
  }

  private getEventHandlers(eventName: string): Set<AnyGridEventHandler<TData>> {
    const handlers = this.eventHandlers.get(eventName) ?? new Set<AnyGridEventHandler<TData>>();
    this.eventHandlers.set(eventName, handlers);
    return handlers;
  }

  private getBeforeEventHandlers(eventName: string): Set<AnyGridBeforeEventHandler<TData>> {
    const handlers = this.beforeEventHandlers.get(eventName)
      ?? new Set<AnyGridBeforeEventHandler<TData>>();
    this.beforeEventHandlers.set(eventName, handlers);
    return handlers;
  }
}
