import { InfiniteRequestController } from "./infiniteCancellation.js";
import type { InfiniteRowModelOptions } from "./infiniteTypes.js";
import type { GetRowsRequest } from "../types/data.js";

const EMPTY_FILTER_MODEL = Object.freeze({});
const EMPTY_GROUP_MODEL = Object.freeze({});

export interface InfiniteBlockRequest {
  readonly request: GetRowsRequest;
  readonly controller: InfiniteRequestController;
}

export function createInfiniteBlockRequest<TData>(
  options: InfiniteRowModelOptions<TData>,
  blockIndex: number,
  blockSize: number,
  requestId: string
): InfiniteBlockRequest {
  const startRow = blockIndex * blockSize;
  const endRow = startRow + blockSize;
  const controller = new InfiniteRequestController();

  return {
    controller,
    request: {
      rowModel: "infinite",
      startRow,
      endRow,
      sortModel: options.sortModel ?? [],
      filterModel: options.filterModel ?? EMPTY_FILTER_MODEL,
      groupModel: options.groupModel ?? EMPTY_GROUP_MODEL,
      groupKeys: [],
      ...(options.aggregateModel === undefined ? {} : { aggregateModel: options.aggregateModel }),
      signal: controller.signal,
      requestId
    }
  };
}
