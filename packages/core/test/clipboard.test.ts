import { describe, expect, it } from "vitest";
import {
  createClipboardPastePlan,
  createClipboardText,
  parseClipboardText,
  serializeClipboardMatrix
} from "../src/index.js";

describe("clipboard model", () => {
  it("serializes text/plain TSV with spreadsheet escaping", () => {
    expect(serializeClipboardMatrix([
      ["ID", "Memo"],
      ["R1", "line 1\nline 2"],
      ["R2", "quote \"ok\""]
    ])).toBe("ID\tMemo\r\nR1\t\"line 1\nline 2\"\r\nR2\t\"quote \"\"ok\"\"\"");
  });

  it("neutralizes formula-like text before copying to spreadsheets", () => {
    expect(serializeClipboardMatrix([
      ["Formula", "Signed text", "Number"],
      ["=HYPERLINK(\"https://example.test\")", "-risk", -42],
      [" +SUM(1,2)", "@lookup", 42]
    ])).toBe([
      "Formula\tSigned text\tNumber",
      "\"'=HYPERLINK(\"\"https://example.test\"\")\"\t'-risk\t-42",
      "' +SUM(1,2)\t'@lookup\t42"
    ].join("\r\n"));
  });

  it("parses quoted text/plain TSV cells", () => {
    expect(parseClipboardText("ID\tMemo\r\nR1\t\"a\tb\"\r\nR2\t\"x\"\"y\"")).toEqual([
      ["ID", "Memo"],
      ["R1", "a\tb"],
      ["R2", "x\"y"]
    ]);
  });

  it("creates copy text with optional headers and merge covered blanks", () => {
    const text = createClipboardText({
      includeHeaders: true,
      headers: ["Region", "Agency"],
      rows: [
        [{ value: "Capital" }, { value: "Treasury" }],
        [{ value: "Capital", covered: true }, { value: "Treasury", covered: true }]
      ]
    });

    expect(text).toBe("Region\tAgency\r\nCapital\tTreasury\r\n\t");
  });

  it("plans paste patches and rejects overflow or readonly targets", () => {
    const plan = createClipboardPastePlan({
      text: "A\tB\r\nC\tD",
      anchorRowIndex: 1,
      anchorColumnIndex: 1,
      rowCount: 2,
      columnCount: 3,
      isEditable: (rowIndex, columnIndex) => !(rowIndex === 1 && columnIndex === 2)
    });

    expect(plan.patches).toEqual([
      { rowIndex: 1, columnIndex: 1, rawValue: "A" }
    ]);
    expect(plan.rejected).toEqual([
      { rowIndex: 1, columnIndex: 2, rawValue: "B", reason: "readonly" },
      { rowIndex: 2, columnIndex: 1, rawValue: "C", reason: "out-of-range" },
      { rowIndex: 2, columnIndex: 2, rawValue: "D", reason: "out-of-range" }
    ]);
  });
});
