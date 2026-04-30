import { OneGrid } from "@onegrid/dom";
import { basicColumns, basicRows } from "./data.js";
import type { BasicOrderRow } from "./data.js";

export function mountBasicExample(el: HTMLElement): OneGrid<BasicOrderRow> {
  return new OneGrid({
    el,
    columns: basicColumns,
    data: basicRows,
    rowModel: "client"
  });
}
