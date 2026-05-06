import type { GridImportMatrix } from "./exportTypes.js";
import { decodeUtf8 } from "./textEncoding.js";
import { readZip } from "./xlsxZip.js";

interface XlsxImportContext {
  readonly dateStyleIds: ReadonlySet<number>;
  readonly sharedStrings: readonly string[];
}

const BUILTIN_DATE_FORMAT_IDS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22,
  27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58
]);
const MS_PER_DAY = 86_400_000;

export function importXlsx(data: Uint8Array): GridImportMatrix {
  const zip = readZip(data);
  const sheet = readWorksheet(zip);
  if (!sheet) {
    return Object.freeze({ rows: Object.freeze([]) });
  }
  const context: XlsxImportContext = {
    dateStyleIds: parseDateStyleIds(readText(zip, "xl/styles.xml")),
    sharedStrings: parseSharedStrings(readText(zip, "xl/sharedStrings.xml"))
  };
  return Object.freeze({ rows: Object.freeze(parseWorksheetXml(decodeUtf8(sheet), context)) });
}

function readWorksheet(zip: ReadonlyMap<string, Uint8Array>): Uint8Array | undefined {
  const workbookXml = readText(zip, "xl/workbook.xml");
  const relsXml = readText(zip, "xl/_rels/workbook.xml.rels");
  const firstSheetRel = workbookXml ? /<sheet\b[^>]*r:id="([^"]+)"/u.exec(workbookXml)?.[1] : undefined;
  const relTarget = firstSheetRel && relsXml ? findRelationshipTarget(relsXml, firstSheetRel) : undefined;
  return zip.get(resolveWorkbookTarget(relTarget)) ?? zip.get("xl/worksheets/sheet1.xml");
}

function findRelationshipTarget(relsXml: string, id: string): string | undefined {
  const relPattern = /<Relationship\b([^>]*)\/?>/gu;
  let match: RegExpExecArray | null;
  while ((match = relPattern.exec(relsXml)) !== null) {
    const attrs = match[1] ?? "";
    if (readAttr(attrs, "Id") === id) {
      return readAttr(attrs, "Target");
    }
  }
  return undefined;
}

function resolveWorkbookTarget(target: string | undefined): string {
  if (!target) {
    return "xl/worksheets/sheet1.xml";
  }
  const normalized = target.replace(/^\/+/u, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

function parseWorksheetXml(
  xmlText: string,
  context: XlsxImportContext
): readonly (readonly string[])[] {
  const rows: string[][] = [];
  const rowPattern = /<row\b[^>]*>([\s\S]*?)<\/row>/gu;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(xmlText)) !== null) {
    rows.push(parseRowXml(rowMatch[1] ?? "", context));
  }
  applyVerticalMergeValues(rows, xmlText);
  return Object.freeze(rows.map((row) => Object.freeze(row)));
}

function parseRowXml(rowXml: string, context: XlsxImportContext): string[] {
  const cells: string[] = [];
  const cellPattern = /<c\b([^>]*)>([\s\S]*?)<\/c>/gu;
  let cellMatch: RegExpExecArray | null;
  while ((cellMatch = cellPattern.exec(rowXml)) !== null) {
    const attrs = cellMatch[1] ?? "";
    const columnName = /r="([A-Z]+)(\d+)"/u.exec(attrs)?.[1];
    const columnIndex = columnName ? columnNameToIndex(columnName) : cells.length;
    while (cells.length < columnIndex) cells.push("");
    cells[columnIndex] = readCellText(cellMatch[2] ?? "", attrs, context);
  }
  return cells;
}

function readCellText(
  cellXml: string,
  attrs: string,
  context: XlsxImportContext
): string {
  const type = readAttr(attrs, "t");
  if (type === "inlineStr") {
    return readInlineText(cellXml);
  }
  const rawValue = readValue(cellXml);
  if (type === "s") {
    return context.sharedStrings[Number(rawValue)] ?? "";
  }
  if (type === "b") {
    return rawValue === "1" ? "TRUE" : "FALSE";
  }
  if (rawValue) {
    return isDateCell(attrs, context) ? formatExcelDate(rawValue) : unescapeXml(rawValue);
  }
  const formula = /<f\b[^>]*>([\s\S]*?)<\/f>/u.exec(cellXml)?.[1];
  return formula ? `=${unescapeXml(formula)}` : "";
}

function parseSharedStrings(xmlText: string | undefined): readonly string[] {
  if (!xmlText) {
    return Object.freeze([]);
  }
  const values: string[] = [];
  const itemPattern = /<si\b[^>]*>([\s\S]*?)<\/si>/gu;
  let itemMatch: RegExpExecArray | null;
  while ((itemMatch = itemPattern.exec(xmlText)) !== null) {
    values.push(readInlineText(itemMatch[1] ?? ""));
  }
  return Object.freeze(values);
}

function parseDateStyleIds(xmlText: string | undefined): ReadonlySet<number> {
  if (!xmlText) {
    return new Set(BUILTIN_DATE_FORMAT_IDS);
  }
  const dateNumFmtIds = new Set(BUILTIN_DATE_FORMAT_IDS);
  const numFmtPattern = /<numFmt\b([^>]*)\/?>/gu;
  let numFmtMatch: RegExpExecArray | null;
  while ((numFmtMatch = numFmtPattern.exec(xmlText)) !== null) {
    const attrs = numFmtMatch[1] ?? "";
    const id = Number(readAttr(attrs, "numFmtId"));
    const formatCode = readAttr(attrs, "formatCode") ?? "";
    if (Number.isFinite(id) && looksLikeDateFormat(formatCode)) {
      dateNumFmtIds.add(id);
    }
  }
  return parseCellXfDateStyles(xmlText, dateNumFmtIds);
}

function parseCellXfDateStyles(
  xmlText: string,
  dateNumFmtIds: ReadonlySet<number>
): ReadonlySet<number> {
  const styles = new Set<number>();
  const cellXfs = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/u.exec(xmlText)?.[1] ?? "";
  const xfPattern = /<xf\b([^>]*)\/?>/gu;
  let xfMatch: RegExpExecArray | null;
  let styleIndex = 0;
  while ((xfMatch = xfPattern.exec(cellXfs)) !== null) {
    const numFmtId = Number(readAttr(xfMatch[1] ?? "", "numFmtId"));
    if (dateNumFmtIds.has(numFmtId)) {
      styles.add(styleIndex);
    }
    styleIndex += 1;
  }
  return styles;
}

function applyVerticalMergeValues(rows: string[][], xmlText: string): void {
  const mergePattern = /<mergeCell\b[^>]*ref="([A-Z]+)(\d+):([A-Z]+)(\d+)"/gu;
  let mergeMatch: RegExpExecArray | null;
  while ((mergeMatch = mergePattern.exec(xmlText)) !== null) {
    const startColumn = columnNameToIndex(mergeMatch[1] ?? "");
    const startRow = Number(mergeMatch[2] ?? 0) - 1;
    const endColumn = columnNameToIndex(mergeMatch[3] ?? "");
    const endRow = Number(mergeMatch[4] ?? 0) - 1;
    if (startColumn < 0 || startColumn !== endColumn || startRow < 0 || endRow <= startRow) {
      continue;
    }
    const anchorValue = rows[startRow]?.[startColumn] ?? "";
    for (let rowIndex = startRow + 1; rowIndex <= endRow; rowIndex += 1) {
      const row = rows[rowIndex];
      if (!row) continue;
      while (row.length <= startColumn) row.push("");
      if (row[startColumn]?.trim() === "") {
        row[startColumn] = anchorValue;
      }
    }
  }
}

function readInlineText(xmlText: string): string {
  const parts: string[] = [];
  const textPattern = /<t\b[^>]*>([\s\S]*?)<\/t>/gu;
  let match: RegExpExecArray | null;
  while ((match = textPattern.exec(xmlText)) !== null) {
    parts.push(unescapeXml(match[1] ?? ""));
  }
  return parts.join("");
}

function readValue(xmlText: string): string {
  return unescapeXml(/<v[^>]*>([\s\S]*?)<\/v>/u.exec(xmlText)?.[1] ?? "");
}

function readAttr(attrs: string, name: string): string | undefined {
  return new RegExp(`${name}="([^"]*)"`, "u").exec(attrs)?.[1];
}

function isDateCell(attrs: string, context: XlsxImportContext): boolean {
  const styleId = Number(readAttr(attrs, "s"));
  return Number.isFinite(styleId) && context.dateStyleIds.has(styleId);
}

function looksLikeDateFormat(formatCode: string): boolean {
  const normalized = unescapeXml(formatCode)
    .replace(/"[^"]*"/gu, "")
    .replace(/\\./gu, "")
    .replace(/\[[^\]]*\]/gu, "");
  return /[ymdhHs]/u.test(normalized);
}

function formatExcelDate(rawValue: string): string {
  const serial = Number(rawValue);
  if (!Number.isFinite(serial)) {
    return rawValue;
  }
  const time = Date.UTC(1899, 11, 30) + Math.round(serial * MS_PER_DAY);
  const date = new Date(time);
  if (!Number.isFinite(time) || Number.isNaN(date.getTime())) {
    return rawValue;
  }
  const iso = date.toISOString();
  return Math.abs(serial - Math.trunc(serial)) < 0.000001
    ? iso.slice(0, 10)
    : iso.slice(0, 19).replace("T", " ");
}

function readText(zip: ReadonlyMap<string, Uint8Array>, path: string): string | undefined {
  const data = zip.get(path);
  return data ? decodeUtf8(data) : undefined;
}

function columnNameToIndex(name: string): number {
  return [...name].reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function unescapeXml(value: string): string {
  return value
    .replaceAll("&quot;", "\"")
    .replaceAll("&apos;", "'")
    .replaceAll("&gt;", ">")
    .replaceAll("&lt;", "<")
    .replaceAll("&amp;", "&");
}
