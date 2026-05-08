import type {
  GridBeforeEventHandler,
  GridBeforeEventMap,
  GridBeforeEventPayload,
  GridEventHandler,
  GridEventMap,
  Unsubscribe
} from "@onegrid/core";
import { GridEventRegistry } from "./gridEventRegistry.js";
import type { DomGridOptions } from "./oneGridTypes.js";

export abstract class OneGridEventBase<TData = unknown> {
  protected readonly options: DomGridOptions<TData>;
  private readonly eventRegistry = new GridEventRegistry<TData>();

  protected constructor(options: DomGridOptions<TData>) {
    this.options = options;
  }

  on<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): Unsubscribe {
    return this.eventRegistry.on(eventName, handler);
  }

  off<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    handler: GridEventHandler<TData, K>
  ): void {
    this.eventRegistry.off(eventName, handler);
  }

  onBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    handler: GridBeforeEventHandler<TData, K>
  ): Unsubscribe {
    return this.eventRegistry.onBefore(eventName, handler);
  }

  offBefore<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    handler: GridBeforeEventHandler<TData, K>
  ): void {
    this.eventRegistry.offBefore(eventName, handler);
  }

  protected emitGridEvent<K extends keyof GridEventMap<TData> & string>(
    eventName: K,
    event: GridEventMap<TData>[K]
  ): void {
    const configured = this.options.events?.[eventName] as GridEventHandler<TData, K> | undefined;
    this.eventRegistry.emit(configured, eventName, event);
  }

  protected emitGridBeforeEvent<K extends keyof GridBeforeEventMap<TData> & string>(
    eventName: K,
    event: GridBeforeEventPayload<TData, K>
  ): GridBeforeEventMap<TData>[K] {
    const configured = this.options.beforeEvents?.[eventName] as
      | GridBeforeEventHandler<TData, K>
      | undefined;
    return this.eventRegistry.emitBefore(configured, eventName, event);
  }
}
