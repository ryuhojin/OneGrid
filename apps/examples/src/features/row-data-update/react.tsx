import { useRef, useState } from "react";
import { OneGrid } from "@onegrid/react";
import type { OneGridHandle } from "@onegrid/react";
import {
  createInsertedRow,
  createRowDataUpdateRows,
  rowDataUpdateColumns
} from "./data.js";
import type { RowDataUpdateRow } from "./data.js";

export function RowDataUpdateReactExample() {
  const gridRef = useRef<OneGridHandle<RowDataUpdateRow>>(null);
  const [rows, setRows] = useState(createRowDataUpdateRows);
  const [operation, setOperation] = useState("initial data");

  return (
    <>
      <div className="example-actions" aria-label="Row data update React actions">
        <button className="example-action-button" onClick={() => {
          const nextRows = createRowDataUpdateRows();
          setRows(nextRows);
          setOperation("controlled data reset");
        }}>
          Reset controlled data
        </button>
        <button className="example-action-button" onClick={() => {
          gridRef.current?.appendRows([createInsertedRow()]);
          setOperation("GridApi appendRows");
        }}>
          Append via API
        </button>
        <button className="example-action-button" onClick={() => {
          gridRef.current?.updateRows([{ rowKey: "UPD-0002", row: { status: "Approved", amount: 1110 } }]);
          setOperation("GridApi updateRows");
        }}>
          Update via API
        </button>
      </div>
      <OneGrid
        ref={gridRef}
        columns={rowDataUpdateColumns}
        data={rows}
        rowKey="id"
        rowModel="client"
        accessibility={{ label: "Row data update React grid" }}
      />
      <dl className="example-inspector" aria-label="Row data update React summary">
        <dt>Last operation</dt>
        <dd>{operation}</dd>
      </dl>
    </>
  );
}
