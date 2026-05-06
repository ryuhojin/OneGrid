import type { GridExportMatrix } from "./exportTypes.js";
import { encodeUtf8 } from "./textEncoding.js";

type ExportRows = GridExportMatrix["bodyRows"];
interface ColumnRange {
  readonly first: number;
  readonly last: number;
}

export function exportPdf(
  matrix: GridExportMatrix,
  options: { readonly title?: string } = {}
): Uint8Array {
  const streams = createPdfPageStreams(matrix, options.title ?? "OneGrid Export");
  const pageIds = streams.map((_, index) => 3 + index);
  const fontId = 3 + streams.length;
  const contentIds = streams.map((_, index) => fontId + 1 + index);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${streams.length} >>`,
    ...streams.map((_, index) =>
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`
    ),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ...streams.map((stream) => `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`)
  ];
  return encodeUtf8(createPdfDocument(objects));
}

function createPdfPageStreams(matrix: GridExportMatrix, title: string): readonly string[] {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const rowHeight = 22;
  const titleY = pageHeight - margin;
  const tableTop = titleY - 26;
  const tableWidth = pageWidth - margin * 2;
  const columnCount = Math.max(matrix.columns.length, 1);
  const ranges = chunkColumns(columnCount, 8);
  const pages = ranges.flatMap((range) => {
    const headerRows = sliceRows(matrix.headerRows, range);
    const bodyRows = sliceRows(matrix.bodyRows, range);
    const rowCapacity = Math.max(1, Math.floor((tableTop - margin) / rowHeight));
    const bodyCapacity = Math.max(1, rowCapacity - headerRows.length);
    return chunkRows(bodyRows, bodyCapacity).map((chunk) => ({
      columnWidth: tableWidth / Math.max(1, range.last - range.first + 1),
      headerRowCount: headerRows.length,
      rows: [...headerRows, ...chunk]
    }));
  });
  return pages.map((page, pageIndex) =>
    createPdfTableStream({
      ...page,
      title,
      pageIndex,
      pageCount: pages.length,
      margin,
      rowHeight,
      titleY,
      tableTop
    })
  );
}

function createPdfTableStream(input: {
  readonly title: string;
  readonly pageIndex: number;
  readonly pageCount: number;
  readonly margin: number;
  readonly rowHeight: number;
  readonly titleY: number;
  readonly tableTop: number;
  readonly columnWidth: number;
  readonly headerRowCount: number;
  readonly rows: ExportRows;
}): string {
  const commands = [
    "BT",
    "/F1 16 Tf",
    "0.066 0.094 0.153 rg",
    `${input.margin} ${input.titleY} Td`,
    `(${escapePdfText(input.title)}) Tj`,
    "ET"
  ];

  input.rows.forEach((row, rowIndex) => {
    const isHeader = rowIndex < input.headerRowCount;
    row.forEach((cell, columnIndex) => {
      if (cell.covered === true) {
        return;
      }
      const x = input.margin + columnIndex * input.columnWidth;
      const width = input.columnWidth * (cell.colSpan ?? 1);
      const height = input.rowHeight * (cell.rowSpan ?? 1);
      const y = input.tableTop - (rowIndex + (cell.rowSpan ?? 1)) * input.rowHeight;
      commands.push(...createPdfCell({
        x,
        y,
        width,
        height,
        text: truncatePdfText(formatCell(cell), Math.max(8, Math.floor(width / 5.8))),
        isHeader,
        isMerged: (cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1
      }));
    });
  });
  commands.push(...createPageNumberCommands(input.pageIndex, input.pageCount, input.margin));
  return commands.join("\n");
}

function chunkRows(
  rows: ExportRows,
  size: number
): readonly ExportRows[] {
  if (rows.length === 0) {
    return [Object.freeze([])];
  }
  const chunks: ExportRows[] = [];
  let current: ExportRows = [];
  let index = 0;
  while (index < rows.length) {
    const blockEnd = findRowSpanBlockEnd(rows, index);
    const block = rows.slice(index, blockEnd + 1);
    if (current.length > 0 && current.length + block.length > size) {
      chunks.push(current);
      current = [];
    }
    if (block.length > size) {
      chunks.push(block);
    } else {
      current = [...current, ...block];
    }
    index = blockEnd + 1;
  }
  if (current.length > 0) {
    chunks.push(current);
  }
  return chunks;
}

function chunkColumns(columnCount: number, size: number): readonly ColumnRange[] {
  const ranges: ColumnRange[] = [];
  for (let first = 0; first < columnCount; first += size) {
    ranges.push({ first, last: Math.min(columnCount - 1, first + size - 1) });
  }
  return ranges.length === 0 ? [{ first: 0, last: 0 }] : ranges;
}

function sliceRows(rows: ExportRows, range: ColumnRange): ExportRows {
  return rows.map((row) => Object.freeze(row.slice(range.first, range.last + 1).map((cell, offset) => {
    const sourceColumn = range.first + offset;
    if (cell.covered === true) {
      return cell;
    }
    const remaining = range.last - sourceColumn + 1;
    const colSpan = Math.min(cell.colSpan ?? 1, remaining);
    return colSpan === (cell.colSpan ?? 1) ? cell : { ...cell, colSpan };
  })));
}

function findRowSpanBlockEnd(rows: ExportRows, startIndex: number): number {
  let blockEnd = startIndex;
  for (let rowIndex = startIndex; rowIndex <= blockEnd && rowIndex < rows.length; rowIndex += 1) {
    rows[rowIndex]?.forEach((cell) => {
      if (cell.covered === true) {
        return;
      }
      blockEnd = Math.max(blockEnd, rowIndex + (cell.rowSpan ?? 1) - 1);
    });
  }
  return Math.min(blockEnd, rows.length - 1);
}

function createPageNumberCommands(
  pageIndex: number,
  pageCount: number,
  margin: number
): readonly string[] {
  return [
    "BT",
    "/F1 8 Tf",
    "0.400 0.459 0.533 rg",
    `${margin} 24 Td`,
    `(Page ${pageIndex + 1} of ${pageCount}) Tj`,
    "ET"
  ];
}

function createPdfCell(input: {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly text: string;
  readonly isHeader: boolean;
  readonly isMerged: boolean;
}): readonly string[] {
  const fill = input.isHeader ? "0.941 0.961 0.984 rg" : input.isMerged ? "1 0.992 0.961 rg" : "1 1 1 rg";
  return [
    "q",
    fill,
    `${formatNumber(input.x)} ${formatNumber(input.y)} ${formatNumber(input.width)} ${formatNumber(input.height)} re f`,
    "0.820 0.847 0.878 RG",
    "0.6 w",
    `${formatNumber(input.x)} ${formatNumber(input.y)} ${formatNumber(input.width)} ${formatNumber(input.height)} re S`,
    "Q",
    "BT",
    input.isHeader || input.isMerged ? "/F1 10 Tf" : "/F1 9 Tf",
    "0.066 0.094 0.153 rg",
    `${formatNumber(input.x + 6)} ${formatNumber(getPdfTextY(input))} Td`,
    `(${escapePdfText(input.text)}) Tj`,
    "ET"
  ];
}

function getPdfTextY(input: { readonly y: number; readonly height: number; readonly isMerged: boolean }): number {
  return input.isMerged ? input.y + input.height / 2 - 4 : input.y + input.height - 14;
}

function truncatePdfText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 3))}...` : value;
}

function createPdfDocument(objects: readonly string[]): string {
  const parts = ["%PDF-1.4\n"];
  const offsets: number[] = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(parts.join("").length);
    parts.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }
  const xref = parts.join("").length;
  parts.push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets.slice(1)) {
    parts.push(`${String(offset).padStart(10, "0")} 00000 n \n`);
  }
  parts.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return parts.join("");
}

function formatCell(cell: { readonly value: unknown; readonly covered?: boolean }): string {
  if (cell.covered === true) {
    return "";
  }
  return cell.value === null || cell.value === undefined ? "" : String(cell.value);
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapePdfText(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
