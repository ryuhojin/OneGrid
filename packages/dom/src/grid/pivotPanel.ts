import type { ClientPivotMeta, PivotModel, PivotValueModel } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

let nextPivotPanelId = 0;

export function createPivotToolbar<TData>(
  options: DomGridOptions<TData>,
  meta: ClientPivotMeta | undefined
): HTMLElement | undefined {
  if (options.pivot?.panel !== true || !options.pivot.model) {
    return undefined;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "og-grid__toolbar og-grid__pivot-toolbar";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__toolbar-button";
  button.textContent = "Pivot";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "dialog");

  const panel = createPivotPanel(options.pivot.model, meta);
  button.setAttribute("aria-controls", panel.id);
  panel.hidden = true;
  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });

  toolbar.append(button, panel);
  return toolbar;
}

function createPivotPanel(
  model: PivotModel,
  meta: ClientPivotMeta | undefined
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "og-grid__pivot-panel";
  panel.id = `og-pivot-panel-${++nextPivotPanelId}`;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", "Pivot panel");

  panel.append(
    createBucket("Rows", model.rows),
    createBucket("Columns", model.columns),
    createBucket("Values", model.values.map(formatValueField)),
    createBucket("Totals", [model.totals ?? "none", model.subtotals === true ? "subtotals" : "no subtotals"]),
    createBucket("Rendered", [
      `${meta?.dataRowCount ?? 0} rows`,
      `${meta?.pivotColumnCount ?? 0} pivot columns`
    ])
  );
  return panel;
}

function createBucket(label: string, values: readonly string[]): HTMLElement {
  const bucket = document.createElement("section");
  bucket.className = "og-grid__pivot-bucket";
  bucket.setAttribute("aria-label", label);

  const title = document.createElement("h3");
  title.className = "og-grid__pivot-bucket-title";
  title.textContent = label;

  const list = document.createElement("ul");
  list.className = "og-grid__pivot-list";
  for (const value of values.length > 0 ? values : ["None"]) {
    const item = document.createElement("li");
    item.className = "og-grid__pivot-item";
    item.textContent = value;
    list.append(item);
  }

  bucket.append(title, list);
  return bucket;
}

function formatValueField(value: PivotValueModel): string {
  if (typeof value === "string") {
    return `${value}:sum`;
  }

  return `${value.alias ?? value.field}:${value.function ?? "sum"}`;
}
