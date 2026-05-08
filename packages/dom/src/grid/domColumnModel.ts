import { createColumnModel } from "@onegrid/core";
import type { ColumnModel } from "@onegrid/core";
import type { DomGridOptions } from "./oneGridTypes.js";

export function createDomColumnModel<TData>(
  options: DomGridOptions<TData>
): ColumnModel<TData> {
  return createColumnModel(options.columns, {
    ...(options.defaultColumnDef === undefined ? {} : { defaultColumnDef: options.defaultColumnDef }),
    ...(options.columnTypes === undefined ? {} : { columnTypes: options.columnTypes }),
    ...(options.columnOrder === undefined ? {} : { columnOrder: options.columnOrder }),
    ...(options.columnState === undefined ? {} : { columnState: options.columnState })
  });
}
