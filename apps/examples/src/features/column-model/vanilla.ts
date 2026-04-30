import { createColumnModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import { columnModelColumns, columnModelOrder, columnModelRows } from "./data.js";
import type { ColumnModelOrderRow } from "./data.js";

export function mountColumnModelExample(el: HTMLElement): OneGrid<ColumnModelOrderRow> {
  const model = createColumnModel(columnModelColumns, { columnOrder: columnModelOrder });
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Column model summary");

  appendValue(inspector, "Visible columns", model.order.visible.join(", "));
  appendValue(inspector, "Hidden columns", model.order.hidden.join(", "));
  appendValue(
    inspector,
    "Pinned left columns",
    model.pinnedLeafColumns.left.map((column) => column.headerName).join(", ")
  );
  appendValue(
    inspector,
    "Pinned right columns",
    model.pinnedLeafColumns.right.map((column) => column.headerName).join(", ")
  );

  el.replaceChildren(gridHost, inspector);

  return new OneGrid({
    el: gridHost,
    columns: columnModelColumns,
    columnOrder: columnModelOrder,
    data: columnModelRows,
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
