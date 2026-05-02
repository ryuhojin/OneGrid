import { OneGrid } from "@onegrid/react";
import {
  exportColumns,
  exportGridOptions,
  exportRows
} from "./data.js";

export function ExportReactExample() {
  return (
    <>
      <OneGrid
        columns={exportColumns}
        data={exportRows}
        accessibility={{ label: "React export import grid" }}
        {...exportGridOptions}
      />
      <dl className="example-inspector" aria-label="Export import summary">
        <dt>Formats</dt>
        <dd>CSV, XLSX, PDF, print HTML, selected range, and import parsing</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards the shared export and import contracts to @onegrid/dom</dd>
      </dl>
    </>
  );
}
