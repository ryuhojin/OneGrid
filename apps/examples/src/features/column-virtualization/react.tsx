import { OneGrid } from "@onegrid/react";
import {
  COLUMN_VIRTUALIZATION_CENTER_COLUMNS,
  columnVirtualizationColumns,
  columnVirtualizationLayout,
  columnVirtualizationRows,
  columnVirtualizationVirtualization
} from "./data.js";

export function ColumnVirtualizationReactExample() {
  return (
    <>
      <OneGrid
        columns={columnVirtualizationColumns}
        data={columnVirtualizationRows}
        rowKey="id"
        rowModel="client"
        rowHeight={32}
        layout={columnVirtualizationLayout}
        virtualization={columnVirtualizationVirtualization}
      />
      <dl className="example-inspector" aria-label="Column virtualization summary">
        <dt>Center columns</dt>
        <dd>{COLUMN_VIRTUALIZATION_CENTER_COLUMNS}</dd>
        <dt>Max DOM columns</dt>
        <dd>{columnVirtualizationVirtualization.columns.maxDomColumns}</dd>
      </dl>
    </>
  );
}
