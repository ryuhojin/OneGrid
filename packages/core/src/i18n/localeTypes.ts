export type LocaleDateValue = Date | number | string;

export type LocaleNumberFormatter = (
  value: number,
  options?: Intl.NumberFormatOptions
) => string;

export type LocaleDateFormatter = (
  value: LocaleDateValue,
  options?: Intl.DateTimeFormatOptions
) => string;

export interface GridReadyTextInput {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly formatNumber: LocaleNumberFormatter;
}

export interface PaginationLabelInput {
  readonly label: string;
  readonly placement: "top" | "bottom";
}

export interface PaginationLoadedRowsInput {
  readonly loadedRowCount: number;
  readonly rowCount?: number;
  readonly loading: boolean;
  readonly formatNumber: LocaleNumberFormatter;
}

export interface PaginationPageInput {
  readonly page: number;
  readonly pageCount?: number;
}

export interface PaginationRowsRangeInput {
  readonly startRow: number;
  readonly endRow: number;
  readonly rowCount?: number;
  readonly formatNumber: LocaleNumberFormatter;
}

export interface LocaleText {
  readonly gridLabel: string;
  readonly gridRowsCouldNotLoad: string;
  readonly gridRowsLoading: string;
  gridReady(input: GridReadyTextInput): string;
  footerRows(rowCount: number, formatNumber: LocaleNumberFormatter): string;
  readonly loadingRows: string;
  readonly loadMoreRows: string;
  readonly noRows: string;
  readonly unableToLoadRows: string;
  paginationAriaLabel(input: PaginationLabelInput): string;
  readonly paginationLoadNextPage: string;
  readonly paginationLoadMore: string;
  readonly paginationFirstPage: string;
  readonly paginationFirst: string;
  readonly paginationPreviousPage: string;
  readonly paginationPrevious: string;
  readonly paginationNextPage: string;
  readonly paginationNext: string;
  readonly paginationLastPage: string;
  readonly paginationLast: string;
  paginationPage(page: number): string;
  readonly paginationRowsPerPage: string;
  paginationLoadedRows(input: PaginationLoadedRowsInput): string;
  paginationPageStatus(input: PaginationPageInput): string;
  paginationRowsRange(input: PaginationRowsRangeInput): string;
  readonly paginationUnknown: string;
  readonly loadingPrefix: string;
}

export interface LocaleDefinition {
  readonly locale: string;
  readonly text: LocaleText;
  readonly number?: Intl.NumberFormatOptions;
  readonly date?: Intl.DateTimeFormatOptions;
}

export interface LocaleFormatterBridge {
  readonly locale: string;
  readonly text: LocaleText;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: LocaleDateValue, options?: Intl.DateTimeFormatOptions): string;
}
