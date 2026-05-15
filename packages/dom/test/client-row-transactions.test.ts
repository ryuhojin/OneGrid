import { describe, expect, it } from "vitest";
import { OneGrid } from "../src/index.js";

interface TransactionRow {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
}

describe("@onegrid/dom client row transactions", () => {
  it("returns accepted and rejected transaction details from row data APIs", () => {
    const el = document.createElement("div");
    const grid = new OneGrid<TransactionRow>({
      el,
      rowKey: "id",
      columns: [
        { field: "id", headerName: "ID" },
        { field: "name", headerName: "Name" },
        { field: "amount", headerName: "Amount" }
      ],
      data: [
        { id: "TR-001", name: "Budget", amount: 100 },
        { id: "TR-002", name: "Audit", amount: 200 }
      ]
    });

    const appendResult = grid.appendRows([{ id: "TR-003", name: "Risk", amount: 300 }]);
    const updateResult = grid.updateRows([
      { rowKey: "TR-002", row: { amount: 250 } },
      { rowKey: "TR-MISSING", row: { amount: 999 } }
    ]);
    const removeResult = grid.removeRows(["TR-001", "TR-MISSING"]);

    expect(appendResult).toMatchObject({
      kind: "append",
      acceptedRowCount: 1,
      rejectedRowCount: 0
    });
    expect(updateResult?.updated[0]).toMatchObject({
      key: "TR-002",
      previousData: { id: "TR-002", name: "Audit", amount: 200 },
      data: { id: "TR-002", name: "Audit", amount: 250 }
    });
    expect(updateResult?.rejected).toEqual([
      { reason: "missingKey", key: "TR-MISSING", requestIndex: 1, data: { amount: 999 } }
    ]);
    expect(removeResult?.removed.map((row) => row.key)).toEqual(["TR-001"]);
    expect(removeResult?.rejected.map((reject) => reject.key)).toEqual(["TR-MISSING"]);
    expect(grid.getRow("TR-002")?.amount).toBe(250);

    grid.destroy();
  });
});
