import { useMemo, useState } from "react";
import { OneGrid } from "@onegrid/react";
import { editingColumns, editingOptions, editingRows } from "./data.js";
import type { EditingRow } from "./data.js";

export function EditingReactExample() {
  const [rows, setRows] = useState<readonly EditingRow[]>(editingRows);
  const [requests, setRequests] = useState(0);
  const readonlyEditing = useMemo(() => ({
    ...editingOptions,
    commitMode: "cell" as const,
    readOnly: true
  }), []);

  return (
    <>
      <OneGrid
        columns={editingColumns}
        columnUi={{ menu: true }}
        data={rows}
        rowKey="id"
        rowModel="client"
        editing={readonlyEditing}
        layout={{ width: "100%", height: 420, bodyHeight: 420 }}
        onCellEditRequested={(event) => {
          setRequests((current) => current + 1);
          setRows((current) => current.map((row) =>
            row.id === event.rowKey ? event.nextRow : row
          ));
        }}
      />
      <dl className="example-inspector" aria-label="Editing summary">
        <dt>Commit mode</dt>
        <dd>Read-only external state</dd>
        <dt>External requests</dt>
        <dd>{requests}</dd>
      </dl>
    </>
  );
}
