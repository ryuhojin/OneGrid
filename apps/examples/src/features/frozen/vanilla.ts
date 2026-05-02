import { OneGrid } from "@onegrid/dom";
import {
  FROZEN_BOTTOM_ROWS,
  FROZEN_ROW_COUNT,
  FROZEN_TOP_ROWS,
  frozenOptions
} from "./data.js";
import type { FrozenOrder } from "./data.js";

export function mountFrozenExample(el: HTMLElement): OneGrid<FrozenOrder> {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const scrollMiddleButton = createActionButton("Scroll to row 120");
  const scrollEndButton = createActionButton("Scroll to row 220");
  actions.append(scrollMiddleButton, scrollEndButton);

  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Frozen rows and columns summary");
  appendValue(inspector, "Frozen top rows", String(FROZEN_TOP_ROWS));
  appendValue(inspector, "Frozen bottom rows", String(FROZEN_BOTTOM_ROWS));
  appendValue(inspector, "Logical rows", String(FROZEN_ROW_COUNT));
  const renderedRows = appendValue(inspector, "Rendered body rows", "0");

  el.replaceChildren(actions, gridHost, inspector);

  const grid = new OneGrid<FrozenOrder>({
    ...frozenOptions,
    el: gridHost
  });

  const refreshInspector = (): void => {
    const rows = gridHost.querySelectorAll(
      '[data-layout-section="body"] [data-layout-pane="center"] [role="row"]:not([data-virtual-spacer])'
    );
    renderedRows.textContent = String(rows.length);
  };

  scrollMiddleButton.addEventListener("click", () => {
    void grid.scrollToRow(119, "start").then(() => requestAnimationFrame(refreshInspector));
  });
  scrollEndButton.addEventListener("click", () => {
    void grid.scrollToRow(219, "end").then(() => requestAnimationFrame(refreshInspector));
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
