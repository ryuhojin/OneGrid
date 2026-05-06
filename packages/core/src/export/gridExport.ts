import type { ExportOptions, ImportOptions } from "../types/grid-options.js";
import type { GridExportResult, GridImportResult } from "../types/shared.js";
import { exportCsv, importCsv } from "./csvExport.js";
import type { GridExportMatrix, GridImportMatrix } from "./exportTypes.js";
import { buildImportedRows } from "./importBuild.js";
import { exportPdf } from "./pdfExport.js";
import { exportPrintHtml } from "./printExport.js";
import { decodeUtf8 } from "./textEncoding.js";
import { exportXlsx } from "./xlsxExport.js";
import { importXlsx } from "./xlsxImport.js";

export function createGridExport(
  matrix: GridExportMatrix,
  options: ExportOptions = {}
): GridExportResult {
  const format = options.format ?? "csv";
  const filename = resolveFilename(options.filename, format);
  if (format === "xlsx") {
    return {
      content: exportXlsx(matrix, optionObject("sheetName", options.sheetName)),
      mediaType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      filename
    };
  }
  if (format === "pdf") {
    return {
      content: exportPdf(matrix, optionObject("title", options.title)),
      mediaType: "application/pdf",
      filename
    };
  }
  if (format === "json") {
    return {
      content: JSON.stringify(matrixToObjects(matrix), null, 2),
      mediaType: "application/json",
      filename
    };
  }
  if (format === "print") {
    return {
      content: exportPrintHtml(matrix, optionObject("title", options.title)),
      mediaType: "text/html",
      filename
    };
  }
  return {
    content: exportCsv(matrix, options.includeHeaders !== false),
    mediaType: "text/csv;charset=utf-8",
    filename
  };
}

export function createGridImport<TData = Record<string, unknown>>(
  content: string | Uint8Array,
  options: ImportOptions<TData> = {},
  fallbackColumns: readonly { readonly id: string; readonly field: string; readonly headerName: string }[] =
    Object.freeze([])
): GridImportResult<TData> {
  const matrix = parseImportMatrix(content, options.format ?? inferImportFormat(content));
  const result = buildImportedRows({ matrix, options, fallbackColumns });
  return Object.freeze({
    rows: result.rows,
    rowCount: result.rows.length,
    rejected: result.rejected
  });
}

function parseImportMatrix(
  content: string | Uint8Array,
  format: NonNullable<ImportOptions["format"]>
): GridImportMatrix {
  if (format === "xlsx") {
    return importXlsx(toBytes(content));
  }
  if (format === "json") {
    return parseJsonImport(content);
  }
  return importCsv(typeof content === "string" ? content : decodeUtf8(content));
}

function parseJsonImport(content: string | Uint8Array): GridImportMatrix {
  const parsed = JSON.parse(typeof content === "string" ? content : decodeUtf8(content)) as unknown;
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return Object.freeze({ rows: Object.freeze([]) });
  }
  const fields = Object.keys(parsed[0] as Record<string, unknown>);
  return Object.freeze({
    rows: Object.freeze([
      Object.freeze(fields),
      ...parsed.map((row) => Object.freeze(fields.map((field) => String((row as Record<string, unknown>)[field] ?? ""))))
    ])
  });
}

function matrixToObjects(matrix: GridExportMatrix): readonly Readonly<Record<string, unknown>>[] {
  return Object.freeze(matrix.bodyRows.map((row) => {
    const record: Record<string, unknown> = {};
    matrix.columns.forEach((column, index) => {
      const cell = row[index];
      record[column.field] = cell?.covered === true ? "" : cell?.value ?? "";
    });
    return Object.freeze(record);
  }));
}

function inferImportFormat(content: string | Uint8Array): NonNullable<ImportOptions["format"]> {
  if (typeof content !== "string" && isZip(content)) {
    return "xlsx";
  }
  if (typeof content === "string" && content.trimStart().startsWith("[")) {
    return "json";
  }
  return "csv";
}

function isZip(content: Uint8Array): boolean {
  return content[0] === 0x50 && content[1] === 0x4b;
}

function toBytes(content: string | Uint8Array): Uint8Array {
  if (typeof content !== "string") {
    return content;
  }
  return new Uint8Array([...content].map((char) => char.charCodeAt(0) & 0xff));
}

function resolveFilename(filename: string | undefined, format: string): string {
  if (filename) {
    return filename;
  }
  return `onegrid-export.${format === "print" ? "html" : format}`;
}

function optionObject<TKey extends string>(
  key: TKey,
  value: string | undefined
): { readonly [K in TKey]?: string } {
  return value === undefined ? {} : { [key]: value } as { readonly [K in TKey]?: string };
}
