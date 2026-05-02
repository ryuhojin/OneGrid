import type {
  ExportOptions,
  GridExportResult,
  GridImportResult,
  ImportOptions
} from "@onegrid/core";
import { exportDomGridData, importDomGridData } from "./exportData.js";
import { invalidate } from "./renderInvalidation.js";
import { OneGridClipboard } from "./oneGridClipboard.js";

export class OneGridExport<TData = unknown> extends OneGridClipboard<TData> {
  async exportData(options: ExportOptions = {}): Promise<GridExportResult> {
    return exportDomGridData({
      options: this.getRenderOptions(),
      rowRenderState: this.createRowRenderState(),
      selection: this.selectionState
    }, {
      ...(this.options.export ?? {}),
      ...options
    });
  }

  async importData(
    content: string | Uint8Array,
    options?: ImportOptions<TData>
  ): Promise<GridImportResult<TData>> {
    const importOptions = { ...(this.options.import ?? {}), ...(options ?? {}) };
    const result = importDomGridData(
      content,
      importOptions,
      getImportFallbackColumns(this.options.columns)
    );
    const mode = importOptions.mode ?? "replace";
    if (mode === "replace" || result.rows.length > 0) {
      this.dataRows = mode === "append"
        ? Object.freeze([...(this.dataRows ?? this.options.data ?? []), ...result.rows])
        : result.rows;
      this.virtualScrollTop = 0;
      this.paginationPage = 1;
      await this.render(invalidate(["rows", "layout", "overlay"], "import-data"));
    }
    return result;
  }
}

function getImportFallbackColumns(columns: readonly { readonly field?: string; readonly headerName?: string }[]) {
  return columns
    .filter((column): column is { readonly field: string; readonly headerName?: string } =>
      typeof column.field === "string"
    )
    .map((column) => ({
      id: column.field,
      field: column.field,
      headerName: column.headerName ?? column.field
    }));
}
