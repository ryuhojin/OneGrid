import { describe, expect, it } from "vitest";
import {
  calculateFixedRowVirtualWindow,
  createMeasuredRowHeightCache,
  createRowHeightIndex,
  createSegmentedVirtualScroll,
  calculateVariableRowVirtualWindow,
  getSegmentedScrollTopForRow,
  getScrollTopForVariableRow,
  getScrollTopForRow,
  resolveSegmentedVirtualRowWindow,
  toLogicalScrollTop,
  toPhysicalScrollTop
} from "../src/index.js";

describe("row virtualization", () => {
  it("calculates a fixed row window with overscan", () => {
    const window = calculateFixedRowVirtualWindow({
      rowCount: 1_000,
      rowHeight: 30,
      viewportHeight: 120,
      scrollTop: 300,
      overscan: { before: 2, after: 3 }
    });

    expect(window.visibleFirstRow).toBe(10);
    expect(window.visibleLastRow).toBe(13);
    expect(window.firstRow).toBe(8);
    expect(window.lastRow).toBe(16);
    expect(window.beforeHeight).toBe(240);
    expect(window.afterHeight).toBe(29_490);
    expect(window.renderedRowCount).toBe(9);
  });

  it("caps rendered DOM rows without clipping visible rows", () => {
    const window = calculateFixedRowVirtualWindow({
      rowCount: 1_000,
      rowHeight: 20,
      viewportHeight: 200,
      overscan: 100,
      maxDomRows: 16
    });

    expect(window.visibleRowCount).toBe(10);
    expect(window.renderedRowCount).toBe(16);
    expect(window.firstRow).toBe(0);
    expect(window.lastRow).toBe(15);
  });

  it("calculates scrollToRow positions with common alignments", () => {
    expect(getScrollTopForRow({
      rowIndex: 100,
      rowCount: 1_000,
      rowHeight: 32,
      viewportHeight: 320
    })).toBe(3_200);

    expect(getScrollTopForRow({
      rowIndex: 100,
      rowCount: 1_000,
      rowHeight: 32,
      viewportHeight: 320,
      align: "center"
    })).toBe(3_056);

    expect(getScrollTopForRow({
      rowIndex: 100,
      rowCount: 1_000,
      rowHeight: 32,
      viewportHeight: 320,
      currentScrollTop: 3_100,
      align: "nearest"
    })).toBe(3_100);
  });

  it("tracks measured row heights without requiring all rows to be measured", () => {
    const cache = createMeasuredRowHeightCache(30);

    cache.set(2, 45);
    cache.set(10, 20);

    expect(cache.size).toBe(2);
    expect(cache.estimateOffset(3)).toBe(105);
    expect(cache.estimateOffset(10)).toBe(315);
    expect(cache.estimateTotalHeight(20)).toBe(605);
    expect(cache.entries()).toEqual([
      { rowIndex: 2, height: 45 },
      { rowIndex: 10, height: 20 }
    ]);
  });

  it("calculates a variable row-height window with exact spacers", () => {
    const rowHeightIndex = createRowHeightIndex({
      rowCount: 6,
      estimatedRowHeight: 40,
      getRowHeight: (index) => [30, 60, 40, 80, 36, 44][index]
    });
    const window = calculateVariableRowVirtualWindow({
      rowHeightIndex,
      scrollTop: 70,
      viewportHeight: 100,
      overscan: { before: 1, after: 1 },
      maxDomRows: 5
    });

    expect(window.visibleFirstRow).toBe(1);
    expect(window.visibleLastRow).toBe(3);
    expect(window.firstRow).toBe(0);
    expect(window.lastRow).toBe(4);
    expect(window.beforeHeight).toBe(0);
    expect(window.afterHeight).toBe(44);
    expect(window.totalHeight).toBe(290);
    expect(window.renderedRowCount).toBe(5);
  });

  it("calculates scrollToRow for variable row heights", () => {
    const rowHeightIndex = createRowHeightIndex({
      rowCount: 4,
      estimatedRowHeight: 40,
      getRowHeight: (index) => [30, 60, 40, 80][index]
    });

    expect(getScrollTopForVariableRow({
      rowHeightIndex,
      rowIndex: 2,
      viewportHeight: 100
    })).toBe(90);
    expect(getScrollTopForVariableRow({
      rowHeightIndex,
      rowIndex: 2,
      viewportHeight: 100,
      align: "end"
    })).toBe(30);
  });

  it("maps 10M rows into a bounded physical scroll range", () => {
    const state = createSegmentedVirtualScroll({
      rowCount: 10_000_000,
      rowHeight: 32,
      viewportHeight: 320,
      logicalScrollTop: 160_000_000
    });

    expect(state.totalLogicalHeight).toBe(320_000_000);
    expect(state.physicalScrollHeight).toBeLessThanOrEqual(24_000_000);
    expect(state.segmentCount).toBeGreaterThan(1);
    expect(state.activeSegmentStartRow).toBeLessThanOrEqual(5_000_000);
    expect(state.activeSegmentEndRow).toBeGreaterThan(5_000_000);
  });

  it("round-trips a 100M row viewport position without allocating rows", () => {
    const base = {
      totalLogicalHeight: 100_000_000 * 36,
      physicalScrollHeight: 24_000_000,
      viewportHeight: 360
    };
    const logical = 2_345_678_900;
    const physical = toPhysicalScrollTop({ ...base, logicalScrollTop: logical });
    const roundTrip = toLogicalScrollTop({ ...base, physicalScrollTop: physical });

    expect(physical).toBeLessThan(base.physicalScrollHeight);
    expect(Math.abs(roundTrip - logical)).toBeLessThan(1);
  });

  it("resolves the final 100M segmented viewport window from physical bottom scroll", () => {
    const base = {
      rowCount: 100_000_000,
      rowHeight: 30,
      viewportHeight: 430,
      maxScrollHeight: 24_000_000,
      maxDomRows: 80
    };
    const top = resolveSegmentedVirtualRowWindow(base);
    const bottom = resolveSegmentedVirtualRowWindow({
      ...base,
      physicalScrollTop: top.maxPhysicalScrollTop
    });

    expect(bottom.logicalScrollTop).toBe(bottom.maxLogicalScrollTop);
    expect(bottom.lastVisibleRow).toBe(99_999_999);
    expect(bottom.firstVisibleRow).toBeLessThan(bottom.lastVisibleRow);
    expect(bottom.renderedRowCount).toBeLessThanOrEqual(80);
  });

  it("seeks to the final segmented row with end alignment", () => {
    const logicalScrollTop = getSegmentedScrollTopForRow({
      rowCount: 100_000_000,
      rowHeight: 30,
      viewportHeight: 430,
      maxScrollHeight: 24_000_000,
      rowIndex: 99_999_999,
      align: "end"
    });
    const window = resolveSegmentedVirtualRowWindow({
      rowCount: 100_000_000,
      rowHeight: 30,
      viewportHeight: 430,
      maxScrollHeight: 24_000_000,
      logicalScrollTop
    });

    expect(logicalScrollTop).toBe(window.maxLogicalScrollTop);
    expect(window.lastVisibleRow).toBe(99_999_999);
  });

});
