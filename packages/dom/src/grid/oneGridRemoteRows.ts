import type { DataSourceStatusSnapshot, RowModelStateSnapshot, RowUpdate, ScrollToRowAlign, ServerLoadResult, ViewportLiveUpdate } from "@onegrid/core";
import { invalidate } from "./renderInvalidation.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import { getViewportHeight, getViewportRowHeight } from "./rowModelOptions.js";
import { resolveScrollTopForRow } from "./scrollPosition.js";
import { OneGridScrolling } from "./oneGridScrolling.js";
import { isRecoverableDataSourceError } from "./remoteDataSourceError.js";
import { createViewportSkeletonEntries, hasViewportVisibleRange } from "./viewportSkeletonRows.js";
import { resolveViewportLoadTarget } from "./viewportLoadTarget.js";
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

    try {
      const pending = this.serverRowModel.applyTransaction(updates);
      this.emitRemoteDataRequested(this.serverRowModel.status);
      const result = await pending;
      this.serverEntries = this.serverRowModel.entries;
      this.emitGridEvent("dataLoaded", {
        type: "dataLoaded",
        requestId: this.serverRowModel.status?.requestId ?? "server:update",
        rows: result.rows
      });
    } catch (error) {
      this.renderError = error;
      this.emitRemoteError(error);
    }
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

  protected resetRemoteRowModel(reason: string, rowModelState?: RowModelStateSnapshot): boolean {
    this.renderError = undefined;
    if (this.infiniteRowModel) {
      this.infiniteRowModel.cancelAll(reason);
      this.infiniteRowModel = createDomInfiniteRowModel(this.getRenderOptions());
      if (rowModelState?.rowModel === "infinite") {
        this.infiniteRowModel?.restoreState(rowModelState);
      }
      this.infiniteLoading = false;
      this.infiniteEntries = this.infiniteRowModel?.getAppendRows() ?? [];
      void this.render(invalidate(["rows", "columns", "overlay"], reason));
      void this.loadNextInfiniteBlock();
      return true;
    }

    if (this.serverRowModel) {
      this.serverRowModel = createDomServerRowModel(this.getRenderOptions());
      if (rowModelState?.rowModel === "server") {
        this.serverRowModel?.restoreState(rowModelState);
        if (rowModelState.page !== undefined) {
          this.paginationPage = rowModelState.page + 1;
        }
      }
      this.serverLoading = false;
      this.serverEntries = [];
      this.serverResultColumns = undefined;
      this.serverMergeMeta = [];
      this.serverAggregate = undefined;
      void this.loadServerRows(true);
      return true;
    }

    if (this.viewportRowModel) {
      this.viewportRowModel = createDomViewportRowModel(this.getRenderOptions());
      if (rowModelState?.rowModel === "viewport") {
        this.viewportRowModel?.restoreState(rowModelState);
      }
      this.viewportLoading = false;
      this.viewportEntries = [];
      void this.scrollViewportTo(rowModelState?.rowModel === "viewport"
        ? rowModelState.range?.firstRow ?? 0
        : 0);
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
      treeRowModel: this.treeRowModel,
      ...(this.options.rowHeight === "auto" ? { autoRowHeightCache: this.autoRowHeightCache } : {})
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
      const load = this.infiniteRowModel.loadNextAppendBlock();
      this.emitRemoteDataRequested(this.infiniteRowModel.status);
      const result = await load;
      if (result.block.status === "loaded") {
        this.emitGridEvent("dataLoaded", {
          type: "dataLoaded",
          requestId: result.block.requestId ?? result.status.requestId,
          rows: result.block.rows
        });
      } else if (result.block.status === "error") {
        this.renderError = result.block.error;
        this.emitRemoteError(result.block.error);
      }
    } catch (error) {
      this.renderError = error;
      this.emitRemoteError(error);
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
      const load = refresh ? rowModel.refresh() : rowModel.loadPage(page);
      this.emitRemoteDataRequested(rowModel.status);
      const result = await load;
      if (this.serverRowModel !== rowModel) {
        return;
      }
      this.applyServerLoadResult(result);
      this.emitGridEvent("dataLoaded", {
        type: "dataLoaded",
        requestId: result.request.requestId,
        rows: result.rows
      });
    } catch (error) {
      this.renderError = error;
      this.emitRemoteError(error);
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
      const load = expanded ? rowModel.expandGroup(groupKey) : rowModel.collapseGroup(groupKey);
      this.emitRemoteDataRequested(rowModel.status);
      const result = await load;
      if (this.serverRowModel !== rowModel) {
        return;
      }
      this.applyServerLoadResult(result);
      this.emitGridEvent("dataLoaded", {
        type: "dataLoaded",
        requestId: result.request.requestId,
        rows: result.rows
      });
    } catch (error) {
      this.renderError = error;
      this.emitRemoteError(error);
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
    this.serverResultColumns = result.columns;
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
    if (!this.viewportRowModel) {
      return;
    }

    const target = resolveViewportLoadTarget({
      options: this.options,
      rowCount: this.viewportRowModel.rowCount,
      rowHeight,
      viewportHeight,
      rowIndex,
      ...(scrollTop === undefined ? {} : { scrollTop })
    });
    const targetScrollTop = target.scrollTop;
    const normalizedRowIndex = target.rowIndex;
    this.virtualScrollTop = targetScrollTop;
    if (this.viewportLoading) {
      this.pendingViewportLoad = { rowIndex: normalizedRowIndex, scrollTop: targetScrollTop };
      return;
    }

    this.viewportLoading = true;
    this.renderError = undefined;
    let shouldRender = false;
    let nextViewportLoad: PendingViewportLoad | undefined;
    const skeletonEntries = createViewportSkeletonEntries(
      this.viewportRowModel,
      normalizedRowIndex,
      viewportHeight,
      this.options
    );
    if (skeletonEntries.length > 0 && !hasViewportVisibleRange(
      this.viewportEntries,
      normalizedRowIndex,
      this.options,
      viewportHeight
    )) {
      this.viewportEntries = skeletonEntries;
      this.renderNow(invalidate(["rows", "overlay"], "viewport-skeleton"));
    }

    try {
      const load = this.viewportRowModel.loadViewport({
        scrollTop: targetScrollTop,
        viewportHeight
      });
      this.emitRemoteDataRequested(this.viewportRowModel.status);
      const result = await load;
      const pending = this.pendingViewportLoad;
      if (!result.stale && (pending === undefined || pending.rowIndex === normalizedRowIndex)) {
        this.viewportEntries = result.entries;
        shouldRender = true;
        this.emitGridEvent("dataLoaded", {
          type: "dataLoaded",
          requestId: result.request.requestId,
          rows: result.entries.flatMap((entry) => entry.kind === "data" ? [entry.data] : [])
        });
      }
    } catch (error) {
      this.renderError = error;
      this.emitRemoteError(error);
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

  protected emitRemoteDataRequested(status: DataSourceStatusSnapshot | undefined): void {
    if (status?.status !== "loading") {
      return;
    }

    this.emitGridEvent("dataRequested", {
      type: "dataRequested",
      requestId: status.requestId
    });
  }

  protected emitRemoteError(error: unknown): void {
    this.emitGridEvent("error", {
      type: "error",
      error,
      recoverable: isRecoverableDataSourceError(error) ?? true
    });
  }
}
