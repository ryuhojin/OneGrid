import { OneGrid } from "@onegrid/dom";
import type { GetRowsRequest, RowUpdate } from "@onegrid/core";
import {
  createServerOrderDataSource,
  SERVER_ROW_MODEL_PAGE_SIZE,
  SERVER_UPDATED_ROW_ID,
  serverRowModelColumns
} from "./data.js";
import type { ServerOrderRow } from "./data.js";

export function mountServerRowModelExample(el: HTMLElement): OneGrid<ServerOrderRow> {
  let requestCount = 0;
  const gridHost = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Server row model summary");
  const requestValue = appendValue(inspector, "Server requests", "0");
  const sortValue = appendValue(inspector, "Sort model", "pending");
  const filterValue = appendValue(inspector, "Filter model", "pending");
  const groupValue = appendValue(inspector, "Group fields", "pending");
  const groupKeysValue = appendValue(inspector, "Group keys", "pending");
  const aggregateValue = appendValue(inspector, "Aggregate fields", "pending");
  const pivotValue = appendValue(inspector, "Pivot values", "pending");

  const grid = new OneGrid<ServerOrderRow>({
    el: gridHost,
    columns: serverRowModelColumns,
    rowKey: "id",
    rowModel: "server",
    dataSource: createServerOrderDataSource((request) => {
      requestCount += 1;
      updateInspector(request);
    }),
    server: { pageSize: SERVER_ROW_MODEL_PAGE_SIZE },
    sorting: { serverOnly: true, model: [{ field: "amount", direction: "desc" }] },
    filtering: {
      serverOnly: true,
      model: { conditions: [{ field: "status", kind: "set", operator: "in", value: ["Approved", "Draft"] }] }
    },
    grouping: { serverOnly: true, model: { fields: ["region"] } },
    aggregation: {
      serverOnly: true,
      model: { fields: [{ field: "amount", function: "sum", alias: "amountTotal" }] }
    },
    pivot: {
      serverOnly: true,
      model: { rows: ["region"], columns: ["status"], values: ["amount"] }
    }
  });

  const refreshButton = createButton("Refresh server rows", () => void grid.refreshServerRows());
  const updateButton = createButton("Apply transaction", () => {
    const updates: readonly RowUpdate<ServerOrderRow>[] = [
      { rowKey: SERVER_UPDATED_ROW_ID, row: { customer: "Public Sector 40 (updated)" } }
    ];
    void grid.updateServerRows(updates);
  });
  actions.append(refreshButton, updateButton);
  el.replaceChildren(actions, gridHost, inspector);

  return grid;

  function updateInspector(request: GetRowsRequest): void {
    requestValue.textContent = String(requestCount);
    sortValue.textContent = request.sortModel.map((sort) => `${sort.field}:${sort.direction}`).join(", ");
    filterValue.textContent = request.filterModel.conditions?.map((filter) => filter.field).join(", ") ?? "none";
    groupValue.textContent = request.groupModel.fields?.join(", ") ?? "none";
    groupKeysValue.textContent = request.groupKeys.length === 0 ? "root" : request.groupKeys.join(" > ");
    aggregateValue.textContent = request.aggregateModel?.fields.map((field) => field.alias ?? field.field).join(", ") ?? "none";
    pivotValue.textContent = request.pivotModel?.values.join(", ") ?? "none";
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
