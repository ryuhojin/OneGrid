import type { GridExportCell } from "@onegrid/core";
import type { ExcelJsCellLike, ExcelJsWorksheetLike } from "./excelJsTypes.js";

export function applyCellStyle(
  worksheet: ExcelJsWorksheetLike,
  row: number,
  column: number,
  cell: GridExportCell,
  isHeader: boolean
): void {
  const style = createCellStyle(isHeader, isMerged(cell));
  const rowSpan = cell.rowSpan ?? 1;
  const colSpan = cell.colSpan ?? 1;
  for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
    for (let colOffset = 0; colOffset < colSpan; colOffset += 1) {
      assignStyle(worksheet.getCell(row + rowOffset, column + colOffset), style);
    }
  }
}

export function createCellStyle(
  isHeader: boolean,
  isMergedCell: boolean
): Readonly<Record<string, unknown>> {
  const fillColor = isHeader ? "FFF1F5F9" : isMergedCell ? "FFFFFBF0" : "FFFFFFFF";
  return Object.freeze({
    alignment: { horizontal: isHeader ? "center" : "left", vertical: "middle", wrapText: true },
    border: {
      top: thinBorder(),
      right: thinBorder(),
      bottom: thinBorder(),
      left: thinBorder()
    },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: fillColor } },
    font: { bold: isHeader || isMergedCell, color: { argb: "FF111827" }, name: "Arial", size: 11 }
  });
}

function assignStyle(cell: ExcelJsCellLike, style: Readonly<Record<string, unknown>>): void {
  cell.alignment = style.alignment;
  cell.border = style.border;
  cell.fill = style.fill;
  cell.font = style.font;
}

function isMerged(cell: GridExportCell): boolean {
  return (cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1;
}

function thinBorder(): Readonly<Record<string, unknown>> {
  return Object.freeze({ style: "thin", color: { argb: "FFD1D5DB" } });
}
