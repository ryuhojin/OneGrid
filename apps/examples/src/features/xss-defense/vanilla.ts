import { OneGrid } from "@onegrid/dom";
import {
  xssDefenseColumns,
  xssDefenseRows,
  xssDefenseSecurity
} from "./data.js";
import type { XssDefenseRow } from "./data.js";

declare global {
  interface Window {
    __onegridXss?: boolean;
  }
}

export function mountXssDefenseExample(el: HTMLElement): OneGrid<XssDefenseRow> {
  window.__onegridXss = false;
  const gridHost = document.createElement("div");
  const summary = createSummary();
  el.append(gridHost, summary.element);

  const grid = new OneGrid<XssDefenseRow>({
    el: gridHost,
    columns: xssDefenseColumns,
    data: xssDefenseRows,
    rowKey: "id",
    rowModel: "client",
    security: xssDefenseSecurity
  });

  queueMicrotask(() => {
    summary.xss.textContent = window.__onegridXss ? "yes" : "no";
    summary.blockedHref.textContent = gridHost.querySelector(".xss-defense-link")?.getAttribute("href") ?? "blocked";
    summary.htmlPolicy.textContent =
      gridHost.querySelector<HTMLElement>("[data-trusted-types-policy]")?.dataset.trustedTypesPolicy ?? "unavailable";
  });

  return grid;
}

function createSummary(): {
  readonly element: HTMLElement;
  readonly xss: HTMLElement;
  readonly blockedHref: HTMLElement;
  readonly htmlPolicy: HTMLElement;
} {
  const element = document.createElement("dl");
  element.className = "example-summary";
  element.setAttribute("aria-label", "XSS defense summary");
  const xss = appendItem(element, "XSS fired", "pending");
  const blockedHref = appendItem(element, "Unsafe href", "pending");
  const htmlPolicy = appendItem(element, "Trusted Types policy", "pending");
  return { element, xss, blockedHref, htmlPolicy };
}

function appendItem(list: HTMLElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return description;
}
