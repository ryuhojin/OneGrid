export type PaginationMode =
  | "client"
  | "server"
  | "cursor"
  | "append-scroll"
  | "infinite"
  | "viewport";

export type PaginationPosition = "top" | "bottom" | "both";

export interface PaginationState {
  readonly page: number;
  readonly pageSize: number;
  readonly rowCount?: number;
  readonly mode: PaginationMode;
  readonly hasMore?: boolean;
}

export interface CreatePaginationStateInput {
  readonly page?: number;
  readonly pageSize?: number;
  readonly rowCount?: number;
  readonly mode?: PaginationMode;
  readonly hasMore?: boolean;
}

export interface PageGroup {
  readonly firstPage: number;
  readonly lastPage: number;
  readonly pages: readonly number[];
}

export interface PageRange {
  readonly startRow: number;
  readonly endRow: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_GROUP_SIZE = 5;

export function createPaginationState(input: CreatePaginationStateInput = {}): PaginationState {
  const mode = input.mode ?? "client";
  const pageSize = normalizePageSize(input.pageSize);
  const rowCount = normalizeRowCount(input.rowCount);
  const page = clampPage(normalizePage(input.page), pageSize, rowCount, mode);

  return Object.freeze({
    page,
    pageSize,
    mode,
    ...(rowCount === undefined ? {} : { rowCount }),
    ...(input.hasMore === undefined ? {} : { hasMore: input.hasMore })
  });
}

export function setPaginationPage(state: PaginationState, page: number): PaginationState {
  return createPaginationState({
    ...state,
    page
  });
}

export function setPaginationPageSize(state: PaginationState, pageSize: number): PaginationState {
  return createPaginationState({
    ...state,
    page: DEFAULT_PAGE,
    pageSize
  });
}

export function getPageStartRow(state: PaginationState): number {
  return (state.page - 1) * state.pageSize;
}

export function getPageEndRow(state: PaginationState): number {
  const endRow = getPageStartRow(state) + state.pageSize;
  return state.rowCount === undefined ? endRow : Math.min(endRow, state.rowCount);
}

export function getPageRange(state: PaginationState): PageRange {
  return Object.freeze({
    startRow: getPageStartRow(state),
    endRow: getPageEndRow(state)
  });
}

export function getPageCount(rowCount: number | undefined, pageSize: number): number | undefined {
  const normalizedRowCount = normalizeRowCount(rowCount);
  if (normalizedRowCount === undefined) {
    return undefined;
  }

  return Math.max(1, Math.ceil(normalizedRowCount / normalizePageSize(pageSize)));
}

export function getVisiblePageGroup(
  state: PaginationState,
  groupSize = DEFAULT_PAGE_GROUP_SIZE
): PageGroup {
  const safeGroupSize = normalizePageGroupSize(groupSize);
  const pageCount = getPageCount(state.rowCount, state.pageSize);
  const knownLastPage = pageCount ?? state.page + (state.hasMore === true ? safeGroupSize - 1 : 0);
  const firstPage = Math.floor((state.page - 1) / safeGroupSize) * safeGroupSize + 1;
  const lastPage = Math.max(firstPage, Math.min(firstPage + safeGroupSize - 1, knownLastPage));
  const pages = Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index);

  return Object.freeze({
    firstPage,
    lastPage,
    pages: Object.freeze(pages)
  });
}

export function paginateRows<T>(rows: readonly T[], state: PaginationState): readonly T[] {
  if (state.mode !== "client") {
    return rows;
  }

  return Object.freeze(rows.slice(getPageStartRow(state), getPageEndRow(state)));
}

export function normalizePageSizeOptions(
  pageSize: number,
  options: readonly number[] | undefined
): readonly number[] {
  const values = new Set<number>();
  for (const option of options ?? [10, 25, 50, 100]) {
    values.add(normalizePageSize(option));
  }
  values.add(normalizePageSize(pageSize));
  return Object.freeze([...values].sort((left, right) => left - right));
}

export function normalizePage(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value < 1
    ? DEFAULT_PAGE
    : Math.trunc(value);
}

export function normalizePageSize(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value <= 0
    ? DEFAULT_PAGE_SIZE
    : Math.trunc(value);
}

export function normalizePageGroupSize(value: number | undefined): number {
  return value === undefined || !Number.isFinite(value) || value <= 0
    ? DEFAULT_PAGE_GROUP_SIZE
    : Math.trunc(value);
}

function clampPage(
  page: number,
  pageSize: number,
  rowCount: number | undefined,
  mode: PaginationMode
): number {
  const pageCount = getPageCount(rowCount, pageSize);
  if (pageCount === undefined || mode === "cursor") {
    return page;
  }

  return Math.min(page, pageCount);
}

function normalizeRowCount(value: number | undefined): number | undefined {
  return value === undefined || !Number.isFinite(value) || value < 0
    ? undefined
    : Math.trunc(value);
}
