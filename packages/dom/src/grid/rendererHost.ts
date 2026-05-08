import type {
  CellContext,
  HeaderContext,
  LocaleFormatterBridge,
  RenderElement,
  RenderElementBuilder,
  RowKey,
  SecurityOptions
} from "@onegrid/core";
import type { HeaderCell, NormalizedColumn, NormalizedDataColumn } from "@onegrid/core";
import { applySafeAttribute, getSafeTagName, renderSanitizedHtml } from "./htmlSecurity.js";

export interface CellRendererHostInput<TData> {
  readonly cell: HTMLElement;
  readonly rowData: TData;
  readonly rowKey: RowKey;
  readonly rowIndex: number;
  readonly column: NormalizedDataColumn<TData>;
  readonly value: unknown;
  readonly security?: SecurityOptions;
  readonly i18n: LocaleFormatterBridge;
}

export interface HeaderRendererHostInput<TData> {
  readonly host: HTMLElement;
  readonly cell: HeaderCell;
  readonly column: NormalizedColumn<TData> | undefined;
  readonly security?: SecurityOptions;
}

export function renderCellHost<TData>(input: CellRendererHostInput<TData>): void {
  const context = createCellContext(input);
  applyCellDecoration(input.cell, input.column, context);

  const renderer = input.column.source.renderer;
  if (!renderer) {
    input.cell.textContent = formatDefaultCellValue(input.column, context);
    return;
  }

  if (renderer.kind === "html") {
    renderHtml(input.cell, renderer.render(context), input.security);
    return;
  }

  if (renderer.kind === "element") {
    input.cell.replaceChildren(createElement(renderer.render(context, elementBuilder), input.security));
    return;
  }

  input.cell.textContent = renderer.render(context);
}

export function renderHeaderHost<TData>(input: HeaderRendererHostInput<TData>): void {
  const renderer = input.column?.source.headerRenderer;

  if (!renderer) {
    input.host.textContent = input.cell.headerName;
    return;
  }

  const column = input.column;
  if (!column) {
    input.host.textContent = input.cell.headerName;
    return;
  }

  const context: HeaderContext<TData> = {
    column: column.source,
    columnId: column.id,
    depth: input.cell.depth
  };
  const rendered = renderer.render(context, renderer.kind === "element" ? elementBuilder : undefined);
  if (typeof rendered === "string") {
    input.host.textContent = rendered;
    return;
  }

  input.host.replaceChildren(createElement(rendered, input.security));
}

export function readCellValue<TData>(
  rowData: TData,
  rowKey: RowKey,
  rowIndex: number,
  column: NormalizedDataColumn<TData>
): unknown {
  if (column.source.valueGetter) {
    return column.source.valueGetter({ row: rowData, rowIndex, rowKey });
  }

  return readField(rowData, column.field);
}

function createCellContext<TData>(input: CellRendererHostInput<TData>): CellContext<TData> {
  return {
    ...input.i18n,
    row: input.rowData,
    rowIndex: input.rowIndex,
    rowKey: input.rowKey,
    column: input.column.source,
    columnId: input.column.id,
    field: input.column.field,
    value: input.value,
    position: {
      rowIndex: input.rowIndex,
      columnId: input.column.id,
      field: input.column.field,
      rowKey: input.rowKey
    }
  };
}

function formatDefaultCellValue<TData>(
  column: NormalizedDataColumn<TData>,
  context: CellContext<TData>
): string {
  if (column.source.formatter) {
    return column.source.formatter(context);
  }

  return formatUnknown(context.value);
}

function applyCellDecoration<TData>(
  cell: HTMLElement,
  column: NormalizedDataColumn<TData>,
  context: CellContext<TData>
): void {
  const className = typeof column.source.className === "function"
    ? column.source.className(context)
    : column.source.className;
  if (className) {
    cell.classList.add(...className.split(/\s+/u).filter(Boolean));
  }

  const style = typeof column.source.style === "function"
    ? column.source.style(context)
    : column.source.style;
  if (style) {
    for (const [property, value] of Object.entries(style)) {
      cell.style.setProperty(property, String(value));
    }
  }
}

function renderHtml(cell: HTMLElement, html: string, security: SecurityOptions | undefined): void {
  renderSanitizedHtml(cell, html, security);
}

const elementBuilder: RenderElementBuilder = {
  element(tagName, attributes, children) {
    return {
      tagName,
      ...(attributes === undefined ? {} : { attributes }),
      ...(children === undefined ? {} : { children })
    };
  }
};

function createElement(spec: RenderElement, security: SecurityOptions | undefined): HTMLElement {
  const tagName = getSafeTagName(spec.tagName);
  const element = document.createElement(tagName);
  for (const [name, value] of Object.entries(spec.attributes ?? {})) {
    applySafeAttribute(element, name, value, security);
  }

  for (const child of spec.children ?? []) {
    element.append(typeof child === "string" ? document.createTextNode(child) : createElement(child, security));
  }

  return element;
}

function readField(row: unknown, field: string): unknown {
  if (row === null || typeof row !== "object") {
    return undefined;
  }

  return (row as Readonly<Record<string, unknown>>)[field];
}

function formatUnknown(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}
