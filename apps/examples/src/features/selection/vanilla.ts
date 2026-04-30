import { OneGrid } from "@onegrid/dom";
import {
  selectionColumns,
  selectionOptions,
  selectionRows
} from "./data.js";
import type { SelectionRow } from "./data.js";

export function mountSelectionExample(el: HTMLElement): OneGrid<SelectionRow> {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Selection summary");

  const rows = appendValue(inspector, "Row keys", "none");
  const cells = appendValue(inspector, "Cells", "0");
  const ranges = appendValue(inspector, "Ranges", "0");
  const token = appendValue(inspector, "Server token", "none");

  const grid = new OneGrid<SelectionRow>({
    el: gridHost,
    columns: selectionColumns,
    data: selectionRows,
    rowKey: "id",
    rowModel: "client",
    selection: selectionOptions,
    merge: { enabled: true },
    layout: { width: "100%", height: 430, bodyHeight: 430 },
    events: {
      selectionChanged: (event) => {
        rows.textContent = event.rowKeys.length > 0 ? event.rowKeys.join(", ") : "none";
        cells.textContent = String(event.cells.length);
        ranges.textContent = String(event.ranges.length);
        token.textContent = event.allRowsToken?.token ?? "none";
      }
    }
  });

  actions.append(
    createButton("Select first two rows", () => {
      grid.selectRows(["SEL-0001", "SEL-0002"]);
    }),
    createButton("Select server dataset", () => {
      grid.selectServerDataset();
    }),
    createButton("Clear", () => {
      grid.clearSelection();
    })
  );

  el.replaceChildren(actions, gridHost, inspector);
  return grid;
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
