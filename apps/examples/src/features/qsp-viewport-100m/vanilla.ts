import { OneGrid } from "@onegrid/dom";
import type { GetRowsRequest } from "@onegrid/core";
import {
  createQspViewportDataSource,
  QSP_VIEWPORT_JUMP_ROW,
  QSP_VIEWPORT_ROW_HEIGHT,
  QSP_VIEWPORT_SIZE,
  QSP_VIEWPORT_TOTAL_ROWS,
  qspViewportColumns
} from "./data.js";
import type { QspViewportRow } from "./data.js";

export function mountQspViewport100mExample(el: HTMLElement): OneGrid<QspViewportRow> {
  let requests = 0;
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const host = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "100M viewport rows summary");

  const requestValue = appendValue(inspector, "Viewport requests", "0");
  const viewportValue = appendValue(inspector, "Visible range", "pending");
  const rangeValue = appendValue(inspector, "Requested range", "pending");
  appendValue(inspector, "Logical rows", QSP_VIEWPORT_TOTAL_ROWS.toLocaleString("en-US"));

  const grid = new OneGrid<QspViewportRow>({
    el: host,
    columns: qspViewportColumns,
    rowKey: "id",
    rowModel: "viewport",
    dataSource: createQspViewportDataSource(updateInspector),
    viewport: {
      rowHeight: QSP_VIEWPORT_ROW_HEIGHT,
      viewportSize: QSP_VIEWPORT_SIZE,
      overscan: 24,
      prefetchRows: 80,
      highVelocityRowsPerSecond: 200,
      maxCachedRanges: 6,
      initialRowCount: QSP_VIEWPORT_TOTAL_ROWS
    },
    virtualization: {
      segmented: true,
      rowHeight: QSP_VIEWPORT_ROW_HEIGHT,
      maxDomRows: 80
    },
    layout: { height: 430, bodyHeight: 430 },
    accessibility: { label: "100M viewport rows grid" }
  });

  actions.append(
    createButton("Jump near 100M", () => {
      void grid.scrollViewportTo(QSP_VIEWPORT_JUMP_ROW);
    }),
    createButton("Jump top", () => {
      void grid.scrollViewportTo(0);
    })
  );
  el.replaceChildren(actions, host, inspector);
  return grid;

  function updateInspector(request: GetRowsRequest): void {
    requests += 1;
    requestValue.textContent = String(requests);
    viewportValue.textContent = request.viewport
      ? `${request.viewport.firstRow}-${request.viewport.lastRow}`
      : "none";
    rangeValue.textContent = `${request.startRow}-${request.endRow - 1}`;
  }
}

function createButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return description;
}
