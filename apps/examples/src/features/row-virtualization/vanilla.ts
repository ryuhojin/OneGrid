import { OneGrid } from "@onegrid/dom";
import {
  ROW_VIRTUALIZATION_ROW_COUNT,
  rowVirtualizationOptions
} from "./data.js";
import type { RowVirtualizationOrder } from "./data.js";

export function mountRowVirtualizationExample(el: HTMLElement): OneGrid<RowVirtualizationOrder> {
  const gridHost = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "example-actions";

  const scrollNearButton = createActionButton("Scroll to row 2500");
  const scrollFarButton = createActionButton("Scroll to row 40000");
  actions.append(scrollNearButton, scrollFarButton);

  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Row virtualization summary");
  appendValue(inspector, "Logical rows", String(ROW_VIRTUALIZATION_ROW_COUNT));
  const renderedRows = appendValue(inspector, "Rendered rows", "0");
  const firstRow = appendValue(inspector, "First rendered row", "0");

  el.replaceChildren(actions, gridHost, inspector);

  const grid = new OneGrid<RowVirtualizationOrder>({
    ...rowVirtualizationOptions,
    el: gridHost
  });

  const refreshInspector = (): void => {
    const rows = gridHost.querySelectorAll('[data-layout-section="body"] [data-layout-pane="center"] [data-row-key]');
    const first = rows.item(0);
    renderedRows.textContent = String(rows.length);
    firstRow.textContent = first?.getAttribute("aria-rowindex") ?? "0";
  };

  scrollNearButton.addEventListener("click", () => {
    void grid.scrollToRow(2_499).then(() => requestAnimationFrame(refreshInspector));
  });
  scrollFarButton.addEventListener("click", () => {
    void grid.scrollToRow(39_999).then(() => requestAnimationFrame(refreshInspector));
  });
  requestAnimationFrame(refreshInspector);

  return grid;
}

function createActionButton(label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.className = "example-action-button";
  button.type = "button";
  button.textContent = label;
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
