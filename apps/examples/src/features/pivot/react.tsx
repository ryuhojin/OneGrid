import { OneGrid } from "@onegrid/react";
import {
  clientPivotOptions,
  createPivotDataSource,
  pivotRows,
  pivotSourceColumns,
  serverPivotColumns,
  serverPivotOptions
} from "./data.js";

export function PivotReactExample() {
  return (
    <>
      <OneGrid
        columns={pivotSourceColumns}
        data={pivotRows}
        accessibility={{ label: "Client pivot grid" }}
        {...clientPivotOptions}
      />
      <OneGrid
        columns={serverPivotColumns}
        dataSource={createPivotDataSource()}
        accessibility={{ label: "Server pivot grid" }}
        {...serverPivotOptions}
      />
      <dl className="example-inspector" aria-label="Pivot summary">
        <dt>Pivot contracts</dt>
        <dd>row fields, column fields, value fields, row totals, column totals, subtotals</dd>
        <dt>Wrapper behavior</dt>
        <dd>React forwards the shared pivot model to @onegrid/dom</dd>
      </dl>
    </>
  );
}
