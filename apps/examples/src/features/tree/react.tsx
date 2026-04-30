import { OneGrid } from "@onegrid/react";
import {
  clientTreeOptions,
  clientTreeRows,
  createServerTreeDataSource,
  createTreeFeatureDataSource,
  serverTreeOptions,
  serverTreeRows,
  treeFeatureColumns
} from "./data.js";

export function TreeReactExample() {
  return (
    <>
      <OneGrid
        columns={treeFeatureColumns}
        data={clientTreeRows}
        dataSource={createTreeFeatureDataSource()}
        accessibility={{ label: "Client tree grid" }}
        {...clientTreeOptions}
      />
      <OneGrid
        columns={treeFeatureColumns}
        data={serverTreeRows}
        dataSource={createServerTreeDataSource()}
        accessibility={{ label: "Server tree grid" }}
        {...serverTreeOptions}
      />
      <dl className="example-inspector" aria-label="Tree summary">
        <dt>Tree contracts</dt>
        <dd>tree column, lazy children, sibling sort, ancestor filter, cascade checkbox selection</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards tree row model options to @onegrid/dom</dd>
      </dl>
    </>
  );
}
