import { validateGridPlugins } from "./lifecycle.js";
import { GridPluginRuntimeContext } from "./pluginContext.js";
import type { GridPluginDescriptor, GridPluginLifecycle, PluginValidationResult } from "./lifecycle.js";
import type { GridApi } from "../types/grid-api.js";
import type { GridOptions } from "../types/grid-options.js";
import type { GridPlugin } from "../types/plugin.js";
import type { Unsubscribe } from "../types/shared.js";

export interface CreatePluginRegistryOptions<TData = unknown> {
  readonly api: GridApi<TData>;
  readonly gridOptions: GridOptions<TData>;
  readonly plugins?: readonly GridPlugin<TData>[];
}

export interface GridPluginRegistry<TData = unknown> {
  register(plugin: GridPlugin<TData>): Unsubscribe;
  registerAll(plugins: readonly GridPlugin<TData>[]): void;
  setupAll(): void;
  disposeAll(): void;
  validate(): PluginValidationResult;
  get(pluginId: string): GridPluginDescriptor<TData> | undefined;
  has(pluginId: string): boolean;
  list(): readonly GridPluginDescriptor<TData>[];
}

interface PluginRecord<TData = unknown> {
  readonly plugin: GridPlugin<TData>;
  lifecycle: GridPluginLifecycle;
  context: GridPluginRuntimeContext<TData> | undefined;
}

export function createPluginRegistry<TData = unknown>(
  options: CreatePluginRegistryOptions<TData>
): GridPluginRegistry<TData> {
  const records = new Map<string, PluginRecord<TData>>();
  const setupOrder: string[] = [];

  const registry: GridPluginRegistry<TData> = {
    register(plugin) {
      assertPluginId(plugin);
      assertPluginIsNew(records, plugin.id);

      records.set(plugin.id, {
        plugin,
        lifecycle: "registered",
        context: undefined
      });

      return () => {
        disposeRecord(plugin.id, records);
        records.delete(plugin.id);
      };
    },
    registerAll(plugins) {
      for (const plugin of plugins) {
        registry.register(plugin);
      }
    },
    setupAll() {
      const validation = registry.validate();
      if (!validation.valid) {
        throw new Error(formatPluginValidationError(validation));
      }

      for (const pluginId of validation.setupOrder) {
        const record = records.get(pluginId);
        if (!record || record.lifecycle === "setup") {
          continue;
        }

        setupRecord(record, options.api, options.gridOptions);
        setupOrder.push(pluginId);
      }
    },
    disposeAll() {
      const errors: unknown[] = [];

      for (const pluginId of [...setupOrder].reverse()) {
        try {
          disposeRecord(pluginId, records);
        } catch (error) {
          errors.push(error);
        }
      }

      setupOrder.length = 0;
      throwCleanupErrors(errors);
    },
    validate() {
      return validateGridPlugins([...records.values()].map((record) => record.plugin));
    },
    get(pluginId) {
      const record = records.get(pluginId);
      if (!record) {
        return undefined;
      }

      return toDescriptor(pluginId, record);
    },
    has(pluginId) {
      return records.has(pluginId);
    },
    list() {
      return [...records.entries()].map(([pluginId, record]) => toDescriptor(pluginId, record));
    }
  };

  registry.registerAll(options.plugins ?? options.gridOptions.plugins ?? []);

  return registry;
}

function setupRecord<TData>(
  record: PluginRecord<TData>,
  api: GridApi<TData>,
  gridOptions: GridOptions<TData>
): void {
  const context = new GridPluginRuntimeContext(api, gridOptions);

  try {
    const cleanup = record.plugin.setup(context);
    if (cleanup) {
      context.addCleanup(cleanup);
    }
    record.context = context;
    record.lifecycle = "setup";
  } catch (error) {
    context.dispose();
    throw error;
  }
}

function disposeRecord<TData>(
  pluginId: string,
  records: ReadonlyMap<string, PluginRecord<TData>>
): void {
  const record = records.get(pluginId);
  if (!record || record.lifecycle === "disposed") {
    return;
  }

  record.context?.dispose();
  record.context = undefined;
  record.lifecycle = "disposed";
}

function toDescriptor<TData>(
  pluginId: string,
  record: PluginRecord<TData>
): GridPluginDescriptor<TData> {
  return {
    id: pluginId,
    plugin: record.plugin,
    lifecycle: record.lifecycle
  };
}

function assertPluginId<TData>(plugin: GridPlugin<TData>): void {
  if (plugin.id.trim().length === 0) {
    throw new Error("Plugin id is required");
  }
}

function assertPluginIsNew<TData>(
  records: ReadonlyMap<string, PluginRecord<TData>>,
  pluginId: string
): void {
  if (records.has(pluginId)) {
    throw new Error(`Plugin is already registered: ${pluginId}`);
  }
}

function formatPluginValidationError(validation: PluginValidationResult): string {
  const reasons = validation.issues.map((issue) => issue.message).join("; ");
  return `Invalid OneGrid plugin graph: ${reasons}`;
}

function throwCleanupErrors(errors: readonly unknown[]): void {
  if (errors.length === 0) {
    return;
  }

  if (errors.length === 1) {
    throw errors[0];
  }

  throw new AggregateError(errors, "OneGrid plugin cleanup failed");
}
