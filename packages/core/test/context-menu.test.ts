import { describe, expect, it } from "vitest";
import { createContextMenuModel } from "../src/index.js";
import type { ContextMenuContext } from "../src/index.js";

interface MenuRow {
  readonly id: string;
  readonly status: string;
}

const cellContext: ContextMenuContext<MenuRow> = {
  scope: "cell",
  row: { id: "M-1", status: "Ready" },
  rowIndex: 0,
  rowKey: "M-1",
  field: "status",
  value: "Ready",
  column: { field: "status", headerName: "Status" }
};

describe("context menu model", () => {
  it("creates default row and cell menu actions from capabilities", () => {
    const model = createContextMenuModel({
      context: cellContext,
      options: { enabled: true },
      capabilities: { canCopy: true, canEdit: false, hasSelection: true }
    });

    expect(model?.items.map((item) => [item.label, item.enabled])).toEqual([
      ["Copy cell", true],
      ["Copy row", true],
      ["Copy row with headers", true],
      ["Start edit", false],
      ["Clear selection", true]
    ]);
  });

  it("merges custom row scoped items into a cell context", () => {
    const model = createContextMenuModel({
      context: cellContext,
      options: {
        enabled: true,
        defaultItems: false,
        items: [
          { id: "flag", label: "Flag row", scope: "row" },
          { id: "hidden", label: "Hidden", visible: false }
        ]
      }
    });

    expect(model?.items.map((item) => item.label)).toEqual(["Flag row"]);
  });
});
