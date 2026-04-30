import { OneGrid } from "@onegrid/react";
import { sortingColumns, sortingOptions, sortingRows } from "./data.js";

export function SortingReactExample() {
  return (
    <>
      <OneGrid
        columns={sortingColumns}
        columnUi={{ menu: true }}
        data={sortingRows}
        rowModel="client"
        sorting={sortingOptions}
      />
      <dl className="example-inspector" aria-label="Sorting summary">
        <dt>Sort cycle</dt>
        <dd>ascending, descending, none</dd>
        <dt>Multi sort</dt>
        <dd>Shift-click sortable headers</dd>
      </dl>
    </>
  );
}
