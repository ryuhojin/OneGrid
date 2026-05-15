import { describe, expect, it } from "vitest";
import type {
  ExcelJsCellLike,
  ExcelJsRowLike,
  ExcelJsWorkbookLike,
  ExcelJsWorksheetLike
} from "../src/index.js";
import {
  createExcelJsExportAdapter,
  createExcelJsImportAdapter,
  createExcelJsIoAdapterPlugin
} from "../src/index.js";

describe("ExcelJS adapter", () => {
  it("exports merged grid matrices with workbook styles", async () => {
    const workbook = new MockWorkbook();
    const adapter = createExcelJsExportAdapter({ workbookFactory: () => workbook });
    const result = await adapter.export({
      matrix: {
        bodyRows: [
          [
            { value: "A", rowSpan: 2 },
            { value: 10 }
          ],
          [
            { value: "", covered: true },
            { value: 20 }
          ]
        ],
        columns: [
          { field: "region", headerName: "Region", id: "region" },
          { field: "amount", headerName: "Amount", id: "amount" }
        ],
        headerRows: [[{ value: "Financial", colSpan: 2 }, { value: "", covered: true }]]
      },
      options: { format: "xlsx", filename: "audit.xlsx" }
    });

    expect(result.filename).toBe("audit.xlsx");
    expect(result.mediaType).toContain("spreadsheetml");
    expect(workbook.sheet?.merges).toEqual([[1, 1, 1, 2], [2, 1, 3, 1]]);
    expect(workbook.sheet?.getCell(1, 1).font).toMatchObject({ bold: true });
    expect(workbook.sheet?.getCell(2, 1).fill).toMatchObject({ pattern: "solid" });
  });

  it("imports external workbook rows through core import builder", async () => {
    const workbook = new MockWorkbook([
      ["ID", "Status"],
      ["IMP-1", "Ready"],
      ["IMP-2", "Review"]
    ]);
    const adapter = createExcelJsImportAdapter<{ readonly id: string; readonly status: string }>({
      workbookFactory: () => workbook
    });
    const result = await adapter.import({
      content: new Uint8Array([1, 2, 3]),
      fallbackColumns: [
        { field: "id", headerName: "ID", id: "id" },
        { field: "status", headerName: "Status", id: "status" }
      ],
      options: {
        columns: ["id", "status"],
        format: "xlsx",
        parseRow: (row) => ({ id: String(row.id), status: String(row.status) })
      }
    });

    expect(workbook.loaded).toBe(true);
    expect(result.rowCount).toBe(2);
    expect(result.rows).toEqual([
      { id: "IMP-1", status: "Ready" },
      { id: "IMP-2", status: "Review" }
    ]);
  });

  it("creates a plugin with export and import adapters", () => {
    const plugin = createExcelJsIoAdapterPlugin({
      export: { workbookFactory: () => new MockWorkbook() },
      import: { workbookFactory: () => new MockWorkbook() }
    });

    expect(plugin.id).toBe("onegrid-exceljs-adapter");
  });

  it("round-trips a real ExcelJS workbook", async () => {
    const Workbook = await loadExcelJsWorkbook();
    const exportAdapter = createExcelJsExportAdapter({
      workbookFactory: () => new Workbook()
    });
    const exported = await exportAdapter.export({
      matrix: {
        bodyRows: [[{ value: "EXP-1" }, { value: "Approved" }]],
        columns: [
          { field: "id", headerName: "ID", id: "id" },
          { field: "status", headerName: "Status", id: "status" }
        ],
        headerRows: [
          [{ value: "Workflow", colSpan: 2 }, { value: "", covered: true }],
          [{ value: "ID" }, { value: "Status" }]
        ]
      },
      options: { format: "xlsx" }
    });

    const bytes = exported.content as Uint8Array;
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);

    const importAdapter = createExcelJsImportAdapter({
      workbookFactory: () => new Workbook()
    });
    const imported = await importAdapter.import({
      content: bytes,
      options: {
        columns: ["id", "status"],
        format: "xlsx",
        headerRowCount: 2,
        parseRow: (row) => ({ id: String(row.id), status: String(row.status) })
      }
    });

    expect(imported.rows).toEqual([{ id: "EXP-1", status: "Approved" }]);
  });
});

async function loadExcelJsWorkbook(): Promise<new () => ExcelJsWorkbookLike> {
  const module = await import("exceljs") as unknown;
  const candidate = module as {
    readonly Workbook?: new () => ExcelJsWorkbookLike;
    readonly default?: { readonly Workbook?: new () => ExcelJsWorkbookLike };
  };
  const Workbook = candidate.Workbook ?? candidate.default?.Workbook;
  if (!Workbook) {
    throw new Error("ExcelJS Workbook constructor was not found.");
  }
  return Workbook;
}

class MockWorkbook implements ExcelJsWorkbookLike {
  loaded = false;
  sheet: MockWorksheet | undefined;
  readonly xlsx = {
    load: async (): Promise<void> => {
      this.loaded = true;
    },
    writeBuffer: async (): Promise<Uint8Array> => new TextEncoder().encode("xlsx")
  };

  constructor(rows: readonly (readonly unknown[])[] = []) {
    if (rows.length > 0) {
      this.sheet = new MockWorksheet(rows);
    }
  }

  get worksheets(): readonly ExcelJsWorksheetLike[] {
    return this.sheet ? [this.sheet] : [];
  }

  addWorksheet(): ExcelJsWorksheetLike {
    this.sheet = new MockWorksheet([]);
    return this.sheet;
  }
}

class MockWorksheet implements ExcelJsWorksheetLike {
  columns?: unknown;
  views?: readonly unknown[];
  autoFilter?: unknown;
  readonly cells = new Map<string, MockCell>();
  readonly merges: number[][] = [];

  constructor(private readonly rows: readonly (readonly unknown[])[]) {}

  get rowCount(): number {
    return this.rows.length;
  }

  get columnCount(): number {
    return Math.max(0, ...this.rows.map((row) => row.length));
  }

  getRow(row: number): ExcelJsRowLike {
    return new MockRow(row, this.rows[row - 1] ?? [], this);
  }

  getCell(row: number, column: number): ExcelJsCellLike {
    const key = `${row}:${column}`;
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new MockCell(this.rows[row - 1]?.[column - 1]);
      this.cells.set(key, cell);
    }
    return cell;
  }

  mergeCells(startRow: number, startColumn: number, endRow: number, endColumn: number): void {
    this.merges.push([startRow, startColumn, endRow, endColumn]);
  }
}

class MockRow implements ExcelJsRowLike {
  height?: number;

  constructor(
    private readonly rowNumber: number,
    private readonly values: readonly unknown[],
    private readonly worksheet: MockWorksheet
  ) {}

  get cellCount(): number {
    return this.values.length;
  }

  getCell(column: number): ExcelJsCellLike {
    return this.worksheet.getCell(this.rowNumber, column);
  }
}

class MockCell implements ExcelJsCellLike {
  style?: unknown;
  font?: unknown;
  fill?: unknown;
  border?: unknown;
  alignment?: unknown;

  constructor(public value?: unknown) {}

  get text(): string {
    return String(this.value ?? "");
  }
}
