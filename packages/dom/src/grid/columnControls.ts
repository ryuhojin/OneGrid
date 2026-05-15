import { canMoveColumn, canResizeColumn } from "@onegrid/core";
import type {
  ColumnModel,
  ColumnMenuExtensionPayload,
  ColumnUiOptions,
  ColumnUiState,
  GridPluginExtension,
  HeaderCell,
  NormalizedDataColumn,
  PinnedSide
} from "@onegrid/core";
import { createColumnMenuButton } from "./columnMenu.js";
import { createToolPanel } from "./columnToolPanel.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";

export interface ColumnUiRuntime {
  readonly headerMenuExtensions?: HeaderMenuExtensionRuntime;
  resizeColumn(columnId: string, width: number): void;
  autoSizeColumn(columnId: string): void;
  hideColumn(columnId: string): void;
  showColumn(columnId: string): void;
  pinColumn(columnId: string, pinned: PinnedSide | null): void;
  moveColumnBefore(columnId: string, targetColumnId: string): void;
  moveColumnByOffset(columnId: string, offset: number): void;
}

export interface HeaderMenuExtensionRuntime {
  getExtensions(): readonly GridPluginExtension<ColumnMenuExtensionPayload>[];
}

export interface ResolvedColumnUiOptions {
  readonly resize: boolean;
  readonly autoSize: boolean;
  readonly reorder: boolean;
  readonly menu: boolean;
  readonly toolPanel: boolean;
}

const DRAG_MIME_TYPE = "text/onegrid-column-id";

export function resolveColumnUiOptions(
  options: ColumnUiOptions | undefined
): ResolvedColumnUiOptions {
  return {
    resize: options?.resize === true,
    autoSize: options?.autoSize === true,
    reorder: options?.reorder === true,
    menu: options?.menu === true,
    toolPanel: options?.toolPanel === true
  };
}

export function enhanceHeaderCell<TData>(
  element: HTMLElement,
  cell: HeaderCell,
  model: ColumnModel<TData>,
  state: ColumnUiState,
  options: ResolvedColumnUiOptions,
  runtime: ColumnUiRuntime | undefined,
  filterRuntime?: HeaderFilterRuntime
): void {
  if (!runtime || cell.kind !== "column") {
    return;
  }

  if (options.reorder) {
    attachColumnDragDrop(element, cell, model, runtime);
  }

  const actions = document.createElement("span");
  actions.className = "og-grid__header-actions";

  if (options.menu) {
    actions.append(createColumnMenuButton(cell, model, state, options, runtime, filterRuntime));
  }

  if (actions.childElementCount > 0) {
    element.append(actions);
  }

  if (options.resize) {
    const column = getDataColumn(model, cell.sourceId);
    if (column && canResizeColumn(column)) {
      attachBorderResize(element, cell, model, options, runtime);
      element.append(createResizeHandle(cell, model, options, runtime));
    }
  }
}

export function createColumnToolbar<TData>(
  model: ColumnModel<TData>,
  options: ResolvedColumnUiOptions,
  runtime: ColumnUiRuntime | undefined
): HTMLElement | undefined {
  if (!runtime || !options.toolPanel) {
    return undefined;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "og-grid__toolbar";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__toolbar-button";
  button.textContent = "Columns";
  button.setAttribute("aria-expanded", "false");
  button.setAttribute("aria-haspopup", "dialog");

  const panel = createToolPanel(model, runtime);
  button.setAttribute("aria-controls", panel.id);
  panel.hidden = true;

  button.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
    button.setAttribute("aria-expanded", String(!panel.hidden));
  });

  toolbar.append(button, panel);
  return toolbar;
}

function createResizeHandle<TData>(
  cell: HeaderCell,
  model: ColumnModel<TData>,
  options: ResolvedColumnUiOptions,
  runtime: ColumnUiRuntime
): HTMLButtonElement {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "og-grid__resize-handle";
  handle.draggable = false;
  handle.setAttribute("aria-label", `Resize ${cell.headerName}`);
  handle.addEventListener("dragstart", (event) => {
    event.preventDefault();
  });

  handle.addEventListener("pointerdown", (event) => {
    startColumnResize(cell, model, runtime, event);
  });

  handle.addEventListener("dblclick", (event) => {
    if (!options.autoSize) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    runtime.autoSizeColumn(cell.sourceId);
  });

  return handle;
}

function attachBorderResize<TData>(
  element: HTMLElement,
  cell: HeaderCell,
  model: ColumnModel<TData>,
  options: ResolvedColumnUiOptions,
  runtime: ColumnUiRuntime
): void {
  element.addEventListener("pointerdown", (event) => {
    if (isColumnControlTarget(event.target) || !isResizeZone(element, event.clientX)) {
      return;
    }

    startColumnResize(cell, model, runtime, event);
  });

  element.addEventListener("dblclick", (event) => {
    if (
      isColumnControlTarget(event.target) ||
      !options.autoSize ||
      !isResizeZone(element, event.clientX)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    runtime.autoSizeColumn(cell.sourceId);
  });
}

function startColumnResize<TData>(
  cell: HeaderCell,
  model: ColumnModel<TData>,
  runtime: ColumnUiRuntime,
  event: PointerEvent
): void {
  const column = model.byId.get(cell.sourceId);
  if (!column || column.kind !== "data") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  const startX = event.clientX;
  const startWidth = column.width;

  document.body.classList.add("og-grid--resizing-column");
  if (event.currentTarget instanceof HTMLElement) {
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  const onPointerMove = (nextEvent: PointerEvent): void => {
    const nextWidth = startWidth + nextEvent.clientX - startX;
    runtime.resizeColumn(cell.sourceId, nextWidth);
  };
  const onPointerEnd = (): void => {
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerCancel);
    document.body.classList.remove("og-grid--resizing-column");
  };
  const onPointerUp = (): void => {
    onPointerEnd();
  };
  const onPointerCancel = (): void => {
    onPointerEnd();
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerCancel);
}

function isResizeZone(element: HTMLElement, clientX: number): boolean {
  const rect = element.getBoundingClientRect();
  return clientX >= rect.right - 8 && clientX <= rect.right + 6;
}

function attachColumnDragDrop<TData>(
  element: HTMLElement,
  cell: HeaderCell,
  model: ColumnModel<TData>,
  runtime: ColumnUiRuntime
): void {
  const column = getDataColumn(model, cell.sourceId);
  if (!column || !canMoveColumn(column)) {
    return;
  }

  element.draggable = true;
  element.addEventListener("pointerdown", (event) => {
    if (
      event.button !== 0 ||
      isColumnControlTarget(event.target) ||
      isResizeZone(element, event.clientX)
    ) {
      return;
    }

    const startX = event.clientX;
    const startY = event.clientY;
    const onPointerUp = (upEvent: PointerEvent): void => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      if (Math.hypot(upEvent.clientX - startX, upEvent.clientY - startY) < 6) {
        return;
      }

      const dropTarget = document
        .elementFromPoint(upEvent.clientX, upEvent.clientY)
        ?.closest<HTMLElement>('[role="columnheader"][data-source-id]');
      const targetColumnId = dropTarget?.dataset.sourceId;
      if (targetColumnId && targetColumnId !== cell.sourceId) {
        runtime.moveColumnBefore(cell.sourceId, targetColumnId);
      }
    };
    const onPointerCancel = (): void => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
    };

    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
  });
  element.addEventListener("dragstart", (event) => {
    if (isColumnControlTarget(event.target)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer?.setData(DRAG_MIME_TYPE, cell.sourceId);
    event.dataTransfer?.setData("text/plain", cell.sourceId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
    }
  });
  element.addEventListener("dragover", (event) => {
    event.preventDefault();
  });
  element.addEventListener("drop", (event) => {
    event.preventDefault();
    const sourceId =
      event.dataTransfer?.getData(DRAG_MIME_TYPE) || event.dataTransfer?.getData("text/plain");

    if (sourceId && sourceId !== cell.sourceId) {
      runtime.moveColumnBefore(sourceId, cell.sourceId);
    }
  });
}

function isColumnControlTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(".og-grid__resize-handle, .og-grid__menu-button") !== null
  );
}

function getDataColumn<TData>(
  model: ColumnModel<TData>,
  columnId: string
): NormalizedDataColumn<TData> | undefined {
  const column = model.byId.get(columnId);
  return column?.kind === "data" ? column : undefined;
}
