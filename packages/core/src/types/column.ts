import type {
  CellPosition,
  ColumnId,
  ColumnTypeReference,
  EditorKind,
  EditStartMode,
  FilterKind,
  PinnedSide,
  RowKey,
  SummaryKind
} from "./shared.js";
import type { LocaleFormatterBridge } from "../i18n/localeTypes.js";

export type ColumnDef<TData = unknown> = DataColumnDef<TData> | ColumnGroupDef<TData>;

export type DataColumnDefaults<TData = unknown> = Partial<
  Omit<DataColumnDef<TData>, "columnId" | "id" | "field">
>;

export type ColumnTypeDef<TData = unknown> = DataColumnDefaults<TData>;

export type ColumnTypeRegistry<TData = unknown> = Readonly<Record<string, ColumnTypeDef<TData>>>;

export interface DataColumnDef<TData = unknown> {
  readonly columnId?: ColumnId;
  readonly id?: ColumnId;
  readonly field?: string;
  readonly headerName?: string;
  readonly headerTooltip?: string;
  readonly headerRenderer?: HeaderRendererDef<TData>;
  readonly type?: ColumnTypeReference;
  readonly width?: number;
  readonly minWidth?: number;
  readonly maxWidth?: number;
  readonly flex?: number;
  readonly pinned?: PinnedSide;
  readonly hidden?: boolean;
  readonly resizable?: boolean;
  readonly movable?: boolean;
  readonly sortable?: boolean;
  readonly sort?: "asc" | "desc";
  readonly sortComparator?: SortComparator<TData>;
  readonly filter?: FilterKind | FilterOptions<TData>;
  readonly editable?: boolean | EditablePredicate<TData>;
  readonly editor?: EditorKind | EditorDef<TData>;
  readonly editTrigger?: EditStartMode;
  readonly renderer?: CellRendererDef<TData>;
  readonly formatter?: ValueFormatter<TData>;
  readonly parser?: ValueParser<TData>;
  readonly validator?: ValueValidator<TData>;
  readonly valueGetter?: ValueGetter<TData>;
  readonly valueSetter?: ValueSetter<TData>;
  readonly merge?: ColumnMergeOptions<TData>;
  readonly summary?: SummaryKind | SummaryDef<TData>;
  readonly menu?: HeaderMenuOptions;
  readonly className?: string | ClassNameCallback<TData>;
  readonly style?: CellStyle | CellStyleCallback<TData>;
}

export interface ColumnGroupDef<TData = unknown> {
  readonly columnId?: ColumnId;
  readonly groupId?: ColumnId;
  readonly headerName: string;
  readonly children: readonly ColumnDef<TData>[];
  readonly marryChildren?: boolean;
  readonly openByDefault?: boolean;
  readonly pinned?: PinnedSide;
  readonly headerClassName?: string;
  readonly headerRenderer?: HeaderRendererDef<TData>;
}

export interface RowContext<TData = unknown> {
  readonly row: TData;
  readonly rowIndex: number;
  readonly rowKey: RowKey;
}

export interface CellContext<TData = unknown> extends RowContext<TData>, LocaleFormatterBridge {
  readonly column: DataColumnDef<TData>;
  readonly columnId: ColumnId;
  readonly field: string;
  readonly value: unknown;
  readonly position: CellPosition;
}

export interface HeaderContext<TData = unknown> {
  readonly column: ColumnDef<TData>;
  readonly columnId?: ColumnId;
  readonly depth: number;
}

export type EditablePredicate<TData = unknown> = (context: CellContext<TData>) => boolean;

export type ValueGetter<TData = unknown> = (context: RowContext<TData>) => unknown;

export type SortComparator<TData = unknown> = (
  leftValue: unknown,
  rightValue: unknown,
  context: SortComparatorContext<TData>
) => number;

export interface SortComparatorContext<TData = unknown> {
  readonly columnId?: ColumnId;
  readonly field: string;
  readonly leftRow: TData;
  readonly rightRow: TData;
  readonly leftRowIndex: number;
  readonly rightRowIndex: number;
}

export type ValueSetter<TData = unknown> = (
  context: CellContext<TData>,
  nextValue: unknown,
) => TData;

export type ValueFormatter<TData = unknown> = (context: CellContext<TData>) => string;

export type ValueParser<TData = unknown> = (rawValue: unknown, context: CellContext<TData>) => unknown;

export type ValueValidator<TData = unknown> = (
  value: unknown,
  context: CellContext<TData>,
) => readonly string[] | Promise<readonly string[]>;

export interface FilterOptions<TData = unknown> {
  readonly kind: FilterKind;
  readonly operators?: readonly string[];
  readonly serverOnly?: boolean;
  readonly values?: readonly unknown[];
  readonly predicate?: FilterPredicate<TData>;
}

export type FilterPredicate<TData = unknown> = (
  context: FilterPredicateContext<TData>
) => boolean;

export interface FilterPredicateContext<TData = unknown> extends RowContext<TData> {
  readonly columnId: ColumnId;
  readonly field: string;
  readonly column: DataColumnDef<TData>;
  readonly value: unknown;
  readonly filterValue: unknown;
  readonly operator: string;
  readonly custom?: Readonly<Record<string, unknown>>;
}

export interface EditorDef<TData = unknown> {
  readonly kind: EditorKind;
  readonly options?: readonly EditorOption[];
  readonly params?: Readonly<Record<string, unknown>>;
  readonly validate?: ValueValidator<TData>;
}

export interface EditorOption {
  readonly value: unknown;
  readonly label: string;
  readonly disabled?: boolean;
}

export type CellRendererDef<TData = unknown> =
  | CellTextRenderer<TData>
  | CellHtmlRenderer<TData>
  | CellElementRenderer<TData>;

export interface CellTextRenderer<TData = unknown> {
  readonly kind: "text";
  render(context: CellContext<TData>): string;
}

export interface CellHtmlRenderer<TData = unknown> {
  readonly kind: "html";
  readonly sanitize: true;
  render(context: CellContext<TData>): string;
}

export interface CellElementRenderer<TData = unknown> {
  readonly kind: "element";
  render(context: CellContext<TData>, builder: RenderElementBuilder): RenderElement;
}

export interface HeaderRendererDef<TData = unknown> {
  readonly kind: "text" | "element";
  render(context: HeaderContext<TData>, builder?: RenderElementBuilder): string | RenderElement;
}

export interface RenderElement {
  readonly tagName: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly children?: readonly (RenderElement | string)[];
}

export interface RenderElementBuilder {
  element(
    tagName: string,
    attributes?: Readonly<Record<string, string>>,
    children?: readonly (RenderElement | string)[]
  ): RenderElement;
}

export interface ColumnMergeOptions<TData = unknown> {
  readonly mode: "value" | "custom" | "server";
  readonly rowSpan?: number | ((context: CellContext<TData>) => number);
  readonly colSpan?: number | ((context: CellContext<TData>) => number);
}

export interface SummaryDef<TData = unknown> {
  readonly kind: SummaryKind | "custom";
  readonly field?: string;
  readonly label?: string;
  readonly aggregateKey?: string;
  calculate?(rows: readonly TData[]): unknown;
}

export interface HeaderMenuOptions {
  readonly enabled?: boolean;
  readonly items?: readonly string[];
}

export type ClassNameCallback<TData = unknown> = (context: CellContext<TData>) => string;

export type CellStyle = Readonly<Record<string, string | number>>;

export type CellStyleCallback<TData = unknown> = (context: CellContext<TData>) => CellStyle;
