import type { GridExportMatrix } from "./exportTypes.js";
import { encodeUtf8 } from "./textEncoding.js";
import { createZip } from "./xlsxZip.js";

export function exportXlsx(matrix: GridExportMatrix, options: { readonly sheetName?: string } = {}): Uint8Array {
  const sheetName = sanitizeSheetName(options.sheetName ?? "OneGrid");
  return createZip([
    xmlEntry("[Content_Types].xml", contentTypesXml()),
    xmlEntry("_rels/.rels", packageRelsXml()),
    xmlEntry("xl/workbook.xml", workbookXml(sheetName)),
    xmlEntry("xl/_rels/workbook.xml.rels", workbookRelsXml()),
    xmlEntry("xl/styles.xml", stylesXml()),
    xmlEntry("xl/worksheets/sheet1.xml", worksheetXml(matrix))
  ]);
}

function worksheetXml(matrix: GridExportMatrix): string {
  const rows = [...matrix.headerRows, ...matrix.bodyRows];
  const headerRowCount = matrix.headerRows.length;
  const lastRow = Math.max(rows.length, 1);
  const lastColumn = Math.max(matrix.columns.length, 1);
  const merges = rows.flatMap((row, rowIndex) =>
    row.flatMap((cell, columnIndex) => {
      if (cell.covered === true || ((cell.rowSpan ?? 1) <= 1 && (cell.colSpan ?? 1) <= 1)) {
        return [];
      }
      const start = cellRef(rowIndex + 1, columnIndex + 1);
      const end = cellRef(rowIndex + (cell.rowSpan ?? 1), columnIndex + (cell.colSpan ?? 1));
      return start === end ? [] : [`<mergeCell ref="${start}:${end}"/>`];
    })
  );
  const sheetRows = rows.map((row, rowIndex) =>
    `<row r="${rowIndex + 1}" ht="${rowHeight(rowIndex, headerRowCount)}" customHeight="1">${row.map((cell, columnIndex) =>
      createWorksheetCell(cell, rowIndex, columnIndex, headerRowCount)
    ).join("")}</row>`
  ).join("");

  return xml(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`
    + `<dimension ref="A1:${cellRef(lastRow, lastColumn)}"/>`
    + sheetViewsXml(headerRowCount)
    + `<sheetFormatPr defaultRowHeight="21"/>`
    + columnsXml(matrix)
    + `<sheetData>${sheetRows}</sheetData>`
    + autoFilterXml(headerRowCount, lastRow, lastColumn)
    + (merges.length === 0 ? "" : `<mergeCells count="${merges.length}">${merges.join("")}</mergeCells>`)
    + `<printOptions horizontalCentered="1"/>`
    + `<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>`
    + `<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>`
    + `</worksheet>`
  );
}

function createWorksheetCell(
  cell: GridExportMatrix["bodyRows"][number][number],
  rowIndex: number,
  columnIndex: number,
  headerRowCount: number
): string {
  const reference = cellRef(rowIndex + 1, columnIndex + 1);
  const styleId = cellStyleId(cell, rowIndex, headerRowCount);
  if (cell.covered === true) {
    return `<c r="${reference}" s="${styleId}" t="inlineStr"><is><t></t></is></c>`;
  }
  if (isFiniteNumber(cell.value)) {
    return `<c r="${reference}" s="${styleId}"><v>${cell.value}</v></c>`;
  }
  return `<c r="${reference}" s="${styleId}" t="inlineStr"><is><t>${escapeXml(formatCell(cell.value))}</t></is></c>`;
}

function cellStyleId(
  cell: { readonly covered?: boolean; readonly rowSpan?: number; readonly colSpan?: number },
  rowIndex: number,
  headerRowCount: number
): number {
  if (rowIndex < headerRowCount) {
    return 1;
  }
  return cell.covered === true || (cell.rowSpan ?? 1) > 1 || (cell.colSpan ?? 1) > 1 ? 3 : 2;
}

function columnsXml(matrix: GridExportMatrix): string {
  const rows = [...matrix.headerRows, ...matrix.bodyRows];
  const cols = matrix.columns.map((column, index) => {
    const values = rows.map((row) => formatCell(row[index]?.value));
    const length = Math.max(column.headerName.length, ...values.map((value) => value.length));
    const width = Math.min(34, Math.max(12, length + 3));
    return `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`;
  });
  return cols.length === 0 ? "" : `<cols>${cols.join("")}</cols>`;
}

function sheetViewsXml(headerRowCount: number): string {
  if (headerRowCount <= 0) {
    return `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
  }
  const topLeftCell = cellRef(headerRowCount + 1, 1);
  return `<sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRowCount}" topLeftCell="${topLeftCell}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`;
}

function autoFilterXml(
  headerRowCount: number,
  lastRow: number,
  lastColumn: number
): string {
  if (headerRowCount <= 0 || lastColumn <= 0 || lastRow <= headerRowCount) {
    return "";
  }
  return `<autoFilter ref="A${headerRowCount}:${cellRef(lastRow, lastColumn)}"/>`;
}

function rowHeight(rowIndex: number, headerRowCount: number): number {
  return rowIndex < headerRowCount ? 24 : 21;
}

function contentTypesXml(): string {
  return xml(
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`
    + `<Default Extension="xml" ContentType="application/xml"/>`
    + `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>`
    + `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
    + `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>`
    + `</Types>`
  );
}

function packageRelsXml(): string {
  return xml(`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
}

function workbookXml(sheetName: string): string {
  return xml(`<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`);
}

function workbookRelsXml(): string {
  return xml(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>`
    + `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
    + `</Relationships>`
  );
}

function stylesXml(): string {
  return xml(
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<fonts count="2">`
    + `<font><sz val="11"/><color rgb="FF111827"/><name val="Arial"/></font>`
    + `<font><b/><sz val="11"/><color rgb="FF111827"/><name val="Arial"/></font>`
    + `</fonts>`
    + `<fills count="4">`
    + `<fill><patternFill patternType="none"/></fill>`
    + `<fill><patternFill patternType="gray125"/></fill>`
    + `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/><bgColor indexed="64"/></patternFill></fill>`
    + `<fill><patternFill patternType="solid"><fgColor rgb="FFFFFBF0"/><bgColor indexed="64"/></patternFill></fill>`
    + `</fills>`
    + `<borders count="2">`
    + `<border><left/><right/><top/><bottom/><diagonal/></border>`
    + `<border><left style="thin"><color rgb="FFD1D5DB"/></left><right style="thin"><color rgb="FFD1D5DB"/></right><top style="thin"><color rgb="FFD1D5DB"/></top><bottom style="thin"><color rgb="FFD1D5DB"/></bottom><diagonal/></border>`
    + `</borders>`
    + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
    + `<cellXfs count="4">`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`
    + `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>`
    + `</cellXfs>`
    + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`
    + `</styleSheet>`
  );
}

function xml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${body}`;
}

function xmlEntry(name: string, text: string) {
  return { name, data: encodeUtf8(text) };
}

function cellRef(row: number, column: number): string {
  return `${columnName(column)}${row}`;
}

function columnName(column: number): string {
  let value = column;
  let name = "";
  while (value > 0) {
    value -= 1;
    name = String.fromCharCode(65 + (value % 26)) + name;
    value = Math.floor(value / 26);
  }
  return name;
}

function sanitizeSheetName(value: string): string {
  const cleaned = value.replace(/[\\/?*[\]:]/gu, " ").trim();
  return (cleaned.length === 0 ? "OneGrid" : cleaned).slice(0, 31);
}

function formatCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
