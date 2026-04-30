import {
  createPaginationState,
  getPageCount,
  getPageEndRow,
  getPageStartRow,
  getVisiblePageGroup,
  normalizePageSizeOptions
} from "@onegrid/pagination";
import type { PaginationMode, PaginationPosition, PaginationState } from "@onegrid/pagination";
import type { DomGridOptions } from "./OneGrid.js";
import type { RowRenderState } from "./renderGridTypes.js";

export interface GridPaginationRuntime {
  setPage(page: number): void;
  setPageSize(pageSize: number): void;
  loadNextPage(): void;
}

export interface PaginationRenderModel {
  readonly state: PaginationState;
  readonly position: PaginationPosition;
  readonly pageSizeOptions: readonly number[];
  readonly pageGroupSize: number;
  readonly label: string;
  readonly loading: boolean;
  readonly loadedRowCount: number;
}

export function createPaginationRenderModel<TData>(
  options: DomGridOptions<TData>,
  totalRowCount: number,
  rowRenderState: RowRenderState<TData> | undefined
): PaginationRenderModel | undefined {
  const pagination = options.pagination;
  if (!pagination || pagination.mode === "viewport") {
    return undefined;
  }

  const mode = pagination.mode ?? resolveDefaultMode(options);
  const rowCount = resolvePaginationRowCount(mode, totalRowCount, rowRenderState);
  const state = createPaginationState({
    mode,
    ...(pagination.page === undefined ? {} : { page: pagination.page }),
    ...(pagination.pageSize === undefined ? {} : { pageSize: pagination.pageSize }),
    ...(rowCount === undefined ? {} : { rowCount }),
    ...(rowRenderState?.hasMore === undefined ? {} : { hasMore: rowRenderState.hasMore })
  });

  return {
    state,
    position: pagination.position ?? "bottom",
    pageSizeOptions: normalizePageSizeOptions(state.pageSize, pagination.pageSizeOptions),
    pageGroupSize: pagination.pageGroupSize ?? 5,
    label: options.accessibility?.label ?? "Grid",
    loading: rowRenderState?.loading ?? false,
    loadedRowCount: rowRenderState?.entries.length ?? totalRowCount
  };
}

export function createPaginationToolbar(
  model: PaginationRenderModel,
  runtime: GridPaginationRuntime,
  placement: "top" | "bottom"
): HTMLElement | undefined {
  if (!shouldRenderAt(model.position, placement)) {
    return undefined;
  }

  const toolbar = document.createElement("nav");
  toolbar.className = `og-grid__pagination og-grid__pagination--${placement}`;
  toolbar.setAttribute("aria-label", `${model.label} ${placement} pagination`);
  toolbar.dataset.paginationPlacement = placement;

  const status = document.createElement("span");
  status.className = "og-grid__pagination-status";
  status.textContent = getStatusText(model);
  status.setAttribute("aria-live", "polite");
  toolbar.append(status);

  if (isAppendMode(model.state.mode)) {
    toolbar.append(createButton("Load next page", "Load more", () => runtime.loadNextPage(), {
      disabled: model.loading || model.state.hasMore !== true
    }));
    return toolbar;
  }

  toolbar.append(createButton("First page", "First", () => runtime.setPage(1), {
    disabled: isAtFirstPage(model.state) || model.loading
  }));
  toolbar.append(createButton("Previous page", "Prev", () => runtime.setPage(model.state.page - 1), {
    disabled: isAtFirstPage(model.state) || model.loading
  }));

  for (const page of getVisiblePageGroup(model.state, model.pageGroupSize).pages) {
    toolbar.append(createPageButton(page, model, runtime));
  }

  toolbar.append(createButton("Next page", "Next", () => runtime.setPage(model.state.page + 1), {
    disabled: !canMoveNext(model.state) || model.loading
  }));
  toolbar.append(createLastPageButton(model, runtime));
  toolbar.append(createPageSizeSelect(model, runtime));

  return toolbar;
}

function createPageButton(
  page: number,
  model: PaginationRenderModel,
  runtime: GridPaginationRuntime
): HTMLButtonElement {
  return createButton(`Page ${page}`, String(page), () => runtime.setPage(page), {
    current: page === model.state.page,
    disabled: model.loading
  });
}

function createLastPageButton(
  model: PaginationRenderModel,
  runtime: GridPaginationRuntime
): HTMLButtonElement {
  const pageCount = getPageCount(model.state.rowCount, model.state.pageSize);
  return createButton("Last page", "Last", () => {
    if (pageCount !== undefined) {
      runtime.setPage(pageCount);
    }
  }, {
    disabled: pageCount === undefined || model.state.page >= pageCount || model.loading
  });
}

function createPageSizeSelect(
  model: PaginationRenderModel,
  runtime: GridPaginationRuntime
): HTMLElement {
  const label = document.createElement("label");
  label.className = "og-grid__pagination-size";
  const text = document.createElement("span");
  text.textContent = "Rows per page";
  const select = document.createElement("select");
  select.setAttribute("aria-label", "Rows per page");
  select.disabled = model.loading;
  for (const pageSize of model.pageSizeOptions) {
    const option = document.createElement("option");
    option.value = String(pageSize);
    option.textContent = String(pageSize);
    option.selected = pageSize === model.state.pageSize;
    select.append(option);
  }
  select.addEventListener("change", () => runtime.setPageSize(Number(select.value)));
  label.append(text, select);
  return label;
}

function createButton(
  ariaLabel: string,
  text: string,
  onClick: () => void,
  options: { readonly disabled?: boolean; readonly current?: boolean } = {}
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__pagination-button";
  button.textContent = text;
  button.setAttribute("aria-label", ariaLabel);
  button.disabled = options.disabled === true;
  if (options.current === true) {
    button.setAttribute("aria-current", "page");
  }
  button.addEventListener("click", onClick);
  return button;
}

function getStatusText(model: PaginationRenderModel): string {
  const state = model.state;
  const prefix = model.loading ? "Loading " : "";
  if (isAppendMode(state.mode)) {
    const total = state.rowCount === undefined ? "unknown" : formatNumber(state.rowCount);
    return `${prefix}Loaded ${formatNumber(model.loadedRowCount)} of ${total} rows`;
  }

  const pageCount = getPageCount(state.rowCount, state.pageSize);
  const pageText = pageCount === undefined
    ? `Page ${state.page}`
    : `Page ${state.page} of ${pageCount}`;
  const startRow = state.rowCount === 0 ? 0 : getPageStartRow(state) + 1;
  const endRow = getPageEndRow(state);
  const count = state.rowCount === undefined ? "unknown" : formatNumber(state.rowCount);
  return `${prefix}${pageText} · Rows ${formatNumber(startRow)}-${formatNumber(endRow)} of ${count}`;
}

function resolveDefaultMode<TData>(options: DomGridOptions<TData>): PaginationMode {
  return options.rowModel === "server"
    ? "server"
    : options.rowModel === "infinite" ? "infinite" : "client";
}

function resolvePaginationRowCount<TData>(
  mode: PaginationMode,
  totalRowCount: number,
  rowRenderState: RowRenderState<TData> | undefined
): number | undefined {
  if (mode === "cursor" && rowRenderState?.rowCount === 0) {
    return undefined;
  }

  return totalRowCount;
}

function shouldRenderAt(position: PaginationPosition, placement: "top" | "bottom"): boolean {
  return position === "both" || position === placement;
}

function isAtFirstPage(state: PaginationState): boolean {
  return state.page <= 1;
}

function canMoveNext(state: PaginationState): boolean {
  const pageCount = getPageCount(state.rowCount, state.pageSize);
  if (pageCount === undefined) {
    return state.hasMore !== false;
  }

  return state.page < pageCount;
}

function isAppendMode(mode: PaginationMode): boolean {
  return mode === "append-scroll" || mode === "infinite";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
