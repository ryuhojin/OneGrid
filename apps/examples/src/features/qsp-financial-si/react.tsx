import { OneGrid } from "@onegrid/react";
import { financialExposureTotal, financialSiOptions, financialSiRows } from "./data.js";

export function QspFinancialSiReactExample() {
  return (
    <>
      <OneGrid {...financialSiOptions} />
      <dl className="example-inspector" aria-label="React financial SI summary">
        <dt>Scenario</dt>
        <dd>financial controls</dd>
        <dt>Rows</dt>
        <dd>{financialSiRows.length}</dd>
        <dt>Exposure total</dt>
        <dd>{financialExposureTotal.toLocaleString("en-US")}</dd>
      </dl>
    </>
  );
}
