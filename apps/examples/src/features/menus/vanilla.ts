import type { FilterModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/dom";
import {
  createMenuContextMenu,
  menuClipboard,
  menuColumnUi,
  menuColumns,
  menuEditing,
  menuFiltering,
  menuRows,
  menuSelection
} from "./data.js";
import type { MenuRow } from "./data.js";

export function mountMenusExample(el: HTMLElement): OneGrid<MenuRow> {
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Menu summary");

  const lastAction = appendValue(inspector, "Last menu action", "none");
  const contextRow = appendValue(inspector, "Context row", "none");
  const contextField = appendValue(inspector, "Context field", "none");
  const filterModel = appendValue(inspector, "Filter model", "none");
  const selection = appendValue(inspector, "Selection", "none");

  const grid = new OneGrid<MenuRow>({
    el: gridHost,
    columns: menuColumns,
    data: menuRows,
    rowKey: "id",
    rowModel: "client",
    columnUi: menuColumnUi,
    filtering: menuFiltering,
    selection: menuSelection,
    editing: menuEditing,
    clipboard: menuClipboard,
    contextMenu: createMenuContextMenu((label, context) => {
      lastAction.textContent = label;
      contextRow.textContent = String(context.rowKey);
      contextField.textContent = context.field ?? "row";
    }),
    merge: { enabled: true },
    layout: { width: "100%", height: 420, bodyHeight: 420 },
    events: {
      filterChanged: (event) => {
        filterModel.textContent = formatFilterModel(event.filterModel);
      },
      selectionChanged: (event) => {
        selection.textContent = event.rowKeys.length > 0
          ? event.rowKeys.join(", ")
          : event.cells.length > 0
            ? `${event.cells.length} cell`
            : event.ranges.length > 0 ? `${event.ranges.length} range` : "none";
      },
      cellEditStarted: (event) => {
        lastAction.textContent = `Editing ${event.position.field}`;
      }
    }
  });

  filterModel.textContent = formatFilterModel(grid.getFilterModel());
  el.replaceChildren(gridHost, inspector);
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
