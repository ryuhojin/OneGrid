import { OneGrid } from "@onegrid/react";
import {
  createFilteringDataSource,
  filteringColumns,
  filteringOptions
} from "./data.js";

export function FilteringReactExample() {
  return (
    <>
      <OneGrid
        columns={filteringColumns}
        columnUi={{ menu: true }}
        dataSource={createFilteringDataSource()}
        filtering={filteringOptions}
        rowKey="id"
        rowModel="server"
        server={{ pageSize: 8 }}
      />
      <dl className="example-inspector" aria-label="Filtering summary">
        <dt>Filter UI</dt>
        <dd>Quick filter and column menu filters use the shared filter model</dd>
        <dt>Server mode</dt>
        <dd>getRows receives FilterModel and getDistinctValues powers set filters</dd>
      </dl>
    </>
  );
}
