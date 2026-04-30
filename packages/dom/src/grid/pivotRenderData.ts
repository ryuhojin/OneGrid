import {
  createClientPivotModel,
  createClientRowModel
} from "@onegrid/core";
import type { ClientPivotMeta, ColumnDef } from "@onegrid/core";
import type { DomGridOptions } from "./OneGrid.js";

export interface PivotRenderData<TData> {
  readonly options: DomGridOptions<TData>;
  readonly meta?: ClientPivotMeta;
}

export function createPivotRenderData<TData>(
  options: DomGridOptions<TData>,
  hasRemoteRows: boolean
): PivotRenderData<TData> {
  const pivotModel = options.pivot?.model;
  if (
    hasRemoteRows ||
    options.pivot?.enabled === false ||
    options.pivot?.serverOnly === true ||
    pivotModel === undefined ||
    !Array.isArray(options.data)
  ) {
    return { options };
  }

  const filterModel = options.filtering?.enabled === false || options.filtering?.serverOnly === true
    ? undefined
    : options.filtering?.model;
  const sortModel = options.sorting?.enabled === false || options.sorting?.serverOnly === true
    ? undefined
    : options.sorting?.model;
  const clientRows = createClientRowModel(options.data, {
    ...(options.rowKey === undefined ? {} : { rowKey: options.rowKey }),
    columns: options.columns,
    ...(filterModel === undefined ? {} : { filterModel }),
    ...(sortModel === undefined ? {} : { sortModel })
  });
  const pivot = createClientPivotModel(
    clientRows.sortedRows.map((row) => row.data),
    options.columns,
    pivotModel
  );
  if (!pivot) {
    return { options };
  }

  const baseOptions = omitClientPipelineOptions(options);
  return {
    meta: pivot.meta,
    options: {
      ...baseOptions,
      columns: pivot.columns as readonly ColumnDef<TData>[],
      data: pivot.rows as readonly TData[],
      rowKey: pivot.rowKey,
      rowModel: "client"
    }
  };
}

function omitClientPipelineOptions<TData>(
  options: DomGridOptions<TData>
): DomGridOptions<TData> {
  const next = { ...options };
  delete next.aggregation;
  delete next.filtering;
  delete next.grouping;
  delete next.sorting;
  delete next.summary;
  return next;
}
