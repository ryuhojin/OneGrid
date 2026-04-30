import { OneGrid } from "@onegrid/dom";
import {
  appendPaginationOptions,
  clientPaginationOptions,
  createPaginationDataSource,
  cursorPaginationOptions,
  paginationColumns,
  paginationRows,
  serverPaginationOptions
} from "./data.js";
import type { PaginationRow } from "./data.js";

export function mountPaginationExample(el: HTMLElement): { destroy(): void } {
  const client = createGridSection("Client pagination", "Client pagination summary");
  const server = createGridSection("Server pagination", "Server pagination summary");
  const cursor = createGridSection("Cursor pagination", "Cursor pagination summary");
  const append = createGridSection("Append scroll pagination", "Append pagination summary");

  const clientPage = appendValue(client.inspector, "Page", "1");
  const clientPageSize = appendValue(client.inspector, "Page size", "4");
  const serverPage = appendValue(server.inspector, "Requested page", "pending");
  const serverRows = appendValue(server.inspector, "Rows", "pending");
  const cursorValue = appendValue(cursor.inspector, "Cursor used", "pending");
  const cursorRows = appendValue(cursor.inspector, "Rows", "pending");
  const appendRequests = appendValue(append.inspector, "Requests", "pending");

  const clientGrid = new OneGrid<PaginationRow>({
    el: client.host,
    columns: paginationColumns,
    data: paginationRows,
    accessibility: { label: "Client pagination grid" },
    ...clientPaginationOptions,
    events: {
      pageChanged: (event) => {
        clientPage.textContent = String(event.page);
        clientPageSize.textContent = String(event.pageSize);
      }
    }
  });
  const serverGrid = new OneGrid<PaginationRow>({
    el: server.host,
    columns: paginationColumns,
    dataSource: createPaginationDataSource((stats) => {
      serverPage.textContent = stats.page;
      serverRows.textContent = stats.rows;
    }),
    accessibility: { label: "Server pagination grid" },
    ...serverPaginationOptions
  });
  const cursorGrid = new OneGrid<PaginationRow>({
    el: cursor.host,
    columns: paginationColumns,
    dataSource: createPaginationDataSource((stats) => {
      cursorValue.textContent = stats.cursor;
      cursorRows.textContent = stats.rows;
    }),
    accessibility: { label: "Cursor pagination grid" },
    ...cursorPaginationOptions
  });
  const appendGrid = new OneGrid<PaginationRow>({
    el: append.host,
    columns: paginationColumns,
    dataSource: createPaginationDataSource((stats) => {
      appendRequests.textContent = String(stats.requests);
    }),
    accessibility: { label: "Append scroll pagination grid" },
    ...appendPaginationOptions
  });

  el.classList.add("pagination-example-stack");
  el.replaceChildren(client.section, server.section, cursor.section, append.section);
  return {
    destroy() {
      el.classList.remove("pagination-example-stack");
      clientGrid.destroy();
      serverGrid.destroy();
      cursorGrid.destroy();
      appendGrid.destroy();
    }
  };
}

function createGridSection(title: string, inspectorLabel: string) {
  const section = document.createElement("section");
  section.className = "pagination-example-section";
  const heading = document.createElement("h3");
  heading.className = "pagination-example-heading";
  heading.textContent = title;
  const host = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector pagination-example-inspector";
  inspector.setAttribute("aria-label", inspectorLabel);
  section.append(heading, host, inspector);
  return { section, host, inspector };
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return description;
}
