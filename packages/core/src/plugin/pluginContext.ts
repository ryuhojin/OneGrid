import type { GridApi } from "../types/grid-api.js";
import type { GridOptions } from "../types/grid-options.js";
import type {
  GridPluginCleanup,
  GridPluginContext as PublicGridPluginContext
} from "../types/plugin.js";
import type { Unsubscribe } from "../types/shared.js";

export class GridPluginRuntimeContext<TData = unknown>
  implements PublicGridPluginContext<TData>
{
  readonly api: GridApi<TData>;
  readonly options: GridOptions<TData>;

  private readonly cleanups: GridPluginCleanup[] = [];
  private disposed = false;

  constructor(api: GridApi<TData>, options: GridOptions<TData>) {
    this.api = api;
    this.options = options;
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
