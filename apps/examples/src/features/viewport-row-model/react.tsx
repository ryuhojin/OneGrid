import { OneGrid } from "@onegrid/react";
import {
  createViewportOrderDataSource,
  VIEWPORT_ROW_HEIGHT,
  VIEWPORT_SIZE,
  VIEWPORT_TOTAL_ROWS,
  viewportRowModelColumns
} from "./data.js";

export function ViewportRowModelReactExample() {
  return (
    <>
      <OneGrid
        columns={viewportRowModelColumns}
        rowKey="id"
        rowModel="viewport"
        dataSource={createViewportOrderDataSource()}
        viewport={{
          rowHeight: VIEWPORT_ROW_HEIGHT,
          viewportSize: VIEWPORT_SIZE,
          overscan: 2,
          prefetchRows: 24,
          maxCachedRanges: 3,
          initialRowCount: VIEWPORT_TOTAL_ROWS
        }}
        sorting={{ serverOnly: true, model: [{ field: "amount", direction: "asc" }] }}
      />
      <dl className="example-inspector" aria-label="Viewport row model summary">
        <dt>Total rows</dt>
        <dd>{VIEWPORT_TOTAL_ROWS}</dd>
        <dt>Viewport rows</dt>
        <dd>{VIEWPORT_SIZE}</dd>
      </dl>
    </>
  );
}
