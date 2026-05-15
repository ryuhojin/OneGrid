export interface PivotDragPayload {
  readonly field: string;
  readonly sourceBucket?: "rows" | "columns" | "values";
  readonly sourceIndex?: number;
  readonly label?: string;
}

export interface PivotDropPosition {
  readonly index: number;
}

export function createPivotToggleButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__toolbar-button";
  button.textContent = "Pivot fields";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "true");
  return button;
}

export function createPivotDropSection(
  label: string,
  onDropPayload: (payload: PivotDragPayload, position: PivotDropPosition) => void,
  canDropPayload: (payload: PivotDragPayload) => boolean = () => true
): HTMLElement {
  const section = document.createElement("section");
  section.setAttribute("aria-label", label);
  section.addEventListener("dragover", (event) => {
    event.preventDefault();
    updateDropState(section, event, canDropPayload);
  });
  section.addEventListener("dragleave", (event) => {
    if (!section.contains(event.relatedTarget as Node | null)) {
      clearDropState(section);
    }
  });
  section.addEventListener("drop", (event) => {
    event.preventDefault();
    const payload = getPivotDragPayload(event);
    const position = getDropPosition(section, event);
    clearDropState(section);
    if (payload && canDropPayload(payload)) {
      onDropPayload(payload, position);
    }
  });
  return section;
}

export function attachPivotDragSource(
  element: HTMLElement,
  payload: PivotDragPayload
): void {
  element.draggable = true;
  element.addEventListener("dragstart", (event) => {
    element.classList.add("og-grid__pivot-item--dragging");
    setPivotDragPayload(event, payload);
  });
  element.addEventListener("dragend", () => {
    element.classList.remove("og-grid__pivot-item--dragging");
  });
}

export function createPivotBucketTitle(label: string): HTMLHeadingElement {
  const title = document.createElement("h3");
  title.className = "og-grid__pivot-bucket-title";
  title.textContent = label;
  return title;
}

export function createPivotItemLabel(value: string): HTMLElement {
  const label = document.createElement("span");
  label.className = "og-grid__pivot-item-label";
  label.textContent = value;
  return label;
}

export function createPivotItemMeta(value: string): HTMLElement {
  const meta = document.createElement("span");
  meta.className = "og-grid__pivot-item-meta";
  meta.textContent = value;
  return meta;
}

export function createPivotInfoItem(label: string, meta: string): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "og-grid__pivot-item";
  item.append(createPivotItemLabel(label), createPivotItemMeta(meta));
  return item;
}

export function createPivotEmptyItem(label: string): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "og-grid__pivot-empty";
  item.textContent = label;
  return item;
}

export function createPivotActionButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__pivot-action";
  button.textContent = label;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", onClick);
  return button;
}

export function setPivotDragPayload(event: DragEvent, payload: PivotDragPayload): void {
  if (!event.dataTransfer) {
    return;
  }
  event.dataTransfer.effectAllowed = "copyMove";
  event.dataTransfer.setData("application/x-onegrid-pivot", JSON.stringify(payload));
  event.dataTransfer.setData("text/plain", payload.field);
  const preview = createDragPreview(payload.label ?? payload.field);
  event.dataTransfer.setDragImage(preview, 8, 8);
  window.setTimeout(() => preview.remove(), 0);
}

function updateDropState(
  section: HTMLElement,
  event: DragEvent,
  canDropPayload: (payload: PivotDragPayload) => boolean
): void {
  const payload = getPivotDragPayload(event);
  const valid = payload !== undefined && canDropPayload(payload);
  clearDropTarget(section);
  section.dataset.dropState = valid ? "valid" : "invalid";
  if (valid) {
    markDropTarget(section, event);
  }
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = valid ? "move" : "none";
  }
}

function clearDropState(section: HTMLElement): void {
  delete section.dataset.dropState;
  clearDropTarget(section);
}

function createDragPreview(label: string): HTMLElement {
  const preview = document.createElement("div");
  preview.className = "og-grid__pivot-drag-preview";
  preview.textContent = label;
  document.body.append(preview);
  return preview;
}

function getPivotDragPayload(event: DragEvent): PivotDragPayload | undefined {
  const raw = event.dataTransfer?.getData("application/x-onegrid-pivot");
  if (!raw) {
    return undefined;
  }
  try {
    const payload = JSON.parse(raw) as PivotDragPayload;
    return typeof payload.field === "string" ? payload : undefined;
  } catch {
    return undefined;
  }
}

function getDropPosition(section: HTMLElement, event: DragEvent): PivotDropPosition {
  const item = getDropItem(section, event);
  if (!item) {
    return { index: getItemCount(section) };
  }
  const index = Number(item.dataset.pivotIndex ?? getItemCount(section));
  const rect = item.getBoundingClientRect();
  return { index: event.clientY > rect.top + rect.height / 2 ? index + 1 : index };
}

function markDropTarget(section: HTMLElement, event: DragEvent): void {
  const item = getDropItem(section, event);
  if (!item) {
    section.dataset.dropPosition = "append";
    return;
  }
  const rect = item.getBoundingClientRect();
  item.dataset.dropPosition = event.clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function clearDropTarget(section: HTMLElement): void {
  delete section.dataset.dropPosition;
  section.querySelectorAll<HTMLElement>("[data-drop-position]")
    .forEach((item) => delete item.dataset.dropPosition);
}

function getDropItem(section: HTMLElement, event: DragEvent): HTMLElement | undefined {
  const target = event.target instanceof Element ? event.target : section;
  const item = target.closest<HTMLElement>(".og-grid__pivot-item[data-pivot-index]");
  return item && section.contains(item) ? item : undefined;
}

function getItemCount(section: HTMLElement): number {
  return section.querySelectorAll(".og-grid__pivot-item[data-pivot-index]").length;
}
