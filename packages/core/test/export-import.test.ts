import { describe, expect, it } from "vitest";
import {
  createGridExport,
  createGridImport,
  exportCsv,
  exportPrintHtml,
  exportXlsx,
  importCsv,
  importXlsx
} from "../src/index.js";
import type { GridExportMatrix } from "../src/index.js";

const matrix: GridExportMatrix = {
  columns: [
    { id: "id", field: "id", headerName: "ID" },
    { id: "region", field: "region", headerName: "Region" },
    { id: "amount", field: "amount", headerName: "Amount" }
  ],
  headerRows: [
    [{ value: "Identity", colSpan: 2 }, { value: "", covered: true }, { value: "Financial" }],
    [{ value: "ID" }, { value: "Region" }, { value: "Amount" }]
  ],
  bodyRows: [
    [{ value: "EXP-1" }, { value: "Capital", rowSpan: 2 }, { value: 1200 }],
    [{ value: "EXP-2" }, { value: "", covered: true }, { value: 860 }]
  ]
};

describe("export/import model", () => {
  it("exports CSV with merged covered cells as blanks", () => {
    expect(exportCsv(matrix)).toContain("Identity,,Financial");
    expect(exportCsv(matrix)).toContain("EXP-2,,860");
  });

  it("imports CSV rows with typed parser", () => {
    const result = createGridImport(
      "id,amount\r\nA,42",
      {
        format: "csv",
        parseRow: (record) => ({ id: String(record.id), amount: Number(record.amount) })
      }
    );

    expect(result.rows).toEqual([{ id: "A", amount: 42 }]);
    expect(result.rejected).toHaveLength(0);
  });

  it("roundtrips dependency-free XLSX workbooks created by OneGrid", () => {
    const xlsx = exportXlsx(matrix, { sheetName: "Export" });
    const imported = importXlsx(xlsx);
    const workbook = decodeAscii(xlsx);

    expect(xlsx[0]).toBe(0x50);
    expect(workbook).toContain("styles.xml");
    expect(workbook).toContain("FFD1D5DB");
    expect(workbook).toContain("mergeCells");
    expect(workbook).toContain("s=\"1\"");
    expect(workbook).toContain("<c r=\"B1\" s=\"1\"");
    expect(workbook).toContain("<c r=\"B4\" s=\"3\"");
    expect(imported.rows[0]).toEqual(["Identity", "", "Financial"]);
    expect(imported.rows.at(-1)).toEqual(["EXP-2", "", "860"]);
  });

  it("exports print HTML with table spans", () => {
    const html = exportPrintHtml(matrix, { title: "Print Test" });

    expect(html).toContain("data-onegrid-print-layout");
    expect(html).toContain("colspan=\"2\"");
    expect(html).toContain("rowspan=\"2\"");
  });

  it("creates format-specific export results", () => {
    const pdf = createGridExport(matrix, { format: "pdf", title: "PDF Test" });
    const xlsx = createGridExport(matrix, { format: "xlsx" });
    const parsed = importCsv(createGridExport(matrix, { format: "csv" }).content as string);
    const pdfText = decodeAscii(pdf.content as Uint8Array);

    expect(pdf.mediaType).toBe("application/pdf");
    expect(pdfText).toContain("PDF Test");
    expect(pdfText).toContain(" re f");
    expect(pdfText).toContain(" re S");
    expect(xlsx.content).toBeInstanceOf(Uint8Array);
    expect(parsed.rows[1]).toEqual(["ID", "Region", "Amount"]);
  });
});

function decodeAscii(data: Uint8Array): string {
  return Array.from(data, (byte) => String.fromCharCode(byte)).join("");
}
