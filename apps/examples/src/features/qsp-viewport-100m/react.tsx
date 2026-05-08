import { OneGrid } from "@onegrid/react";
import {
  createQspViewportDataSource,
  QSP_VIEWPORT_ROW_HEIGHT,
  QSP_VIEWPORT_SIZE,
  QSP_VIEWPORT_TOTAL_ROWS,
  qspViewportColumns
} from "./data.js";

export function QspViewport100mReactExample() {
  return (
    <>
      <OneGrid
        columns={qspViewportColumns}
        rowKey="id"
        rowModel="viewport"
        dataSource={createQspViewportDataSource()}
        viewport={{
          rowHeight: QSP_VIEWPORT_ROW_HEIGHT,
          viewportSize: QSP_VIEWPORT_SIZE,
          overscan: 24,
          prefetchRows: 80,
          maxCachedRanges: 6,
          initialRowCount: QSP_VIEWPORT_TOTAL_ROWS
        }}
        virtualization={{
          segmented: true,
          rowHeight: QSP_VIEWPORT_ROW_HEIGHT,
          maxDomRows: 80
        }}
        layout={{ height: 430, bodyHeight: 430 }}
        accessibility={{ label: "React 100M viewport rows grid" }}
      />
      <dl className="example-inspector" aria-label="React 100M viewport rows summary">
        <dt>Logical rows</dt>
        <dd>{QSP_VIEWPORT_TOTAL_ROWS.toLocaleString("en-US")}</dd>
        <dt>Viewport rows</dt>
        <dd>{QSP_VIEWPORT_SIZE}</dd>
      </dl>
    </>
  );
}
