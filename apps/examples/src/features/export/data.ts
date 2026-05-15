import type {
  ColumnDef,
  ExportOptions,
  GridExportMatrix,
  GridOptions,
  HeaderMergeOptions,
  ImportOptions,
  SelectionOptions
} from "@onegrid/core";
import { createGridIoAdapterPlugin } from "@onegrid/adapters";

export interface ExportRow {
  readonly id: string;
  readonly region: string;
  readonly agency: string;
  readonly program: string;
  readonly amount: number;
  readonly memo: string;
  readonly owner: string;
  readonly status: "Approved" | "Review" | "Hold";
}

export type ExportWideRow = Readonly<Record<string, string | number>>;

export const exportColumns: readonly ColumnDef<ExportRow>[] = [
  { field: "id", headerName: "ID", width: 120 },
  { field: "region", headerName: "Region", width: 140, merge: { mode: "value" } },
  {
    groupId: "workflow",
    headerName: "Workflow",
    children: [
      { field: "agency", headerName: "Agency", width: 170, merge: { mode: "value" } },
      { field: "program", headerName: "Program", width: 190 },
      {
        field: "memo",
        headerName: "Memo",
        width: 220,
        merge: {
          mode: "custom",
          colSpan: ({ row }) => row.memo === "Joint approval" ? 2 : 1
        }
      },
      { field: "owner", headerName: "Owner", width: 120 }
    ]
  },
  { field: "amount", headerName: "Amount", type: "number", width: 130 },
  { field: "status", headerName: "Status", width: 140 }
];

export const exportRows: readonly ExportRow[] = [
  createRow("EXP-0001", "Capital", "Treasury Office", "Budget approval", 1200, "Joint approval", "Han", "Approved"),
  createRow("EXP-0002", "Capital", "Treasury Office", "Bond issuance", 860, "Joint approval", "Han", "Approved"),
  createRow("EXP-0003", "Capital", "Audit Bureau", "Risk sampling", 430, "Desk review", "Lee", "Review"),
  createRow("EXP-0004", "Regional", "Welfare Office", "Care center", 620, "Regional hold", "Choi", "Hold"),
  createRow("EXP-0005", "Regional", "Welfare Office", "Care staffing", 530, "Regional hold", "Choi", "Hold")
];

export const exportPagedRows: readonly ExportRow[] = Array.from({ length: 64 }, (_, index) => {
  const rowNumber = index + 1;
  const region = ["Capital", "Regional", "Digital", "Harbor"][index % 4] ?? "Capital";
  const agency = ["Treasury Office", "Welfare Office", "Platform Team", "Procurement Hub"][index % 4] ?? "Treasury Office";
  const program = ["Budget approval", "Road upgrade", "Identity sync", "Audit trail"][index % 4] ?? "Budget approval";
  const status = (["Approved", "Review", "Hold"] as const)[index % 3] ?? "Review";
  return createRow(
    `PAG-${String(rowNumber).padStart(4, "0")}`,
    region,
    agency,
    `${program} ${rowNumber}`,
    500 + rowNumber * 17,
    rowNumber % 5 === 0 ? "Cross office approval" : "Operational review",
    ["Han", "Lee", "Kang", "Seo"][index % 4] ?? "Han",
    status
  );
});

const wideMetricFields = Array.from({ length: 16 }, (_, index) => `m${String(index + 1).padStart(2, "0")}`);

export const exportWideColumns: readonly ColumnDef<ExportWideRow>[] = [
  { field: "id", headerName: "ID", width: 120 },
  { field: "desk", headerName: "Desk", width: 150 },
  ...wideMetricFields.map((field, index) => ({
    field,
    headerName: `Metric ${index + 1}`,
    type: "number" as const,
    width: 120
  })),
  { field: "owner", headerName: "Owner", width: 120 },
  { field: "status", headerName: "Status", width: 140 }
];

export const exportWideRows: readonly ExportWideRow[] = Array.from({ length: 8 }, (_, rowIndex) => {
  const record: Record<string, string | number> = {
    id: `WIDE-${String(rowIndex + 1).padStart(4, "0")}`,
    desk: ["Treasury", "Public Funds", "Audit", "Procurement"][rowIndex % 4] ?? "Treasury",
    owner: ["Han", "Lee", "Kang", "Seo"][rowIndex % 4] ?? "Han",
    status: ["Approved", "Review", "Blocked"][rowIndex % 3] ?? "Review"
  };
  wideMetricFields.forEach((field, columnIndex) => {
    record[field] = 1000 + rowIndex * 19 + columnIndex * 11;
  });
  return Object.freeze(record);
});

export const exportSelection: SelectionOptions = {
  mode: "range",
  multiple: true
};

export const exportHeaderMerge: HeaderMergeOptions = {
  enabled: true,
  rules: [{
    headerName: "Export review window",
    columnIds: ["agency", "program", "memo", "owner"],
    presentation: "row",
    ariaLabel: "Merged export review columns"
  }]
};

export const exportOptions: ExportOptions = {
  includeHeaders: true,
  includeHeaderMerges: true,
  includeCellMerges: true,
  preserveVisualLayout: true,
  sheetName: "OneGrid Export",
  title: "OneGrid Export"
};

const importFields = ["id", "region", "agency", "program", "memo", "owner", "amount", "status"] as const;

export const exportImportOptions: ImportOptions<ExportRow> = {
  hasHeaders: true,
  headerRowCount: 1,
  columns: importFields,
  parseRow: (record) => createRow(
    String(record.id ?? ""),
    String(record.region ?? ""),
    String(record.agency ?? ""),
    String(record.program ?? ""),
    Number(record.amount ?? 0),
    String(record.memo ?? ""),
    String(record.owner ?? ""),
    parseStatus(record.status)
  )
};

export const exportGridOptions: Pick<
  GridOptions<ExportRow>,
  "rowKey" | "rowModel" | "selection" | "merge" | "layout" | "headerMerge" | "export" | "import" | "plugins"
> = {
  rowKey: "id",
  rowModel: "client",
  selection: exportSelection,
  merge: { enabled: true },
  headerMerge: exportHeaderMerge,
  export: exportOptions,
  import: exportImportOptions,
  plugins: [
    createGridIoAdapterPlugin<ExportRow>({
      id: "enterprise-document-io",
      exports: [{
        format: "enterprise-json",
        capabilities: { cjkFonts: true, customFonts: true, externalWorkbook: true, mergedLayout: true },
        export({ matrix, options }) {
          return {
            content: JSON.stringify(createEnterprisePayload(matrix), null, 2),
            mediaType: "application/vnd.onegrid.enterprise+json",
            filename: options.filename ?? "onegrid-enterprise-export.json"
          };
        }
      }],
      imports: [{
        format: "enterprise-json",
        capabilities: { compressedXlsx: true, externalWorkbook: true, mergedLayout: true },
        import({ content, options }) {
          const payload = parseEnterprisePayload(content);
          const rows = payload.rows.map((row, index) =>
            options.parseRow ? options.parseRow(row, index) : row as unknown as ExportRow
          );
          return { rows, rowCount: rows.length, rejected: [] };
        }
      }]
    })
  ],
  layout: { width: "100%", height: 360, bodyHeight: 360 }
};

export const exportPagedGridOptions: Pick<
  GridOptions<ExportRow>,
  "rowKey" | "rowModel" | "selection" | "merge" | "layout" | "headerMerge" | "export"
> = {
  rowKey: "id",
  rowModel: "client",
  selection: exportSelection,
  merge: { enabled: true },
  headerMerge: exportHeaderMerge,
  export: {
    ...exportOptions,
    title: "OneGrid Paged Export",
    sheetName: "Paged Export"
  },
  layout: { width: "100%", height: 320, bodyHeight: 320 }
};

export const exportWideGridOptions: Pick<
  GridOptions<ExportWideRow>,
  "rowKey" | "rowModel" | "layout" | "export"
> = {
  rowKey: "id",
  rowModel: "client",
  export: {
    ...exportOptions,
    title: "OneGrid Wide Export",
    sheetName: "Wide Export"
  },
  layout: { width: "100%", height: 320, bodyHeight: 320 }
};

export const sampleCsvImport = [
  "id,region,agency,program,memo,owner,amount,status",
  "IMP-1001,Imported,Records Office,CSV intake,Imported CSV,Seo,710,Review",
  "IMP-1002,Imported,Records Office,CSV approval,Imported CSV,Seo,930,Approved"
].join("\r\n");

export const sampleXlsxImportMatrix: GridExportMatrix = {
  columns: importFields.map((field) => ({ id: field, field, headerName: field })),
  headerRows: [importFields.map((field) => ({ value: field }))],
  bodyRows: [
    createImportCells(createRow(
      "XLS-2001",
      "Spreadsheet",
      "Data Exchange Office",
      "Workbook intake",
      1480,
      "Generated XLSX",
      "Yoon",
      "Review"
    )),
    createImportCells(createRow(
      "XLS-2002",
      "Spreadsheet",
      "Data Exchange Office",
      "Workbook approval",
      1660,
      "Generated XLSX",
      "Yoon",
      "Approved"
    ))
  ]
};

export const sampleEnterpriseImport = JSON.stringify({
  version: 1,
  rows: [
    createRow(
      "ENT-3001",
      "Adapter",
      "Document Office",
      "Enterprise import",
      2110,
      "Adapter supplied row",
      "Moon",
      "Review"
    ),
    createRow(
      "ENT-3002",
      "Adapter",
      "Document Office",
      "Font package handoff",
      2240,
      "Adapter supplied row",
      "Moon",
      "Approved"
    )
  ]
});

function createRow(
  id: string,
  region: string,
  agency: string,
  program: string,
  amount: number,
  memo: string,
  owner: string,
  status: ExportRow["status"]
): ExportRow {
  return { id, region, agency, program, amount, memo, owner, status };
}

function createImportCells(row: ExportRow) {
  return importFields.map((field) => ({ value: row[field] }));
}

function parseStatus(value: unknown): ExportRow["status"] {
  return value === "Approved" || value === "Review" || value === "Hold" ? value : "Review";
}

function createEnterprisePayload(matrix: GridExportMatrix) {
  return {
    version: 1,
    capabilities: {
      cjkFonts: true,
      customFonts: true,
      externalWorkbook: true,
      mergedLayout: true
    },
    columns: matrix.columns.map((column) => ({
      id: column.id,
      field: column.field,
      headerName: column.headerName
    })),
    rows: matrix.bodyRows.map((row) => Object.fromEntries(matrix.columns.map((column, index) => [
      column.field,
      row[index]?.covered === true ? "" : row[index]?.value ?? ""
    ])))
  };
}

function parseEnterprisePayload(content: string | Uint8Array): { readonly rows: readonly Readonly<Record<string, unknown>>[] } {
  const text = typeof content === "string"
    ? content
    : new TextDecoder().decode(content);
  const parsed = JSON.parse(text) as { readonly rows?: readonly Readonly<Record<string, unknown>>[] };
  return { rows: Array.isArray(parsed.rows) ? parsed.rows : [] };
}
