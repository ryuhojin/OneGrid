import { createGridIoAdapterPlugin } from "@onegrid/adapters";
import type { GridPlugin } from "@onegrid/core";
import {
  createExcelJsExportAdapter,
  type ExcelJsExportAdapterOptions
} from "./excelJsExportAdapter.js";
import {
  createExcelJsImportAdapter,
  type ExcelJsImportAdapterOptions
} from "./excelJsImportAdapter.js";

export type {
  ExcelJsCellLike,
  ExcelJsRowLike,
  ExcelJsWorksheetLike,
  ExcelJsWorkbookLike
} from "./excelJsTypes.js";
export {
  createExcelJsExportAdapter,
  type ExcelJsExportAdapterOptions,
  createExcelJsImportAdapter,
  type ExcelJsImportAdapterOptions
};

export interface ExcelJsIoAdapterPluginOptions<TData = unknown> {
  readonly id?: string;
  readonly export?: ExcelJsExportAdapterOptions<TData>;
  readonly import?: ExcelJsImportAdapterOptions;
}

export function createExcelJsIoAdapterPlugin<TData = unknown>(
  options: ExcelJsIoAdapterPluginOptions<TData>
): GridPlugin<TData> {
  const exportAdapter = options.export ? createExcelJsExportAdapter<TData>(options.export) : undefined;
  const importAdapter = options.import ? createExcelJsImportAdapter<TData>(options.import) : undefined;
  return createGridIoAdapterPlugin({
    id: options.id ?? "onegrid-exceljs-adapter",
    exports: exportAdapter ? [exportAdapter] : [],
    imports: importAdapter ? [importAdapter] : []
  });
}
