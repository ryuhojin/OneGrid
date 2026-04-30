import type { ColumnDef, GridOptions } from "@onegrid/core";

export interface AccessibilityRow {
  readonly id: string;
  readonly department: "Finance" | "Audit" | "Digital";
  readonly service: string;
  readonly owner: string;
  readonly status: "Ready" | "Review" | "Blocked";
}

export const accessibilityColumns: readonly ColumnDef<AccessibilityRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 112 },
  { field: "department", headerName: "Department", width: 160, merge: { mode: "value" } },
  { field: "service", headerName: "Service", width: 220 },
  { field: "owner", headerName: "Owner", width: 140 },
  { field: "status", headerName: "Status", pinned: "right", width: 132 }
];

export const accessibilityRows: readonly AccessibilityRow[] = Object.freeze([
  row("AX-0001", "Finance", "Budget approval", "Han", "Ready"),
  row("AX-0002", "Finance", "Treasury review", "Han", "Ready"),
  row("AX-0003", "Audit", "Risk sampling", "Lee", "Review"),
  row("AX-0004", "Audit", "Field exception", "Lee", "Blocked"),
  row("AX-0005", "Digital", "Identity sync", "Kang", "Ready"),
  row("AX-0006", "Digital", "Records cloud", "Kang", "Review")
]);

export const accessibilityOptions: GridOptions<AccessibilityRow> = {
  columns: accessibilityColumns,
  data: accessibilityRows,
  rowKey: "id",
  rowModel: "client",
  columnUi: {
    resize: true,
    autoSize: true,
    reorder: true,
    menu: true,
    toolPanel: true
  },
  accessibility: {
    label: "Accessibility contract grid",
    description: "Validates OneGrid ARIA roles, live region, keyboard focus, and menu semantics.",
    liveRegion: "polite"
  },
  layout: {
    width: "100%",
    height: 320,
    bodyHeight: 320
  },
  merge: {
    enabled: true
  }
};

function row(
  id: string,
  department: AccessibilityRow["department"],
  service: string,
  owner: string,
  status: AccessibilityRow["status"]
): AccessibilityRow {
  return { id, department, service, owner, status };
}
