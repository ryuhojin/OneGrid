import type { ViewportRowModelOptions } from "./viewportTypes.js";
import type { GetRowsRequest } from "../types/data.js";
import type { ViewportRange } from "../types/shared.js";

const EMPTY_FILTER_MODEL = Object.freeze({});
const EMPTY_GROUP_MODEL = Object.freeze({});

export function createViewportRowsRequest<TData>(
  options: ViewportRowModelOptions<TData>,
  visibleRange: ViewportRange,
  requestedRange: ViewportRange,
  requestId: string
): GetRowsRequest {
  return {
    rowModel: "viewport",
    startRow: requestedRange.firstRow,
    endRow: requestedRange.lastRow + 1,
    sortModel: options.sortModel ?? [],
    filterModel: options.filterModel ?? EMPTY_FILTER_MODEL,
    groupModel: options.groupModel ?? EMPTY_GROUP_MODEL,
    groupKeys: [],
    viewport: visibleRange,
    ...(options.aggregateModel === undefined ? {} : { aggregateModel: options.aggregateModel }),
    ...(options.pivotModel === undefined ? {} : { pivotModel: options.pivotModel }),
    requestId,
    ...(options.snapshotVersion === undefined ? {} : { snapshotVersion: options.snapshotVersion })
  };
}
