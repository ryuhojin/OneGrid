import { createServerRequestKey } from "./serverSerialization.js";
import type { ServerRowModelOptions, ServerRowRequestState } from "./serverTypes.js";
import type { GetRowsRequest } from "../types/data.js";

const EMPTY_FILTER_MODEL = Object.freeze({});
const EMPTY_GROUP_MODEL = Object.freeze({});

export interface ServerRowsRequest {
  readonly cacheKey: string;
  readonly request: GetRowsRequest;
}

export function createServerRowsRequest<TData>(
  options: ServerRowModelOptions<TData>,
  state: ServerRowRequestState
): ServerRowsRequest {
  const startRow = state.page * state.pageSize;
  const endRow = startRow + state.pageSize;
  const groupKeys = state.groupKeys ?? options.groupKeys;
  const cacheKey = createServerRequestKey({
    page: state.page,
    pageSize: state.pageSize,
    ...(state.cursor === undefined ? {} : { cursor: state.cursor }),
    ...(options.sortModel === undefined ? {} : { sortModel: options.sortModel }),
    ...(options.filterModel === undefined ? {} : { filterModel: options.filterModel }),
    ...(options.groupModel === undefined ? {} : { groupModel: options.groupModel }),
    ...(groupKeys === undefined ? {} : { groupKeys }),
    ...(options.aggregateModel === undefined ? {} : { aggregateModel: options.aggregateModel }),
    ...(options.pivotModel === undefined ? {} : { pivotModel: options.pivotModel }),
    ...(options.snapshotVersion === undefined ? {} : { snapshotVersion: options.snapshotVersion })
  });

  return {
    cacheKey,
    request: {
      rowModel: "server",
      startRow,
      endRow,
      page: state.page,
      pageSize: state.pageSize,
      ...(state.cursor === undefined ? {} : { cursor: state.cursor }),
      sortModel: options.sortModel ?? [],
      filterModel: options.filterModel ?? EMPTY_FILTER_MODEL,
      groupModel: options.groupModel ?? EMPTY_GROUP_MODEL,
      groupKeys: groupKeys ?? [],
      ...(options.pivotModel === undefined ? {} : { pivotModel: options.pivotModel }),
      ...(options.aggregateModel === undefined ? {} : { aggregateModel: options.aggregateModel }),
      requestId: state.requestId,
      ...(options.snapshotVersion === undefined ? {} : { snapshotVersion: options.snapshotVersion })
    }
  };
}
