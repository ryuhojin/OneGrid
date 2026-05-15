import { OneGrid } from "@onegrid/react";
import {
  clientGroupingOptions,
  createGroupingDataSource,
  groupingColumns,
  groupingFieldSummary,
  groupingRows,
  serverGroupingOptions
} from "./data.js";

export function GroupingReactExample() {
  return (
    <>
      <h3 className="example-subheading">Client grouping</h3>
      <OneGrid
        columns={groupingColumns}
        data={groupingRows}
        accessibility={{ label: "Client grouping grid" }}
        {...clientGroupingOptions}
      />
      <h3 className="example-subheading">Server grouping</h3>
      <OneGrid
        columns={groupingColumns}
        dataSource={createGroupingDataSource()}
        accessibility={{ label: "Server grouping grid" }}
        {...serverGroupingOptions}
      />
      <dl className="example-inspector" aria-label="Grouping summary">
        <dt>Grouping fields</dt>
        <dd>{groupingFieldSummary.fields}</dd>
        <dt>Grouping aggregates</dt>
        <dd>{groupingFieldSummary.aggregates}</dd>
        <dt>Client UX</dt>
        <dd>expandable rows, aggregate chips, and bottom group footers</dd>
        <dt>Server UX</dt>
        <dd>root groups, child route expansion, and server-supplied aggregate metadata</dd>
      </dl>
    </>
  );
}
