import { OneGrid } from "@onegrid/react";
import {
  clientPivotOptions,
  createPivotDataSource,
  pivotRows,
  pivotSourceColumns,
  pivotUxSummary,
  serverPivotColumns,
  serverPivotOptions
} from "./data.js";

export function PivotReactExample() {
  return (
    <>
      <h3 className="example-subheading">Client pivot</h3>
      <OneGrid
        columns={pivotSourceColumns}
        data={pivotRows}
        accessibility={{ label: "Client pivot grid" }}
        {...clientPivotOptions}
      />
      <h3 className="example-subheading">Server pivot</h3>
      <OneGrid
        columns={serverPivotColumns}
        dataSource={createPivotDataSource()}
        accessibility={{ label: "Server pivot grid" }}
        {...serverPivotOptions}
      />
      <dl className="example-inspector" aria-label="Pivot summary">
        <dt>Pivot row fields</dt>
        <dd>{pivotUxSummary.rows}</dd>
        <dt>Pivot column fields</dt>
        <dd>{pivotUxSummary.columns}</dd>
        <dt>Pivot value fields</dt>
        <dd>{pivotUxSummary.values}</dd>
        <dt>Pivot totals</dt>
        <dd>{pivotUxSummary.totals}</dd>
      </dl>
    </>
  );
}
