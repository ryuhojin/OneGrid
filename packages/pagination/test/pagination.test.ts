import { describe, expect, it } from "vitest";
import {
  createPaginationState,
  getPageRange,
  getVisiblePageGroup,
  normalizePageSizeOptions,
  paginateRows,
  setPaginationPage,
  setPaginationPageSize
} from "../src/index.js";

describe("pagination state", () => {
  it("normalizes page, page size, and client row range", () => {
    const state = createPaginationState({
      mode: "client",
      page: 2,
      pageSize: 3,
      rowCount: 8
    });

    expect(getPageRange(state)).toEqual({ startRow: 3, endRow: 6 });
    expect(paginateRows(["A", "B", "C", "D", "E", "F", "G", "H"], state)).toEqual([
      "D",
      "E",
      "F"
    ]);
  });

  it("clamps known row counts but allows cursor pages without a known total", () => {
    expect(createPaginationState({ page: 99, pageSize: 10, rowCount: 12 }).page).toBe(2);
    expect(createPaginationState({ mode: "cursor", page: 99, pageSize: 10 }).page).toBe(99);
  });

  it("resets to the first page when page size changes", () => {
    const state = createPaginationState({ page: 3, pageSize: 10, rowCount: 100 });

    expect(setPaginationPageSize(state, 25)).toMatchObject({ page: 1, pageSize: 25 });
    expect(setPaginationPage(state, 4)).toMatchObject({ page: 4, pageSize: 10 });
  });

  it("creates page groups and stable page size options", () => {
    const state = createPaginationState({ page: 8, pageSize: 20, rowCount: 260 });

    expect(getVisiblePageGroup(state, 5)).toEqual({
      firstPage: 6,
      lastPage: 10,
      pages: [6, 7, 8, 9, 10]
    });
    expect(normalizePageSizeOptions(20, [50, 10, 10])).toEqual([10, 20, 50]);
  });
});
