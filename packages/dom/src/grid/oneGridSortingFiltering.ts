import {
  getNextSortModel,
  normalizeFilterModel,
  normalizeSortModel,
  readField,
  setColumnFilterConditions,
  setQuickFilterText
} from "@onegrid/core";
import type { FilterModel, SortModel } from "@onegrid/core";
import { showColumnFilterPanel } from "./filterPanel.js";
import type { HeaderFilterRuntime } from "./filterRuntime.js";
import { invalidate } from "./renderInvalidation.js";
import type { HeaderSortRuntime } from "./sortRuntime.js";
import { OneGridRows } from "./oneGridRows.js";

export abstract class OneGridSortingFiltering<TData = unknown> extends OneGridRows<TData> {
  setSortModel(model: readonly SortModel[]): void {
    this.applySortModel(normalizeSortModel(model), "sort-api");
  }

  getSortModel(): readonly SortModel[] {
    return this.sortModel;
  }

  setFilterModel(model: FilterModel): void {
    this.applyFilterModel(normalizeFilterModel(model), "filter-api");
  }

  getFilterModel(): FilterModel {
    return this.filterModel;
  }

  protected createSortRuntime(): HeaderSortRuntime {
    return {
      sortModel: this.sortModel,
      toggleSort: (field, additive) => {
        this.pendingHeaderFocusField = field;
        this.applySortModel(
          getNextSortModel(this.sortModel, field, {
            ...(this.options.sorting?.multiSort === undefined
              ? {}
              : { multiSort: this.options.sorting.multiSort }),
            additive,
            ...(this.options.sorting?.sortOrder === undefined
              ? {}
              : { sortOrder: this.options.sorting.sortOrder })
          }),
          "sort-header"
        );
      }
    };
  }

  protected createFilterRuntime(): HeaderFilterRuntime {
    return {
      filterModel: this.filterModel,
      applyColumnFilter: (field, conditions) => {
        this.applyFilterModel(
          setColumnFilterConditions(this.filterModel, field, conditions),
          "filter-column"
        );
      },
      applyQuickFilter: (text) => {
        this.pendingQuickFilterFocus = true;
        this.applyFilterModel(setQuickFilterText(this.filterModel, text), "filter-quick");
      },
      clearColumnFilter: (field) => {
        this.applyFilterModel(
          setColumnFilterConditions(this.filterModel, field, []),
          "filter-column-clear"
        );
      },
      getDistinctValues: (field) => this.getDistinctFilterValues(field),
      isColumnFiltered: (field) =>
        (this.filterModel.conditions ?? []).some((condition) => condition.field === field),
      openColumnFilter: (anchor, column) => {
        showColumnFilterPanel(anchor, column, this.createFilterRuntime());
      }
    };
  }

  protected applySortModel(model: readonly SortModel[], reason: string): void {
    if (this.destroyed || sameSortModel(this.sortModel, model)) {
      return;
    }

    this.sortModel = model;
    if (this.treeRowModel) {
      this.treeRowModel.setSortModel(this.sortModel);
      this.treeEntries = this.treeRowModel.visibleRows;
    }
    this.virtualScrollTop = 0;
    this.paginationPage = 1;
    this.emitGridEvent("sortChanged", { type: "sortChanged", sortModel: this.sortModel });
    if (this.resetRemoteRowModel(reason)) {
      return;
    }

    void this.render(invalidate(["rows", "columns", "overlay"], reason));
  }

  protected applyFilterModel(model: FilterModel, reason: string): void {
    if (this.destroyed || sameFilterModel(this.filterModel, model)) {
      return;
    }

    this.filterModel = model;
    if (this.treeRowModel) {
      this.treeRowModel.setFilterModel(this.filterModel);
      this.treeEntries = this.treeRowModel.visibleRows;
    }
    this.virtualScrollTop = 0;
    this.paginationPage = 1;
    this.emitGridEvent("filterChanged", { type: "filterChanged", filterModel: this.filterModel });
    if (this.resetRemoteRowModel(reason)) {
      return;
    }

    void this.render(invalidate(["rows", "columns", "overlay"], reason));
  }

  private async getDistinctFilterValues(field: string): Promise<readonly unknown[]> {
    if (this.options.dataSource?.getDistinctValues) {
      const requestId = `filter:distinct:${++this.filterRequestSequence}`;
      const result = await this.options.dataSource.getDistinctValues({
        field,
        filterModel: this.filterModel,
        requestId
      });
      return Object.freeze([...result.values]);
    }

    return this.getClientDistinctValues(field);
  }

  private getClientDistinctValues(field: string): readonly unknown[] {
    if (!Array.isArray(this.options.data)) {
      return Object.freeze([]);
    }

    const column = this.findDataColumn(field);
    const values = new Map<string, unknown>();
    this.options.data.forEach((row, index) => {
      const value = column?.source.valueGetter
        ? column.source.valueGetter({
            row,
            rowIndex: index,
            rowKey: this.resolveDistinctRowKey(row, index)
          })
        : readField(row, field);
      values.set(String(value), value);
    });

    return Object.freeze([...values.values()]);
  }
}

function sameSortModel(
  left: readonly SortModel[],
  right: readonly SortModel[]
): boolean {
  return left.length === right.length
    && left.every((item, index) =>
      item.field === right[index]?.field
      && item.direction === right[index]?.direction
      && (item.priority ?? index) === (right[index]?.priority ?? index)
    );
}

function sameFilterModel(left: FilterModel, right: FilterModel): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
