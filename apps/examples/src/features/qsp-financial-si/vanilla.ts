import { OneGrid } from "@onegrid/dom";
import { financialExposureTotal, financialSiOptions, financialSiRows } from "./data.js";
import type { FinancialSiRow } from "./data.js";

export function mountQspFinancialSiExample(el: HTMLElement): OneGrid<FinancialSiRow> {
  const host = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "Financial SI summary");

  appendValue(inspector, "Scenario", "financial controls");
  appendValue(inspector, "Rows", String(financialSiRows.length));
  appendValue(inspector, "Exposure total", financialExposureTotal.toLocaleString("en-US"));
  appendValue(inspector, "Security default", "text rendering unless explicitly sanitized");
  appendValue(inspector, "Keyboard", "range selection and clipboard enabled");

  const grid = new OneGrid<FinancialSiRow>({ el: host, ...financialSiOptions });
  el.replaceChildren(host, inspector);
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
