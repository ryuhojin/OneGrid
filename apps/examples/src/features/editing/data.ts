import type { ColumnDef, EditorOption, EditingOptions, RenderElement, RenderElementBuilder } from "@onegrid/core";

export interface EditingRow {
  readonly id: string;
  readonly title: string;
  readonly budget: number;
  readonly dueDate: string;
  readonly meetingAt: string;
  readonly active: boolean;
  readonly status: "Draft" | "Review" | "Approved" | "Blocked";
  readonly tags: readonly string[];
  readonly priority: "Low" | "Medium" | "High";
  readonly notes: string;
  readonly owner: string;
  readonly code: string;
}

export const editingOptions: EditingOptions = {
  enabled: true,
  commitMode: "batch",
  blurAction: "cancel",
  validateOnCommit: true
};

const statusOptions: readonly EditorOption[] = [
  { value: "Draft", label: "Draft" },
  { value: "Review", label: "Review" },
  { value: "Approved", label: "Approved" },
  { value: "Blocked", label: "Blocked" }
];

const tagOptions: readonly EditorOption[] = [
  { value: "budget", label: "Budget" },
  { value: "audit", label: "Audit" },
  { value: "field", label: "Field" },
  { value: "security", label: "Security" }
];

const priorityOptions: readonly EditorOption[] = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" }
];

const ownerOptions: readonly EditorOption[] = [
  { value: "Han", label: "Han" },
  { value: "Lee", label: "Lee" },
  { value: "Park", label: "Park" },
  { value: "Choi", label: "Choi" },
  { value: "Kang", label: "Kang" }
];

function renderActiveCheckbox(value: unknown, builder: RenderElementBuilder): RenderElement {
  const checked = value === true;
  const attributes = {
    type: "checkbox",
    class: "og-grid__cell-native-checkbox",
    tabindex: "-1",
    "aria-label": checked ? "Active checked" : "Active not checked",
    "aria-disabled": "true",
    ...(checked ? { checked: "checked" } : {})
  };
  return builder.element("input", attributes);
}

export const editingColumns: readonly ColumnDef<EditingRow>[] = [
  { field: "id", headerName: "ID", pinned: "left", width: 118 },
  {
    field: "title",
    headerName: "Title",
    editable: true,
    editor: "text",
    width: 180,
    validator: (value) => String(value).trim().length < 3 ? ["Title must be at least 3 characters"] : []
  },
  { field: "budget", headerName: "Budget", type: "number", editable: true, width: 128 },
  { field: "dueDate", headerName: "Due Date", type: "date", editable: true, width: 132 },
  { field: "meetingAt", headerName: "Meeting", type: "datetime", editable: true, width: 168 },
  {
    field: "active",
    headerName: "Active",
    type: "boolean",
    editable: true,
    width: 104,
    renderer: {
      kind: "element",
      render: ({ value }, builder) => renderActiveCheckbox(value, builder)
    }
  },
  {
    field: "status",
    headerName: "Status",
    editable: true,
    editor: { kind: "select", options: statusOptions },
    width: 132
  },
  {
    field: "tags",
    headerName: "Tags",
    editable: true,
    editor: { kind: "multi-select", options: tagOptions },
    formatter: ({ value }) => Array.isArray(value) ? value.join(", ") : "",
    width: 172
  },
  {
    field: "priority",
    headerName: "Priority",
    editable: true,
    editor: { kind: "radio", options: priorityOptions },
    width: 220
  },
  {
    field: "notes",
    headerName: "Notes",
    editable: true,
    editor: { kind: "textarea", params: { rows: 3 } },
    width: 210
  },
  {
    field: "owner",
    headerName: "Owner",
    editable: true,
    editor: { kind: "autocomplete", options: ownerOptions },
    width: 128
  },
  {
    field: "code",
    headerName: "Code",
    pinned: "right",
    editable: true,
    editor: {
      kind: "custom",
      validate: async (value) => {
        await wait(5);
        return String(value).startsWith("ERR") ? ["Code cannot start with ERR"] : [];
      }
    },
    parser: (value) => String(value).trim().toUpperCase(),
    width: 120
  }
];

export const editingRows: readonly EditingRow[] = [
  {
    id: "ED-0001",
    title: "Budget approval",
    budget: 1200000,
    dueDate: "2026-05-11",
    meetingAt: "2026-05-11T09:30",
    active: true,
    status: "Review",
    tags: ["budget", "audit"],
    priority: "High",
    notes: "Joint approval",
    owner: "Han",
    code: "APR"
  },
  {
    id: "ED-0002",
    title: "Field exception",
    budget: 430000,
    dueDate: "2026-05-18",
    meetingAt: "2026-05-18T13:00",
    active: false,
    status: "Draft",
    tags: ["field"],
    priority: "Medium",
    notes: "Needs review",
    owner: "Lee",
    code: "REV"
  },
  {
    id: "ED-0003",
    title: "Security gate",
    budget: 920000,
    dueDate: "2026-06-03",
    meetingAt: "2026-06-03T10:15",
    active: true,
    status: "Approved",
    tags: ["security"],
    priority: "Low",
    notes: "Automated check",
    owner: "Kang",
    code: "SEC"
  }
];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}
