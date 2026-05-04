import type { GridOptions } from "@onegrid/core";
import type { OneGridEventProps } from "./gridEvents.js";
import { createGridEventHandlers, getEventPropDeps } from "./gridEvents.js";
import type { ReactRendererBridge, ReactRendererSlots } from "./reactRendererBridge.js";

export interface OneGridOptionProps<TData = unknown> extends GridOptions<TData> {
  readonly reactRenderers?: ReactRendererSlots<TData>;
}

export function createReactGridOptions<TData>(
  props: OneGridOptionProps<TData> & OneGridEventProps<TData>,
  bridge: ReactRendererBridge<TData>
): GridOptions<TData> {
  const events = createGridEventHandlers(props.events, props);
  return {
    columns: bridge.enhanceColumns(props.columns, props.reactRenderers),
    ...(props.columnOrder === undefined ? {} : { columnOrder: props.columnOrder }),
    ...(props.columnState === undefined ? {} : { columnState: props.columnState }),
    ...(props.columnUi === undefined ? {} : { columnUi: props.columnUi }),
    ...(props.headerMerge === undefined ? {} : { headerMerge: props.headerMerge }),
    ...(props.data === undefined ? {} : { data: props.data }),
    ...(props.dataSource === undefined ? {} : { dataSource: props.dataSource }),
    ...(props.rowModel === undefined ? {} : { rowModel: props.rowModel }),
    ...(props.infinite === undefined ? {} : { infinite: props.infinite }),
    ...(props.server === undefined ? {} : { server: props.server }),
    ...(props.viewport === undefined ? {} : { viewport: props.viewport }),
    ...(props.rowKey === undefined ? {} : { rowKey: props.rowKey }),
    ...(props.width === undefined ? {} : { width: props.width }),
    ...(props.height === undefined ? {} : { height: props.height }),
    ...(props.bodyHeight === undefined ? {} : { bodyHeight: props.bodyHeight }),
    ...(props.layout === undefined ? {} : { layout: props.layout }),
    ...(props.virtualization === undefined ? {} : { virtualization: props.virtualization }),
    ...(props.rowHeight === undefined ? {} : { rowHeight: props.rowHeight }),
    ...(props.headerHeight === undefined ? {} : { headerHeight: props.headerHeight }),
    ...(props.frozenRows === undefined ? {} : { frozenRows: props.frozenRows }),
    ...(props.frozenColumns === undefined ? {} : { frozenColumns: props.frozenColumns }),
    ...(props.selection === undefined ? {} : { selection: props.selection }),
    ...(props.editing === undefined ? {} : { editing: props.editing }),
    ...(props.filtering === undefined ? {} : { filtering: props.filtering }),
    ...(props.sorting === undefined ? {} : { sorting: props.sorting }),
    ...(props.grouping === undefined ? {} : { grouping: props.grouping }),
    ...(props.aggregation === undefined ? {} : { aggregation: props.aggregation }),
    ...(props.pivot === undefined ? {} : { pivot: props.pivot }),
    ...(props.summary === undefined ? {} : { summary: props.summary }),
    ...(props.tree === undefined ? {} : { tree: props.tree }),
    ...(props.merge === undefined ? {} : { merge: props.merge }),
    ...(props.pagination === undefined ? {} : { pagination: props.pagination }),
    ...(props.clipboard === undefined ? {} : { clipboard: props.clipboard }),
    ...(props.export === undefined ? {} : { export: props.export }),
    ...(props.import === undefined ? {} : { import: props.import }),
    ...(props.contextMenu === undefined ? {} : { contextMenu: props.contextMenu }),
    ...(props.accessibility === undefined ? {} : { accessibility: props.accessibility }),
    ...(props.security === undefined ? {} : { security: props.security }),
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.locale === undefined ? {} : { locale: props.locale }),
    ...(props.plugins === undefined ? {} : { plugins: props.plugins }),
    ...(events === undefined ? {} : { events })
  };
}

export function getGridOptionDeps<TData>(
  props: OneGridOptionProps<TData> & OneGridEventProps<TData>
): readonly unknown[] {
  return [
    props.columns,
    props.columnOrder,
    props.columnState,
    props.columnUi,
    props.headerMerge,
    props.data,
    props.dataSource,
    props.rowModel,
    props.infinite,
    props.server,
    props.viewport,
    props.rowKey,
    props.width,
    props.height,
    props.bodyHeight,
    props.layout,
    props.virtualization,
    props.rowHeight,
    props.headerHeight,
    props.frozenRows,
    props.frozenColumns,
    props.selection,
    props.editing,
    props.filtering,
    props.sorting,
    props.grouping,
    props.aggregation,
    props.pivot,
    props.summary,
    props.tree,
    props.merge,
    props.pagination,
    props.clipboard,
    props.export,
    props.import,
    props.contextMenu,
    props.accessibility,
    props.security,
    props.theme,
    props.locale,
    props.plugins,
    props.events,
    props.reactRenderers,
    ...getEventPropDeps(props)
  ];
}
