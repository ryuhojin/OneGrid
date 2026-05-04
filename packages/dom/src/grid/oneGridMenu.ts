import {
  createContextMenuModel,
  createLocaleFormatter,
  isCellEditable
} from "@onegrid/core";
import type {
  ContextMenuContext,
  ContextMenuModel,
  ContextMenuModelItem
} from "@onegrid/core";
import {
  attachGridContextMenuForHost,
  disposeGridContextMenu
} from "./contextMenuRuntime.js";
import type { GridContextMenuRuntime } from "./contextMenuRuntime.js";
import { readCellValue } from "./rendererHost.js";
import { fullInvalidation } from "./renderInvalidation.js";
import { OneGridExport } from "./oneGridExport.js";

export class OneGridMenu<TData = unknown> extends OneGridExport<TData> {
  protected override commitRender(invalidation = fullInvalidation("commit")): void {
    super.commitRender(invalidation);
    this.attachContextMenuRuntime();
  }

  override destroy(): void {
    disposeGridContextMenu(this.root);
    super.destroy();
  }

  private attachContextMenuRuntime(): void {
    const grid = this.root.querySelector<HTMLElement>(".og-grid");
    if (!grid || this.options.contextMenu?.enabled !== true) {
      disposeGridContextMenu(this.root);
      return;
    }

    attachGridContextMenuForHost(this.root, {
      grid,
      runtime: this.createContextMenuRuntime()
    });
  }

  private createContextMenuRuntime(): GridContextMenuRuntime<TData> {
    return {
      enabled: this.options.contextMenu?.enabled === true,
      createModel: (cell) => this.createContextMenuModel(cell),
      runItem: (item, context) => {
        void this.runContextMenuItem(item, context);
      }
    };
  }

  private createContextMenuModel(cell: HTMLElement): ContextMenuModel<TData> | undefined {
    const context = this.readContextMenuContext(cell);
    if (!context) {
      return undefined;
    }

    return createContextMenuModel({
      context,
      ...(this.options.contextMenu === undefined ? {} : { options: this.options.contextMenu }),
      capabilities: {
        canCopy: this.options.clipboard?.enabled === true,
        canEdit: this.isContextEditable(context),
        hasSelection: this.hasSelection()
      }
    });
  }

  private async runContextMenuItem(
    item: ContextMenuModelItem<TData>,
    context: ContextMenuContext<TData>
  ): Promise<void> {
    if (item.action === "copyCell" && context.field) {
      this.selectCell(toSelectedCell(context, context.field));
      await this.copyToClipboard({ selectedOnly: true });
    } else if (item.action === "copyRow") {
      this.selectRows([context.rowKey]);
      await this.copyToClipboard({ selectedOnly: true });
    } else if (item.action === "copyWithHeaders") {
      this.selectRows([context.rowKey]);
      await this.copyToClipboard({ selectedOnly: true, includeHeaders: true });
    } else if (item.action === "startEdit" && context.field) {
      this.startEdit({ rowIndex: context.rowIndex, rowKey: context.rowKey, field: context.field });
    } else if (item.action === "clearSelection") {
      this.clearSelection();
    }

    item.source?.onSelect?.(context);
  }

  private readContextMenuContext(cell: HTMLElement): ContextMenuContext<TData> | undefined {
    const rowKey = cell.dataset.editRowKey;
    const field = cell.dataset.field;
    const rowIndex = readNumber(cell.dataset.rowIndex);
    const sourceIndex = readNumber(cell.dataset.sourceIndex);
    const ariaColumnIndex = readNumber(cell.getAttribute("aria-colindex") ?? undefined);
    if (rowKey === undefined || field === undefined || rowIndex === undefined) {
      return undefined;
    }

    const rowInfo = this.findEditableRow(rowKey, sourceIndex);
    const column = this.findDataColumn(field);
    if (!rowInfo || !column) {
      return undefined;
    }

    const value = readCellValue(rowInfo.row, rowInfo.rowKey, rowIndex, column);
    return {
      scope: "cell",
      row: rowInfo.row,
      rowIndex,
      rowKey: rowInfo.rowKey,
      ...(rowInfo.sourceIndex === undefined ? {} : { sourceIndex: rowInfo.sourceIndex }),
      field,
      ...(ariaColumnIndex === undefined ? {} : { columnIndex: ariaColumnIndex - 1 }),
      column: column.source,
      value
    };
  }

  private isContextEditable(context: ContextMenuContext<TData>): boolean {
    if (!context.field || !context.column) {
      return false;
    }

    return isCellEditable(context.column, {
      ...createLocaleFormatter(this.options.locale),
      row: context.row,
      rowIndex: context.rowIndex,
      rowKey: context.rowKey,
      column: context.column,
      field: context.field,
      value: context.value,
      position: { rowIndex: context.rowIndex, rowKey: context.rowKey, field: context.field }
    }, this.options.editing);
  }

  private hasSelection(): boolean {
    return this.selectionState.rowKeys.length > 0
      || this.selectionState.cells.length > 0
      || this.selectionState.ranges.length > 0
      || this.selectionState.allRowsToken !== undefined;
  }
}

function toSelectedCell<TData>(context: ContextMenuContext<TData>, field: string) {
  return {
    rowKey: context.rowKey,
    rowIndex: context.rowIndex,
    field,
    columnIndex: context.columnIndex ?? 0
  };
}

function readNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
