import { createColumnModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import { columnUiColumns, columnUiOptions, columnUiRows } from "./data.js";
import type { ColumnUiOrderRow } from "./data.js";

export function mountColumnUiExample(el: HTMLElement): OneGrid<ColumnUiOrderRow> {
  const model = createColumnModel(columnUiColumns);
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Column UI summary");

  appendValue(inspector, "Interactive controls", "resize, auto size, reorder, menu, tool panel");
  appendValue(inspector, "Initial visible columns", model.order.visible.join(", "));
  appendValue(inspector, "Initial hidden columns", model.order.hidden.join(", "));

  el.replaceChildren(gridHost, inspector);

  return new OneGrid({
    el: gridHost,
    columns: columnUiColumns,
    columnUi: columnUiOptions,
    data: columnUiRows,
    rowModel: "client"
  });
}

function appendValue(list: HTMLDListElement, label: string, value: string): void {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
}
