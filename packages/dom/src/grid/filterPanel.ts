import type {
  FilterCondition,
  FilterKind,
  NormalizedDataColumn
} from "@onegrid/core";
import { attachOverlayFocusTrap } from "./focusTrap.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import type { FocusTrapHandle } from "./focusTrap.js";
import { positionOverlay } from "./overlayPosition.js";
import { attachOverlayScrollSync } from "./overlayScrollSync.js";
import type { OverlayScrollSyncHandle } from "./overlayScrollSync.js";

let nextFilterPanelId = 0;

export function showColumnFilterPanel<TData>(
  anchor: HTMLElement,
  column: NormalizedDataColumn<TData>,
  runtime: HeaderFilterRuntime
): void {
  closeOpenFilterPanels();
  const kind = resolveFilterKind(column);
  const panel = document.createElement("form");
  panel.className = "og-grid__filter-panel";
  panel.id = createFilterPanelId(column);
  panel.dataset.filterPanelField = column.field;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", `Filter ${column.headerName}`);
  panel.tabIndex = -1;

  const title = document.createElement("div");
  title.className = "og-grid__filter-panel-title";
  title.textContent = `Filter ${column.headerName}`;

  const body = document.createElement("div");
  body.className = "og-grid__filter-panel-body";
  panel.append(title, body);

  const closePanel = attachPanelClose(panel, anchor);
  let focusTrap: FocusTrapHandle | undefined;
  let scrollSync: OverlayScrollSyncHandle | undefined;
  const conditions = getColumnConditions(runtime, column.field);
  if (kind === "set") {
    renderSetFilter(body, column, runtime, closePanel);
  } else if (kind === "boolean") {
    renderBooleanFilter(panel, body, column, runtime, conditions, closePanel);
  } else {
    renderValueFilter(panel, body, column, kind, runtime, conditions, closePanel);
  }

  document.body.append(panel);
  const reposition = (): void => {
    positionOverlay({ anchor, overlay: panel });
  };
  reposition();
  scrollSync = attachOverlayScrollSync({
    anchor,
    onUpdate: reposition,
    onAnchorMissing: closePanel
  });
  focusTrap = attachOverlayFocusTrap(panel, {
    restoreFocusTo: anchor,
    onEscape: closePanel
  });
  panel.addEventListener("filter-panel-close", () => {
    focusTrap?.destroy();
    focusTrap = undefined;
    scrollSync?.destroy();
    scrollSync = undefined;
  });
  panel.querySelector<HTMLElement>("input,select,button")?.focus();
}

function renderValueFilter<TData>(
  panel: HTMLFormElement,
  body: HTMLElement,
  column: NormalizedDataColumn<TData>,
  kind: Exclude<FilterKind, "set" | "boolean">,
  runtime: HeaderFilterRuntime,
  conditions: readonly FilterCondition[],
  closePanel: () => void
): void {
  const first = conditions[0];
  const second = conditions[1];
  const firstRow = createConditionRow(column, kind, first, 1);
  const secondRow = createConditionRow(column, kind, second, 2);
  body.append(firstRow.row, secondRow.row);
  body.append(createPanelActions(column, runtime, closePanel, () => {
    const next = [firstRow.getCondition(), secondRow.getCondition()].filter(
      (condition): condition is FilterCondition => condition !== undefined
    );
    runtime.applyColumnFilter(column.field, next);
  }));
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = [firstRow.getCondition(), secondRow.getCondition()].filter(
      (condition): condition is FilterCondition => condition !== undefined
    );
    runtime.applyColumnFilter(column.field, next);
    closePanel();
  });
}

function renderBooleanFilter<TData>(
  panel: HTMLFormElement,
  body: HTMLElement,
  column: NormalizedDataColumn<TData>,
  runtime: HeaderFilterRuntime,
  conditions: readonly FilterCondition[],
  closePanel: () => void
): void {
  const select = document.createElement("select");
  select.className = "og-grid__filter-input";
  select.setAttribute("aria-label", `${column.headerName} filter value`);
  for (const [label, value] of [["True", "true"], ["False", "false"]] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = String(conditions[0]?.value ?? "true");
  body.append(select, createPanelActions(column, runtime, closePanel, () => {
    runtime.applyColumnFilter(column.field, [{
      field: column.field,
      kind: "boolean",
      operator: "equals",
      value: select.value === "true"
    }]);
  }));
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    runtime.applyColumnFilter(column.field, [{
      field: column.field,
      kind: "boolean",
      operator: "equals",
      value: select.value === "true"
    }]);
    closePanel();
  });
}

function renderSetFilter<TData>(
  body: HTMLElement,
  column: NormalizedDataColumn<TData>,
  runtime: HeaderFilterRuntime,
  closePanel: () => void
): void {
  const status = document.createElement("div");
  status.className = "og-grid__filter-loading";
  status.textContent = "Loading values";
  body.append(status);

  void runtime.getDistinctValues(column.field).then((values) => {
    if (!body.isConnected) {
      return;
    }

    const selected = new Set(getSelectedSetValues(runtime, column.field));
    const valuesByKey = new Map<string, unknown>();
    const list = document.createElement("div");
    list.className = "og-grid__filter-set-list";
    list.setAttribute("role", "group");
    list.setAttribute("aria-label", `${column.headerName} values`);
    for (const value of values) {
      const key = String(value);
      valuesByKey.set(key, value);
      const label = document.createElement("label");
      label.className = "og-grid__filter-set-option";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "og-grid__checkbox";
      checkbox.value = key;
      checkbox.checked = selected.size === 0 || selected.has(key);
      const text = document.createElement("span");
      text.textContent = key;
      label.append(checkbox, text);
      list.append(label);
    }

    status.replaceWith(list, createPanelActions(column, runtime, closePanel, () => {
      const checked = [...list.querySelectorAll<HTMLInputElement>("input:checked")]
        .map((input) => valuesByKey.get(input.value) ?? input.value);
      runtime.applyColumnFilter(column.field, [{
        field: column.field,
        kind: "set",
        operator: "in",
        value: checked
      }]);
    }));
    list.querySelector<HTMLInputElement>("input")?.focus();
  });
}

function createConditionRow<TData>(
  column: NormalizedDataColumn<TData>,
  kind: Exclude<FilterKind, "set" | "boolean">,
  condition: FilterCondition | undefined,
  index: 1 | 2
) {
  const row = document.createElement("div");
  row.className = "og-grid__filter-condition";
  const operator = document.createElement("select");
  operator.className = "og-grid__filter-input";
  operator.setAttribute("aria-label", `${column.headerName} filter operator ${index}`);
  for (const item of getOperators(kind)) {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    operator.append(option);
  }
  operator.value = condition?.operator ?? operator.options[0]?.value ?? "contains";

  const value = document.createElement("input");
  value.className = "og-grid__filter-input";
  value.type = getInputType(kind);
  value.value = String(condition?.value ?? "");
  value.setAttribute("aria-label", `${column.headerName} filter value ${index}`);
  row.append(operator, value);

  return {
    row,
    getCondition(): FilterCondition | undefined {
      if (!value.value.trim()) {
        return undefined;
      }
      return {
        field: column.field,
        kind,
        operator: operator.value,
        value: value.value
      };
    }
  };
}

function createPanelActions<TData>(
  column: NormalizedDataColumn<TData>,
  runtime: HeaderFilterRuntime,
  closePanel: () => void,
  apply: () => void
): HTMLElement {
  const actions = document.createElement("div");
  actions.className = "og-grid__filter-actions";

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "og-grid__filter-button";
  clear.textContent = "Clear";
  clear.setAttribute("aria-label", `Clear ${column.headerName} filter`);
  clear.addEventListener("click", () => {
    runtime.clearColumnFilter(column.field);
    closePanel();
  });

  const submit = document.createElement("button");
  submit.type = "button";
  submit.className = "og-grid__filter-button og-grid__filter-button--primary";
  submit.textContent = "Apply";
  submit.setAttribute("aria-label", `Apply ${column.headerName} filter`);
  submit.addEventListener("click", () => {
    apply();
    closePanel();
  });

  actions.append(clear, submit);
  return actions;
}

function resolveFilterKind<TData>(column: NormalizedDataColumn<TData>): FilterKind {
  const filter = column.source.filter;
  if (typeof filter === "string") {
    return filter;
  }
  if (filter && typeof filter === "object") {
    return filter.kind;
  }
  if (column.source.type === "number") {
    return "number";
  }
  if (column.source.type === "date" || column.source.type === "datetime") {
    return "date";
  }
  if (column.source.type === "boolean") {
    return "boolean";
  }
  return "text";
}

function getColumnConditions(
  runtime: HeaderFilterRuntime,
  field: string
): readonly FilterCondition[] {
  return (runtime.filterModel.conditions ?? []).filter((condition) => condition.field === field);
}

function getSelectedSetValues(runtime: HeaderFilterRuntime, field: string): readonly string[] {
  const condition = getColumnConditions(runtime, field).find((item) => item.kind === "set");
  const values = Array.isArray(condition?.value) ? condition.value : [];
  return values.map((value) => String(value));
}

function getOperators(kind: Exclude<FilterKind, "set" | "boolean">) {
  if (kind === "number" || kind === "date") {
    return [
      { value: "=", label: "=" },
      { value: "!=", label: "!=" },
      { value: ">", label: ">" },
      { value: ">=", label: ">=" },
      { value: "<", label: "<" },
      { value: "<=", label: "<=" }
    ];
  }
  if (kind === "custom") {
    return [{ value: "custom", label: "custom" }];
  }
  return [
    { value: "contains", label: "contains" },
    { value: "equals", label: "equals" },
    { value: "startsWith", label: "starts with" },
    { value: "endsWith", label: "ends with" }
  ];
}

function getInputType(kind: Exclude<FilterKind, "set" | "boolean">): string {
  if (kind === "number") {
    return "number";
  }
  if (kind === "date") {
    return "date";
  }
  return "text";
}

function attachPanelClose(panel: HTMLElement, anchor: HTMLElement): () => void {
  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (!panel.contains(event.target as Node) && !anchor.contains(event.target as Node)) {
      closePanel();
    }
  };
  const closePanel = (): void => {
    panel.dispatchEvent(new CustomEvent("filter-panel-close"));
    panel.remove();
    document.removeEventListener("pointerdown", onDocumentPointerDown);
  };
  window.setTimeout(() => {
    document.addEventListener("pointerdown", onDocumentPointerDown);
  });
  return closePanel;
}

function closeOpenFilterPanels(): void {
  document.querySelectorAll<HTMLElement>(".og-grid__filter-panel").forEach((panel) => {
    panel.dispatchEvent(new CustomEvent("filter-panel-close"));
    panel.remove();
  });
}

function createFilterPanelId<TData>(column: NormalizedDataColumn<TData>): string {
  return `og-filter-panel-${column.id.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}-${++nextFilterPanelId}`;
}
