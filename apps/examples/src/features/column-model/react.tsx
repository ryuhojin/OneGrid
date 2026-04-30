import { createColumnModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/react";
import { columnModelColumns, columnModelOrder, columnModelRows } from "./data.js";

const model = createColumnModel(columnModelColumns, { columnOrder: columnModelOrder });

export function ColumnModelReactExample() {
  return (
    <>
      <OneGrid
        columns={columnModelColumns}
        columnOrder={columnModelOrder}
        data={columnModelRows}
        rowModel="client"
      />
      <dl className="example-inspector" aria-label="Column model summary">
        <dt>Visible columns</dt>
        <dd>{model.order.visible.join(", ")}</dd>
        <dt>Hidden columns</dt>
        <dd>{model.order.hidden.join(", ")}</dd>
        <dt>Pinned left columns</dt>
        <dd>{model.pinnedLeafColumns.left.map((column) => column.headerName).join(", ")}</dd>
        <dt>Pinned right columns</dt>
        <dd>{model.pinnedLeafColumns.right.map((column) => column.headerName).join(", ")}</dd>
      </dl>
    </>
  );
}
