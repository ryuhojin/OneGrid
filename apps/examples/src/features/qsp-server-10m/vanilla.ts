import { OneGrid } from "@onegrid/dom";
import type { GetRowsRequest } from "@onegrid/core";
import {
  createQspServerDataSource,
  QSP_SERVER_JUMP_ROW,
  QSP_SERVER_PAGE_SIZE,
  QSP_SERVER_TOTAL_ROWS,
  qspServerColumns
} from "./data.js";
import type { QspServerRow } from "./data.js";

export function mountQspServer10mExample(el: HTMLElement): OneGrid<QspServerRow> {
  let requests = 0;
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const host = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "10M server rows summary");

  const requestValue = appendValue(inspector, "Server requests", "0");
  const rangeValue = appendValue(inspector, "Requested range", "pending");
  const totalValue = appendValue(inspector, "Logical rows", QSP_SERVER_TOTAL_ROWS.toLocaleString("en-US"));
  const pageSizeValue = appendValue(inspector, "Page size", String(QSP_SERVER_PAGE_SIZE));
  const pageValue = appendValue(inspector, "Page", "1");

  const grid = new OneGrid<QspServerRow>({
    el: host,
    columns: qspServerColumns,
    rowKey: "id",
    rowModel: "server",
    dataSource: createQspServerDataSource(updateInspector),
    server: { pageSize: QSP_SERVER_PAGE_SIZE },
    pagination: { mode: "server", position: "bottom", pageSize: QSP_SERVER_PAGE_SIZE },
    layout: { height: 420, bodyHeight: 420 },
    sorting: { serverOnly: true, model: [{ field: "amount", direction: "desc" }] },
    accessibility: { label: "10M server rows grid" }
  });

  actions.append(
    createButton("Jump near 10M", () => {
      grid.setPage(Math.floor(QSP_SERVER_JUMP_ROW / QSP_SERVER_PAGE_SIZE) + 1);
    }),
    createButton("Refresh range", () => {
      void grid.refreshServerRows();
    })
  );
  el.replaceChildren(actions, host, inspector);
  return grid;

  function updateInspector(request: GetRowsRequest): void {
    requests += 1;
    requestValue.textContent = String(requests);
    rangeValue.textContent = `${request.startRow}-${request.endRow - 1}`;
    totalValue.textContent = QSP_SERVER_TOTAL_ROWS.toLocaleString("en-US");
    pageSizeValue.textContent = String(request.pageSize ?? QSP_SERVER_PAGE_SIZE);
    pageValue.textContent = String((request.page ?? 0) + 1);
  }
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
