import { OneGrid } from "@onegrid/react";
import {
  FROZEN_BOTTOM_ROWS,
  FROZEN_ROW_COUNT,
  FROZEN_TOP_ROWS,
  frozenColumns,
  frozenLayout,
  frozenRows,
  frozenVirtualization
} from "./data.js";

export function FrozenReactExample() {
  return (
    <>
      <OneGrid
        columns={frozenColumns}
        data={frozenRows}
        rowKey="id"
        rowModel="client"
        rowHeight={32}
        layout={frozenLayout}
        virtualization={frozenVirtualization}
        frozenRows={{ top: FROZEN_TOP_ROWS, bottom: FROZEN_BOTTOM_ROWS }}
        frozenColumns={{ left: ["id", "region"], right: ["status"] }}
        merge={{ enabled: true, strategy: "value", fields: ["region", "agency"] }}
      />
      <dl className="example-inspector" aria-label="Frozen rows and columns summary">
        <dt>Frozen top rows</dt>
        <dd>{FROZEN_TOP_ROWS}</dd>
        <dt>Frozen bottom rows</dt>
        <dd>{FROZEN_BOTTOM_ROWS}</dd>
        <dt>Logical rows</dt>
        <dd>{FROZEN_ROW_COUNT}</dd>
      </dl>
    </>
  );
}
