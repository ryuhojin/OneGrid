import type { OneGrid as DomOneGrid } from "@onegrid/dom";
import { h } from "vue";
import { describe, expect, it, vi } from "vitest";
import {
  gridApiMethodParityNames,
  gridBeforeEventParityNames,
  gridEventParityNames,
  gridOptionParityKeys
} from "@onegrid/core";
import { createGridExpose } from "../src/gridExpose.js";
import { toGridOptions } from "../src/gridOptions.js";
import type { OneGridProps } from "../src/gridOptions.js";
import { OneGrid } from "../src/index.js";
import { oneGridProps } from "../src/oneGridProps.js";
import {
  createVueGridBeforeEventHandlers,
  createVueGridEventHandlers,
  vueGridBeforeEmits,
  vueGridEmits
} from "../src/vueEvents.js";
import { VueRendererBridge } from "../src/vueRendererBridge.js";

describe("@onegrid/vue shell", () => {
  it("exports a named Vue component", () => {
    expect(OneGrid.name).toBe("OneGrid");
  });

  it("keeps the enterprise option props on the Vue bridge", () => {
    expect(oneGridProps.columns.required).toBe(true);
    expect(oneGridProps.defaultColumnDef.default).toBeUndefined();
    expect(oneGridProps.columnTypes.default).toBeUndefined();
    expect(oneGridProps.security.default).toBeUndefined();
    expect(oneGridProps.accessibility.default).toBeUndefined();
    expect(oneGridProps.locale.default).toBeUndefined();
    expect(oneGridProps.events.default).toBeUndefined();
    expect(oneGridProps.beforeEvents.default).toBeUndefined();
  });

  it("returns stable fallbacks before the DOM grid is mounted", async () => {
    const exposed = createGridExpose(() => undefined);

    expect(exposed.getPendingEdits()).toEqual([]);
    expect(exposed.getSelectedRows()).toEqual([]);
    expect(exposed.getTreeSelection()).toEqual([]);
    expect(exposed.getSelectionState().rowKeys).toEqual([]);
    expect(exposed.getPage()).toBe(1);
    expect(exposed.getPageSize()).toBe(50);
    await expect(exposed.copyToClipboard()).resolves.toBeUndefined();
    await expect(exposed.exportData()).resolves.toEqual({
      content: "",
      mediaType: "text/plain"
    });
  });

  it("delegates exposed methods to the DOM grid", () => {
    const grid = {
      destroy: vi.fn(),
      getPage: vi.fn(() => 3),
      selectRows: vi.fn(),
      setLocale: vi.fn()
    } as unknown as DomOneGrid<unknown>;
    const exposed = createGridExpose(() => grid);

    exposed.destroy();
    exposed.selectRows(["row-1"]);
    exposed.setLocale("ko-KR");

    expect(grid.destroy).toHaveBeenCalledTimes(1);
    expect(grid.getPage()).toBe(3);
    expect(grid.selectRows).toHaveBeenCalledWith(["row-1"]);
    expect(grid.setLocale).toHaveBeenCalledWith("ko-KR");
  });

  it("maps every shared GridOptions key through the Vue props bridge", () => {
    const props = createParityProps();
    const options = toGridOptions(props);
    const optionRecord = options as unknown as Readonly<Record<string, unknown>>;
    const propRecord = props as unknown as Readonly<Record<string, unknown>>;

    expect([...Object.keys(oneGridProps)].sort()).toEqual([...gridOptionParityKeys].sort());
    expect(gridOptionParityKeys.filter((key) => !(key in options))).toEqual([]);
    for (const key of gridOptionParityKeys) {
      if (key === "columns" || key === "events" || key === "beforeEvents") {
        continue;
      }
      expect(optionRecord[key]).toBe(propRecord[key]);
    }
  });

  it("keeps Vue emits and exposed methods aligned with the shared API", () => {
    expect(vueGridEmits).toEqual(gridEventParityNames);
    expect(vueGridBeforeEmits).toEqual(gridBeforeEventParityNames);

    const exposed = createGridExpose(() => undefined);
    expect(gridApiMethodParityNames.filter((name) => typeof exposed[name] !== "function")).toEqual([]);
  });

  it("chains core events into Vue emits", () => {
    const coreReady = vi.fn();
    const emit = vi.fn();
    const handlers = createVueGridEventHandlers({ ready: coreReady }, emit);

    handlers?.ready?.({ type: "ready" });

    expect(coreReady).toHaveBeenCalledWith({ type: "ready" });
    expect(emit).toHaveBeenCalledWith("ready", { type: "ready" });
  });

  it("chains cancellable before events into Vue emits until prevented", () => {
    const coreBefore = vi.fn();
    const emit = vi.fn();
    const handlers = createVueGridBeforeEventHandlers({ beforeSortChange: coreBefore }, emit);
    const event = {
      event: {
        type: "beforeSortChange" as const,
        previousSortModel: [],
        sortModel: [{ field: "id", direction: "asc" as const }],
        reason: "test"
      },
      defaultPrevented: false,
      reason: undefined,
      preventDefault: vi.fn()
    };

    handlers?.beforeSortChange?.(event);

    expect(coreBefore).toHaveBeenCalledWith(event);
    expect(emit).toHaveBeenCalledWith("beforeSortChange", event);
  });

  it("maps Vue cell and header slots into element renderer columns", () => {
    const host = document.createElement("div");
    const bridge = new VueRendererBridge(host, {
      "cell-id": () => [h("span", "Cell")],
      "header-id": () => [h("span", "Header")]
    });
    const [column] = bridge.enhanceColumns([{ field: "id" }]);

    expect(column).toBeDefined();
    if (column === undefined) {
      return;
    }
    expect("children" in column).toBe(false);
    if (!("children" in column)) {
      expect(column.renderer?.kind).toBe("element");
      expect(column.headerRenderer?.kind).toBe("element");
    }
    bridge.destroy();
  });
});

function createParityProps(): OneGridProps {
  const rows = Object.freeze([{ id: "V1", amount: 20 }]);
  return {
    columns: Object.freeze([{ field: "id", headerName: "ID" }]),
    defaultColumnDef: Object.freeze({ resizable: true }),
    columnTypes: Object.freeze({
      money: Object.freeze({ type: "number" as const, width: 140 })
    }),
    initialState: Object.freeze({ locale: "en-US", scroll: Object.freeze({ top: 0, left: 0 }) }),
    columnOrder: Object.freeze(["id"]),
    columnState: Object.freeze({}),
    columnUi: Object.freeze({ resize: true }),
    headerMerge: Object.freeze({ enabled: true }),
    data: rows,
    dataSource: {
      getRows: async () => ({ rows, rowCount: rows.length })
    },
    rowKey: "id",
    rowModel: "client",
    rowHeight: 32,
    width: "100%",
    height: 320,
    bodyHeight: 260,
    headerHeight: 40,
    infinite: Object.freeze({ blockSize: 100 }),
    server: Object.freeze({ pageSize: 50 }),
    viewport: Object.freeze({ viewportSize: 20 }),
    tree: Object.freeze({ enabled: true }),
    layout: Object.freeze({ width: "100%", height: 320 }),
    virtualization: Object.freeze({ overscan: { rows: 4 }, columns: { overscan: 2 } }),
    frozenRows: Object.freeze({ top: 1 }),
    frozenColumns: Object.freeze({ left: ["id"] }),
    editing: Object.freeze({ enabled: true }),
    clipboard: Object.freeze({ enabled: true }),
    export: Object.freeze({ format: "csv" }),
    import: Object.freeze({ format: "csv" }),
    contextMenu: Object.freeze({ enabled: true }),
    filtering: Object.freeze({ enabled: true }),
    sorting: Object.freeze({ enabled: true }),
    selection: Object.freeze({ mode: "row" }),
    grouping: Object.freeze({ enabled: true }),
    aggregation: Object.freeze({ enabled: true }),
    pivot: Object.freeze({ enabled: true }),
    summary: Object.freeze({ enabled: true }),
    merge: Object.freeze({ enabled: true }),
    pagination: Object.freeze({ mode: "client", pageSize: 10 }),
    accessibility: Object.freeze({ label: "Parity grid" }),
    security: Object.freeze({ csp: { nonce: "nonce" } }),
    locale: "en-US",
    theme: Object.freeze({ name: "clean" }),
    events: Object.freeze({ ready: () => undefined }),
    beforeEvents: Object.freeze({ beforeSortChange: () => undefined }),
    plugins: Object.freeze([])
  };
}
