import type { SelectionOptions } from "@onegrid/core";
import type { GridSelectionRuntime } from "./selectionRuntime.js";

export function createSelectionToolbar(
  options: SelectionOptions | undefined,
  runtime: GridSelectionRuntime | undefined
): HTMLElement | undefined {
  if (!runtime || options?.mode === "none") {
    return undefined;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "og-grid__selection-toolbar";
  toolbar.setAttribute("aria-label", "Selection controls");
  toolbar.append(
    createButton("Clear selection", "clear"),
    createButton("Select all visible", "visible")
  );

  if (runtime.selectAllMode === "server") {
    toolbar.append(createButton("Select server dataset", "server"));
  }

  return toolbar;
}

function createButton(label: string, action: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__selection-action";
  button.dataset.selectionAction = action;
  button.textContent = label;
  return button;
}
