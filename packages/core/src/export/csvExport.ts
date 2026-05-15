import type { GridExportMatrix, GridImportMatrix } from "./exportTypes.js";
import { formatSpreadsheetTextCell } from "../security/spreadsheetFormula.js";

export function exportCsv(matrix: GridExportMatrix, includeHeaders = true): string {
  const rows = [
    ...(includeHeaders ? matrix.headerRows : []),
    ...matrix.bodyRows
  ];
  return rows.map((row) =>
    row.map((cell) => serializeCsvCell(cell.covered === true ? "" : cell.value)).join(",")
  ).join("\r\n");
}

export function importCsv(text: string): GridImportMatrix {
  if (text.length === 0) {
    return Object.freeze({ rows: Object.freeze([]) });
  }

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === "\"" && cell.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
    } else {
      cell += char;
    }
  }

  if (cell.length > 0 || row.length > 0 || !endsWithRowBreak(text)) {
    row.push(cell);
    rows.push(row);
  }

  return Object.freeze({ rows: Object.freeze(rows.map((item) => Object.freeze(item))) });
}

function serializeCsvCell(value: unknown): string {
  const text = formatSpreadsheetTextCell(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll("\"", "\"\"")}"` : text;
}

function endsWithRowBreak(text: string): boolean {
  return text.endsWith("\n") || text.endsWith("\r");
}
