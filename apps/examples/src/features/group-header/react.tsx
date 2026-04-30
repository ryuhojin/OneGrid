import { createColumnModel, createHeaderModel } from "@onegrid/core";
import { OneGrid } from "@onegrid/react";
import { groupHeaderColumns, groupHeaderMerge, groupHeaderRows, metricColumnIds } from "./data.js";

const columnModel = createColumnModel(groupHeaderColumns);
const headerModel = createHeaderModel(columnModel, { merge: groupHeaderMerge });
const metricColumnNames = metricColumnIds.map((columnId) => {
  const column = columnModel.byId.get(columnId);
  return column?.headerName ?? columnId;
});

export function GroupHeaderReactExample() {
  return (
    <>
      <OneGrid
        columns={groupHeaderColumns}
        headerMerge={groupHeaderMerge}
        data={groupHeaderRows}
        rowModel="client"
      />
      <dl className="example-inspector" aria-label="Group header summary">
        <dt>Header rows</dt>
        <dd>{headerModel.depth}</dd>
        <dt>Metric columns</dt>
        <dd>{metricColumnNames.join(", ")}</dd>
        <dt>Center headers</dt>
        <dd>
          {headerModel.regions.center.rows
            .flatMap((row) => row.cells.map((cell) => cell.headerName))
            .join(", ")}
        </dd>
        <dt>ARIA labels</dt>
        <dd>{[...headerModel.ariaLabels.values()].slice(0, 4).join(" / ")}</dd>
      </dl>
    </>
  );
}
