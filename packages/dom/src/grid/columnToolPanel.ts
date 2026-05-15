import { createColumnsToolPanelModel } from "@onegrid/core";
import type { ColumnModel, ColumnsToolPanelColumn } from "@onegrid/core";
import type { ColumnUiRuntime } from "./columnControls.js";

let nextToolPanelId = 0;

export function createToolPanel<TData>(
  model: ColumnModel<TData>,
  runtime: ColumnUiRuntime
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "og-grid__tool-panel";
  panel.id = `og-columns-tool-panel-${++nextToolPanelId}`;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Columns tool panel");

  const panelModel = createColumnsToolPanelModel(model);
  for (const column of panelModel.columns) {
    const row = document.createElement("div");
    row.className = "og-grid__tool-panel-row";
    row.append(
      createVisibilityToggle(column, runtime),
      createPinButton(column.headerName, "L", column.pinnable, () =>
        runtime.pinColumn(column.id, "left")
      ),
      createPinButton(column.headerName, "R", column.pinnable, () =>
        runtime.pinColumn(column.id, "right")
      ),
      createPinButton(column.headerName, "-", column.pinnable, () =>
        runtime.pinColumn(column.id, null)
      )
    );
    panel.append(row);
  }

  return panel;
}

function createVisibilityToggle(
  column: ColumnsToolPanelColumn,
  runtime: ColumnUiRuntime
): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "og-grid__tool-panel-label";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "og-grid__checkbox";
  checkbox.checked = !column.hidden;
  checkbox.disabled = !column.hideable;
  checkbox.addEventListener("change", () => {
    if (checkbox.checked) {
      runtime.showColumn(column.id);
    } else {
      runtime.hideColumn(column.id);
    }
  });

  const text = document.createElement("span");
  text.textContent = column.headerName;
  label.append(checkbox, text);
  return label;
}

function createPinButton(
  label: string,
  text: string,
  enabled: boolean,
  onClick: () => void
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__tool-panel-pin";
  button.textContent = text;
  button.disabled = !enabled;
  button.setAttribute("aria-label", getPinButtonLabel(label, text));
  button.addEventListener("click", onClick);
  return button;
}

function getPinButtonLabel(label: string, text: string): string {
  if (text === "-") {
    return `Unpin ${label}`;
  }

  return `Pin ${label} ${text === "L" ? "left" : "right"}`;
}
