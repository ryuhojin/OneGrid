import type { GridApi } from "./grid-api.js";
import type { GridOptions } from "./grid-options.js";
import type { Unsubscribe } from "./shared.js";

export interface GridPlugin<TData = unknown> {
  readonly id: string;
  readonly version?: string;
  readonly dependencies?: readonly string[];
  setup(context: GridPluginContext<TData>): GridPluginCleanup | undefined;
}

export interface GridPluginContext<TData = unknown> {
  readonly api: GridApi<TData>;
  readonly options: GridOptions<TData>;
  addCleanup(cleanup: GridPluginCleanup): void;
  onDispose(cleanup: GridPluginCleanup): Unsubscribe;
}

export type GridPluginCleanup = () => void;
