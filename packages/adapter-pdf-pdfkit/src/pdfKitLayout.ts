import type { GridExportCell, GridExportMatrix } from "@onegrid/core";
import type { PdfKitDocumentLike } from "./pdfKitTypes.js";

export interface PdfKitLayoutOptions {
  readonly title: string;
  readonly regularFont: string;
  readonly boldFont: string;
  readonly pageWidth?: number;
  readonly pageHeight?: number;
}

interface LayoutMetrics {
  readonly margin: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly rowHeight: number;
  readonly titleHeight: number;
  readonly columnWidth: number;
  readonly maxRowsPerPage: number;
}

export function drawPdfKitMatrix(
  document: PdfKitDocumentLike,
  matrix: GridExportMatrix,
  options: PdfKitLayoutOptions
): void {
  const metrics = createMetrics(matrix, options);
  const rows = [...matrix.headerRows, ...matrix.bodyRows];
  let pageRow = 0;
  drawTitle(document, options, metrics);
  rows.forEach((row, rowIndex) => {
    if (pageRow >= metrics.maxRowsPerPage) {
      document.addPage?.();
      drawTitle(document, options, metrics);
      pageRow = 0;
    }
    drawRow(document, row, {
      ...options,
      metrics,
      pageRow,
      isHeader: rowIndex < matrix.headerRows.length
    });
    pageRow += 1;
  });
}

function drawTitle(
  document: PdfKitDocumentLike,
  options: PdfKitLayoutOptions,
  metrics: LayoutMetrics
): void {
  document.font(options.boldFont)
    .fontSize(14)
    .fillColor("#111827")
    .text(options.title, metrics.margin, metrics.margin, {
      width: metrics.pageWidth - metrics.margin * 2
    });
}

function drawRow(
  document: PdfKitDocumentLike,
  row: readonly GridExportCell[],
  input: PdfKitLayoutOptions & {
    readonly metrics: LayoutMetrics;
    readonly pageRow: number;
    readonly isHeader: boolean;
  }
): void {
  row.forEach((cell, columnIndex) => {
    if (cell.covered === true) {
      return;
    }
    const x = input.metrics.margin + columnIndex * input.metrics.columnWidth;
    const y = input.metrics.margin + input.metrics.titleHeight + input.pageRow * input.metrics.rowHeight;
    const width = input.metrics.columnWidth * (cell.colSpan ?? 1);
    const height = input.metrics.rowHeight * (cell.rowSpan ?? 1);
    drawCell(document, cell, {
      x,
      y,
      width,
      height,
      isHeader: input.isHeader,
      regularFont: input.regularFont,
      boldFont: input.boldFont
    });
  });
}

function drawCell(
  document: PdfKitDocumentLike,
  cell: GridExportCell,
  input: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly isHeader: boolean;
    readonly regularFont: string;
    readonly boldFont: string;
  }
): void {
  const isMerged = (cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1;
  const fill = input.isHeader ? "#f1f5f9" : isMerged ? "#fffbf0" : "#ffffff";
  document.rect(input.x, input.y, input.width, input.height).fill(fill);
  document.rect(input.x, input.y, input.width, input.height).lineWidth(0.5).stroke("#d1d5db");
  document.font(input.isHeader || isMerged ? input.boldFont : input.regularFont)
    .fontSize(input.isHeader ? 9 : 8)
    .fillColor("#111827")
    .text(formatCell(cell.value), input.x + 5, input.y + 7, {
      ellipsis: true,
      height: Math.max(8, input.height - 8),
      width: Math.max(8, input.width - 10)
    });
}

function createMetrics(
  matrix: GridExportMatrix,
  options: PdfKitLayoutOptions
): LayoutMetrics {
  const pageWidth = options.pageWidth ?? 842;
  const pageHeight = options.pageHeight ?? 595;
  const margin = 32;
  const rowHeight = 24;
  const titleHeight = 28;
  return {
    columnWidth: (pageWidth - margin * 2) / Math.max(1, matrix.columns.length),
    margin,
    maxRowsPerPage: Math.max(1, Math.floor((pageHeight - margin * 2 - titleHeight) / rowHeight)),
    pageHeight,
    pageWidth,
    rowHeight,
    titleHeight
  };
}

function formatCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
