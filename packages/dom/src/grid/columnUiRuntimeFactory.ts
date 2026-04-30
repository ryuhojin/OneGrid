import {
  autoSizeColumn,
  moveColumn,
  moveColumnBefore,
  pinColumn,
  resizeColumn,
  setColumnHidden
} from "@onegrid/core";
import { collectRenderedRows } from "./renderedRows.js";
import type {
  ColumnModel,
  ColumnUiState,
  InfiniteRowEntry,
  ServerRowEntry,
  TreeRowEntry,
  ViewportRowEntry
} from "@onegrid/core";
import type { ColumnUiRuntime } from "./columnControls.js";
import type { DomGridOptions } from "./OneGrid.js";

export interface ColumnUiRuntimeFactoryInput<TData> {
  readonly options: DomGridOptions<TData>;
  readonly columnState: ColumnUiState;
  readonly infiniteEntries: readonly InfiniteRowEntry<TData>[];
  readonly serverEntries: readonly ServerRowEntry<TData>[];
  readonly viewportEntries: readonly ViewportRowEntry<TData>[];
  readonly treeEntries: readonly TreeRowEntry<TData>[];
  setColumnState(state: ColumnUiState): void;
  updateColumnState(updater: (model: ColumnModel<TData>) => ColumnUiState): void;
}

export function createColumnUiRuntime<TData>(
  input: ColumnUiRuntimeFactoryInput<TData>
): ColumnUiRuntime {
  return {
    resizeColumn: (columnId, width) => {
      input.updateColumnState((model) => resizeColumn(model, input.columnState, columnId, width));
    },
    autoSizeColumn: (columnId) => {
      input.updateColumnState((model) =>
        autoSizeColumn(model, input.columnState, columnId, {
          rows: collectRenderedRows(
            input.options,
            input.infiniteEntries,
            input.serverEntries,
            input.viewportEntries,
            input.treeEntries
          )
        })
      );
    },
    hideColumn: (columnId) => {
      input.setColumnState(setColumnHidden(input.columnState, columnId, true));
    },
    showColumn: (columnId) => {
      input.setColumnState(setColumnHidden(input.columnState, columnId, false));
    },
    pinColumn: (columnId, pinned) => {
      input.setColumnState(pinColumn(input.columnState, columnId, pinned));
    },
    moveColumnBefore: (columnId, targetColumnId) => {
      input.updateColumnState((model) =>
        moveColumnBefore(model, input.columnState, columnId, targetColumnId)
      );
    },
    moveColumnByOffset: (columnId, offset) => {
      input.updateColumnState((model) => {
        const currentIndex = model.order.all.indexOf(columnId);
        return currentIndex < 0
          ? input.columnState
          : moveColumn(model, input.columnState, columnId, currentIndex + offset);
      });
    }
  };
}
