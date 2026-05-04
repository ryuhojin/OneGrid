import { useMemo, useRef, useState } from "react";
import { OneGrid } from "@onegrid/react";
import type { OneGridHandle, ReactRendererSlots } from "@onegrid/react";
import type { GridPendingEdit } from "@onegrid/core";
import {
  reactWrapperColumns,
  reactWrapperOptions,
  reactWrapperRows
} from "./data.js";
import type { ReactWrapperRow } from "./data.js";

export function ReactWrapperExample() {
  const gridRef = useRef<OneGridHandle<ReactWrapperRow>>(null);
  const [rows, setRows] = useState(reactWrapperRows);
  const [ready, setReady] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [pendingEdits, setPendingEdits] = useState<readonly GridPendingEdit<ReactWrapperRow>[]>([]);
  const renderers = useMemo<ReactRendererSlots<ReactWrapperRow>>(() => ({
    headers: {
      workflow: () => <span className="react-wrapper-header">Workflow slots</span>,
      status: () => <span className="react-wrapper-header">Stage</span>
    },
    cells: {
      amount: ({ value }) => <strong>{Number(value).toLocaleString("en-US")}</strong>,
      status: ({ value }) => (
        <span className={`react-wrapper-status react-wrapper-status--${String(value).toLowerCase()}`}>
          {String(value)}
        </span>
      )
    }
  }), []);

  return (
    <>
      <div className="example-actions" aria-label="React wrapper actions">
        <button className="example-action-button" onClick={() => gridRef.current?.selectRows(["WR-0001", "WR-0002"])}>
          Select first two
        </button>
        <button className="example-action-button" onClick={() => setRows(createNextRows(rows))}>
          Add controlled row
        </button>
        <button className="example-action-button" onClick={() => void gridRef.current?.commitPendingEdits()}>
          Commit edits
        </button>
        <button className="example-action-button" onClick={() => gridRef.current?.cancelPendingEdits()}>
          Cancel edits
        </button>
      </div>
      <OneGrid
        ref={gridRef}
        columns={reactWrapperColumns}
        data={rows}
        rowKey="id"
        rowModel="client"
        reactRenderers={renderers}
        {...reactWrapperOptions}
        accessibility={{ label: "React wrapper grid" }}
        onReady={() => setReady(true)}
        onSelectionChanged={(event) => setSelectedCount(event.rowKeys.length)}
        onCellEditStaged={() => {
          setPendingEdits(gridRef.current?.getPendingEdits() ?? []);
        }}
        onCellEditCommitted={() => setPendingEdits(gridRef.current?.getPendingEdits() ?? [])}
        onCellEditCancelled={() => setPendingEdits(gridRef.current?.getPendingEdits() ?? [])}
      />
      <dl className="example-inspector" aria-label="React wrapper summary">
        <dt>Ready event</dt>
        <dd>{ready ? "received" : "pending"}</dd>
        <dt>Selected rows</dt>
        <dd>{selectedCount}</dd>
        <dt>Rows</dt>
        <dd>{rows.length}</dd>
        <dt>Pending edits</dt>
        <dd>{pendingEdits.length}</dd>
      </dl>
    </>
  );
}

function createNextRows(rows: readonly ReactWrapperRow[]): readonly ReactWrapperRow[] {
  if (rows.some((row) => row.id === "WR-0004")) {
    return rows;
  }

  return Object.freeze([
    ...rows,
    {
      id: "WR-0004",
      department: "Public Funds",
      program: "Grant review",
      memo: "Controlled props update",
      owner: "Seo",
      amount: 980,
      status: "Ready"
    }
  ]);
}
