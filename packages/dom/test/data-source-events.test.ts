import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

describe("@onegrid/dom data source events", () => {
  it("renders empty and error overlays", async () => {
    const emptyHost = document.createElement("div");
    const emptyGrid = new OneGrid({
      el: emptyHost,
      columns: [{ field: "id", headerName: "ID" }],
      data: []
    });

    expect(emptyHost.querySelector(".og-grid__overlay-status")?.textContent).toBe("No rows");
    emptyGrid.destroy();

    const errorHost = document.createElement("div");
    let capturedError: unknown;
    const errorGrid = new OneGrid({
      el: errorHost,
      columns: [{ field: "id", headerName: "ID" }],
      rowModel: "server",
      dataSource: {
        async getRows() {
          throw new Error("network down");
        }
      },
      events: {
        error(event) {
          capturedError = event.error;
        }
      }
    });

    await waitForMicrotasks();

    expect(errorHost.querySelector(".og-grid__overlay-status")?.textContent)
      .toBe("Unable to load rows");
    expect(capturedError).toMatchObject({
      message: "network down",
      requestKind: "getRows",
      recoverable: true
    });
    errorGrid.destroy();
  });

  it("retries server data source loads and emits data lifecycle events", async () => {
    const host = document.createElement("div");
    const events: string[] = [];
    let requestCount = 0;
    const grid = new OneGrid({
      el: host,
      columns: [{ field: "id", headerName: "ID" }],
      rowModel: "server",
      dataSourceOptions: { retry: { attempts: 2, delayMs: 0 } },
      dataSource: {
        async getRows() {
          requestCount += 1;
          if (requestCount === 1) {
            throw Object.assign(new Error("temporary"), { statusCode: 503 });
          }
          return { rows: [{ id: "SRV-1" }], rowCount: 1 };
        }
      },
      events: {
        dataRequested(event) {
          events.push(`requested:${event.requestId}`);
        },
        dataLoaded(event) {
          events.push(`loaded:${event.requestId}:${event.rows.length}`);
        }
      }
    });

    await waitForMicrotasks();

    expect(requestCount).toBe(2);
    expect(events[0]).toMatch(/^requested:server:/);
    expect(events[1]).toMatch(/^loaded:server:.*:1$/);
    expect(host.querySelector('[role="gridcell"]')?.textContent).toBe("SRV-1");
    grid.destroy();
  });

  it("emits standardized errors for lazy tree child loads", async () => {
    const host = document.createElement("div");
    let capturedError: unknown;
    const grid = new OneGrid({
      el: host,
      columns: [{ field: "name", headerName: "Name" }],
      data: [{ id: "ROOT", name: "Root", hasChildren: true }],
      rowKey: "id",
      rowModel: "tree",
      tree: { hasChildrenField: "hasChildren", lazy: true },
      dataSource: {
        async getRows() {
          return { rows: [], rowCount: 0 };
        },
        async getChildren() {
          throw Object.assign(new Error("child validation failed"), { statusCode: 400 });
        }
      },
      events: {
        error(event) {
          capturedError = event.error;
        }
      }
    });

    await grid.expandTreeNode("ROOT");

    expect(capturedError).toMatchObject({
      message: "child validation failed",
      requestKind: "getChildren",
      retryable: false
    });
    expect(host.querySelector(".og-grid__overlay-status")?.textContent)
      .toBe("Unable to load rows");
    grid.destroy();
  });
});

function waitForMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
