import { OneGrid } from "@onegrid/react";
import {
  createQspServerDataSource,
  QSP_SERVER_PAGE_SIZE,
  QSP_SERVER_TOTAL_ROWS,
  qspServerColumns
} from "./data.js";

export function QspServer10mReactExample() {
  return (
    <>
      <OneGrid
        columns={qspServerColumns}
        rowKey="id"
        rowModel="server"
        dataSource={createQspServerDataSource()}
        server={{ pageSize: QSP_SERVER_PAGE_SIZE }}
        pagination={{ mode: "server", position: "bottom", pageSize: QSP_SERVER_PAGE_SIZE }}
        layout={{ height: 420, bodyHeight: 420 }}
        sorting={{ serverOnly: true, model: [{ field: "amount", direction: "desc" }] }}
        accessibility={{ label: "React 10M server rows grid" }}
      />
      <dl className="example-inspector" aria-label="React 10M server rows summary">
        <dt>Logical rows</dt>
        <dd>{QSP_SERVER_TOTAL_ROWS.toLocaleString("en-US")}</dd>
        <dt>Page size</dt>
        <dd>{QSP_SERVER_PAGE_SIZE}</dd>
      </dl>
    </>
  );
}
