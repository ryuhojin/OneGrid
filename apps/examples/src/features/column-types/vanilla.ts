import { OneGrid } from "@onegrid/dom";
import {
  columnTypeDefinitions,
  columnTypesColumns,
  columnTypesDefaultColumnDef,
  columnTypesRows
} from "./data.js";
import type { ColumnTypesRow } from "./data.js";

export function mountColumnTypesExample(el: HTMLElement): OneGrid<ColumnTypesRow> {
  return new OneGrid({
    el,
    columns: columnTypesColumns,
    defaultColumnDef: columnTypesDefaultColumnDef,
    columnTypes: columnTypeDefinitions,
    data: columnTypesRows,
    rowKey: "id",
    rowModel: "client",
    accessibility: { label: "Column types grid" }
  });
}
