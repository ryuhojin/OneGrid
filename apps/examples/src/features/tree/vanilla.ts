import { OneGrid } from "@onegrid/dom";
import {
  clientTreeOptions,
  clientTreeRows,
  createServerTreeDataSource,
  createTreeFeatureDataSource,
  serverTreeOptions,
  serverTreeRows,
  treeFeatureColumns
} from "./data.js";
import type { TreeFeatureRow, TreeServerStats } from "./data.js";

export function mountTreeExample(el: HTMLElement): { destroy(): void } {
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const clientHost = document.createElement("div");
  const serverHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Tree summary");

  const clientLazyRequests = appendValue(inspector, "Client lazy child requests", "0");
  const clientSelection = appendValue(inspector, "Client selected keys", "0");
  const serverRequests = appendValue(inspector, "Server child requests", "0");
  const serverParent = appendValue(inspector, "Last server parent", "none");
  const serverSort = appendValue(inspector, "Last server sort", "none");
  const serverFilter = appendValue(inspector, "Last server filter", "none");
  let lazyRequests = 0;

  const clientGrid = new OneGrid<TreeFeatureRow>({
    el: clientHost,
    columns: treeFeatureColumns,
    data: clientTreeRows,
    dataSource: createTreeFeatureDataSource(() => {
      lazyRequests += 1;
      clientLazyRequests.textContent = String(lazyRequests);
    }),
    accessibility: { label: "Client tree grid" },
    ...clientTreeOptions
  });
  const serverGrid = new OneGrid<TreeFeatureRow>({
    el: serverHost,
    columns: treeFeatureColumns,
    data: serverTreeRows,
    dataSource: createServerTreeDataSource((stats) => {
      updateServerStats(stats, serverRequests, serverParent, serverSort, serverFilter);
    }),
    accessibility: { label: "Server tree grid" },
    ...serverTreeOptions
  });

  actions.append(
    createAction("Filter open tree", () => {
      clientGrid.setFilterModel({
        conditions: [{ field: "status", kind: "set", operator: "in", value: ["Open"] }]
      });
    }),
    createAction("Clear tree filter", () => {
      clientGrid.setFilterModel({});
    }),
    createAction("Load audit children", async () => {
      await clientGrid.expandTreeNode("DIG-AUD");
    }),
    createAction("Select digital branch", () => {
      clientGrid.selectTreeNode("DIG", true);
      clientSelection.textContent = String(clientGrid.getTreeSelection().length);
    }),
    createAction("Open server capital", async () => {
      await serverGrid.expandTreeNode("SRV-CAP");
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

function createAction(label: string, onClick: () => void | Promise<void>): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "example-action-button";
  button.textContent = label;
  button.addEventListener("click", () => {
    void Promise.resolve(onClick());
  });
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

function updateServerStats(
  stats: TreeServerStats,
  serverRequests: HTMLElement,
  serverParent: HTMLElement,
  serverSort: HTMLElement,
  serverFilter: HTMLElement
): void {
  serverRequests.textContent = String(stats.requests);
  serverParent.textContent = stats.parentKey;
  serverSort.textContent = stats.sort;
  serverFilter.textContent = stats.filter;
}
