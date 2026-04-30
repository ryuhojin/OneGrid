import { OneGrid } from "@onegrid/react";
import { baseLayoutColumns, baseLayoutOptions, baseLayoutRows } from "./data.js";

export function BaseLayoutReactExample() {
  return (
    <>
      <OneGrid columns={baseLayoutColumns} data={baseLayoutRows} {...baseLayoutOptions} />
      <dl className="example-inspector" aria-label="Base layout summary">
        <dt>Pinned panes</dt>
        <dd>left, center, right</dd>
        <dt>Summary position</dt>
        <dd>bottom</dd>
        <dt>Footer status</dt>
        <dd>rows</dd>
      </dl>
    </>
  );
}
