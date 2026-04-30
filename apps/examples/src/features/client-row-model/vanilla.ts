import { createClientRowModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import {
  clientRowAggregateModel,
  clientRowFilterModel,
  clientRowGroupModel,
  clientRowModelColumns,
  clientRowModelRows,
  clientRowSortModel
} from "./data.js";
import type { ClientRowModelOrderRow } from "./data.js";

export function mountClientRowModelExample(el: HTMLElement): OneGrid<ClientRowModelOrderRow> {
  const model = createClientRowModel(clientRowModelRows, {
    rowKey: "id",
    filterModel: clientRowFilterModel,
    sortModel: clientRowSortModel,
    groupModel: clientRowGroupModel,
    aggregateModel: clientRowAggregateModel
  });
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Client row model summary");

  appendValue(inspector, "Source rows", String(model.rows.length));
  appendValue(inspector, "Filtered rows", String(model.dataRowCount));
  appendValue(inspector, "Visible row entries", String(model.rowCount));
  appendValue(inspector, "Aggregate amount", String(model.aggregateValues.amountTotal));

  el.replaceChildren(gridHost, inspector);

  return new OneGrid({
    el: gridHost,
    columns: clientRowModelColumns,
    data: clientRowModelRows,
    rowKey: "id",
    rowModel: "client",
    filtering: { model: clientRowFilterModel },
    sorting: { model: clientRowSortModel },
    grouping: { model: clientRowGroupModel },
    aggregation: { model: clientRowAggregateModel }
  });
}

function appendValue(list: HTMLDListElement, label: string, value: string): void {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
}
