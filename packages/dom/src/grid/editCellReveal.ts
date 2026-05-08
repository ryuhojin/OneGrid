import type { CellPosition, ScrollAlign } from "@onegrid/core";
import {
  getBodyViewport,
  getCenterEditViewportWidth
} from "./editCellVisibility.js";
import type { CellEditTarget } from "./editRuntime.js";

export interface EditCellRevealRuntime {
  readonly root: HTMLElement;
  findCellElement(position: CellPosition): HTMLElement | undefined;
  getColumnScrollLeft(): number;
  setColumnScrollToField(columnId: string, align: ScrollAlign): void;
  setColumnViewportWidth(width: number): void;
}

export function revealEditCell(
  cell: HTMLElement,
  target: CellEditTarget,
  runtime: EditCellRevealRuntime
): HTMLElement {
  const position = getEditCellPosition(target);
  scrollEditPositionIntoView(position, runtime);
  return runtime.findCellElement(position) ?? cell;
}

export function scrollEditPositionIntoView(
  position: CellPosition,
  runtime: EditCellRevealRuntime
): void {
  const viewport = getBodyViewport(runtime.root);
  if (!viewport) {
    return;
  }

  runtime.setColumnViewportWidth(
    getCenterEditViewportWidth(runtime.root, viewport) || viewport.clientWidth
  );
  runtime.setColumnScrollToField(position.columnId ?? position.field, "nearest");
  const nextScrollLeft = runtime.getColumnScrollLeft();
  if (Math.abs(viewport.scrollLeft - nextScrollLeft) > 1) {
    viewport.scrollLeft = nextScrollLeft;
    viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
  }
}

function getEditCellPosition(target: CellEditTarget): CellPosition {
  return {
    rowIndex: target.rowIndex,
    rowKey: target.rowKey,
    columnId: target.columnId,
    field: target.field
  };
}
