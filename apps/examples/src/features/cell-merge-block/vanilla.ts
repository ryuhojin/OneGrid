import { OneGrid } from "@onegrid/dom";
import { cellMergeBlockOptions } from "./data.js";
import type { CellMergeBlockRow } from "./data.js";

export function mountCellMergeBlockExample(el: HTMLElement): OneGrid<CellMergeBlockRow> {
  return new OneGrid({
    ...cellMergeBlockOptions,
    el
  });
}
