import { OneGrid } from "@onegrid/react";
import {
  clientSummaryOptions,
  createSummaryDataSource,
  serverSummaryOptions,
  summaryColumns,
  summaryRows
} from "./data.js";

export function SummaryReactExample() {
  return (
    <>
      <OneGrid
        columns={summaryColumns}
        data={summaryRows}
        accessibility={{ label: "Client summary grid" }}
        {...clientSummaryOptions}
      />
      <OneGrid
        columns={summaryColumns}
        dataSource={createSummaryDataSource()}
        accessibility={{ label: "Server aggregate grid" }}
        {...serverSummaryOptions}
      />
      <dl className="example-inspector" aria-label="Summary aggregate summary">
        <dt>Summary modes</dt>
        <dd>sum, avg, min, max, count, distinct count, custom, group, and server aggregate</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards the shared summary and aggregation contracts to @onegrid/dom</dd>
      </dl>
    </>
  );
}
