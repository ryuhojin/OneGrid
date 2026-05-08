import { OneGrid } from "@onegrid/dom";
import {
  createInsertedRow,
  createRowDataUpdateRows,
  rowDataUpdateColumns
} from "./data.js";
import type { RowDataUpdateRow } from "./data.js";

export function mountRowDataUpdateExample(el: HTMLElement): { destroy(): void } {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  actions.setAttribute("aria-label", "Row data update actions");

  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Row data update summary");
  const operation = appendValue(inspector, "Last operation", "initial data");
  const rowCount = appendValue(inspector, "Rows", "3");

  const grid = new OneGrid<RowDataUpdateRow>({
    el: gridHost,
    columns: rowDataUpdateColumns,
    data: createRowDataUpdateRows(),
    rowKey: "id",
    rowModel: "client",
    accessibility: { label: "Row data update grid" }
  });

  actions.append(
    createButton("Reset data", () => {
      grid.setData(createRowDataUpdateRows());
      updateInspector(operation, rowCount, "setData reset", 3);
    }),
    createButton("Append row", () => {
      grid.appendRows([createInsertedRow()]);
      updateInspector(operation, rowCount, "appendRows UPD-0004", 4);
    }),
    createButton("Update row", () => {
      grid.updateRows([{ rowKey: "UPD-0002", row: { status: "Approved", amount: 1110 } }]);
      updateInspector(operation, rowCount, "updateRows UPD-0002", Number(rowCount.textContent));
    }),
    createButton("Remove row", () => {
      grid.removeRows(["UPD-0001"]);
      updateInspector(operation, rowCount, "removeRows UPD-0001", Math.max(0, Number(rowCount.textContent) - 1));
    })
  );

  el.append(actions, gridHost, inspector);

  return {
    destroy() {
      grid.destroy();
    }
  };
}

function updateInspector(operation: HTMLElement, rowCount: HTMLElement, label: string, count: number): void {
  operation.textContent = label;
  rowCount.textContent = String(count);
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
