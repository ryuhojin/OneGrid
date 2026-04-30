import { createColumnModel, createHeaderModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import { groupHeaderColumns, groupHeaderMerge, groupHeaderRows, metricColumnIds } from "./data.js";
import type { ColumnModel } from "@onegrid/core";
import type { GroupHeaderOrderRow } from "./data.js";

export function mountGroupHeaderExample(el: HTMLElement): OneGrid<GroupHeaderOrderRow> {
  const columnModel = createColumnModel(groupHeaderColumns);
  const headerModel = createHeaderModel(columnModel, { merge: groupHeaderMerge });
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Group header summary");

  appendValue(inspector, "Header rows", String(headerModel.depth));
  appendValue(inspector, "Metric columns", getColumnNames(columnModel, metricColumnIds).join(", "));
  appendValue(
    inspector,
    "Center headers",
    headerModel.regions.center.rows
      .flatMap((row) => row.cells.map((cell) => cell.headerName))
      .join(", ")
  );
  appendValue(
    inspector,
    "ARIA labels",
    [...headerModel.ariaLabels.values()].slice(0, 4).join(" / ")
  );

  el.replaceChildren(gridHost, inspector);

  return new OneGrid({
    el: gridHost,
    columns: groupHeaderColumns,
    headerMerge: groupHeaderMerge,
    data: groupHeaderRows,
    rowModel: "client"
  });
}

function getColumnNames(
  columnModel: ColumnModel<GroupHeaderOrderRow>,
  columnIds: readonly string[]
): readonly string[] {
  return columnIds.map((columnId) => {
    const column = columnModel.byId.get(columnId);
    return column?.headerName ?? columnId;
  });
}

function appendValue(list: HTMLDListElement, label: string, value: string): void {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
}
