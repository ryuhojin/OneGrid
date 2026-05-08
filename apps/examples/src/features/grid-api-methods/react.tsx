import { useRef, useState } from "react";
import { OneGrid } from "@onegrid/react";
import type { OneGridHandle } from "@onegrid/react";
import { gridApiMethodsColumns, gridApiMethodsRows } from "./data.js";
import type { GridApiMethodsRow } from "./data.js";

export function GridApiMethodsReactExample() {
  const gridRef = useRef<OneGridHandle<GridApiMethodsRow>>(null);
  const [lastMethod, setLastMethod] = useState("ready");

  return (
    <>
      <div className="example-actions" aria-label="Grid API method React actions">
        <button className="example-action-button" onClick={() => {
          gridRef.current?.selectRows(["API-0002"]);
          setLastMethod("selectRows");
        }}>
          Select API-0002
        </button>
        <button className="example-action-button" onClick={() => {
          gridRef.current?.setSortModel([{ field: "amount", direction: "desc" }]);
          setLastMethod("setSortModel");
        }}>
          Sort amount
        </button>
        <button className="example-action-button" onClick={() => {
          gridRef.current?.hideColumn("owner");
          setLastMethod("hideColumn");
        }}>
          Hide owner
        </button>
      </div>
      <OneGrid
        ref={gridRef}
        columns={gridApiMethodsColumns}
        data={gridApiMethodsRows}
        rowKey="id"
        rowModel="client"
        selection={{ mode: "row", multiple: true, checkbox: true, selectAll: "visible" }}
        accessibility={{ label: "Grid API methods React grid" }}
      />
      <dl className="example-inspector" aria-label="Grid API method React summary">
        <dt>Last method</dt>
        <dd>{lastMethod}</dd>
      </dl>
    </>
  );
}
