import type { GridExportMatrix } from "./exportTypes.js";
import { encodeUtf8 } from "./textEncoding.js";

export function exportPdf(
  matrix: GridExportMatrix,
  options: { readonly title?: string } = {}
): Uint8Array {
  const stream = createPdfTableStream(matrix, options.title ?? "OneGrid Export");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  return encodeUtf8(createPdfDocument(objects));
}

function createPdfTableStream(matrix: GridExportMatrix, title: string): string {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 40;
  const rowHeight = 22;
  const titleY = pageHeight - margin;
  const tableTop = titleY - 26;
  const tableWidth = pageWidth - margin * 2;
  const columnCount = Math.max(matrix.columns.length, 1);
  const columnWidth = tableWidth / columnCount;
  const rows = [...matrix.headerRows, ...matrix.bodyRows].slice(0, Math.floor((tableTop - margin) / rowHeight));
  const commands = [
    "BT",
    "/F1 16 Tf",
    "0.066 0.094 0.153 rg",
    `${margin} ${titleY} Td`,
    `(${escapePdfText(title)}) Tj`,
    "ET"
  ];

  rows.forEach((row, rowIndex) => {
    const isHeader = rowIndex < matrix.headerRows.length;
    row.forEach((cell, columnIndex) => {
      if (cell.covered === true) {
        return;
      }
      const x = margin + columnIndex * columnWidth;
      const width = columnWidth * (cell.colSpan ?? 1);
      const height = rowHeight * (cell.rowSpan ?? 1);
      const y = tableTop - (rowIndex + (cell.rowSpan ?? 1)) * rowHeight;
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
  return commands.join("\n");
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
