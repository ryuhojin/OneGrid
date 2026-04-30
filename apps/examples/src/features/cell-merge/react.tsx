import { OneGrid } from "@onegrid/react";
import {
  cellMergeColumns,
  cellMergeRows,
  createCellMergeDataSource
} from "./data.js";

export function CellMergeReactExample() {
  return (
    <>
      <OneGrid
        columns={cellMergeColumns}
        rowKey="id"
        rowModel="server"
        dataSource={createCellMergeDataSource()}
        server={{ pageSize: cellMergeRows.length }}
        rowHeight={36}
        layout={{ width: "100%", height: 392, bodyHeight: 392 }}
        merge={{ enabled: true }}
      />
      <dl className="example-inspector" aria-label="Cell merge summary">
        <dt>Merge sources</dt>
        <dd>value, custom, server mergeMeta</dd>
        <dt>Rows</dt>
        <dd>{cellMergeRows.length}</dd>
      </dl>
    </>
  );
}
