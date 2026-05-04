import {
  normalizePage,
  normalizePageSize
} from "@onegrid/pagination";
import type { GridPaginationRuntime } from "./paginationRenderer.js";
import { invalidate } from "./renderInvalidation.js";
import { createDomServerRowModel } from "./rowModelFactory.js";
import { OneGridApiBase } from "./oneGridApiBase.js";

export abstract class OneGridPagination<TData = unknown> extends OneGridApiBase<TData> {
  setPage(page: number): void {
    if (this.destroyed || this.options.pagination === undefined) {
      return;
    }

    const nextPage = normalizePage(page);
    if (nextPage === this.paginationPage) {
      return;
    }

    this.paginationPage = nextPage;
    this.virtualScrollTop = 0;
    this.emitGridEvent("pageChanged", {
      type: "pageChanged",
      page: this.paginationPage,
      pageSize: this.paginationPageSize
    });
    if (this.serverRowModel) {
      void this.loadServerRows(false, this.paginationPage - 1);
      return;
    }

    void this.render(invalidate(["rows", "layout", "overlay"], "pagination-page"));
  }

  getPage(): number {
    return this.paginationPage;
  }

  setPageSize(pageSize: number): void {
    if (this.destroyed || this.options.pagination === undefined) {
      return;
    }

    const nextPageSize = normalizePageSize(pageSize);
    if (nextPageSize === this.paginationPageSize) {
      return;
    }

    this.paginationPageSize = nextPageSize;
    this.paginationPage = 1;
    this.virtualScrollTop = 0;
    this.emitGridEvent("pageChanged", {
      type: "pageChanged",
      page: this.paginationPage,
      pageSize: this.paginationPageSize
    });

    if (this.serverRowModel) {
      this.serverRowModel = createDomServerRowModel(this.getRenderOptions());
      this.serverEntries = [];
      this.serverMergeMeta = [];
      this.serverAggregate = undefined;
      void this.loadServerRows(true);
      return;
    }

    void this.render(invalidate(["rows", "layout", "overlay"], "pagination-page-size"));
  }

  getPageSize(): number {
    return this.paginationPageSize;
  }

  protected createPaginationRuntime(): GridPaginationRuntime | undefined {
    if (this.options.pagination === undefined) {
      return undefined;
    }

    return {
      setPage: (page) => this.setPage(page),
      setPageSize: (pageSize) => this.setPageSize(pageSize),
      loadNextPage: () => {
        if (this.infiniteRowModel) {
          void this.loadNextInfiniteBlock();
        } else {
          this.setPage(this.paginationPage + 1);
        }
      }
    };
  }
}
