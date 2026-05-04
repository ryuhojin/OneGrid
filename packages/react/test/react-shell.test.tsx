import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  gridApiMethodParityNames,
  gridEventParityNames,
  gridOptionParityKeys
} from "@onegrid/core";
import { OneGrid } from "../src/index.js";
import { reactGridEventPropEntries } from "../src/gridEvents.js";
import type { OneGridEventProps } from "../src/gridEvents.js";
import { createGridHandle } from "../src/gridHandle.js";
import { createReactGridOptions } from "../src/gridOptions.js";
import type { OneGridOptionProps } from "../src/gridOptions.js";
import type { ReactRendererSlots } from "../src/index.js";
import { ReactRendererBridge } from "../src/reactRendererBridge.js";

interface ParityRow {
  readonly id: string;
  readonly amount: number;
}

describe("@onegrid/react shell", () => {
  it("renders a host element without reimplementing grid logic", () => {
    const html = renderToStaticMarkup(<OneGrid columns={[{ field: "id" }]} data={[]} />);

    expect(html).toContain("<div");
  });

  it("types react renderer slots without exposing HTML sinks", () => {
    const slots: ReactRendererSlots<{ id: string }> = {
      cells: {
        id: ({ value }) => <span>{String(value)}</span>
      },
      headers: {
        id: () => <strong>ID</strong>
      }
    };

    expect(Object.keys(slots.cells ?? {})).toEqual(["id"]);
  });

  it("maps every shared GridOptions key through the React props bridge", () => {
    const bridge = new ReactRendererBridge<ParityRow>(document.createElement("div"));
    const props = createParityOptions();
    const options = createReactGridOptions(props, bridge);
    const optionRecord = options as unknown as Readonly<Record<string, unknown>>;
    const propRecord = props as unknown as Readonly<Record<string, unknown>>;

    expect(gridOptionParityKeys.filter((key) => !(key in options))).toEqual([]);
    for (const key of gridOptionParityKeys) {
      if (key === "columns" || key === "events") {
        continue;
      }
      expect(optionRecord[key]).toBe(propRecord[key]);
    }
    bridge.destroy();
  });

  it("keeps React event props and ref methods aligned with the shared API", () => {
    expect(reactGridEventPropEntries.map(([eventName]) => eventName)).toEqual(gridEventParityNames);
    expect(new Set(reactGridEventPropEntries.map(([, propName]) => propName)).size)
      .toBe(gridEventParityNames.length);

    const handle = createGridHandle<ParityRow>(() => undefined);
    expect(gridApiMethodParityNames.filter((name) => typeof handle[name] !== "function")).toEqual([]);
  });
});

function createParityOptions(): OneGridOptionProps<ParityRow> & OneGridEventProps<ParityRow> {
  const columns = Object.freeze([{ field: "id", headerName: "ID" }]);
  const rows = Object.freeze([{ id: "R1", amount: 10 }]);
  return {
    columns,
    columnOrder: Object.freeze(["id"]),
    columnState: Object.freeze({}),
    columnUi: Object.freeze({ resize: true }),
    headerMerge: Object.freeze({ enabled: true }),
    data: rows,
    dataSource: {
      getRows: async () => ({ rows, rowCount: rows.length })
    },
    rowModel: "client",
    infinite: Object.freeze({ blockSize: 100 }),
    server: Object.freeze({ pageSize: 50 }),
    viewport: Object.freeze({ viewportSize: 20 }),
    rowKey: "id",
    width: "100%",
    height: 320,
    bodyHeight: 260,
    layout: Object.freeze({ width: "100%", height: 320 }),
    virtualization: Object.freeze({ overscan: { rows: 4 }, columns: { overscan: 2 } }),
    rowHeight: 32,
    headerHeight: 40,
    frozenRows: Object.freeze({ top: 1 }),
    frozenColumns: Object.freeze({ left: ["id"] }),
    selection: Object.freeze({ mode: "row" as const }),
    editing: Object.freeze({ enabled: true }),
    filtering: Object.freeze({ enabled: true }),
    sorting: Object.freeze({ enabled: true }),
    grouping: Object.freeze({ enabled: true }),
    aggregation: Object.freeze({ enabled: true }),
    pivot: Object.freeze({ enabled: true }),
    summary: Object.freeze({ enabled: true }),
    tree: Object.freeze({ enabled: true }),
    merge: Object.freeze({ enabled: true }),
    pagination: Object.freeze({ mode: "client" as const, pageSize: 10 }),
    clipboard: Object.freeze({ enabled: true }),
    export: Object.freeze({ format: "csv" as const }),
    import: Object.freeze({ format: "csv" as const }),
    contextMenu: Object.freeze({ enabled: true }),
    accessibility: Object.freeze({ label: "Parity grid" }),
    security: Object.freeze({ csp: { nonce: "nonce" } }),
    theme: Object.freeze({ name: "clean" }),
    locale: "en-US",
    plugins: Object.freeze([]),
    events: Object.freeze({ ready: () => undefined })
  };
}
