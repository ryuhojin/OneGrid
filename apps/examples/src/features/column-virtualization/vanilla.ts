import { OneGrid } from "@onegrid/dom";
import {
  COLUMN_VIRTUALIZATION_CENTER_COLUMNS,
  columnVirtualizationOptions
} from "./data.js";
import type { ColumnVirtualizationOrder } from "./data.js";

export function mountColumnVirtualizationExample(
  el: HTMLElement
): OneGrid<ColumnVirtualizationOrder> {
  const actions = document.createElement("div");
  actions.className = "example-actions";

  const gridHost = document.createElement("div");
  const scrollMiddleButton = createActionButton("Scroll to M32");
  const scrollFarButton = createActionButton("Scroll to M64");
  actions.append(scrollMiddleButton, scrollFarButton);

  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Column virtualization summary");
  appendValue(inspector, "Center columns", String(COLUMN_VIRTUALIZATION_CENTER_COLUMNS));
  const renderedColumns = appendValue(inspector, "Rendered center columns", "0");
  const firstColumn = appendValue(inspector, "First rendered column", "0");

  el.replaceChildren(actions, gridHost, inspector);

  const grid = new OneGrid<ColumnVirtualizationOrder>({
    ...columnVirtualizationOptions,
    el: gridHost
  });

  const refreshInspector = (): void => {
    const centerBody = gridHost.querySelector<HTMLElement>(
      '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__body'
    );
    const cells = gridHost.querySelectorAll(
      '[data-layout-section="body"] [data-layout-pane="center"] [role="row"]:not([data-virtual-spacer]) [role="gridcell"]'
    );
    const firstRendered = centerBody?.dataset.virtualFirstColumn ?? "1";
    const renderedCount = cells.length / Math.max(1, columnVirtualizationOptions.data?.length ?? 1);
    renderedColumns.textContent = String(Math.trunc(renderedCount));
    firstColumn.textContent = firstRendered;
  };

  scrollMiddleButton.addEventListener("click", () => {
    void grid.scrollToColumn("metric32").then(() => requestAnimationFrame(refreshInspector));
  });
  scrollFarButton.addEventListener("click", () => {
    void grid.scrollToColumn("metric64").then(() => requestAnimationFrame(refreshInspector));
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
