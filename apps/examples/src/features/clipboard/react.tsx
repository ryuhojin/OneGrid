import { OneGrid } from "@onegrid/react";
import {
  clipboardColumns,
  clipboardEditing,
  clipboardOptions,
  clipboardRows,
  clipboardSelection
} from "./data.js";

export function ClipboardReactExample() {
  return (
    <>
      <OneGrid
        columns={clipboardColumns}
        data={clipboardRows}
        rowKey="id"
        rowModel="client"
        selection={clipboardSelection}
        editing={clipboardEditing}
        clipboard={clipboardOptions}
        merge={{ enabled: true }}
      />
      <dl className="example-inspector" aria-label="Clipboard summary">
        <dt>Clipboard scope</dt>
        <dd>Selected cells, rows, headers, paste validation, and merged-cell blanks</dd>
        <dt>Wrapper behavior</dt>
        <dd>React passes the same GridOptions clipboard contract to @onegrid/dom</dd>
      </dl>
    </>
  );
}
