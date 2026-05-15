import type {
  GridImportAdapterPayload,
  GridImportMatrix,
  GridImportResult
} from "@onegrid/core";
import { buildImportedRows } from "@onegrid/core";
import type { ExcelJsWorkbookLike, ExcelJsWorksheetLike } from "./excelJsTypes.js";
import { normalizeImportValue, toArrayBuffer } from "./excelJsValues.js";

export interface ExcelJsImportAdapterOptions {
  readonly workbookFactory: () => ExcelJsWorkbookLike | Promise<ExcelJsWorkbookLike>;
  readonly format?: string;
  readonly sheetName?: string;
  readonly sheetIndex?: number;
  readonly formulaMode?: "result" | "formula";
}

export function createExcelJsImportAdapter<TData = Record<string, unknown>>(
  options: ExcelJsImportAdapterOptions
): GridImportAdapterPayload<TData> {
  return {
    format: options.format ?? "xlsx",
    capabilities: {
      compressedXlsx: true,
      externalWorkbook: true,
      mergedLayout: true
    },
    async import(context): Promise<GridImportResult<TData>> {
      const workbook = await options.workbookFactory();
      await workbook.xlsx.load(toArrayBuffer(context.content));
      const worksheet = resolveWorksheet(workbook, options);
      const matrix = readWorksheetMatrix(worksheet, options.formulaMode ?? "result");
      const result = buildImportedRows<TData>({
        matrix,
        options: context.options,
        ...(context.fallbackColumns === undefined ? {} : { fallbackColumns: context.fallbackColumns })
      });
      return Object.freeze({
        rows: result.rows,
        rowCount: result.rows.length,
        rejected: result.rejected
      });
    }
  };
}

function resolveWorksheet(
  workbook: ExcelJsWorkbookLike,
  options: ExcelJsImportAdapterOptions
): ExcelJsWorksheetLike {
  if (options.sheetName && workbook.getWorksheet) {
    const worksheet = workbook.getWorksheet(options.sheetName);
    if (worksheet) {
      return worksheet;
    }
  }
  if (options.sheetIndex !== undefined && workbook.getWorksheet) {
    const worksheet = workbook.getWorksheet(options.sheetIndex);
    if (worksheet) {
      return worksheet;
    }
  }
  const worksheet = workbook.worksheets?.[Math.max(0, (options.sheetIndex ?? 1) - 1)];
  if (!worksheet) {
    throw new Error("OneGrid ExcelJS import adapter could not find a worksheet.");
  }
  return worksheet;
}

function readWorksheetMatrix(
  worksheet: ExcelJsWorksheetLike,
  formulaMode: "result" | "formula"
): GridImportMatrix {
  const rowCount = worksheet.rowCount ?? 0;
  const columnCount = Math.max(worksheet.columnCount ?? 0, worksheet.actualColumnCount ?? 0);
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => {
    const row = worksheet.getRow(rowIndex + 1);
    const cellCount = Math.max(columnCount, row.cellCount ?? 0, row.actualCellCount ?? 0);
    return Object.freeze(Array.from({ length: cellCount }, (_, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      return cell.text ?? normalizeImportValue(cell.value, formulaMode);
    }));
  });
  return Object.freeze({ rows: Object.freeze(rows) });
}
