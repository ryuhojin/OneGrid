import type {
  CellEditSession,
  GridOptions,
  NormalizedDataColumn
} from "@onegrid/core";
import type { CellEditorOverlay } from "./editorOverlay.js";

export interface DomGridOptions<TData = unknown> extends GridOptions<TData> {
  readonly el: HTMLElement;
}

export interface ActiveDomEdit<TData> {
  readonly session: CellEditSession<TData>;
  readonly overlay: CellEditorOverlay;
}

export interface ResolvedEditableCell<TData> {
  readonly row: TData;
  readonly rowIndex: number;
  readonly rowKey: string | number;
  readonly sourceIndex?: number;
  readonly column: NormalizedDataColumn<TData>;
  readonly value: unknown;
}
