import type { GridApi } from "../types/grid-api.js";
import type { GridOptions } from "../types/grid-options.js";
import type {
  GridPluginCleanup,
  GridPluginContext as PublicGridPluginContext,
  GridPluginExtension,
  GridPluginExtensionContribution,
  GridPluginExtensionPoint
} from "../types/plugin.js";
import type { Unsubscribe } from "../types/shared.js";
import type { GridPluginExtensionRegistry } from "./pluginExtensions.js";

export class GridPluginRuntimeContext<TData = unknown>
  implements PublicGridPluginContext<TData>
{
  readonly api: GridApi<TData>;
  readonly options: GridOptions<TData>;

  private readonly pluginId: string;
  private readonly extensions: GridPluginExtensionRegistry;
  private readonly cleanups: GridPluginCleanup[] = [];
  private disposed = false;

  constructor(
    pluginId: string,
    api: GridApi<TData>,
    options: GridOptions<TData>,
    extensions: GridPluginExtensionRegistry
  ) {
    this.pluginId = pluginId;
    this.api = api;
    this.options = options;
    this.extensions = extensions;
  }

  addCleanup(cleanup: GridPluginCleanup): void {
    if (this.disposed) {
      cleanup();
      return;
    }

    this.cleanups.push(cleanup);
  }

  onDispose(cleanup: GridPluginCleanup): Unsubscribe {
    this.addCleanup(cleanup);

    return () => {
      const cleanupIndex = this.cleanups.indexOf(cleanup);
      if (cleanupIndex >= 0) {
        this.cleanups.splice(cleanupIndex, 1);
      }
    };
  }

  registerExtension<TPayload = unknown>(
    extension: GridPluginExtensionContribution<TPayload>
  ): Unsubscribe {
    if (this.disposed) {
      throw new Error(`Plugin is already disposed: ${this.pluginId}`);
    }

    const unregister = this.extensions.register(this.pluginId, extension);
    this.addCleanup(unregister);
    return unregister;
  }

  getExtensions<TPayload = unknown>(
    point?: GridPluginExtensionPoint
  ): readonly GridPluginExtension<TPayload>[] {
    return this.extensions.list<TPayload>(point);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    const errors: unknown[] = [];

    while (this.cleanups.length > 0) {
      const cleanup = this.cleanups.pop();
      if (!cleanup) {
        continue;
      }

      try {
        cleanup();
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length === 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new AggregateError(errors, "OneGrid plugin cleanup failed");
    }
  }
}
