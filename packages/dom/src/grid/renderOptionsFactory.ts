import {
  isFilterModelEmpty
} from "@onegrid/core";
import type {
  ColumnUiState,
  FilterModel,
  GroupModel,
  SortModel,
  ThemeOptions
} from "@onegrid/core";
import type { DomGridOptions } from "./oneGridTypes.js";

export interface RenderOptionsInput<TData> {
  readonly options: DomGridOptions<TData>;
  readonly dataRows?: readonly TData[] | undefined;
  readonly columnState: ColumnUiState;
  readonly sortModel: readonly SortModel[];
  readonly filterModel: FilterModel;
  readonly groupModel: GroupModel;
  readonly serverGroupKeys: readonly string[];
  readonly paginationPage: number;
  readonly paginationPageSize: number;
  readonly locale: string;
  readonly theme?: ThemeOptions | undefined;
}

export function createRenderOptions<TData>(
  input: RenderOptionsInput<TData>
): DomGridOptions<TData> {
  const sorting = getSortingOptions(input.options, input.sortModel);
  const filtering = getFilteringOptions(input.options, input.filterModel);
  const grouping = getGroupingOptions(input.options, input.groupModel);
  const server = getServerOptions(input);
  const pagination = getPaginationOptions(input);
  return {
    ...input.options,
    locale: input.locale,
    ...(input.theme === undefined ? {} : { theme: input.theme }),
    ...(input.dataRows === undefined ? {} : { data: input.dataRows }),
    columnState: input.columnState,
    ...(sorting === undefined ? {} : { sorting }),
    ...(filtering === undefined ? {} : { filtering }),
    ...(grouping === undefined ? {} : { grouping }),
    ...(server === undefined ? {} : { server }),
    ...(pagination === undefined ? {} : { pagination })
  };
}

function getSortingOptions<TData>(
  options: DomGridOptions<TData>,
  sortModel: readonly SortModel[]
): DomGridOptions<TData>["sorting"] {
  return options.sorting === undefined && sortModel.length === 0
    ? undefined
    : { ...options.sorting, model: sortModel };
}

function getFilteringOptions<TData>(
  options: DomGridOptions<TData>,
  filterModel: FilterModel
): DomGridOptions<TData>["filtering"] {
  return options.filtering === undefined && isFilterModelEmpty(filterModel)
    ? undefined
    : { ...options.filtering, model: filterModel };
}

function getGroupingOptions<TData>(
  options: DomGridOptions<TData>,
  groupModel: GroupModel
): DomGridOptions<TData>["grouping"] {
  return options.grouping === undefined && groupModel.fields === undefined
    ? undefined
    : { ...options.grouping, model: groupModel };
}

function getServerOptions<TData>(
  input: RenderOptionsInput<TData>
): DomGridOptions<TData>["server"] {
  if (input.options.server === undefined && input.serverGroupKeys.length === 0) {
    return undefined;
  }

  const paginationMode = input.options.pagination?.mode;
  const usesPagination = paginationMode === "server" || paginationMode === "cursor";
  return {
    ...input.options.server,
    groupKeys: input.serverGroupKeys,
    ...(usesPagination ? { pageSize: input.paginationPageSize } : {})
  };
}

function getPaginationOptions<TData>(
  input: RenderOptionsInput<TData>
): DomGridOptions<TData>["pagination"] {
  return input.options.pagination === undefined
    ? undefined
    : {
        ...input.options.pagination,
        page: input.paginationPage,
        pageSize: input.paginationPageSize
      };
}
