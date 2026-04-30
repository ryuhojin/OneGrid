import { OneGrid } from "@onegrid/dom";
import {
  cellMergeColumns,
  cellMergeOptions,
  cellMergeRows,
  createCellMergeDataSource
} from "./data.js";
import type { CellMergeBudgetRow } from "./data.js";

export function mountCellMergeExample(el: HTMLElement): OneGrid<CellMergeBudgetRow> {
  let requestCount = 0;
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Cell merge summary");
  const requestValue = appendValue(inspector, "Server merge requests", "0");
  appendValue(inspector, "Rows", String(cellMergeRows.length));
  const anchorValue = appendValue(inspector, "Merged anchors", "0");

  const grid = new OneGrid<CellMergeBudgetRow>({
    ...cellMergeOptions,
    columns: cellMergeColumns,
    dataSource: createCellMergeDataSource(() => {
      requestCount += 1;
      requestValue.textContent = String(requestCount);
    }),
    el: gridHost
  });

  el.replaceChildren(gridHost, inspector);
  window.setTimeout(() => {
    anchorValue.textContent = String(gridHost.querySelectorAll("[data-cell-span-id]").length);
  }, 80);

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
