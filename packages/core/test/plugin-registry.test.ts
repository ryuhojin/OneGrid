import { describe, expect, it, vi } from "vitest";
import { createPluginRegistry, validateGridPlugins } from "../src/index.js";
import type { GridApi, GridOptions, GridPlugin } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly amount: number;
}

const api = {} as GridApi<OrderRow>;
const gridOptions: GridOptions<OrderRow> = {
  columns: []
};

describe("core plugin registry", () => {
  it("sets up plugins after their dependencies", () => {
    const lifecycle: string[] = [];
    const feature = createLifecyclePlugin("feature", lifecycle, ["core"]);
    const core = createLifecyclePlugin("core", lifecycle);
    const registry = createPluginRegistry({
      api,
      gridOptions,
      plugins: [feature, core]
    });

    registry.setupAll();

    expect(lifecycle).toEqual(["setup:core", "setup:feature"]);
    expect(registry.get("feature")?.lifecycle).toBe("setup");
  });

  it("disposes plugin cleanup handlers in reverse setup order", () => {
    const lifecycle: string[] = [];
    const registry = createPluginRegistry({
      api,
      gridOptions,
      plugins: [
        createLifecyclePlugin("core", lifecycle),
        createLifecyclePlugin("feature", lifecycle, ["core"])
      ]
    });

    registry.setupAll();
    registry.disposeAll();

    expect(lifecycle).toEqual([
      "setup:core",
      "setup:feature",
      "cleanup:return:feature",
      "cleanup:context:feature",
      "cleanup:return:core",
      "cleanup:context:core"
    ]);
    expect(registry.get("core")?.lifecycle).toBe("disposed");
  });

  it("validates missing, duplicate, and cyclic dependencies", () => {
    const missing = validateGridPlugins([
      createLifecyclePlugin("feature", [], ["core"])
    ]);
    const duplicate = validateGridPlugins([
      createLifecyclePlugin("core", []),
      createLifecyclePlugin("core", [])
    ]);
    const cyclic = validateGridPlugins([
      createLifecyclePlugin("a", [], ["b"]),
      createLifecyclePlugin("b", [], ["a"])
    ]);

    expect(missing.issues[0]?.kind).toBe("missing-dependency");
    expect(duplicate.issues[0]?.kind).toBe("duplicate");
    expect(cyclic.issues.some((issue) => issue.kind === "cyclic-dependency")).toBe(true);
  });

  it("supports unregistering dispose handlers before cleanup", () => {
    const disposed = vi.fn();
    const registry = createPluginRegistry({
      api,
      gridOptions,
      plugins: [
        {
          id: "optional-cleanup",
          setup(context) {
            const unregister = context.onDispose(disposed);
            unregister();
            return undefined;
          }
        }
      ]
    });

    registry.setupAll();
    registry.disposeAll();

    expect(disposed).not.toHaveBeenCalled();
  });

  it("rejects duplicate registration", () => {
    const registry = createPluginRegistry({ api, gridOptions });
    const plugin = createLifecyclePlugin("duplicate", []);

    registry.register(plugin);

    expect(() => registry.register(plugin)).toThrow("Plugin is already registered");
  });

  it("registers ordered plugin extension points", () => {
    const observedLabels: string[] = [];
    const registry = createPluginRegistry({
      api,
      gridOptions,
      plugins: [
        {
          id: "menu-core",
          setup(context) {
            context.registerExtension({
              id: "audit",
              point: "menu.context",
              order: 20,
              payload: { label: "Audit" }
            });
            return undefined;
          }
        },
        {
          id: "menu-feature",
          dependencies: ["menu-core"],
          setup(context) {
            context.registerExtension({
              id: "approve",
              point: "menu.context",
              order: 10,
              payload: { label: "Approve" }
            });
            observedLabels.push(
              ...context.getExtensions<{ label: string }>("menu.context")
                .map((extension) => extension.payload?.label ?? "")
            );
            return undefined;
          }
        }
      ]
    });

    registry.setupAll();

    expect(observedLabels).toEqual(["Approve", "Audit"]);
    expect(registry.getExtensions<{ label: string }>("menu.context")).toMatchObject([
      { id: "approve", pluginId: "menu-feature", payload: { label: "Approve" } },
      { id: "audit", pluginId: "menu-core", payload: { label: "Audit" } }
    ]);
  });

  it("cleans up plugin extensions on dispose and unregister", () => {
    const registry = createPluginRegistry({
      api,
      gridOptions,
      plugins: [
        {
          id: "temporary-menu",
          setup(context) {
            context.registerExtension({
              id: "temporary",
              point: "menu.context"
            });
            return undefined;
          }
        }
      ]
    });

    registry.setupAll();
    expect(registry.getExtensions("menu.context")).toHaveLength(1);

    registry.disposeAll();
    expect(registry.getExtensions("menu.context")).toEqual([]);

    const unregisterRegistry = createPluginRegistry({ api, gridOptions });
    const unregister = unregisterRegistry.register({
      id: "registered-menu",
      setup(context) {
        context.registerExtension({
          id: "registered",
          point: "menu.context"
        });
        return undefined;
      }
    });
    unregisterRegistry.setupAll();
    expect(unregisterRegistry.getExtensions("menu.context")).toHaveLength(1);

    unregister();
    expect(unregisterRegistry.getExtensions("menu.context")).toEqual([]);
  });

  it("rejects duplicate extension ids within one extension point", () => {
    const registry = createPluginRegistry({
      api,
      gridOptions,
      plugins: [
        {
          id: "first-menu",
          setup(context) {
            context.registerExtension({ id: "same", point: "menu.context" });
            return undefined;
          }
        },
        {
          id: "second-menu",
          setup(context) {
            context.registerExtension({ id: "same", point: "menu.context" });
            return undefined;
          }
        }
      ]
    });

    expect(() => registry.setupAll()).toThrow(
      "Plugin extension is already registered: menu.context:same"
    );
  });
});

function createLifecyclePlugin(
  id: string,
  lifecycle: string[],
  dependencies: readonly string[] = []
): GridPlugin<OrderRow> {
  return {
    id,
    dependencies,
    setup(context) {
      lifecycle.push(`setup:${id}`);
      context.addCleanup(() => lifecycle.push(`cleanup:context:${id}`));
      return () => lifecycle.push(`cleanup:return:${id}`);
    }
  };
}
