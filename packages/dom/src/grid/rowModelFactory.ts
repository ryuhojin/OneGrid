import {
  InfiniteRowModel,
  ServerRowModel,
  TreeRowModel,
  ViewportRowModel
} from "@onegrid/core";
import {
  createInfiniteRowModelOptions,
  createServerRowModelOptions,
  createTreeRowModelOptions,
  createViewportRowModelOptions
} from "./rowModelOptions.js";
import type { DomGridOptions } from "./OneGrid.js";

export function createDomInfiniteRowModel<TData>(
  options: DomGridOptions<TData>
): InfiniteRowModel<TData> | undefined {
  return options.rowModel === "infinite" && options.dataSource
    ? new InfiniteRowModel<TData>(createInfiniteRowModelOptions(options))
    : undefined;
}

export function createDomServerRowModel<TData>(
  options: DomGridOptions<TData>
): ServerRowModel<TData> | undefined {
  return options.rowModel === "server" && options.dataSource
    ? new ServerRowModel<TData>(createServerRowModelOptions(options))
    : undefined;
}

export function createDomViewportRowModel<TData>(
  options: DomGridOptions<TData>
): ViewportRowModel<TData> | undefined {
  return options.rowModel === "viewport" && options.dataSource
    ? new ViewportRowModel<TData>(createViewportRowModelOptions(options))
    : undefined;
}

export function createDomTreeRowModel<TData>(
  options: DomGridOptions<TData>
): TreeRowModel<TData> | undefined {
  return options.rowModel === "tree"
    ? new TreeRowModel<TData>(
      Array.isArray(options.data) ? options.data : [],
      createTreeRowModelOptions(options)
    )
    : undefined;
}
