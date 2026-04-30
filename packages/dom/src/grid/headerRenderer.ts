import type {
  ColumnModel,
  ColumnUiState,
  HeaderCell,
  HeaderRow,
  LayoutPane,
  NormalizedColumn,
  SecurityOptions,
  SortingOptions
} from "@onegrid/core";
import { enhanceHeaderCell } from "./columnControls.js";
import { applyPaneVirtualInlineWindow } from "./paneVirtualStyles.js";
import { renderHeaderHost } from "./rendererHost.js";
import type { ColumnUiRuntime, ResolvedColumnUiOptions } from "./columnControls.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import type { HeaderSortRuntime } from "./sortRuntime.js";

export interface HeaderPaneOptions<TData> {
  readonly rows: readonly HeaderRow[];
  readonly columnTemplate: string;
  readonly ariaColumnOffset: number;
  readonly rowCount: number;
  readonly columnModel: ColumnModel<TData>;
  readonly columnState: ColumnUiState;
  readonly columnUi: ResolvedColumnUiOptions;
  readonly runtime: ColumnUiRuntime | undefined;
  readonly sorting?: SortingOptions;
  readonly sortRuntime?: HeaderSortRuntime;
  readonly filterRuntime?: HeaderFilterRuntime;
  readonly pane?: LayoutPane<TData>;
  readonly security?: SecurityOptions;
}

export function createHeaderPane<TData>(options: HeaderPaneOptions<TData>): HTMLElement {
  const header = document.createElement("div");
  header.className = "og-grid__header";
  header.style.gridTemplateColumns = options.columnTemplate;
  header.style.gridTemplateRows = `repeat(${options.rowCount}, var(--og-header-height))`;
  header.setAttribute("role", "rowgroup");
  if (options.pane) {
    applyPaneVirtualInlineWindow(header, options.pane);
  }

  for (const row of options.rows) {
    const headerRow = document.createElement("div");
    headerRow.className = "og-grid__header-row";
    headerRow.setAttribute("role", row.cells.length === 0 ? "presentation" : "row");
    headerRow.setAttribute("aria-rowindex", String(row.depth + 1));
    if (row.cells.length === 0) {
      headerRow.setAttribute("aria-hidden", "true");
    }
    for (const cell of row.cells) {
      headerRow.append(createHeaderCell(cell, options));
    }
    header.append(headerRow);
  }

  return header;
}

function createHeaderCell<TData>(
  cell: HeaderCell,
  options: HeaderPaneOptions<TData>
): HTMLElement {
  const element = document.createElement("div");
  element.className = getHeaderCellClassName(cell);
  element.style.gridColumn = `${cell.startLeafIndex + 1} / span ${cell.colSpan}`;
  element.style.gridRow = `${cell.depth + 1} / span ${cell.rowSpan}`;
  element.setAttribute("role", "columnheader");
  element.setAttribute("aria-colindex", String(options.ariaColumnOffset + cell.startLeafIndex + 1));
  element.setAttribute("aria-colspan", String(cell.colSpan));
  element.setAttribute("aria-rowspan", String(cell.rowSpan));
  element.setAttribute("aria-label", cell.ariaLabel);
  element.dataset.headerId = cell.id;
  element.dataset.headerKind = cell.kind;
  element.dataset.sourceId = cell.sourceId;

  const title = document.createElement("span");
  title.className = "og-grid__header-title";
  const column = options.columnModel.byId.get(cell.sourceId);
  renderHeaderHost({
    host: title,
    cell,
    column,
    ...(options.security === undefined ? {} : { security: options.security })
  });
  element.append(title);
  enhanceSortableHeader(element, cell, column, options);
  enhanceFilterableHeader(element, cell, column, options);

  for (const label of cell.labels ?? []) {
    const badge = document.createElement("span");
    badge.className = "og-grid__header-label";
    badge.dataset.headerLabelId = label.id;
    badge.textContent = label.text;
    badge.setAttribute("aria-hidden", "true");
    element.append(badge);
  }

  enhanceHeaderCell(
    element,
    cell,
    options.columnModel,
    options.columnState,
    options.columnUi,
    options.runtime,
    options.filterRuntime
  );
  return element;
}

function enhanceSortableHeader<TData>(
  element: HTMLElement,
  cell: HeaderCell,
  column: NormalizedColumn<TData> | undefined,
  options: HeaderPaneOptions<TData>
): void {
  if (
    cell.kind !== "column"
    || column?.kind !== "data"
    || options.sorting?.enabled === false
    || column.source.sortable === false
  ) {
    return;
  }

  const sort = options.sortRuntime?.sortModel.find((item) => item.field === column.field);
  element.classList.add("og-grid__header-cell--sortable");
  element.tabIndex = 0;
  element.dataset.sortable = "true";
  element.setAttribute("aria-sort", getAriaSort(sort?.direction));
  if (sort) {
    element.dataset.sortDirection = sort.direction;
    element.dataset.sortPriority = String((sort.priority ?? 0) + 1);
  }

  if (sort) {
    const indicator = document.createElement("span");
    indicator.className = "og-grid__sort-indicator";
    indicator.setAttribute("aria-hidden", "true");
    element.append(indicator);
  }

  if (sort && (options.sortRuntime?.sortModel.length ?? 0) > 1) {
    const priority = document.createElement("span");
    priority.className = "og-grid__sort-priority";
    priority.textContent = String((sort.priority ?? 0) + 1);
    priority.setAttribute("aria-hidden", "true");
    element.append(priority);
  }

  element.addEventListener("click", (event) => {
    if (isInteractiveHeaderTarget(event.target)) {
      return;
    }
    options.sortRuntime?.toggleSort(column.field, event.shiftKey);
  });

  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    options.sortRuntime?.toggleSort(column.field, event.shiftKey);
  });
}

function enhanceFilterableHeader<TData>(
  element: HTMLElement,
  cell: HeaderCell,
  column: NormalizedColumn<TData> | undefined,
  options: HeaderPaneOptions<TData>
): void {
  if (
    cell.kind !== "column"
    || column?.kind !== "data"
    || options.filterRuntime?.isColumnFiltered(column.field) !== true
  ) {
    return;
  }

  element.classList.add("og-grid__header-cell--filtered");
  element.dataset.filtered = "true";
  const indicator = document.createElement("span");
  indicator.className = "og-grid__filter-indicator";
  indicator.setAttribute("aria-hidden", "true");
  element.append(indicator);
}

function getAriaSort(direction: "asc" | "desc" | undefined): string {
  if (direction === "asc") {
    return "ascending";
  }
  if (direction === "desc") {
    return "descending";
  }
  return "none";
}

function isInteractiveHeaderTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest("button,input,select,textarea,a,[role='button'],[role='menuitem']") !== null;
}

function getHeaderCellClassName(cell: HeaderCell): string {
  const classNames = ["og-grid__header-cell", `og-grid__header-cell--${cell.kind}`];
  if (cell.pinned) {
    classNames.push(`og-grid__header-cell--pinned-${cell.pinned}`);
  }

  return classNames.join(" ");
}
