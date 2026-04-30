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
