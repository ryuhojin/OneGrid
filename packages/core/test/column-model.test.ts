import { describe, expect, it } from "vitest";
import { collectLeafColumns, createColumnModel } from "../src/index.js";
import type { ColumnDef } from "../src/index.js";

interface OrderRow {
  readonly id: string;
  readonly customer: string;
  readonly amount: number;
  readonly status: "Draft" | "Approved";
}

const columns: readonly ColumnDef<OrderRow>[] = [
  { id: "order-id", field: "id", headerName: "ID", pinned: "left", width: 96 },
  {
    groupId: "commercial",
    headerName: "Commercial",
    children: [
      { field: "customer", headerName: "Customer", minWidth: 160, flex: 1 },
      { field: "amount", headerName: "Amount", width: 40, minWidth: 90, maxWidth: 120 },
      { field: "amount", headerName: "Amount Hidden", hidden: true }
    ]
  },
  { field: "status", headerName: "Status", pinned: "right", width: 128 }
];

describe("core column model", () => {
  it("normalizes columns into immutable root and leaf models", () => {
    const model = createColumnModel(columns);

    expect(Object.isFrozen(model)).toBe(true);
    expect(model.rootColumns).toHaveLength(3);
    expect(model.leafColumns.map((column) => column.id)).toEqual([
      "order-id",
      "customer",
      "amount",
      "amount__2",
      "status"
    ]);
    expect(collectLeafColumns(model.rootColumns)).toHaveLength(5);
  });

  it("resolves id, field, width, min, max, and flex metadata", () => {
    const model = createColumnModel(columns);
    const amount = model.byId.get("amount");
    const customer = model.byId.get("customer");

    if (!amount || amount.kind !== "data") {
      throw new Error("amount column should resolve to a data column");
    }

    if (!customer || customer.kind !== "data") {
      throw new Error("customer column should resolve to a data column");
    }

    expect(amount.width).toBe(90);
    expect(amount.minWidth).toBe(90);
    expect(amount.maxWidth).toBe(120);
    expect(customer.flex).toBe(1);
  });

  it("keeps column-state overrides from violating visibility and pinning policies", () => {
    const model = createColumnModel<OrderRow>(
      [
        { columnId: "id", field: "id", headerName: "ID", lockVisible: true },
        { columnId: "amount", field: "amount", headerName: "Amount", pinned: "left", lockPinned: true },
        { columnId: "status", field: "status", headerName: "Status" }
      ],
      {
        columnState: {
          columns: {
            id: { hidden: true },
            amount: { pinned: null },
            status: { hidden: true, pinned: "right" }
          }
        }
      }
    );

    expect(model.visibleLeafColumns.map((column) => column.id)).toEqual(["id", "amount"]);
    expect(model.pinnedLeafColumns.left.map((column) => column.id)).toEqual(["amount"]);
    expect(model.pinnedLeafColumns.right.map((column) => column.id)).toEqual([]);
    expect(model.byId.get("status")).toMatchObject({ hidden: true, pinned: "right" });
  });

  it("uses columnId as the canonical data and group identity", () => {
    const model = createColumnModel<OrderRow>([
      {
        columnId: "customer-group",
        groupId: "legacy-customer-group",
        headerName: "Customer Group",
        children: [
          { columnId: "customer-name", id: "legacy-customer", field: "customer" },
          { columnId: "customer-name-copy", field: "customer", headerName: "Duplicate Customer" }
        ]
      }
    ]);

    expect(model.rootColumns[0]?.id).toBe("customer-group");
    expect(model.leafColumns.map((column) => column.id)).toEqual([
      "customer-name",
      "customer-name-copy"
    ]);
    expect(model.leafColumns.map((column) => column.field)).toEqual(["customer", "customer"]);
  });

  it("rejects duplicate explicit column identities", () => {
    expect(() =>
      createColumnModel<OrderRow>([
        { columnId: "customer-name", field: "customer" },
        { columnId: "customer-name", field: "customer", headerName: "Duplicate Customer" }
      ])
    ).toThrow('Duplicate columnId "customer-name"');

    expect(() =>
      createColumnModel<OrderRow>([
        {
          columnId: "workflow",
          headerName: "Workflow",
          children: [{ id: "workflow", field: "status" }]
        }
      ])
    ).toThrow('Duplicate columnId "workflow"');
  });

  it("rejects empty explicit column identities", () => {
    expect(() =>
      createColumnModel<OrderRow>([
        { columnId: " ", field: "customer" }
      ])
    ).toThrow("Column columnId must not be empty");
  });

  it("reserves explicit identities before suffixing field fallbacks", () => {
    const model = createColumnModel<OrderRow>([
      { field: "status", headerName: "Status fallback" },
      { columnId: "status", field: "status", headerName: "Status explicit" }
    ]);

    expect(model.leafColumns.map((column) => column.id)).toEqual(["status__2", "status"]);
    expect(model.leafColumns.map((column) => column.field)).toEqual(["status", "status"]);
  });

  it("supports fieldless value and display columns with stable column ids", () => {
    const model = createColumnModel<OrderRow>([
      {
        columnId: "amount-band",
        headerName: "Amount Band",
        valueGetter: ({ row }) => row.amount >= 1_000 ? "large" : "small"
      },
      {
        headerName: "Actions",
        renderer: { kind: "text", render: () => "Open" }
      }
    ]);

    expect(model.leafColumns.map((column) => column.id)).toEqual([
      "amount-band",
      "column:2"
    ]);
    expect(model.leafColumns[0]?.source.field).toBeUndefined();
    expect(model.leafColumns[0]?.field).toBe("amount-band");
    expect(model.leafColumns[1]?.headerName).toBe("Actions");
  });

  it("separates hidden and pinned leaf columns", () => {
    const model = createColumnModel(columns);

    expect(model.visibleLeafColumns.map((column) => column.id)).toEqual([
      "order-id",
      "customer",
      "amount",
      "status"
    ]);
    expect(model.hiddenLeafColumns.map((column) => column.id)).toEqual(["amount__2"]);
    expect(model.pinnedLeafColumns.left.map((column) => column.id)).toEqual(["order-id"]);
    expect(model.pinnedLeafColumns.center.map((column) => column.id)).toEqual([
      "customer",
      "amount"
    ]);
    expect(model.pinnedLeafColumns.right.map((column) => column.id)).toEqual(["status"]);
  });

  it("uses group open state to resolve open and closed child columns", () => {
    const groupedColumns: readonly ColumnDef<OrderRow>[] = [
      { columnId: "id", field: "id", headerName: "ID" },
      {
        columnId: "workflow",
        headerName: "Workflow",
        openByDefault: false,
        children: [
          { columnId: "workflow-summary", field: "status", headerName: "Summary", columnGroupShow: "closed" },
          { columnId: "workflow-owner", field: "customer", headerName: "Owner", columnGroupShow: "open" },
          { columnId: "workflow-amount", field: "amount", headerName: "Amount" }
        ]
      }
    ];

    const closedModel = createColumnModel(groupedColumns);
    const openModel = createColumnModel(groupedColumns, {
      columnState: { groups: { workflow: { open: true } } }
    });

    expect(closedModel.visibleLeafColumns.map((column) => column.id)).toEqual([
      "id",
      "workflow-summary",
      "workflow-amount"
    ]);
    expect(openModel.visibleLeafColumns.map((column) => column.id)).toEqual([
      "id",
      "workflow-owner",
      "workflow-amount"
    ]);
    expect(openModel.byId.get("workflow")).toMatchObject({ kind: "group", open: true });
  });

  it("applies a stable column order without dropping missing columns", () => {
    const model = createColumnModel(columns, {
      columnOrder: ["status", "customer"]
    });

    expect(model.order.visible).toEqual(["status", "customer", "order-id", "amount"]);
    expect(model.visibleLeafColumns.map((column) => column.orderIndex)).toEqual([0, 1, 2, 3]);
  });

  it("keeps marryChildren group leaves contiguous when column order splits them", () => {
    const model = createColumnModel<OrderRow>(
      [
        { columnId: "id", field: "id", headerName: "ID" },
        {
          columnId: "workflow",
          headerName: "Workflow",
          marryChildren: true,
          children: [
            { columnId: "workflow-status", field: "status", headerName: "Status" },
            { columnId: "workflow-customer", field: "customer", headerName: "Customer" },
            { columnId: "workflow-amount", field: "amount", headerName: "Amount" }
          ]
        },
        { columnId: "tail", field: "id", headerName: "Tail" }
      ],
      {
        columnOrder: ["workflow-status", "tail", "workflow-customer", "id", "workflow-amount"]
      }
    );

    expect(model.order.all).toEqual([
      "workflow-status",
      "workflow-customer",
      "workflow-amount",
      "tail",
      "id"
    ]);
  });

  it("applies defaultColumnDef and columnTypes before explicit column options", () => {
    const model = createColumnModel<OrderRow>(
      [
        { field: "amount", headerName: "Amount", type: "money", width: 180 },
        { field: "status", headerName: "Status" }
      ],
      {
        defaultColumnDef: { minWidth: 100, resizable: true, filter: "text" },
        columnTypes: {
          numeric: { type: "number", filter: "number", editor: "number", width: 130 },
          money: { type: "numeric", headerTooltip: "Currency", width: 140 }
        }
      }
    );
    const amount = model.byId.get("amount");
    const status = model.byId.get("status");

    if (!amount || amount.kind !== "data" || !status || status.kind !== "data") {
      throw new Error("columns should resolve to data columns");
    }

    expect(amount.width).toBe(180);
    expect(amount.minWidth).toBe(100);
    expect(amount.source.type).toBe("number");
    expect(amount.source.filter).toBe("number");
    expect(amount.source.editor).toBe("number");
    expect(amount.source.headerTooltip).toBe("Currency");
    expect(amount.source.resizable).toBe(true);
    expect(status.source.filter).toBe("text");
    expect(status.source.resizable).toBe(true);
  });

  it("resolves default column type references through groups", () => {
    const model = createColumnModel<OrderRow>(
      [
        {
          headerName: "Commercial",
          children: [
            { field: "customer", headerName: "Customer" },
            { field: "amount", headerName: "Amount", type: ["currency", "wide"] }
          ]
        }
      ],
      {
        defaultColumnDef: { type: "readonly", minWidth: 96 },
        columnTypes: {
          readonly: { editable: false, sortable: true },
          currency: { type: "number", filter: "number", editor: "number", width: 144 },
          wide: { minWidth: 180, headerTooltip: "Wide metric" }
        }
      }
    );
    const customer = model.byId.get("customer");
    const amount = model.byId.get("amount");

    if (!customer || customer.kind !== "data" || !amount || amount.kind !== "data") {
      throw new Error("group children should resolve to data columns");
    }

    expect(customer.source.editable).toBe(false);
    expect(customer.source.sortable).toBe(true);
    expect(customer.minWidth).toBe(96);
    expect(amount.source.type).toBe("number");
    expect(amount.source.filter).toBe("number");
    expect(amount.source.editor).toBe("number");
    expect(amount.source.editable).toBe(false);
    expect(amount.minWidth).toBe(180);
    expect(amount.source.headerTooltip).toBe("Wide metric");
  });
});
