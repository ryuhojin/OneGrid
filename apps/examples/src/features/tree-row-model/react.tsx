import { OneGrid } from "@onegrid/react";
import { createTreeOrderDataSource, treeRowModelColumns, treeRows } from "./data.js";

export function TreeRowModelReactExample() {
  return (
    <>
      <OneGrid
        columns={treeRowModelColumns}
        data={treeRows}
        dataSource={createTreeOrderDataSource()}
        rowKey="id"
        rowModel="tree"
        tree={{
          childrenField: "children",
          hasChildrenField: "hasChildren",
          indentSize: 22,
          selection: { policy: "descendants" }
        }}
      />
      <dl className="example-inspector" aria-label="Tree row model summary">
        <dt>Selection policy</dt>
        <dd>descendants</dd>
        <dt>Indent size</dt>
        <dd>22</dd>
      </dl>
    </>
  );
}
