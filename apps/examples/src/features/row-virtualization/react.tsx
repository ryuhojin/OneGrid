import { OneGrid } from "@onegrid/react";
import {
  ROW_VIRTUALIZATION_ROW_COUNT,
  rowVirtualizationColumns,
  rowVirtualizationLayout,
  rowVirtualizationRows,
  rowVirtualizationVirtualization
} from "./data.js";

export function RowVirtualizationReactExample() {
  return (
    <>
      <OneGrid
        columns={rowVirtualizationColumns}
        data={rowVirtualizationRows}
        rowKey="id"
        rowModel="client"
        rowHeight={32}
        layout={rowVirtualizationLayout}
        virtualization={rowVirtualizationVirtualization}
      />
      <dl className="example-inspector" aria-label="Row virtualization summary">
        <dt>Logical rows</dt>
        <dd>{ROW_VIRTUALIZATION_ROW_COUNT}</dd>
        <dt>Virtual row height</dt>
        <dd>{rowVirtualizationVirtualization.rowHeight}px</dd>
      </dl>
    </>
  );
}
