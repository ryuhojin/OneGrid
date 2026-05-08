import type {
  RowUpdate,
  ServerLoadResult,
  ScrollToRowAlign,
  ViewportLiveUpdate,
  ViewportRowEntry
} from "@onegrid/core";
import { invalidate } from "./renderInvalidation.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import {
  getViewportHeight,
  getViewportRowHeight
} from "./rowModelOptions.js";
import type { DomGridOptions } from "./OneGrid.js";
import { resolveScrollTopForRow } from "./scrollPosition.js";
import { OneGridScrolling } from "./oneGridScrolling.js";

interface PendingServerLoad {
  readonly refresh: boolean;
  readonly page: number;
}

interface PendingServerGroupExpansion {
  readonly groupKey: string;
  readonly expanded: boolean;
  readonly reason: string;
}

interface PendingViewportLoad {
  readonly rowIndex: number;
  readonly scrollTop: number;
}

export abstract class OneGridRemoteRows<TData = unknown> extends OneGridScrolling<TData> {
  private pendingServerLoad: PendingServerLoad | undefined;
  private pendingServerGroupExpansion: PendingServerGroupExpansion | undefined;
  private pendingViewportLoad: PendingViewportLoad | undefined;

  protected override createVirtualScrollRuntime() {
    const runtime = super.createVirtualScrollRuntime();
    return {
      ...runtime,
      onLogicalRowScroll: (rowIndex: number, scrollTop?: number) => {
        if (this.viewportRowModel) {
          void this.loadViewportRows(rowIndex, scrollTop);
        }
      }
    };
  }

  async refreshServerRows(): Promise<void> {
    await this.loadServerRows(true);
  }

  async updateServerRows(updates: readonly RowUpdate<TData>[]): Promise<void> {
    if (!this.serverRowModel || this.destroyed) {
      return;
    }

    await this.serverRowModel.applyTransaction(updates);
    this.serverEntries = this.serverRowModel.entries;
    await this.render(invalidate(["rows", "overlay"], "server-transaction"));
  }

  async scrollViewportTo(rowIndex: number): Promise<void> {
    this.setVirtualScrollToRow(rowIndex, "start");
    await this.loadViewportRows(rowIndex, this.virtualScrollTop);
  }

  async scrollToRow(rowIndex: number, align: ScrollToRowAlign = "start"): Promise<void> {
    this.setVirtualScrollToRow(rowIndex, align);
    if (this.viewportRowModel) {
      await this.loadViewportRows(rowIndex, this.virtualScrollTop);
      return;
    }

    await this.render(invalidate(["rows"], "scroll-row"));
  }

  applyViewportLiveUpdate(update: ViewportLiveUpdate<TData>): void {
    if (!this.viewportRowModel || this.destroyed) {
      return;
    }

    this.viewportEntries = this.viewportRowModel.applyLiveUpdate(update);
    void this.render(invalidate(["rows", "overlay"], "viewport-live-update"));
  }

  protected resetRemoteRowModel(reason: string): boolean {
    this.renderError = undefined;
    if (this.infiniteRowModel) {
      this.infiniteRowModel.cancelAll(reason);
      this.infiniteRowModel = createDomInfiniteRowModel(this.getRenderOptions());
      this.infiniteLoading = false;
      this.infiniteEntries = this.infiniteRowModel?.getAppendRows() ?? [];
      void this.render(invalidate(["rows", "columns", "overlay"], reason));
      void this.loadNextInfiniteBlock();
      return true;
    }

    if (this.serverRowModel) {
      this.serverRowModel = createDomServerRowModel(this.getRenderOptions());
      this.serverLoading = false;
      this.serverEntries = [];
      this.serverMergeMeta = [];
      this.serverAggregate = undefined;
      void this.loadServerRows(true);
      return true;
    }

    if (this.viewportRowModel) {
      this.viewportRowModel = createDomViewportRowModel(this.getRenderOptions());
      this.viewportLoading = false;
      this.viewportEntries = [];
      void this.scrollViewportTo(0);
      return true;
    }

    return false;
  }

  protected setVirtualScrollToRow(rowIndex: number, align: ScrollToRowAlign): void {
    this.virtualScrollTop = resolveScrollTopForRow({
      options: this.options,
      rowIndex,
      align,
      currentScrollTop: this.virtualScrollTop,
      viewportHeight: this.virtualViewportHeight,
      infiniteRowModel: this.infiniteRowModel,
      infiniteEntries: this.infiniteEntries,
      serverRowModel: this.serverRowModel,
      viewportRowModel: this.viewportRowModel,
      treeRowModel: this.treeRowModel
    });
  }

  protected async loadNextInfiniteBlock(): Promise<void> {
    if (!this.infiniteRowModel || this.infiniteLoading || !this.infiniteRowModel.hasMore) {
      return;
    }

    this.infiniteLoading = true;
    this.renderError = undefined;
    this.infiniteEntries = this.infiniteRowModel.getAppendRows();
    await this.render(invalidate(["rows", "overlay"], "infinite-loading"));

    try {
      await this.infiniteRowModel.loadNextAppendBlock();
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.infiniteEntries = this.infiniteRowModel.getAppendRows();
        this.infiniteLoading = false;
        await this.render(invalidate(["rows", "overlay"], "infinite-loaded"));
      }
    }
  }

  protected async loadServerRows(refresh = false, page = this.paginationPage - 1): Promise<void> {
    const rowModel = this.serverRowModel;
    if (!rowModel) {
      return;
    }

    if (this.serverLoading) {
      this.pendingServerLoad = {
        refresh: refresh || this.pendingServerLoad?.refresh === true,
        page
      };
      return;
    }

    this.serverLoading = true;
    this.renderError = undefined;
    await this.render(invalidate(["rows", "overlay"], "server-loading"));

    try {
      const result = refresh
        ? await rowModel.refresh()
        : await rowModel.loadPage(page);
      if (this.serverRowModel !== rowModel) {
        return;
      }
      this.applyServerLoadResult(result);
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.serverLoading = false;
        await this.render(invalidate(["rows", "overlay"], "server-loaded"));
        const pending = this.pendingServerLoad;
        this.pendingServerLoad = undefined;
        if (pending) {
          await this.loadServerRows(pending.refresh, pending.page);
        } else {
          await this.flushPendingServerGroupExpansion();
        }
      }
    }
  }

  protected async setServerGroupExpanded(
    groupKey: string,
    expanded: boolean,
    reason: string
  ): Promise<void> {
    const rowModel = this.serverRowModel;
    if (!rowModel || this.destroyed) {
      return;
    }

    if (this.serverLoading) {
      this.pendingServerGroupExpansion = { groupKey, expanded, reason };
      return;
    }

    this.serverLoading = true;
    this.renderError = undefined;
    await this.render(invalidate(["rows", "overlay"], `${reason}-loading`));

    try {
      const result = expanded
        ? await rowModel.expandGroup(groupKey)
        : await rowModel.collapseGroup(groupKey);
      if (this.serverRowModel !== rowModel) {
        return;
      }
      this.applyServerLoadResult(result);
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.serverLoading = false;
        await this.render(invalidate(["rows", "overlay"], reason));
        await this.flushPendingServerGroupExpansion();
      }
    }
  }

  private applyServerLoadResult(result: ServerLoadResult<TData>): void {
    this.serverEntries = result.entries;
    this.serverMergeMeta = result.mergeMeta ?? [];
    this.serverAggregate = result.aggregate;
  }

  private async flushPendingServerGroupExpansion(): Promise<void> {
    const pending = this.pendingServerGroupExpansion;
    if (!pending) {
      return;
    }

    this.pendingServerGroupExpansion = undefined;
    await this.setServerGroupExpanded(pending.groupKey, pending.expanded, pending.reason);
  }

  protected async loadViewportRows(rowIndex: number, scrollTop?: number): Promise<void> {
    const rowHeight = getViewportRowHeight(this.options);
    const viewportHeight = this.virtualViewportHeight ?? getViewportHeight(this.options);
    const targetScrollTop = Math.max(0, scrollTop ?? Math.max(0, Math.trunc(rowIndex)) * rowHeight);
    const normalizedRowIndex = Math.max(0, Math.trunc(targetScrollTop / rowHeight));
    if (!this.viewportRowModel) {
      return;
    }

    this.virtualScrollTop = targetScrollTop;
    if (this.viewportLoading) {
      this.pendingViewportLoad = { rowIndex: normalizedRowIndex, scrollTop: targetScrollTop };
      return;
    }

    this.viewportLoading = true;
    this.renderError = undefined;
    let shouldRender = false;
    let nextViewportLoad: PendingViewportLoad | undefined;
    const skeletonEntries = this.createViewportSkeletonEntries(normalizedRowIndex, viewportHeight);
    if (skeletonEntries.length > 0 && !hasViewportVisibleRange(
      this.viewportEntries,
      normalizedRowIndex,
      this.options,
      viewportHeight
    )) {
      this.viewportEntries = skeletonEntries;
      await this.render(invalidate(["rows", "overlay"], "viewport-skeleton"));
    }

    try {
      const result = await this.viewportRowModel.loadViewport({
        scrollTop: targetScrollTop,
        viewportHeight
      });
      const pending = this.pendingViewportLoad;
      if (!result.stale && (pending === undefined || pending.rowIndex === normalizedRowIndex)) {
        this.viewportEntries = result.entries;
        shouldRender = true;
      }
    } catch (error) {
      this.renderError = error;
      shouldRender = true;
    } finally {
      if (!this.destroyed) {
        const pending = this.pendingViewportLoad;
        this.pendingViewportLoad = undefined;
        this.viewportLoading = false;
        if (pending !== undefined && pending.rowIndex !== normalizedRowIndex) {
          nextViewportLoad = pending;
        } else if (shouldRender) {
          this.virtualScrollTop = targetScrollTop;
          await this.render(invalidate(["rows", "overlay"], "viewport-loaded"));
        }
      }
    }

    if (nextViewportLoad !== undefined) {
      await this.loadViewportRows(nextViewportLoad.rowIndex, nextViewportLoad.scrollTop);
    }
  }

  private createViewportSkeletonEntries(
    rowIndex: number,
    viewportHeight: number
  ): readonly ViewportRowEntry<TData>[] {
    const rowModel = this.viewportRowModel;
    if (!rowModel) {
      return Object.freeze([]);
    }

    const rowHeight = getViewportRowHeight(this.options);
    const overscan = normalizeViewportOverscan(this.options.viewport?.overscan);
    const visibleCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
    const firstRow = Math.max(0, rowIndex - overscan);
    const lastRow = Math.min(rowModel.rowCount - 1, rowIndex + visibleCount - 1 + overscan);
    const entries: ViewportRowEntry<TData>[] = [];
    for (let nextRowIndex = firstRow; nextRowIndex <= lastRow; nextRowIndex += 1) {
      entries.push(Object.freeze({ kind: "skeleton", rowIndex: nextRowIndex }));
    }
    return Object.freeze(entries);
  }
}

function normalizeViewportOverscan(value: number | undefined): number {
  return Number.isFinite(value) && value !== undefined && value > 0 ? Math.trunc(value) : 0;
}

function hasViewportVisibleRange<TData>(
  entries: readonly ViewportRowEntry<TData>[],
  firstRow: number,
  options: DomGridOptions<TData>,
  viewportHeight = getViewportHeight(options)
): boolean {
  const rowHeight = getViewportRowHeight(options);
  const lastRow = firstRow + Math.max(1, Math.ceil(viewportHeight / rowHeight)) - 1;
  return entries.some((entry) => entry.rowIndex <= firstRow)
    && entries.some((entry) => entry.rowIndex >= lastRow);
}
