import { OneGrid } from "@onegrid/dom";
import { gridApiMethodsColumns, gridApiMethodsRows } from "./data.js";
import type { GridApiMethodsRow } from "./data.js";

export function mountGridApiMethodsExample(el: HTMLElement): { destroy(): void } {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  actions.setAttribute("aria-label", "Grid API method actions");

  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Grid API method summary");
  const method = appendValue(inspector, "Last method", "ready");
  const result = appendValue(inspector, "Result", "API-0001 available");

  const grid = new OneGrid<GridApiMethodsRow>({
    el: gridHost,
    columns: gridApiMethodsColumns,
    data: gridApiMethodsRows,
    rowKey: "id",
    rowModel: "client",
    selection: { mode: "row", multiple: true, checkbox: true, selectAll: "visible" },
    accessibility: { label: "Grid API methods grid" }
  });

  actions.append(
    createButton("Select API-0002", () => {
      grid.selectRows(["API-0002"]);
      update(method, result, "selectRows", "API-0002 selected");
    }),
    createButton("Sort amount", () => {
      grid.setSortModel([{ field: "amount", direction: "desc" }]);
      update(method, result, "setSortModel", "amount desc");
    }),
    createButton("Hide owner", () => {
      grid.hideColumn("owner");
      update(method, result, "hideColumn", "owner hidden");
    }),
    createButton("Show owner", () => {
      grid.showColumn("owner");
      update(method, result, "showColumn", "owner visible");
    }),
    createButton("Read API-0004", () => {
      const row = grid.getRow("API-0004");
      update(method, result, "getRow", row?.customer ?? "not found");
    })
  );

  el.append(actions, gridHost, inspector);

  return {
    destroy() {
      grid.destroy();
    }
  };
}

function update(method: HTMLElement, result: HTMLElement, nextMethod: string, nextResult: string): void {
  method.textContent = nextMethod;
  result.textContent = nextResult;
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
