import { OneGrid } from "@onegrid/dom";
import {
  createInfiniteOrderDataSource,
  INFINITE_BLOCK_SIZE,
  INFINITE_TOTAL_ROWS,
  infiniteRowModelColumns
} from "./data.js";
import type { InfiniteOrderRow } from "./data.js";

export function mountInfiniteRowModelExample(el: HTMLElement): OneGrid<InfiniteOrderRow> {
  let requestCount = 0;
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Infinite row model summary");

  const requestValue = appendValue(inspector, "Block requests", "0");
  appendValue(inspector, "Total rows", String(INFINITE_TOTAL_ROWS));
  appendValue(inspector, "Block size", String(INFINITE_BLOCK_SIZE));
  appendValue(inspector, "Cache blocks", "2");

  el.replaceChildren(gridHost, inspector);

  return new OneGrid({
    el: gridHost,
    columns: infiniteRowModelColumns,
    rowModel: "infinite",
    dataSource: createInfiniteOrderDataSource(() => {
      requestCount += 1;
      requestValue.textContent = String(requestCount);
    }),
    infinite: {
      blockSize: INFINITE_BLOCK_SIZE,
      maxBlocksInCache: 2,
      initialRowCount: INFINITE_TOTAL_ROWS
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
