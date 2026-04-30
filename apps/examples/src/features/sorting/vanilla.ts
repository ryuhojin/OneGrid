import type { SortModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import { sortingColumns, sortingOptions, sortingRows } from "./data.js";
import type { SortingOrderRow } from "./data.js";

export function mountSortingExample(el: HTMLElement): OneGrid<SortingOrderRow> {
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Sorting summary");

  const sortValue = appendValue(inspector, "Sort model", "none");
  appendValue(inspector, "Interaction", "Click headers to cycle, Shift-click to multi sort");
  el.replaceChildren(gridHost, inspector);

  const grid = new OneGrid({
    el: gridHost,
    columns: sortingColumns,
    columnUi: { menu: true },
    data: sortingRows,
    rowModel: "client",
    sorting: sortingOptions,
    events: {
      sortChanged: (event) => {
        sortValue.textContent = formatSortModel(event.sortModel);
      }
    }
  });

  sortValue.textContent = formatSortModel(grid.getSortModel());
  return grid;
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
  return description;
}

function formatSortModel(model: readonly SortModel[]): string {
  return model.length === 0
    ? "none"
    : model.map((sort) => `${sort.field}:${sort.direction}`).join(", ");
}
