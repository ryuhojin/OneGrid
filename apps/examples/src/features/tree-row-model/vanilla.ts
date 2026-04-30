import { OneGrid } from "@onegrid/dom";
import { createTreeOrderDataSource, treeRowModelColumns, treeRows } from "./data.js";
import type { TreeOrderRow } from "./data.js";

export function mountTreeRowModelExample(el: HTMLElement): OneGrid<TreeOrderRow> {
  let childRequestCount = 0;
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Tree row model summary");
  const requestValue = appendValue(inspector, "Lazy child requests", "0");
  appendValue(inspector, "Selection policy", "descendants");
  appendValue(inspector, "Indent size", "22");

  el.replaceChildren(gridHost, inspector);

  return new OneGrid<TreeOrderRow>({
    el: gridHost,
    columns: treeRowModelColumns,
    data: treeRows,
    dataSource: createTreeOrderDataSource(() => {
      childRequestCount += 1;
      requestValue.textContent = String(childRequestCount);
    }),
    rowKey: "id",
    rowModel: "tree",
    tree: {
      childrenField: "children",
      hasChildrenField: "hasChildren",
      indentSize: 22,
      selection: { policy: "descendants" }
    }
  });
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
  return description;
}
