import type { ScrollAlign } from "@onegrid/core";
import { isColumnVirtualizationEnabled, resolveColumnViewportWidth } from "./columnVirtualScrollRuntime.js";
import type { ColumnVirtualScrollRuntime } from "./columnVirtualScrollRuntime.js";
import { invalidate } from "./renderInvalidation.js";
import { resolveScrollLeftForField } from "./scrollPosition.js";
import { isRowVirtualizationEnabled, resolveVirtualViewportHeight } from "./virtualScrollRuntime.js";
import type { AutoRowHeightMeasurementResult, VirtualScrollRuntime } from "./virtualScrollRuntime.js";
import { OneGridPagination } from "./oneGridPagination.js";

export abstract class OneGridScrolling<TData = unknown> extends OneGridPagination<TData> {
  async scrollToColumn(columnId: string, align: ScrollAlign = "start"): Promise<void> {
    this.setColumnScrollToField(columnId, align);
    await this.render(invalidate(["columns"], "scroll-column"));
  }

  protected createVirtualScrollRuntime(): VirtualScrollRuntime {
    return {
      enabled: isRowVirtualizationEnabled(this.options),
      scrollTop: this.virtualScrollTop,
      viewportHeight: this.virtualViewportHeight ?? resolveVirtualViewportHeight(this.options),
      ...(this.options.rowHeight === "auto" ? { autoRowHeightCache: this.autoRowHeightCache } : {}),
      onScroll: (scrollTop, viewportHeight) => {
        this.updateVirtualScroll(scrollTop, viewportHeight);
      },
      ...(this.options.rowHeight === "auto"
        ? {
            onAutoRowHeightsMeasured: (result: AutoRowHeightMeasurementResult) => {
              this.applyAutoRowHeightMeasurement(result);
            }
          }
        : {})
    };
  }

  protected createColumnVirtualScrollRuntime(): ColumnVirtualScrollRuntime {
    return {
      enabled: isColumnVirtualizationEnabled(this.options),
      scrollLeft: this.columnScrollLeft,
      viewportWidth: this.columnViewportWidth ?? resolveColumnViewportWidth(this.options),
      onScroll: (scrollLeft, viewportWidth) => {
        this.updateColumnVirtualScroll(scrollLeft, viewportWidth);
      }
    };
  }

  protected updateVirtualScroll(scrollTop: number, viewportHeight: number): void {
    const nextScrollTop = Math.max(0, scrollTop);
    const nextViewportHeight = viewportHeight > 0
      ? viewportHeight
      : this.virtualViewportHeight ?? resolveVirtualViewportHeight(this.options);
    if (
      Math.abs(nextScrollTop - this.virtualScrollTop) < 1
      && Math.abs(nextViewportHeight - (this.virtualViewportHeight ?? nextViewportHeight)) < 1
    ) {
      return;
    }

    this.virtualScrollTop = nextScrollTop;
    this.virtualViewportHeight = nextViewportHeight;
  }

  protected applyAutoRowHeightMeasurement(result: AutoRowHeightMeasurementResult): void {
    if (this.destroyed || !result.changed) {
      return;
    }

    if (Math.abs(result.scrollTopAdjustment) >= 1) {
      this.virtualScrollTop = Math.max(0, this.virtualScrollTop + result.scrollTopAdjustment);
    }
    if (result.viewportHeight > 0) {
      this.virtualViewportHeight = result.viewportHeight;
    }
    void this.render(invalidate(["rows", "layout"], "auto-row-height-measured"));
  }

  protected updateColumnVirtualScroll(scrollLeft: number, viewportWidth: number): void {
    const nextScrollLeft = Math.max(0, scrollLeft);
    const nextViewportWidth = viewportWidth > 0
      ? viewportWidth
      : this.columnViewportWidth ?? resolveColumnViewportWidth(this.options);
    if (
      Math.abs(nextScrollLeft - this.columnScrollLeft) < 1
      && Math.abs(nextViewportWidth - (this.columnViewportWidth ?? nextViewportWidth)) < 1
    ) {
      return;
    }

    this.columnScrollLeft = nextScrollLeft;
    this.columnViewportWidth = nextViewportWidth;
  }

  protected setColumnScrollToField(columnId: string, align: ScrollAlign): void {
    const nextScrollLeft = resolveScrollLeftForField({
      options: this.options,
      columnState: this.columnState,
      field: columnId,
      align,
      currentScrollLeft: this.columnScrollLeft,
      viewportWidth: this.columnViewportWidth
    });
    if (nextScrollLeft !== undefined) {
      this.columnScrollLeft = nextScrollLeft;
    }
  }
}
