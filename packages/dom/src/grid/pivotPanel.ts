import type { ClientPivotMeta, PivotModel, PivotTotalMode, PivotValueModel, SummaryKind } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";
import {
  addPivotField,
  canDropPivotField,
  clonePivotModel,
  collectPivotFieldOptions,
  freezePivotModel,
  getPivotValueAggregate,
  getPivotValueField,
  insertPivotField,
  movePivotField,
  movePivotFieldToBucket,
  pivotAggregateOptions,
  removePivotField,
  setPivotSubtotals,
  setPivotTotals,
  setPivotValueAggregate,
  type PivotBucketKey,
  type PivotFieldOption
} from "./pivotModelRuntime.js";
import {
  attachPivotDragSource,
  createPivotActionButton,
  createPivotBucketTitle,
  createPivotDropSection,
  createPivotEmptyItem,
  createPivotInfoItem,
  createPivotItemLabel,
  createPivotItemMeta,
  createPivotToggleButton
} from "./pivotPanelDom.js";

let nextPivotPanelId = 0;

export interface PivotBuilderRuntime {
  readonly getModel: () => PivotModel | undefined;
  readonly applyModel: (model: PivotModel) => void;
}

export function createPivotToolbar<TData>(
  options: DomGridOptions<TData>,
  meta: ClientPivotMeta | undefined,
  runtime?: PivotBuilderRuntime
): HTMLElement | undefined {
  const initialModel = runtime?.getModel() ?? options.pivot?.model;
  if (options.pivot?.panel !== true || !initialModel) {
    return undefined;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "og-grid__toolbar og-grid__pivot-toolbar";

  const state = createBuilderState(initialModel);
  const fields = collectPivotFieldOptions(options.columns);
  const serverOnly = options.pivot.serverOnly === true;
  const button = createPivotToggleButton();
  const panel = createPivotPanel({ state, fields, meta, serverOnly, runtime, button });

  button.setAttribute("aria-controls", panel.id);
  button.addEventListener("click", () => {
    if (panel.hidden) {
      state.committed = clonePivotModel(runtime?.getModel() ?? state.committed);
      state.draft = clonePivotModel(state.committed);
      renderPivotPanel(panel, { state, fields, meta, serverOnly, runtime, button });
    }
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });

  toolbar.append(button, panel);
  return toolbar;
}

interface BuilderState {
  committed: PivotModel;
  draft: PivotModel;
  fieldQuery: string;
}

interface PanelInput {
  readonly state: BuilderState;
  readonly fields: readonly PivotFieldOption[];
  readonly meta: ClientPivotMeta | undefined;
  readonly serverOnly: boolean;
  readonly runtime: PivotBuilderRuntime | undefined;
  readonly button: HTMLButtonElement;
}

function createBuilderState(model: PivotModel): BuilderState {
  return {
    committed: clonePivotModel(model),
    draft: clonePivotModel(model),
    fieldQuery: ""
  };
}

function createPivotPanel(input: PanelInput): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "og-grid__pivot-panel";
  panel.id = `og-pivot-panel-${++nextPivotPanelId}`;
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-label", input.serverOnly ? "Server pivot panel" : "Client pivot panel");
  panel.hidden = true;
  renderPivotPanel(panel, input);
  return panel;
}

function renderPivotPanel(panel: HTMLElement, input: PanelInput): void {
  panel.replaceChildren(
    createPanelHeader(input),
    createBucket("Rows", "rows", input),
    createBucket("Columns", "columns", input),
    createBucket("Values", "values", input),
    createFieldCatalog(input),
    createTotalsSection(input),
    createRuntimeSection(input),
    createPanelFooter(panel, input)
  );
}

function createPanelHeader(input: PanelInput): HTMLElement {
  const header = document.createElement("div");
  header.className = "og-grid__pivot-panel-header";

  const title = document.createElement("strong");
  title.textContent = "Pivot builder";

  const status = document.createElement("span");
  status.className = "og-grid__pivot-mode";
  status.textContent = isDirty(input.state) ? "Draft changes" : input.serverOnly ? "Server-owned" : "Client computed";

  header.append(title, status);
  return header;
}

function createBucket(label: string, bucket: PivotBucketKey, input: PanelInput): HTMLElement {
  const section = createPivotDropSection(`${label} pivot fields`, (payload, position) => {
    input.state.draft = payload.sourceBucket === undefined || payload.sourceIndex === undefined
      ? insertPivotField(input.state.draft, bucket, payload.field, payload.label, position.index)
      : movePivotFieldToBucket(
          input.state.draft,
          payload.sourceBucket,
          payload.sourceIndex,
          bucket,
          payload.label,
          position.index
        );
    renderPivotPanel(section.parentElement as HTMLElement, input);
  }, (payload) => canDropPivotField(input.state.draft, bucket, payload.field, payload.sourceBucket));
  section.className = "og-grid__pivot-bucket";

  section.append(createPivotBucketTitle(label), createBucketList(bucket, input));
  return section;
}

function createBucketList(bucket: PivotBucketKey, input: PanelInput): HTMLUListElement {
  const list = document.createElement("ul");
  list.className = "og-grid__pivot-list";
  const values = getBucketValues(input.state.draft, bucket);
  if (values.length === 0) {
    list.append(createPivotEmptyItem("Drop fields here"));
    return list;
  }

  values.forEach((value, index) => {
    list.append(createBucketItem(bucket, value, index, input));
  });
  return list;
}

function createBucketItem(
  bucket: PivotBucketKey,
  value: string | PivotValueModel,
  index: number,
  input: PanelInput
): HTMLLIElement {
  const field = bucket === "values" ? getPivotValueField(value as PivotValueModel) : String(value);
  const item = document.createElement("li");
  item.className = "og-grid__pivot-item";
  item.dataset.pivotField = field;
  item.dataset.pivotIndex = String(index);
  attachPivotDragSource(item, { field, sourceBucket: bucket, sourceIndex: index, label: field });

  const content = document.createElement("span");
  content.className = "og-grid__pivot-item-content";
  content.append(createPivotItemLabel(formatItemLabel(value)), createPivotItemMeta(formatItemMeta(bucket, value)));

  const controls = document.createElement("span");
  controls.className = "og-grid__pivot-item-controls";
  if (bucket === "values") {
    controls.append(createAggregateSelect(value as PivotValueModel, index, input));
  }
  controls.append(
    createPivotActionButton("Move up", () => updateDraft(input, movePivotField(input.state.draft, bucket, index, -1))),
    createPivotActionButton("Move down", () => updateDraft(input, movePivotField(input.state.draft, bucket, index, 1))),
    createPivotActionButton(`Remove ${field} from ${bucket}`, () =>
      updateDraft(input, removePivotField(input.state.draft, bucket, index))
    )
  );

  item.append(content, controls);
  return item;
}

function createFieldCatalog(input: PanelInput): HTMLElement {
  const section = document.createElement("section");
  section.className = "og-grid__pivot-bucket og-grid__pivot-field-catalog";
  section.setAttribute("aria-label", "Available pivot fields");
  section.append(createPivotBucketTitle("Fields"));

  const search = createFieldSearch(input);
  const list = document.createElement("ul");
  list.className = "og-grid__pivot-list";
  renderFieldList(list, input);
  search.addEventListener("input", () => {
    input.state.fieldQuery = search.value;
    renderFieldList(list, input);
  });
  section.append(search, list);
  return section;
}

function createFieldOption(field: PivotFieldOption, input: PanelInput): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "og-grid__pivot-item og-grid__pivot-field-option";
  attachPivotDragSource(item, field);

  const content = document.createElement("span");
  content.className = "og-grid__pivot-item-content";
  content.append(createPivotItemLabel(field.label), createPivotItemMeta(field.field));

  const controls = document.createElement("span");
  controls.className = "og-grid__pivot-item-controls";
  controls.append(
    createPivotActionButton(`Add ${field.field} to rows`, () =>
      updateDraft(input, addPivotField(input.state.draft, "rows", field.field, field.label))
    ),
    createPivotActionButton(`Add ${field.field} to columns`, () =>
      updateDraft(input, addPivotField(input.state.draft, "columns", field.field, field.label))
    ),
    createPivotActionButton(`Add ${field.field} to values`, () =>
      updateDraft(input, addPivotField(input.state.draft, "values", field.field, field.label))
    )
  );

  item.append(content, controls);
  return item;
}

function createFieldSearch(input: PanelInput): HTMLInputElement {
  const search = document.createElement("input");
  search.type = "search";
  search.className = "og-grid__pivot-search";
  search.placeholder = "Search fields";
  search.value = input.state.fieldQuery;
  search.setAttribute("aria-label", "Search pivot fields");
  return search;
}

function renderFieldList(list: HTMLUListElement, input: PanelInput): void {
  list.replaceChildren();
  const fields = filterFields(input.fields, input.state.fieldQuery);
  if (fields.length === 0) {
    list.append(createPivotEmptyItem("No matching fields"));
    return;
  }
  fields.forEach((field) => list.append(createFieldOption(field, input)));
}

function filterFields(
  fields: readonly PivotFieldOption[],
  query: string
): readonly PivotFieldOption[] {
  const normalized = query.trim().toLowerCase();
  return normalized === ""
    ? fields
    : fields.filter((field) =>
        field.field.toLowerCase().includes(normalized)
          || field.label.toLowerCase().includes(normalized)
      );
}

function createTotalsSection(input: PanelInput): HTMLElement {
  const section = document.createElement("section");
  section.className = "og-grid__pivot-bucket og-grid__pivot-controls";
  section.setAttribute("aria-label", "Pivot totals");
  section.append(createPivotBucketTitle("Totals"));

  const totals = document.createElement("select");
  totals.setAttribute("aria-label", "Pivot totals mode");
  for (const value of ["none", "rows", "columns", "both"] as const) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = (input.state.draft.totals ?? "none") === value;
    totals.append(option);
  }
  totals.addEventListener("change", () =>
    updateDraft(input, setPivotTotals(input.state.draft, totals.value as PivotTotalMode))
  );

  const subtotals = document.createElement("label");
  subtotals.className = "og-grid__pivot-checkbox";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = input.state.draft.subtotals === true;
  checkbox.addEventListener("change", () =>
    updateDraft(input, setPivotSubtotals(input.state.draft, checkbox.checked))
  );
  subtotals.append(checkbox, " Subtotals");

  section.append(totals, subtotals);
  return section;
}

function createRuntimeSection(input: PanelInput): HTMLElement {
  const section = document.createElement("section");
  section.className = "og-grid__pivot-bucket";
  section.setAttribute("aria-label", "Pivot runtime");
  section.append(createPivotBucketTitle("Runtime"));
  const list = document.createElement("ul");
  list.className = "og-grid__pivot-list";
  const items = input.serverOnly
    ? [{ label: "Execution", meta: "DataSource owns pivot result" }, { label: "Request", meta: "pivotModel forwarded" }]
    : [{ label: "Rendered rows", meta: String(input.meta?.dataRowCount ?? 0) }, { label: "Pivot columns", meta: String(input.meta?.pivotColumnCount ?? 0) }];
  items.forEach((item) => list.append(createPivotInfoItem(item.label, item.meta)));
  section.append(list);
  return section;
}

function createPanelFooter(panel: HTMLElement, input: PanelInput): HTMLElement {
  const footer = document.createElement("div");
  footer.className = "og-grid__pivot-panel-footer";
  const apply = createPivotActionButton("Apply pivot model", () => {
    const nextModel = freezePivotModel(input.state.draft);
    input.runtime?.applyModel(nextModel);
    input.state.committed = clonePivotModel(nextModel);
    panel.hidden = true;
    input.button.setAttribute("aria-expanded", "false");
  });
  apply.disabled = !isDirty(input.state);
  footer.append(
    apply,
    createPivotActionButton("Reset pivot draft", () => updateDraft(input, clonePivotModel(input.state.committed))),
    createPivotActionButton("Cancel pivot builder", () => {
      input.state.draft = clonePivotModel(input.state.committed);
      panel.hidden = true;
      input.button.setAttribute("aria-expanded", "false");
    })
  );
  return footer;
}

function createAggregateSelect(value: PivotValueModel, index: number, input: PanelInput): HTMLSelectElement {
  const select = document.createElement("select");
  const field = getPivotValueField(value);
  select.setAttribute("aria-label", `Change ${field} aggregate`);
  const activeAggregate = getPivotValueAggregate(value);
  for (const aggregate of pivotAggregateOptions) {
    const option = document.createElement("option");
    option.value = aggregate;
    option.textContent = aggregate;
    option.selected = aggregate === activeAggregate;
    select.append(option);
  }
  select.addEventListener("change", () =>
    updateDraft(input, setPivotValueAggregate(input.state.draft, index, select.value as SummaryKind))
  );
  return select;
}

function updateDraft(input: PanelInput, model: PivotModel): void {
  input.state.draft = model;
  renderPivotPanel(input.button.nextElementSibling as HTMLElement, input);
}

function getBucketValues(model: PivotModel, bucket: PivotBucketKey): readonly (string | PivotValueModel)[] {
  return bucket === "values" ? model.values : model[bucket];
}

function formatItemLabel(value: string | PivotValueModel): string {
  if (typeof value === "string") {
    return value;
  }
  return value.label ?? value.alias ?? value.field;
}

function formatItemMeta(bucket: PivotBucketKey, value: string | PivotValueModel): string {
  if (bucket !== "values") {
    return String(value);
  }
  const pivotValue = value as PivotValueModel;
  return `${getPivotValueAggregate(pivotValue)}(${getPivotValueField(pivotValue)})`;
}

function isDirty(state: BuilderState): boolean {
  return JSON.stringify(state.draft) !== JSON.stringify(state.committed);
}
