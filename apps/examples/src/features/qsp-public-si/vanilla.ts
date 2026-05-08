import { OneGrid } from "@onegrid/dom";
import { publicSiOptions, publicSiRows } from "./data.js";
import type { PublicSiRow } from "./data.js";

export function mountQspPublicSiExample(el: HTMLElement): OneGrid<PublicSiRow> {
  const host = document.createElement("div");
  const actions = document.createElement("div");
  actions.className = "example-actions";
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Public sector SI summary");

  const quickFilter = document.createElement("input");
  quickFilter.type = "search";
  quickFilter.setAttribute("aria-label", "Public service quick filter");
  quickFilter.placeholder = "Filter public services";

  appendValue(inspector, "Scenario", "public-sector service desk");
  appendValue(inspector, "Rows", String(publicSiRows.length));
  appendValue(inspector, "CSP posture", "no inline handlers or unsafe eval");
  appendValue(inspector, "Keyboard", "headers, menus, and cells expose ARIA grid semantics");

  const grid = new OneGrid<PublicSiRow>({ el: host, ...publicSiOptions });
  quickFilter.addEventListener("input", () => {
    grid.setFilterModel({ quickText: quickFilter.value });
  });
  actions.append(quickFilter);
  el.replaceChildren(actions, host, inspector);
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
