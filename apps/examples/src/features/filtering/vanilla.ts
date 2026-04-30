import type { FilterModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import {
  createFilteringDataSource,
  filteringColumns,
  filteringOptions
} from "./data.js";
import type { FilteringDataSourceStats, FilteringOrderRow } from "./data.js";

export function mountFilteringExample(el: HTMLElement): OneGrid<FilteringOrderRow> {
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Filtering summary");

  const filterValue = appendValue(inspector, "Filter model", "none");
  const requestValue = appendValue(inspector, "Server filter requests", "0");
  const distinctValue = appendValue(inspector, "Distinct values requests", "0");
  el.replaceChildren(gridHost, inspector);

  const grid = new OneGrid({
    el: gridHost,
    columns: filteringColumns,
    columnUi: { menu: true },
    dataSource: createFilteringDataSource((stats) => {
      updateStats(stats, requestValue, distinctValue, filterValue);
    }),
    rowKey: "id",
    rowModel: "server",
    server: { pageSize: 8 },
    filtering: filteringOptions,
    events: {
      filterChanged: (event) => {
        filterValue.textContent = formatFilterModel(event.filterModel);
      }
    }
  });

  filterValue.textContent = formatFilterModel(grid.getFilterModel());
  return grid;
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
  stats: FilteringDataSourceStats,
  requestValue: HTMLElement,
  distinctValue: HTMLElement,
  filterValue: HTMLElement
): void {
  requestValue.textContent = String(stats.filterRequests);
  distinctValue.textContent = String(stats.distinctRequests);
  filterValue.textContent = stats.lastFilterModel;
}

function formatFilterModel(model: FilterModel): string {
  if (!model.quickText && !model.conditions?.length) {
    return "none";
  }

  const parts = [
    ...(model.quickText ? [`quick:${model.quickText}`] : []),
    ...(model.conditions ?? []).map((condition) =>
      `${condition.field}:${condition.operator}:${String(condition.value)}`
    )
  ];

  return parts.join(", ");
}
