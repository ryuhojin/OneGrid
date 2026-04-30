import { OneGrid } from "@onegrid/react";
import { editingColumns, editingOptions, editingRows } from "./data.js";

export function EditingReactExample() {
  return (
    <>
      <OneGrid
        columns={editingColumns}
        columnUi={{ menu: true }}
        data={editingRows}
        rowKey="id"
        rowModel="client"
        editing={editingOptions}
        layout={{ width: "100%", height: 420, bodyHeight: 420 }}
      />
      <dl className="example-inspector" aria-label="Editing summary">
        <dt>Commit mode</dt>
        <dd>Batch pending edits</dd>
        <dt>Final commit</dt>
        <dd>GridApi.commitPendingEdits</dd>
      </dl>
    </>
  );
}
