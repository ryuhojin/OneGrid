import { OneGrid } from "@onegrid/dom";
import {
  clientGroupKeys,
  clientGroupingOptions,
  createGroupingDataSource,
  groupingColumns,
  groupingFieldSummary,
  groupingRows,
  initialClientGroupKeys,
  serverGroupingOptions
} from "./data.js";
import type { GroupingRow, GroupingServerStats } from "./data.js";

export function mountGroupingExample(el: HTMLElement): { destroy(): void } {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const clientHeading = createHeading("Client grouping");
  const clientHost = document.createElement("div");
  const serverHeading = createHeading("Server grouping");
  const serverHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Grouping summary");

  const clientState = appendValue(inspector, "Client expanded groups", "Capital, Digital");
  appendValue(inspector, "Grouping fields", groupingFieldSummary.fields);
  appendValue(inspector, "Grouping aggregates", groupingFieldSummary.aggregates);
  appendValue(inspector, "Grouping filter", groupingFieldSummary.filter);
  appendValue(inspector, "Grouping sort", groupingFieldSummary.sort);
  const serverRequests = appendValue(inspector, "Server grouping requests", "0");
  const serverGroupKeys = appendValue(inspector, "Server group keys", "root");
  const serverMode = appendValue(inspector, "Server grouping mode", "root groups");

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
    createAction("Expand all client groups", () => {
      clientGrid.setGroupModel({ fields: ["region"], expandedKeys: clientGroupKeys });
      updateClientState(clientGrid, clientState);
    }),
    createAction("Collapse all client groups", () => {
      clientGrid.setGroupModel({ fields: ["region"], expandedKeys: [] });
      updateClientState(clientGrid, clientState);
    }),
    createAction("Reset client groups", () => {
      clientGrid.setGroupModel({ fields: ["region"], expandedKeys: initialClientGroupKeys });
      updateClientState(clientGrid, clientState);
    }),
    createAction("Collapse Capital", () => {
      clientGrid.collapseGroup("group:region=Capital");
      updateClientState(clientGrid, clientState);
    }),
    createAction("Expand Regional", () => {
      clientGrid.expandGroup("group:region=Regional");
      updateClientState(clientGrid, clientState);
    }),
    createAction("Open server Capital", () => {
      serverGrid.expandGroup("Capital");
      serverMode.textContent = "Capital children";
    }),
    createAction("Show server groups", () => {
      serverGrid.collapseGroup("Capital");
      serverGroupKeys.textContent = "root (region)";
      serverMode.textContent = "root groups";
    })
  );

  el.replaceChildren(actions, clientHeading, clientHost, serverHeading, serverHost, inspector);
  return {
    destroy() {
      clientGrid.destroy();
      serverGrid.destroy();
    }
  };
}

function createHeading(label: string): HTMLHeadingElement {
  const heading = document.createElement("h3");
  heading.className = "example-subheading";
  heading.textContent = label;
  return heading;
}

function updateClientState(grid: OneGrid<GroupingRow>, target: HTMLElement): void {
  target.textContent = describeExpandedGroups(grid.getGroupModel().expandedKeys ?? []);
}

function describeExpandedGroups(keys: readonly string[]): string {
  const labels = keys.map((key) => key.replace("group:region=", ""));
  return labels.length === 0 ? "none" : labels.join(", ");
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
