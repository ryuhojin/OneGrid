import { OneGrid } from "@onegrid/dom";
import { baseLayoutColumns, baseLayoutOptions, baseLayoutRows } from "./data.js";
import type { BaseLayoutOrderRow } from "./data.js";

export function mountBaseLayoutExample(el: HTMLElement): OneGrid<BaseLayoutOrderRow> {
  const gridHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Base layout summary");
  appendValue(inspector, "Pinned panes", "left, center, right");
  appendValue(inspector, "Summary position", "bottom");
  appendValue(inspector, "Footer status", "rows");

  el.replaceChildren(gridHost, inspector);

  return new OneGrid<BaseLayoutOrderRow>({
    el: gridHost,
    columns: baseLayoutColumns,
    data: baseLayoutRows,
    ...baseLayoutOptions
  });
}

function appendValue(list: HTMLDListElement, label: string, value: string): void {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  list.append(term, description);
}
