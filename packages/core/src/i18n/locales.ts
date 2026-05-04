import type { LocaleDefinition, LocaleNumberFormatter } from "./localeTypes.js";

function enCount(value: number, singular: string, plural: string, formatNumber: LocaleNumberFormatter): string {
  return `${formatNumber(value)} ${value === 1 ? singular : plural}`;
}

export const enUSLocale: LocaleDefinition = {
  locale: "en-US",
  text: {
    gridLabel: "OneGrid data grid",
    gridRowsCouldNotLoad: "Grid rows could not be loaded.",
    gridRowsLoading: "Grid rows are loading.",
    gridReady: ({ rowCount, columnCount, formatNumber }) =>
      `Grid ready. ${enCount(rowCount, "row", "rows", formatNumber)} and ${enCount(
        columnCount,
        "column",
        "columns",
        formatNumber
      )}.`,
    footerRows: (rowCount, formatNumber) => `Rows: ${formatNumber(rowCount)}`,
    loadingRows: "Loading rows",
    loadMoreRows: "Load more rows",
    noRows: "No rows",
    unableToLoadRows: "Unable to load rows",
    paginationAriaLabel: ({ label, placement }) => `${label} ${placement} pagination`,
    paginationLoadNextPage: "Load next page",
    paginationLoadMore: "Load more",
    paginationFirstPage: "First page",
    paginationFirst: "First",
    paginationPreviousPage: "Previous page",
    paginationPrevious: "Prev",
    paginationNextPage: "Next page",
    paginationNext: "Next",
    paginationLastPage: "Last page",
    paginationLast: "Last",
    paginationPage: (page) => `Page ${page}`,
    paginationRowsPerPage: "Rows per page",
    paginationLoadedRows: ({ loadedRowCount, rowCount, loading, formatNumber }) => {
      const total = rowCount === undefined ? "unknown" : formatNumber(rowCount);
      return `${loading ? "Loading " : ""}Loaded ${formatNumber(loadedRowCount)} of ${total} rows`;
    },
    paginationPageStatus: ({ page, pageCount }) =>
      pageCount === undefined ? `Page ${page}` : `Page ${page} of ${pageCount}`,
    paginationRowsRange: ({ startRow, endRow, rowCount, formatNumber }) => {
      const total = rowCount === undefined ? "unknown" : formatNumber(rowCount);
      return `Rows ${formatNumber(startRow)}-${formatNumber(endRow)} of ${total}`;
    },
    paginationUnknown: "unknown",
    loadingPrefix: "Loading "
  },
  number: {},
  date: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }
};

export const koKRLocale: LocaleDefinition = {
  locale: "ko-KR",
  text: {
    gridLabel: "OneGrid 데이터 그리드",
    gridRowsCouldNotLoad: "그리드 행을 불러올 수 없습니다.",
    gridRowsLoading: "그리드 행을 불러오는 중입니다.",
    gridReady: ({ rowCount, columnCount, formatNumber }) =>
      `그리드 준비됨. 행 ${formatNumber(rowCount)}개, 열 ${formatNumber(columnCount)}개.`,
    footerRows: (rowCount, formatNumber) => `행: ${formatNumber(rowCount)}`,
    loadingRows: "행 불러오는 중",
    loadMoreRows: "행 더 불러오기",
    noRows: "행 없음",
    unableToLoadRows: "행을 불러올 수 없음",
    paginationAriaLabel: ({ label, placement }) =>
      `${label} ${placement === "top" ? "상단" : "하단"} 페이지네이션`,
    paginationLoadNextPage: "다음 페이지 불러오기",
    paginationLoadMore: "더 불러오기",
    paginationFirstPage: "첫 페이지",
    paginationFirst: "처음",
    paginationPreviousPage: "이전 페이지",
    paginationPrevious: "이전",
    paginationNextPage: "다음 페이지",
    paginationNext: "다음",
    paginationLastPage: "마지막 페이지",
    paginationLast: "마지막",
    paginationPage: (page) => `${page}페이지`,
    paginationRowsPerPage: "페이지당 행 수",
    paginationLoadedRows: ({ loadedRowCount, rowCount, loading, formatNumber }) => {
      const total = rowCount === undefined ? "알 수 없음" : formatNumber(rowCount);
      return `${loading ? "불러오는 중: " : ""}${total}개 중 ${formatNumber(loadedRowCount)}개 로드`;
    },
    paginationPageStatus: ({ page, pageCount }) =>
      pageCount === undefined ? `${page}페이지` : `${page} / ${pageCount}페이지`,
    paginationRowsRange: ({ startRow, endRow, rowCount, formatNumber }) => {
      const total = rowCount === undefined ? "알 수 없음" : formatNumber(rowCount);
      return `행 ${formatNumber(startRow)}-${formatNumber(endRow)} / ${total}`;
    },
    paginationUnknown: "알 수 없음",
    loadingPrefix: "불러오는 중: "
  },
  number: {},
  date: {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }
};
