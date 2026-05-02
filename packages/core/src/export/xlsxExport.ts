import type { GridExportMatrix, GridImportMatrix } from "./exportTypes.js";
import { decodeUtf8, encodeUtf8 } from "./textEncoding.js";
import { createZip, readZip } from "./xlsxZip.js";

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

export function importXlsx(data: Uint8Array): GridImportMatrix {
  const zip = readZip(data);
  const sheet = zip.get("xl/worksheets/sheet1.xml");
  if (!sheet) {
    return Object.freeze({ rows: Object.freeze([]) });
  }
  return Object.freeze({ rows: Object.freeze(parseWorksheetXml(decodeUtf8(sheet))) });
}

function worksheetXml(matrix: GridExportMatrix): string {
  const rows = [...matrix.headerRows, ...matrix.bodyRows];
  const headerRowCount = matrix.headerRows.length;
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
    `<row r="${rowIndex + 1}">${row.map((cell, columnIndex) =>
      createWorksheetCell(cell, rowIndex, columnIndex, headerRowCount)
    ).join("")}</row>`
  ).join("");

  return xml(
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
    + `<dimension ref="A1:${cellRef(Math.max(rows.length, 1), Math.max(matrix.columns.length, 1))}"/>`
    + columnsXml(matrix)
    + `<sheetData>${sheetRows}</sheetData>`
    + (merges.length === 0 ? "" : `<mergeCells count="${merges.length}">${merges.join("")}</mergeCells>`)
    + `</worksheet>`
  );
}

function createWorksheetCell(
  cell: GridExportMatrix["bodyRows"][number][number],
  rowIndex: number,
  columnIndex: number,
  headerRowCount: number
): string {
  const value = cell.covered === true ? "" : formatCell(cell.value);
  return `<c r="${cellRef(rowIndex + 1, columnIndex + 1)}" s="${cellStyleId(cell, rowIndex, headerRowCount)}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
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

function parseWorksheetXml(xmlText: string): readonly (readonly string[])[] {
  const rows: string[][] = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/gu;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(xmlText)) !== null) {
    const rowXml = rowMatch[1] ?? "";
    const cells: string[] = [];
    const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/gu;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
      const attrs = cellMatch[1] ?? "";
      const ref = /r="([A-Z]+)(\d+)"/u.exec(attrs)?.[1];
      const columnIndex = ref ? columnNameToIndex(ref) : cells.length;
      while (cells.length < columnIndex) cells.push("");
      cells[columnIndex] = unescapeXml(readCellText(cellMatch[2] ?? ""));
    }
    rows.push(cells);
  }
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

function readCellText(xmlText: string): string {
  const inline = /<t[^>]*>([\s\S]*?)<\/t>/u.exec(xmlText);
  if (inline) return inline[1] ?? "";
  return /<v[^>]*>([\s\S]*?)<\/v>/u.exec(xmlText)?.[1] ?? "";
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
    + `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`
    + `<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>`
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

function columnNameToIndex(name: string): number {
  return [...name].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function sanitizeSheetName(value: string): string {
  const cleaned = value.replace(/[\\/?*[\]:]/gu, " ").trim();
  return (cleaned.length === 0 ? "OneGrid" : cleaned).slice(0, 31);
}

function formatCell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function unescapeXml(value: string): string {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
