import { OneGrid } from "@onegrid/dom";
import {
  clientSummaryOptions,
  createSummaryDataSource,
  serverSummaryOptions,
  summaryColumns,
  summaryRows
} from "./data.js";
import type { SummaryRow, SummaryServerStats } from "./data.js";

export function mountSummaryExample(el: HTMLElement): { destroy(): void } {
  const clientHost = document.createElement("div");
  const serverHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Summary aggregate summary");

  appendValue(inspector, "Client rows", String(summaryRows.length));
  appendValue(inspector, "Client amount total", "5690");
  const serverRequests = appendValue(inspector, "Server aggregate requests", "0");
  const lastServerAggregate = appendValue(inspector, "Last server aggregate model", "none");

  const clientGrid = new OneGrid<SummaryRow>({
    el: clientHost,
    columns: summaryColumns,
    data: summaryRows,
    accessibility: { label: "Client summary grid" },
    ...clientSummaryOptions
  });

  const serverGrid = new OneGrid<SummaryRow>({
    el: serverHost,
    columns: summaryColumns,
    dataSource: createSummaryDataSource((stats) => {
      updateStats(stats, serverRequests, lastServerAggregate);
    }),
    accessibility: { label: "Server aggregate grid" },
    ...serverSummaryOptions
  });

  el.replaceChildren(clientHost, serverHost, inspector);
  return {
    destroy() {
      clientGrid.destroy();
      serverGrid.destroy();
    }
  };
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
  stats: SummaryServerStats,
  serverRequests: HTMLElement,
  lastServerAggregate: HTMLElement
): void {
  serverRequests.textContent = String(stats.requests);
  lastServerAggregate.textContent = stats.lastAggregateModel;
}
