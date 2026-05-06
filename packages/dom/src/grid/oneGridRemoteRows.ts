import type {
  RowUpdate,
  ServerLoadResult,
  ScrollToRowAlign,
  ViewportLiveUpdate
} from "@onegrid/core";
import { invalidate } from "./renderInvalidation.js";
import { createDomInfiniteRowModel, createDomServerRowModel, createDomViewportRowModel } from "./rowModelFactory.js";
import {
  getViewportHeight,
  getViewportRowHeight
} from "./rowModelOptions.js";
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

export abstract class OneGridRemoteRows<TData = unknown> extends OneGridScrolling<TData> {
  private pendingServerLoad: PendingServerLoad | undefined;
  private pendingServerGroupExpansion: PendingServerGroupExpansion | undefined;

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
    await this.loadViewportRows(rowIndex);
  }

  async scrollToRow(rowIndex: number, align: ScrollToRowAlign = "start"): Promise<void> {
    this.setVirtualScrollToRow(rowIndex, align);
    if (this.viewportRowModel) {
      await this.loadViewportRows(rowIndex);
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

  protected async loadViewportRows(rowIndex: number): Promise<void> {
    if (!this.viewportRowModel || this.viewportLoading) {
      return;
    }

    this.viewportLoading = true;
    this.renderError = undefined;
    await this.render(invalidate(["rows", "overlay"], "viewport-loading"));

    try {
      const result = await this.viewportRowModel.loadViewport({
        scrollTop: Math.max(0, Math.trunc(rowIndex)) * getViewportRowHeight(this.options),
        viewportHeight: getViewportHeight(this.options)
      });
      if (!result.stale) {
        this.viewportEntries = result.entries;
      }
    } catch (error) {
      this.renderError = error;
    } finally {
      if (!this.destroyed) {
        this.viewportLoading = false;
        await this.render(invalidate(["rows", "overlay"], "viewport-loaded"));
      }
    }
  }
}
