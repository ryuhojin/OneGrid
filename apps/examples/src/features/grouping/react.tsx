import { OneGrid } from "@onegrid/react";
import {
  clientGroupingOptions,
  createGroupingDataSource,
  groupingColumns,
  groupingRows,
  serverGroupingOptions
} from "./data.js";

export function GroupingReactExample() {
  return (
    <>
      <OneGrid
        columns={groupingColumns}
        data={groupingRows}
        accessibility={{ label: "Client grouping grid" }}
        {...clientGroupingOptions}
      />
      <OneGrid
        columns={groupingColumns}
        dataSource={createGroupingDataSource()}
        accessibility={{ label: "Server grouping grid" }}
        {...serverGroupingOptions}
      />
      <dl className="example-inspector" aria-label="Grouping summary">
        <dt>Grouping modes</dt>
        <dd>client groups, expandable group rows, group footers, and server group requests</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards grouping and aggregation contracts to @onegrid/dom</dd>
      </dl>
    </>
  );
}
