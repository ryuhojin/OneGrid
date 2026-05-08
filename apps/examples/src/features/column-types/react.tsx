import { OneGrid } from "@onegrid/react";
import {
  columnTypeDefinitions,
  columnTypesColumns,
  columnTypesDefaultColumnDef,
  columnTypesRows
} from "./data.js";

export function ColumnTypesReactExample() {
  return (
    <OneGrid
      columns={columnTypesColumns}
      defaultColumnDef={columnTypesDefaultColumnDef}
      columnTypes={columnTypeDefinitions}
      data={columnTypesRows}
      rowKey="id"
      rowModel="client"
      accessibility={{ label: "Column types React grid" }}
    />
  );
}
