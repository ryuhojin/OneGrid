import type { FixedRowVirtualWindow, MeasuredRowHeightCache } from "@onegrid/core";
import { AUTO_ROW_RENDER_FALLBACK_HEIGHT } from "./rowHeightRuntime.js";
import type { AutoRowHeightMeasurementResult } from "./virtualScrollRuntime.js";

interface AutoRowHeightMeasurementHandle {
  readonly observer: ResizeObserver | undefined;
  readonly frame: number | undefined;
}

interface AutoRowHeightMeasurementInput {
  readonly viewport: HTMLElement;
  readonly cache: MeasuredRowHeightCache | undefined;
  readonly virtualWindow: FixedRowVirtualWindow | undefined;
  onMeasured?(result: AutoRowHeightMeasurementResult): void;
}

interface AttachedAutoRowHeightMeasurementInput extends AutoRowHeightMeasurementInput {
  readonly host: HTMLElement;
}

const handles = new WeakMap<HTMLElement, AutoRowHeightMeasurementHandle>();

export function attachAutoRowHeightMeasurement(input: AttachedAutoRowHeightMeasurementInput): void {
  disposeAutoRowHeightMeasurement(input.host);
  if (!input.cache || !input.virtualWindow || !input.onMeasured) {
    return;
  }

  let frame: number | undefined;
  const scheduleMeasure = (): void => {
    if (frame !== undefined) {
      return;
    }
    frame = requestAnimationFrame(() => {
      frame = undefined;
      measureAutoRowHeights(input);
    });
  };
  const rows = getMeasurableRows(input.viewport);
  const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(scheduleMeasure);
  rows.forEach((row) => observer?.observe(row));
  frame = requestAnimationFrame(() => {
    frame = undefined;
    measureAutoRowHeights(input);
  });
  handles.set(input.host, { observer, frame });
}

export function disposeAutoRowHeightMeasurement(host: HTMLElement): void {
  const handle = handles.get(host);
  if (!handle) {
    return;
  }

  if (handle.frame !== undefined) {
    cancelAnimationFrame(handle.frame);
  }
  handle.observer?.disconnect();
  handles.delete(host);
}

export function measureAutoRowHeights(input: AutoRowHeightMeasurementInput): void {
  const rows = getMeasurableRows(input.viewport);
  let changed = false;
  let scrollTopAdjustment = 0;

  rows.forEach((row) => {
    const rowIndex = getRowIndex(row);
    if (rowIndex === undefined) {
      return;
    }

    const height = measureAutoHeightRow(row);
    if (height === undefined) {
      return;
    }

    const previousHeight = input.cache?.get(rowIndex) ?? input.cache?.defaultRowHeight ?? height;
    if (Math.abs(previousHeight - height) < 1) {
      return;
    }

    input.cache?.set(rowIndex, height);
    changed = true;
    if (rowIndex < (input.virtualWindow?.visibleFirstRow ?? 0)) {
      scrollTopAdjustment += height - previousHeight;
    }
  });

  if (!changed) {
    return;
  }

  input.onMeasured?.({
    changed,
    scrollTopAdjustment,
    viewportHeight: input.viewport.clientHeight
  });
}

function getMeasurableRows(viewport: HTMLElement): HTMLElement[] {
  return Array.from(viewport.querySelectorAll<HTMLElement>(
    '[data-layout-section="body"] [data-layout-pane="center"] .og-grid__row--auto-height[data-row-key]'
  ));
}

function measureAutoHeightRow(row: HTMLElement): number | undefined {
  const cells = Array.from(row.querySelectorAll<HTMLElement>(".og-grid__cell"))
    .filter(isCellEligibleForAutoHeightMeasurement);
  const measuredCellHeight = cells.reduce((height, cell) => {
    const cellHeight = measureCellIntrinsicHeight(cell) ?? 0;
    return Math.max(height, cellHeight);
  }, 0);
  const measuredHeight = measuredCellHeight > 0
    ? measuredCellHeight
    : normalizeMeasuredHeight(row.getBoundingClientRect().height);

  return measuredHeight === undefined ? undefined : Math.max(measuredHeight, AUTO_ROW_RENDER_FALLBACK_HEIGHT);
}

function isCellEligibleForAutoHeightMeasurement(cell: HTMLElement): boolean {
  if (cell.classList.contains("og-grid__cell--merged-covered")) {
    return false;
  }

  const rowSpan = Number(cell.getAttribute("aria-rowspan") ?? "1");
  return !Number.isFinite(rowSpan) || rowSpan <= 1;
}

function measureCellIntrinsicHeight(cell: HTMLElement): number | undefined {
  const rect = cell.getBoundingClientRect();
  if (!Number.isFinite(rect.width) || rect.width <= 0) {
    return undefined;
  }

  const clone = cell.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  clone.removeAttribute("role");
  clone.style.blockSize = "auto";
  clone.style.inlineSize = `${rect.width}px`;
  clone.style.insetBlockStart = "0";
  clone.style.insetInlineStart = "0";
  clone.style.minBlockSize = "0";
  clone.style.pointerEvents = "none";
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.zIndex = "-1";
  cell.parentElement?.append(clone);
  const height = normalizeMeasuredHeight(clone.getBoundingClientRect().height);
  clone.remove();
  return height;
}

function getRowIndex(row: HTMLElement): number | undefined {
  const rowIndex = Number(row.getAttribute("aria-rowindex")) - 1;
  return Number.isFinite(rowIndex) && rowIndex >= 0 ? rowIndex : undefined;
}

function normalizeMeasuredHeight(height: number): number | undefined {
  return Number.isFinite(height) && height > 0 ? Math.ceil(height) : undefined;
}
