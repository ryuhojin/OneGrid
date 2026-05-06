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
import { encodeUtf8 } from "../src/export/textEncoding.js";
import { createZip } from "../src/export/xlsxZip.js";

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
    expect(workbook).toContain("<pane ySplit=\"2\"");
    expect(workbook).toContain("<autoFilter ref=\"A2:C4\"");
    expect(workbook).toContain("<pageSetup orientation=\"landscape\"");
    expect(workbook).toContain("s=\"1\"");
    expect(workbook).toContain("<c r=\"B1\" s=\"1\"");
    expect(workbook).toContain("<c r=\"B4\" s=\"3\"");
    expect(workbook).toContain("<c r=\"C3\" s=\"2\"><v>1200</v></c>");
    expect(imported.rows[0]).toEqual(["Identity", "", "Financial"]);
    expect(imported.rows.at(-1)).toEqual(["EXP-2", "Capital", "860"]);
  });

  it("imports visual XLSX exports after explicit header row count", () => {
    const result = createGridImport(
      exportXlsx(matrix, { sheetName: "Roundtrip" }),
      {
        format: "xlsx",
        hasHeaders: true,
        headerRowCount: 2,
        columns: ["id", "region", "amount"],
        parseRow: (record) => ({
          id: String(record.id),
          region: String(record.region),
          amount: Number(record.amount)
        })
      }
    );

    expect(result.rows).toEqual([
      { id: "EXP-1", region: "Capital", amount: 1200 },
      { id: "EXP-2", region: "Capital", amount: 860 }
    ]);
    expect(result.rejected).toHaveLength(0);
  });

  it("imports XLSX shared strings, date styles, and formula cached values", () => {
    const imported = importXlsx(createExternalWorkbook());

    expect(imported.rows).toEqual([
      ["Region", "Date", "Formula"],
      ["North", "2024-01-01", "3"],
      ["Inline", "2024-01-01 12:00:00", "=NOW()"]
    ]);
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
    expect(pdfText).toContain("Page 1 of 1");
    expect(pdfText).toContain(" re f");
    expect(pdfText).toContain(" re S");
    expect(xlsx.content).toBeInstanceOf(Uint8Array);
    expect(parsed.rows[1]).toEqual(["ID", "Region", "Amount"]);
  });

  it("keeps row-spanned PDF body blocks on the same page when possible", () => {
    const pdf = createGridExport(createLongMergedMatrix(), { format: "pdf", title: "PDF Split" });
    const pdfText = decodeAscii(pdf.content as Uint8Array);

    expect(pdfText).toContain("Page 1 of 2");
    expect(pdfText).toContain("Page 2 of 2");
    expect(pdfText.indexOf("Page 1 of 2")).toBeLessThan(pdfText.indexOf("Span start"));
    expect(pdfText.indexOf("Span start")).toBeLessThan(pdfText.indexOf("Page 2 of 2"));
  });
});

function decodeAscii(data: Uint8Array): string {
  return Array.from(data, (byte) => String.fromCharCode(byte)).join("");
}

function createExternalWorkbook(): Uint8Array {
  return createZip([
    xlsxEntry("[Content_Types].xml", "<Types/>"),
    xlsxEntry("_rels/.rels", "<Relationships/>"),
    xlsxEntry("xl/workbook.xml", "<workbook><sheets><sheet name=\"Sheet1\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>"),
    xlsxEntry("xl/_rels/workbook.xml.rels", "<Relationships><Relationship Id=\"rId1\" Target=\"worksheets/sheet1.xml\"/></Relationships>"),
    xlsxEntry("xl/sharedStrings.xml", "<sst><si><t>Region</t></si><si><t>Date</t></si><si><t>Formula</t></si><si><t>North</t></si></sst>"),
    xlsxEntry("xl/styles.xml", "<styleSheet><numFmts count=\"1\"><numFmt numFmtId=\"165\" formatCode=\"yyyy-mm-dd\"/></numFmts><cellXfs count=\"2\"><xf numFmtId=\"0\"/><xf numFmtId=\"165\"/></cellXfs></styleSheet>"),
    xlsxEntry("xl/worksheets/sheet1.xml", [
      "<worksheet><sheetData>",
      "<row r=\"1\"><c r=\"A1\" t=\"s\"><v>0</v></c><c r=\"B1\" t=\"s\"><v>1</v></c><c r=\"C1\" t=\"s\"><v>2</v></c></row>",
      "<row r=\"2\"><c r=\"A2\" t=\"s\"><v>3</v></c><c r=\"B2\" s=\"1\"><v>45292</v></c><c r=\"C2\"><f>1+2</f><v>3</v></c></row>",
      "<row r=\"3\"><c r=\"A3\" t=\"inlineStr\"><is><t>Inline</t></is></c><c r=\"B3\" s=\"1\"><v>45292.5</v></c><c r=\"C3\"><f>NOW()</f></c></row>",
      "</sheetData></worksheet>"
    ].join(""))
  ]);
}

function xlsxEntry(name: string, text: string) {
  return { name, data: encodeUtf8(text) };
}

function createLongMergedMatrix(): GridExportMatrix {
  return {
    columns: [
      { id: "id", field: "id", headerName: "ID" },
      { id: "memo", field: "memo", headerName: "Memo" }
    ],
    headerRows: [[{ value: "ID" }, { value: "Memo" }]],
    bodyRows: [
      ...Array.from({ length: 19 }, (_, index) => [
        { value: `PDF-${index + 1}` },
        { value: "Normal" }
      ]),
      [{ value: "PDF-20" }, { value: "Span start", rowSpan: 3 }],
      [{ value: "PDF-21" }, { value: "", covered: true }],
      [{ value: "PDF-22" }, { value: "", covered: true }]
    ]
  };
}
