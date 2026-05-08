import { watch } from "vue";
import type { OneGridProps } from "./gridOptions.js";

export function watchGridProps(
  props: Readonly<OneGridProps>,
  remount: () => void
): void {
  watch(
    () => [
      props.columns,
      props.initialState,
      props.columnOrder,
      props.columnState,
      props.columnUi,
      props.headerMerge,
      props.data,
      props.dataSource,
      props.rowKey,
      props.rowModel,
      props.rowHeight,
      props.width,
      props.height,
      props.bodyHeight,
      props.headerHeight,
      props.infinite,
      props.server,
      props.viewport,
      props.tree,
      props.layout,
      props.virtualization,
      props.frozenRows,
      props.frozenColumns,
      props.editing,
      props.clipboard,
      props.export,
      props.import,
      props.contextMenu,
      props.filtering,
      props.sorting,
      props.selection,
      props.grouping,
      props.aggregation,
      props.pivot,
      props.summary,
      props.merge,
      props.pagination,
      props.accessibility,
      props.security,
      props.locale,
      props.theme,
      props.events,
      props.plugins
    ],
    remount,
    { deep: true }
  );
}
