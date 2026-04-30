import { OneGrid } from "@onegrid/react";
import {
  selectionColumns,
  selectionOptions,
  selectionRows
} from "./data.js";

export function SelectionReactExample() {
  return (
    <>
      <OneGrid
        columns={selectionColumns}
        data={selectionRows}
        rowKey="id"
        rowModel="client"
        selection={selectionOptions}
        merge={{ enabled: true }}
      />
      <dl className="example-inspector" aria-label="Selection summary">
        <dt>Selection modes</dt>
        <dd>Rows, cells, ranges, merged cells, visible rows, and server dataset token</dd>
        <dt>Wrapper behavior</dt>
        <dd>React passes the same GridOptions selection contract to @onegrid/dom</dd>
      </dl>
    </>
  );
}
