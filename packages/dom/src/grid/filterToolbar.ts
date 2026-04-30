import type { FilteringOptions } from "@onegrid/core";
import type { HeaderFilterRuntime } from "./filterRuntime.js";

export function createFilterToolbar(
  filtering: FilteringOptions | undefined,
  runtime: HeaderFilterRuntime | undefined
): HTMLElement | undefined {
  if (!runtime || filtering?.enabled === false || filtering?.quickFilter !== true) {
    return undefined;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "og-grid__filter-toolbar";
  toolbar.setAttribute("role", "search");

  const input = document.createElement("input");
  input.type = "search";
  input.className = "og-grid__quick-filter-input";
  input.value = runtime.filterModel.quickText ?? "";
  input.placeholder = "Quick filter";
  input.setAttribute("aria-label", "Quick filter");
  input.addEventListener("input", () => {
    runtime.applyQuickFilter(input.value);
  });

  const clearButton = document.createElement("button");
  clearButton.type = "button";
  clearButton.className = "og-grid__quick-filter-clear";
  clearButton.textContent = "Clear";
  clearButton.addEventListener("click", () => {
    input.value = "";
    runtime.applyQuickFilter("");
    input.focus();
  });

  toolbar.append(input, clearButton);
  return toolbar;
}
