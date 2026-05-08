import { OneGrid } from "@onegrid/dom";
import {
  clientGroupingOptions,
  createGroupingDataSource,
  groupingColumns,
  groupingRows,
  serverGroupingOptions
} from "./data.js";
import type { GroupingRow, GroupingServerStats } from "./data.js";

export function mountGroupingExample(el: HTMLElement): { destroy(): void } {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const clientHost = document.createElement("div");
  const serverHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Grouping summary");

  const serverRequests = appendValue(inspector, "Server grouping requests", "0");
  const serverGroupKeys = appendValue(inspector, "Server group keys", "root");
  appendValue(inspector, "Client filtered rows", "6");

  const clientGrid = new OneGrid<GroupingRow>({
    el: clientHost,
    columns: groupingColumns,
    data: groupingRows,
    accessibility: { label: "Client grouping grid" },
    ...clientGroupingOptions
  });
  const serverGrid = new OneGrid<GroupingRow>({
    el: serverHost,
    columns: groupingColumns,
    dataSource: createGroupingDataSource((stats) => {
      updateStats(stats, serverRequests, serverGroupKeys);
    }),
    accessibility: { label: "Server grouping grid" },
    ...serverGroupingOptions
  });

  actions.append(
    createAction("Collapse Capital", () => {
      clientGrid.collapseGroup("group:region=Capital");
    }),
    createAction("Expand Regional", () => {
      clientGrid.expandGroup("group:region=Regional");
    }),
    createAction("Open server Capital", () => {
      serverGrid.expandGroup("Capital");
    }),
    createAction("Show server groups", () => {
      serverGrid.collapseGroup("Capital");
      serverGroupKeys.textContent = "root (region)";
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
  stats: GroupingServerStats,
  serverRequests: HTMLElement,
  serverGroupKeys: HTMLElement
): void {
  serverRequests.textContent = String(stats.requests);
  serverGroupKeys.textContent = `${stats.groupKeys} (${stats.groupModel})`;
}
