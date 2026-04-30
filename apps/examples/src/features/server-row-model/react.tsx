import { OneGrid } from "@onegrid/react";
import {
  createServerOrderDataSource,
  SERVER_ROW_MODEL_PAGE_SIZE,
  serverRowModelColumns
} from "./data.js";

export function ServerRowModelReactExample() {
  return (
    <>
      <OneGrid
        columns={serverRowModelColumns}
        rowKey="id"
        rowModel="server"
        dataSource={createServerOrderDataSource()}
        server={{ pageSize: SERVER_ROW_MODEL_PAGE_SIZE }}
        sorting={{ serverOnly: true, model: [{ field: "amount", direction: "desc" }] }}
        filtering={{
          serverOnly: true,
          model: {
            conditions: [
              { field: "status", kind: "set", operator: "in", value: ["Approved", "Draft"] }
            ]
          }
        }}
        grouping={{ serverOnly: true, model: { fields: ["region"] } }}
        aggregation={{
          serverOnly: true,
          model: { fields: [{ field: "amount", function: "sum", alias: "amountTotal" }] }
        }}
        pivot={{
          serverOnly: true,
          model: { rows: ["region"], columns: ["status"], values: ["amount"] }
        }}
      />
      <dl className="example-inspector" aria-label="Server row model summary">
        <dt>Page size</dt>
        <dd>{SERVER_ROW_MODEL_PAGE_SIZE}</dd>
        <dt>Server models</dt>
        <dd>sort, filter, group, aggregate, pivot</dd>
      </dl>
    </>
  );
}
