import type {
  ClipboardOptions,
  ColumnDef,
  ColumnUiOptions,
  ContextMenuContext,
  ContextMenuOptions,
  EditingOptions,
  FilteringOptions,
  SelectionOptions
} from "@onegrid/core";

export interface MenuRow {
  readonly id: string;
  readonly department: string;
  readonly service: string;
  readonly owner: string;
  readonly risk: number;
  readonly active: boolean;
  readonly status: "Ready" | "Review" | "Blocked";
}

export type MenuActionHandler = (
  label: string,
  context: ContextMenuContext<MenuRow>
) => void;

export const menuColumnUi: ColumnUiOptions = {
  resize: true,
  autoSize: true,
  reorder: true,
  menu: true,
  toolPanel: true
};

export const menuFiltering: FilteringOptions = {
  enabled: true,
  quickFilter: true
};

export const menuSelection: SelectionOptions = {
  mode: "range",
  multiple: true,
  checkbox: true
};

export const menuEditing: EditingOptions = {
  enabled: true,
  commitMode: "cell",
  validateOnCommit: true
};

export const menuClipboard: ClipboardOptions = {
  enabled: true,
  includeHeaders: true,
  preserveMerge: true
};

export const menuColumns: readonly ColumnDef<MenuRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 120, filter: "text" },
  {
    field: "department",
    headerName: "Department",
    width: 170,
    filter: { kind: "set", values: ["Finance", "Public Works", "Digital"] },
    merge: { mode: "value" }
  },
  { field: "service", headerName: "Service", width: 220, editable: true, editor: "text", filter: "text" },
  { field: "owner", headerName: "Owner", width: 120, filter: "text" },
  { field: "risk", headerName: "Risk", width: 110, editable: true, editor: "number", filter: "number" },
  { field: "active", headerName: "Active", width: 110, editable: true, editor: "checkbox", filter: "boolean" },
  {
    field: "status",
    headerName: "Status",
    pinned: "right",
    width: 140,
    editable: true,
    editor: {
      kind: "select",
      options: [
        { value: "Ready", label: "Ready" },
        { value: "Review", label: "Review" },
        { value: "Blocked", label: "Blocked" }
      ]
    },
    filter: { kind: "set", values: ["Ready", "Review", "Blocked"] }
  }
];

export const menuRows: readonly MenuRow[] = [
  createRow("MENU-0001", "Finance", "Budget approval", "Han", 42, true, "Ready"),
  createRow("MENU-0002", "Finance", "Bond issuance", "Han", 55, true, "Review"),
  createRow("MENU-0003", "Finance", "Risk sampling", "Lee", 71, false, "Blocked"),
  createRow("MENU-0004", "Public Works", "Bridge renewal", "Choi", 64, true, "Review"),
  createRow("MENU-0005", "Public Works", "Road survey", "Choi", 38, true, "Ready"),
  createRow("MENU-0006", "Public Works", "Depot audit", "Park", 82, false, "Blocked"),
  createRow("MENU-0007", "Digital", "Identity sync", "Kang", 49, true, "Ready"),
  createRow("MENU-0008", "Digital", "Records cloud", "Kang", 58, true, "Review"),
  createRow("MENU-0009", "Digital", "Analytics hub", "Min", 35, true, "Ready"),
  createRow("MENU-0010", "Digital", "Security review", "Min", 77, false, "Blocked")
];

export function createMenuContextMenu(
  onAction?: MenuActionHandler
): ContextMenuOptions<MenuRow> {
  return {
    enabled: true,
    defaultItems: ["copyCell", "copyRow", "copyWithHeaders", "startEdit", "clearSelection"],
    items: (context) => [
      {
        id: "inspect-cell",
        label: "Inspect cell value",
        scope: "cell",
        onSelect: (next) => {
          onAction?.("Inspect cell value", next);
        }
      },
      {
        id: "flag-row",
        label: "Flag row for review",
        scope: "row",
        onSelect: (next) => {
          onAction?.("Flag row for review", next);
        }
      },
      {
        id: "approve-row",
        label: "Mark row ready",
        scope: "row",
        visible: context.row.status !== "Ready",
        onSelect: (next) => {
          onAction?.("Mark row ready", next);
        }
      }
    ]
  };
}

function createRow(
  id: string,
  department: string,
  service: string,
  owner: string,
  risk: number,
  active: boolean,
  status: MenuRow["status"]
): MenuRow {
  return { id, department, service, owner, risk, active, status };
}
