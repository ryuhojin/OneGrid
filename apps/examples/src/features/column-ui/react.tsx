import { createColumnModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/react";
import { columnUiColumns, columnUiOptions, columnUiRows } from "./data.js";

const columnModel = createColumnModel(columnUiColumns);

export function ColumnUiReactExample() {
  return (
    <>
      <OneGrid
        columns={columnUiColumns}
        columnUi={columnUiOptions}
        data={columnUiRows}
        rowModel="client"
      />
      <dl className="example-inspector" aria-label="Column UI summary">
        <dt>Interactive controls</dt>
        <dd>resize, auto size, reorder, menu, tool panel</dd>
        <dt>Initial visible columns</dt>
        <dd>{columnModel.order.visible.join(", ")}</dd>
        <dt>Initial hidden columns</dt>
        <dd>{columnModel.order.hidden.join(", ")}</dd>
      </dl>
    </>
  );
}
