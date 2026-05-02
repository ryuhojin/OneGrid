import type {
  ColumnDef,
  ExportOptions,
  GridExportMatrix,
  GridOptions,
  HeaderMergeOptions,
  ImportOptions,
  SelectionOptions
} from "@onegrid/core";

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
  "rowKey" | "rowModel" | "selection" | "merge" | "layout" | "headerMerge" | "export" | "import"
> = {
  rowKey: "id",
  rowModel: "client",
  selection: exportSelection,
  merge: { enabled: true },
  headerMerge: exportHeaderMerge,
  export: exportOptions,
  import: exportImportOptions,
  layout: { width: "100%", height: 360, bodyHeight: 360 }
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
