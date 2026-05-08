import { OneGrid } from "@onegrid/dom";
import { variableRowHeightOptions } from "./data.js";
import type { VariableRowHeightRow } from "./data.js";

export function mountVariableRowHeightExample(el: HTMLElement): OneGrid<VariableRowHeightRow> {
  return new OneGrid({
    ...variableRowHeightOptions,
    el
  });
}
