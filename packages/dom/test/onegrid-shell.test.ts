import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";
import { invalidate } from "../src/grid/renderInvalidation.js";
import { DomRenderScheduler } from "../src/grid/renderScheduler.js";

describe("@onegrid/dom renderer shell", () => {
  it("mounts a text-safe ARIA grid and destroys it", () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID" },
        { field: "name", headerName: "Name" }
      ],
      data: [{ id: "A-001", name: "<script>alert(1)</script>" }]
    });

    expect(el.querySelector('[role="grid"]')).not.toBeNull();
    expect(el.querySelector('[role="grid"]')?.getAttribute("aria-label")).toBe("OneGrid data grid");
    expect(el.querySelector(".og-grid__live-region")?.textContent).toBe(
      "Grid ready. 1 row and 2 columns."
    );
    expect(el.querySelector('[role="columnheader"]')?.textContent).toBe("ID");
    expect(el.querySelector('[role="gridcell"]')?.textContent).toBe("A-001");
    expect(el.innerHTML).toContain("&lt;script&gt;");

    grid.destroy();

    expect(el.childElementCount).toBe(0);
  });

  it("mounts column UI controls when enabled", () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID" },
        { field: "name", headerName: "Name" }
      ],
      columnUi: {
        resize: true,
        autoSize: true,
        reorder: true,
        menu: true,
        toolPanel: true
      },
      data: [{ id: "A-001", name: "Central Office" }]
    });

    expect(el.querySelector('[aria-label="Column menu Name"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Resize Name"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Columns tool panel"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="Column menu Name"]')?.getAttribute("aria-controls"))
      .toMatch(/^og-column-menu-/);
    expect(el.querySelector("button[aria-haspopup='dialog']")?.getAttribute("aria-controls"))
      .toMatch(/^og-columns-tool-panel-/);

    grid.destroy();
  });

  it("renders base layout sections, pinned panes, summary, footer, and overlay layer", () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID", pinned: "left", width: 80 },
        { field: "amount", headerName: "Amount", summary: "sum", width: 120 },
        { field: "status", headerName: "Status", pinned: "right", width: 120 }
      ],
      data: [
        { id: "A", amount: 10, status: "Approved" },
        { id: "B", amount: 25, status: "Draft" }
      ],
      rowKey: "id",
      layout: { height: 240 },
      summary: { enabled: true }
    });

    expect(el.querySelector('[data-layout-section="header"]')).not.toBeNull();
    expect(el.querySelector('[data-layout-section="body"]')).not.toBeNull();
    expect(el.querySelector('[data-layout-section="summary"]')).not.toBeNull();
    expect(el.querySelector('[data-layout-section="footer"]')).not.toBeNull();
    expect(el.querySelector('[data-layout-section="overlay"]')).not.toBeNull();
    expect(el.querySelector('[data-layout-pane="left"]')?.textContent).toContain("ID");
    expect(el.querySelector('[data-layout-pane="right"]')?.textContent).toContain("Status");
    expect(
      el.querySelector('.og-grid__summary-cell[data-column-id="amount"]')
        ?.getAttribute("data-summary-value")
    ).toBe("35");
    expect(el.querySelector(".og-grid__footer-status")?.textContent).toBe("Rows: 2");
    expect(el.querySelector('[data-layout-section="footer"] [data-layout-pane]')).toBeNull();

    grid.destroy();
  });

  it("virtualizes client rows and scrolls to a logical row", async () => {
    const el = document.createElement("div");
    const rows = Array.from({ length: 1_000 }, (_, index) => ({
      id: `R-${index + 1}`,
      name: `Account ${index + 1}`
    }));
    const grid = new OneGrid({
      el,
      columns: [
        { field: "id", headerName: "ID", pinned: "left", width: 80 },
        { field: "name", headerName: "Name", width: 160 }
      ],
      data: rows,
      rowKey: "id",
      rowHeight: 30,
      layout: { height: 180 },
      virtualization: { rowHeight: 30, overscan: 1, maxDomRows: 12 }
    });

    const renderedRows = () =>
      el.querySelectorAll('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]');

    expect(el.querySelector('[role="grid"]')?.getAttribute("aria-rowcount")).toBe("1000");
    expect(el.querySelector('[role="grid"]')?.getAttribute("data-virtualized-rows")).toBe("true");
    expect(el.querySelector('[data-layout-viewport="body"]')?.getAttribute("data-virtualized-rows")).toBe("true");
    expect(renderedRows().length).toBeLessThanOrEqual(12);

    await grid.scrollToRow(100);

    expect(renderedRows().length).toBeLessThanOrEqual(12);
    expect(el.textContent).toContain("Account 101");
    expect(renderedRows().item(0).getAttribute("aria-rowindex")).toBe("100");

    grid.destroy();
  });

  it("batches renderer invalidations before committing", async () => {
    const commits: string[] = [];
    const scheduler = new DomRenderScheduler((invalidation) => {
      commits.push(invalidation.scopes.join(","));
    });

    await Promise.all([
      scheduler.request(invalidate(["rows"], "rows")),
      scheduler.request(invalidate(["overlay"], "overlay"))
    ]);

    expect(commits).toEqual(["rows,overlay"]);
    scheduler.destroy();
  });

  it("renders custom cell and group header hosts with secure defaults", () => {
    const el = document.createElement("div");
    const grid = new OneGrid({
      el,
      columns: [
        {
          headerName: "Risk",
          headerRenderer: {
            kind: "element",
            render: (_context, builder) =>
              builder?.element("span", { class: "risk-header" }, ["Risk custom"]) ?? "Risk custom"
          },
          children: [
            {
              field: "name",
              headerName: "Name",
              renderer: {
                kind: "text",
                render: ({ value }) => `Safe ${String(value)}`
              }
            },
            {
              field: "link",
              headerName: "Link",
              renderer: {
                kind: "element",
                render: (_context, builder) =>
                  builder.element("a", {
                    class: "safe-link",
                    href: "javascript:alert(1)",
                    onclick: "alert(1)"
                  }, ["Open"])
              }
            },
            {
              field: "status",
              headerName: "Status",
              renderer: {
                kind: "html",
                sanitize: true,
                render: () => "<strong onclick=\"alert(1)\">Approved</strong>"
              }
            }
          ]
        }
      ],
      data: [{ name: "<b>Alice</b>", link: "x", status: "Approved" }],
      security: {
        html: {
          allowHtmlRenderer: true,
          sanitizer: {
            sanitize: (html) => html.replace(" onclick=\"alert(1)\"", "")
          }
        }
      }
    });

    expect(el.querySelector(".risk-header")?.textContent).toBe("Risk custom");
    expect(el.querySelector('[data-column-id="name"]')?.textContent).toBe("Safe <b>Alice</b>");
    expect(el.querySelector(".safe-link")?.getAttribute("href")).toBeNull();
    expect(el.querySelector(".safe-link")?.getAttribute("onclick")).toBeNull();
    expect(el.querySelector('[data-column-id="status"] strong')?.textContent).toBe("Approved");
    expect(el.querySelector('[data-column-id="status"] strong')?.getAttribute("onclick")).toBeNull();

    grid.destroy();
  });

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
    const errorGrid = new OneGrid({
      el: errorHost,
      columns: [{ field: "id", headerName: "ID" }],
      rowModel: "server",
      dataSource: {
        async getRows() {
          throw new Error("network down");
        }
      }
    });

    await waitForMicrotasks();

    expect(errorHost.querySelector(".og-grid__overlay-status")?.textContent)
      .toBe("Unable to load rows");
    errorGrid.destroy();
  });
});

function waitForMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
