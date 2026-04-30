import { OneGrid } from "@onegrid/dom";
import {
  clientPivotOptions,
  createPivotDataSource,
  pivotFilterModel,
  pivotRows,
  pivotSourceColumns,
  serverPivotColumns,
  serverPivotOptions
} from "./data.js";
import type { PivotResultRow, PivotServerStats, PivotSourceRow } from "./data.js";

export function mountPivotExample(el: HTMLElement): { destroy(): void } {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const clientHost = document.createElement("div");
  const serverHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Pivot summary");

  const filteredRows = appendValue(inspector, "Client filtered source rows", "6");
  appendValue(inspector, "Client pivot data rows", "4");
  const serverRequests = appendValue(inspector, "Server pivot requests", "0");
  const serverRows = appendValue(inspector, "Server pivot rows", "none");
  const serverColumns = appendValue(inspector, "Server pivot columns", "none");
  const serverValues = appendValue(inspector, "Server pivot values", "none");

  const clientGrid = new OneGrid<PivotSourceRow>({
    el: clientHost,
    columns: pivotSourceColumns,
    data: pivotRows,
    accessibility: { label: "Client pivot grid" },
    ...clientPivotOptions
  });
  const serverGrid = new OneGrid<PivotResultRow>({
    el: serverHost,
    columns: serverPivotColumns,
    dataSource: createPivotDataSource((stats) => {
      updateStats(stats, serverRequests, serverRows, serverColumns, serverValues);
    }),
    accessibility: { label: "Server pivot grid" },
    ...serverPivotOptions
  });

  actions.append(
    createAction("Clear client filter", () => {
      clientGrid.setFilterModel({});
      filteredRows.textContent = "8";
    }),
    createAction("Restore open filter", () => {
      clientGrid.setFilterModel(pivotFilterModel);
      filteredRows.textContent = "6";
    })
  );

  el.replaceChildren(actions, clientHost, serverHost, inspector);
  return {
    destroy() {
      clientGrid.destroy();
      serverGrid.destroy();
    }
  };
}

function createAction(label: string, onClick: () => void): HTMLButtonElement {
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

function updateStats(
  stats: PivotServerStats,
  serverRequests: HTMLElement,
  serverRows: HTMLElement,
  serverColumns: HTMLElement,
  serverValues: HTMLElement
): void {
  serverRequests.textContent = String(stats.requests);
  serverRows.textContent = stats.rows;
  serverColumns.textContent = stats.columns;
  serverValues.textContent = stats.values;
}
