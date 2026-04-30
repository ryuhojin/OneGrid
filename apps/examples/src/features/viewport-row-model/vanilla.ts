import { OneGrid } from "@onegrid/dom";
import type { GetRowsRequest } from "@onegrid/core";
import {
  createViewportOrderDataSource,
  createViewportOrderRow,
  VIEWPORT_JUMP_ROW,
  VIEWPORT_ROW_HEIGHT,
  VIEWPORT_SIZE,
  VIEWPORT_TOTAL_ROWS,
  viewportRowModelColumns
} from "./data.js";
import type { ViewportOrderRow } from "./data.js";

export function mountViewportRowModelExample(el: HTMLElement): OneGrid<ViewportOrderRow> {
  let requestCount = 0;
  let visibleFirstRow = 0;
  const gridHost = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Viewport row model summary");

  const requestValue = appendValue(inspector, "Viewport requests", "0");
  const visibleValue = appendValue(inspector, "Visible range", "pending");
  const requestedValue = appendValue(inspector, "Requested range", "pending");
  appendValue(inspector, "Total rows", String(VIEWPORT_TOTAL_ROWS));

  const grid = new OneGrid<ViewportOrderRow>({
    el: gridHost,
    columns: viewportRowModelColumns,
    rowKey: "id",
    rowModel: "viewport",
    dataSource: createViewportOrderDataSource(updateInspector),
    viewport: {
      rowHeight: VIEWPORT_ROW_HEIGHT,
      viewportSize: VIEWPORT_SIZE,
      overscan: 2,
      prefetchRows: 24,
      highVelocityRowsPerSecond: 120,
      maxCachedRanges: 3,
      initialRowCount: VIEWPORT_TOTAL_ROWS
    },
    sorting: { serverOnly: true, model: [{ field: "amount", direction: "asc" }] }
  });

  actions.append(
    createButton("Jump viewport", () => void grid.scrollViewportTo(VIEWPORT_JUMP_ROW)),
    createButton("Apply live update", () => {
      grid.applyViewportLiveUpdate({
        rowIndex: visibleFirstRow,
        row: createViewportOrderRow(visibleFirstRow, `Live Account ${visibleFirstRow + 1}`)
      });
    })
  );
  el.replaceChildren(actions, gridHost, inspector);
  return grid;

  function updateInspector(request: GetRowsRequest): void {
    requestCount += 1;
    visibleFirstRow = request.viewport?.firstRow ?? request.startRow;
    requestValue.textContent = String(requestCount);
    visibleValue.textContent = request.viewport
      ? `${request.viewport.firstRow}-${request.viewport.lastRow}`
      : "none";
    requestedValue.textContent = `${request.startRow}-${request.endRow - 1}`;
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
