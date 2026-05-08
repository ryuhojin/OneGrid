import type { GridApi } from "./grid-api.js";
import type { GridOptions } from "./grid-options.js";
import type { Unsubscribe } from "./shared.js";

export interface GridPlugin<TData = unknown> {
  readonly id: string;
  readonly version?: string;
  readonly dependencies?: readonly string[];
  setup(context: GridPluginContext<TData>): GridPluginCleanup | undefined;
}

export type GridPluginExtensionPoint =
  | "grid.lifecycle"
  | "column.definition"
  | "row.model"
  | "render.cell"
  | "render.header"
  | "menu.header"
  | "menu.context"
  | "export.adapter"
  | "import.adapter"
  | "theme"
  | (string & {});

export interface GridPluginExtensionContribution<TPayload = unknown> {
  readonly id: string;
  readonly point: GridPluginExtensionPoint;
  readonly order?: number;
  readonly payload?: TPayload;
}

export interface GridPluginExtension<TPayload = unknown>
  extends GridPluginExtensionContribution<TPayload> {
  readonly pluginId: string;
}

export interface GridPluginContext<TData = unknown> {
  readonly api: GridApi<TData>;
  readonly options: GridOptions<TData>;
  addCleanup(cleanup: GridPluginCleanup): void;
  onDispose(cleanup: GridPluginCleanup): Unsubscribe;
  registerExtension<TPayload = unknown>(
    extension: GridPluginExtensionContribution<TPayload>
  ): Unsubscribe;
  getExtensions<TPayload = unknown>(
    point?: GridPluginExtensionPoint
  ): readonly GridPluginExtension<TPayload>[];
}

export type GridPluginCleanup = () => void;
