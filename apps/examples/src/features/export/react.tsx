import { OneGrid } from "@onegrid/react";
import {
  exportColumns,
  exportGridOptions,
  exportPagedGridOptions,
  exportPagedRows,
  exportRows,
  exportWideColumns,
  exportWideGridOptions,
  exportWideRows
} from "./data.js";

export function ExportReactExample() {
  return (
    <div className="export-example-stack">
      <section className="export-example-section">
        <h3 className="export-example-heading">Standard export</h3>
        <OneGrid
          columns={exportColumns}
          data={exportRows}
          accessibility={{ label: "React export import grid" }}
          {...exportGridOptions}
        />
      </section>
      <section className="export-example-section">
        <h3 className="export-example-heading">Paged row export</h3>
        <OneGrid
          columns={exportColumns}
          data={exportPagedRows}
          accessibility={{ label: "React paged export grid" }}
          {...exportPagedGridOptions}
        />
      </section>
      <section className="export-example-section">
        <h3 className="export-example-heading">Wide column export</h3>
        <OneGrid
          columns={exportWideColumns}
          data={exportWideRows}
          accessibility={{ label: "React wide export grid" }}
          {...exportWideGridOptions}
        />
      </section>
      <dl className="example-inspector" aria-label="Export import summary">
        <dt>Formats</dt>
        <dd>CSV, XLSX, PDF, print HTML, selected range, paged PDF, and wide-column export</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards the shared export and import contracts to @onegrid/dom</dd>
      </dl>
    </div>
  );
}
