import { OneGrid } from "@onegrid/dom";
import { cspColumns, cspNonce, cspRows, cspTheme } from "./data.js";
import type { CspRow } from "./data.js";

export function mountCspExample(el: HTMLElement): { destroy(): void } {
  const stack = document.createElement("div");
  stack.className = "csp-example-stack";

  const nonceHost = document.createElement("div");
  const disabledHost = document.createElement("div");
  const inspector = document.createElement("dl");
  inspector.className = "example-inspector";
  inspector.setAttribute("aria-label", "CSP summary");

  const styleStatus = appendValue(inspector, "Style injection", "pending");
  const nonceValue = appendValue(inspector, "Nonce", "pending");
  const disabledValue = appendValue(inspector, "Disabled injection", "pending");

  stack.append(nonceHost, disabledHost, inspector);
  el.replaceChildren(stack);

  const nonceGrid = new OneGrid<CspRow>({
    el: nonceHost,
    columns: cspColumns,
    data: cspRows,
    rowKey: "id",
    theme: cspTheme,
    security: { csp: { nonce: cspNonce } },
    accessibility: { label: "CSP locked grid" }
  });
  const disabledGrid = new OneGrid<CspRow>({
    el: disabledHost,
    columns: cspColumns,
    data: cspRows.slice(0, 1),
    rowKey: "id",
    theme: cspTheme,
    security: { csp: { disableStyleInjection: true, nonce: cspNonce } },
    accessibility: { label: "CSP disabled style grid" }
  });

  refreshInspector(nonceHost, disabledHost, styleStatus, nonceValue, disabledValue);

  return {
    destroy() {
      nonceGrid.destroy();
      disabledGrid.destroy();
    }
  };
}

function refreshInspector(
  nonceHost: HTMLElement,
  disabledHost: HTMLElement,
  styleStatus: HTMLElement,
  nonceValue: HTMLElement,
  disabledValue: HTMLElement
): void {
  const style = nonceHost.ownerDocument.querySelector<HTMLStyleElement>(
    "style[data-onegrid-instance-style]"
  );
  styleStatus.textContent = nonceHost.dataset.ogStyleInjection ?? "missing";
  nonceValue.textContent = style?.nonce ?? "missing";
  disabledValue.textContent = disabledHost.dataset.ogStyleInjection ?? "missing";
}

function appendValue(list: HTMLDListElement, label: string, value: string): HTMLElement {
  const term = document.createElement("dt");
  term.textContent = label;
  const description = document.createElement("dd");
  description.textContent = value;
  list.append(term, description);
  return description;
}
