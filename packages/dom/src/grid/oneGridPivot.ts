import type { PivotModel } from "@onegrid/core";
import type { PivotBuilderRuntime } from "./pivotPanel.js";
import { freezePivotModel } from "./pivotModelRuntime.js";
import { invalidate } from "./renderInvalidation.js";
import { OneGridRemoteRows } from "./oneGridRemoteRows.js";

export abstract class OneGridPivot<TData = unknown> extends OneGridRemoteRows<TData> {
  setPivotModel(model: PivotModel): void {
    if (this.destroyed) {
      return;
    }

    this.mutableOptions.pivot = Object.freeze({
      ...(this.options.pivot === undefined ? {} : this.options.pivot),
      enabled: this.options.pivot?.enabled ?? true,
      model: freezePivotModel(model)
    });
    this.virtualScrollTop = 0;
    this.columnScrollLeft = 0;
    this.clearAutoRowHeightCache();
    if (this.resetRemoteRowModel("pivot-model")) {
      return;
    }
    void this.render(invalidate(["columns", "rows", "layout", "overlay"], "pivot-model"));
  }

  getPivotModel(): PivotModel | undefined {
    return this.options.pivot?.model;
  }

  protected createPivotRuntime(): PivotBuilderRuntime | undefined {
    if (this.options.pivot?.panel !== true || !this.options.pivot.model) {
      return undefined;
    }
    return {
      getModel: () => this.getPivotModel(),
      applyModel: (model) => this.setPivotModel(model)
    };
  }
}
