import type {
  GridExportAdapterPayload,
  GridExportCell,
  GridExportMatrix,
  GridExportResult
} from "@onegrid/core";
import { applyCellStyle } from "./excelJsStyles.js";
import type { ExcelJsWorkbookLike, ExcelJsWorksheetLike } from "./excelJsTypes.js";
import { normalizeExportValue, toUint8Array } from "./excelJsValues.js";

export interface ExcelJsExportAdapterOptions<TData = unknown> {
  readonly workbookFactory: () => ExcelJsWorkbookLike | Promise<ExcelJsWorkbookLike>;
  readonly format?: string;
  readonly sheetName?: string;
  readonly filename?: string;
  readonly rows?: readonly TData[];
}

export function createExcelJsExportAdapter<TData = unknown>(
  options: ExcelJsExportAdapterOptions<TData>
): GridExportAdapterPayload<TData> {
  return {
    format: options.format ?? "xlsx",
    capabilities: {
      compressedXlsx: true,
      externalWorkbook: true,
      mergedLayout: true
    },
    async export(context): Promise<GridExportResult> {
      const workbook = await options.workbookFactory();
      const sheetName = context.options.sheetName ?? options.sheetName ?? "OneGrid";
      const worksheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
      writeWorkbookMatrix(worksheet, context.matrix);
      const content = toUint8Array(await workbook.xlsx.writeBuffer());
      return {
        content,
        filename: context.options.filename ?? options.filename ?? "onegrid-export.xlsx",
        mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      };
    }
  };
}

function writeWorkbookMatrix(
  worksheet: ExcelJsWorksheetLike,
  matrix: GridExportMatrix
): void {
  worksheet.columns = matrix.columns.map((column, index) => ({
    header: column.headerName,
    key: column.field,
    width: getColumnWidth(matrix, index)
  }));
  worksheet.views = matrix.headerRows.length === 0
    ? []
    : [{ state: "frozen", ySplit: matrix.headerRows.length }];

  const rows = [...matrix.headerRows, ...matrix.bodyRows];
  rows.forEach((row, rowIndex) => {
    const excelRow = worksheet.getRow(rowIndex + 1);
    excelRow.height = rowIndex < matrix.headerRows.length ? 24 : 22;
    row.forEach((cell, columnIndex) => {
      const excelCell = worksheet.getCell(rowIndex + 1, columnIndex + 1);
      excelCell.value = cell.covered === true ? "" : normalizeExportValue(cell.value);
      applyCellStyle(worksheet, rowIndex + 1, columnIndex + 1, cell, rowIndex < matrix.headerRows.length);
      mergeCellIfNeeded(worksheet, cell, rowIndex + 1, columnIndex + 1);
    });
  });

  if (matrix.headerRows.length > 0 && matrix.bodyRows.length > 0) {
    worksheet.autoFilter = {
      from: { row: matrix.headerRows.length, column: 1 },
      to: { row: matrix.headerRows.length + matrix.bodyRows.length, column: matrix.columns.length }
    };
  }
}

function mergeCellIfNeeded(
  worksheet: ExcelJsWorksheetLike,
  cell: GridExportCell,
  row: number,
  column: number
): void {
  if (cell.covered === true || ((cell.rowSpan ?? 1) <= 1 && (cell.colSpan ?? 1) <= 1)) {
    return;
  }
  worksheet.mergeCells(row, column, row + (cell.rowSpan ?? 1) - 1, column + (cell.colSpan ?? 1) - 1);
}

function getColumnWidth(matrix: GridExportMatrix, columnIndex: number): number {
  const values = [...matrix.headerRows, ...matrix.bodyRows].map((row) =>
    row[columnIndex]?.covered === true ? "" : String(row[columnIndex]?.value ?? "")
  );
  return Math.min(42, Math.max(12, ...values.map((value) => value.length + 3)));
}

function sanitizeSheetName(value: string): string {
  const cleaned = value.replace(/[\\/?*[\]:]/gu, " ").trim();
  return (cleaned.length === 0 ? "OneGrid" : cleaned).slice(0, 31);
}
