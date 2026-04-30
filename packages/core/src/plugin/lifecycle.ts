import type { GridPlugin } from "../types/plugin.js";

export type GridPluginLifecycle = "registered" | "setup" | "disposed";

export interface GridPluginDescriptor<TData = unknown> {
  readonly id: string;
  readonly plugin: GridPlugin<TData>;
  readonly lifecycle: GridPluginLifecycle;
}

export interface PluginValidationIssue {
  readonly kind: "duplicate" | "missing-dependency" | "cyclic-dependency";
  readonly pluginId: string;
  readonly dependencyId?: string;
  readonly message: string;
}

export interface PluginValidationResult {
  readonly valid: boolean;
  readonly issues: readonly PluginValidationIssue[];
  readonly setupOrder: readonly string[];
}

export function validateGridPlugins<TData>(
  plugins: readonly GridPlugin<TData>[]
): PluginValidationResult {
  const issues: PluginValidationIssue[] = [];
  const byId = new Map<string, GridPlugin<TData>>();

  for (const plugin of plugins) {
    if (byId.has(plugin.id)) {
      issues.push({
        kind: "duplicate",
        pluginId: plugin.id,
        message: `Plugin is already registered: ${plugin.id}`
      });
      continue;
    }

    byId.set(plugin.id, plugin);
  }

  for (const plugin of byId.values()) {
    for (const dependencyId of plugin.dependencies ?? []) {
      if (!byId.has(dependencyId)) {
        issues.push({
          kind: "missing-dependency",
          pluginId: plugin.id,
          dependencyId,
          message: `Plugin ${plugin.id} requires missing dependency: ${dependencyId}`
        });
      }
    }
  }

  const setupOrder = resolveSetupOrder(byId, issues);

  return {
    valid: issues.length === 0,
    issues,
    setupOrder
  };
}

function resolveSetupOrder<TData>(
  plugins: ReadonlyMap<string, GridPlugin<TData>>,
  issues: PluginValidationIssue[]
): readonly string[] {
  const setupOrder: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclicEdges = new Set<string>();

  for (const pluginId of plugins.keys()) {
    visitPlugin(pluginId, plugins, visiting, visited, cyclicEdges, setupOrder, issues);
  }

  return setupOrder;
}

function visitPlugin<TData>(
  pluginId: string,
  plugins: ReadonlyMap<string, GridPlugin<TData>>,
  visiting: Set<string>,
  visited: Set<string>,
  cyclicEdges: Set<string>,
  setupOrder: string[],
  issues: PluginValidationIssue[]
): void {
  if (visited.has(pluginId)) {
    return;
  }

  if (visiting.has(pluginId)) {
    if (!cyclicEdges.has(pluginId)) {
      cyclicEdges.add(pluginId);
      issues.push({
        kind: "cyclic-dependency",
        pluginId,
        message: `Plugin dependency cycle detected at: ${pluginId}`
      });
    }
    return;
  }

  const plugin = plugins.get(pluginId);
  if (!plugin) {
    return;
  }

  visiting.add(pluginId);
  for (const dependencyId of plugin.dependencies ?? []) {
    visitPlugin(dependencyId, plugins, visiting, visited, cyclicEdges, setupOrder, issues);
  }
  visiting.delete(pluginId);
  visited.add(pluginId);
  setupOrder.push(pluginId);
}
