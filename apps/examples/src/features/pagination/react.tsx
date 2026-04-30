import { OneGrid } from "@onegrid/react";
import {
  clientPaginationOptions,
  paginationColumns,
  paginationRows,
  serverPaginationOptions,
  createPaginationDataSource
} from "./data.js";
import type { PaginationRow } from "./data.js";

export function PaginationExample() {
  return (
    <div>
      <OneGrid<PaginationRow>
        columns={paginationColumns}
        data={paginationRows}
        accessibility={{ label: "React client pagination grid" }}
        {...clientPaginationOptions}
      />
      <OneGrid<PaginationRow>
        columns={paginationColumns}
        dataSource={createPaginationDataSource()}
        accessibility={{ label: "React server pagination grid" }}
        {...serverPaginationOptions}
      />
    </div>
  );
}
