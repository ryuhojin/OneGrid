import type {
  ClientGroupFooterRowEntry,
  ClientGroupRowEntry,
  NormalizedDataColumn,
  SummaryDef,
  SummaryKind
} from "@onegrid/core";

export interface GroupRowRuntime {
  onToggleGroup(groupKey: string, expanded: boolean): void;
}

export interface GroupRowRenderOptions<TData> {
  readonly entry: ClientGroupRowEntry;
  readonly rowIndex: number;
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly columnTemplate: string;
  readonly ariaColumnOffset: number;
  readonly renderLabel: boolean;
  readonly exposeRowKey: boolean;
  readonly runtime?: GroupRowRuntime;
}

export interface GroupFooterRenderOptions<TData> {
  readonly entry: ClientGroupFooterRowEntry;
  readonly rowIndex: number;
  readonly columns: readonly NormalizedDataColumn<TData>[];
  readonly columnTemplate: string;
  readonly ariaColumnOffset: number;
  readonly renderLabel: boolean;
  readonly exposeRowKey: boolean;
}

export function createGroupRow<TData>(options: GroupRowRenderOptions<TData>): HTMLElement {
  const row = createRow(
    "og-grid__row og-grid__group-row",
    options.columnTemplate,
    options.rowIndex,
    options.entry.key,
    options.exposeRowKey
  );
  if (options.columns.length === 0) {
    return row;
  }

  const cell = document.createElement("div");
  cell.className = "og-grid__group-cell";
  cell.style.gridColumn = `1 / span ${options.columns.length}`;
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-colindex", String(options.ariaColumnOffset + 1));
  cell.setAttribute("aria-colspan", String(options.columns.length));
  cell.dataset.groupKey = options.entry.key;

  if (options.renderLabel) {
    appendGroupLabel(cell, options.entry, options.runtime);
  }

  row.append(cell);
  return row;
}

export function createGroupFooterRow<TData>(
  options: GroupFooterRenderOptions<TData>
): HTMLElement {
  const row = createRow(
    "og-grid__row og-grid__group-footer-row",
    options.columnTemplate,
    options.rowIndex,
    options.entry.key,
    options.exposeRowKey
  );

  options.columns.forEach((column, columnIndex) => {
    row.append(createGroupFooterCell(column, columnIndex, options));
  });

  return row;
}

function createGroupFooterCell<TData>(
  column: NormalizedDataColumn<TData>,
  columnIndex: number,
  options: GroupFooterRenderOptions<TData>
): HTMLElement {
  const cell = document.createElement("div");
  cell.className = getCellClassName("og-grid__cell og-grid__group-footer-cell", column);
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-colindex", String(options.ariaColumnOffset + columnIndex + 1));
  cell.dataset.columnId = column.id;

  const aggregate = readGroupAggregate(column, options.entry.aggregateValues);
  if (aggregate) {
    cell.dataset.groupAggregateKey = aggregate.key;
    cell.dataset.groupAggregateValue = aggregate.value;
    cell.append(createInlineLabel(aggregate.label), createInlineValue(aggregate.value));
  } else if (options.renderLabel && columnIndex === 0) {
    const label = `${formatCellValue(options.entry.value)} subtotal`;
    cell.classList.add("og-grid__group-footer-label-cell");
    cell.textContent = label;
    cell.title = label;
  }

  return cell;
}

function appendGroupLabel(
  cell: HTMLElement,
  entry: ClientGroupRowEntry,
  runtime: GroupRowRuntime | undefined
): void {
  if (runtime) {
    cell.append(createGroupToggle(entry, runtime));
  }

  const label = document.createElement("span");
  label.className = "og-grid__group-label";
  label.textContent = formatGroupSummary(entry);
  cell.title = formatGroupTitle(entry);
  cell.append(label);

  const aggregates = createGroupAggregateList(entry);
  if (aggregates) {
    cell.append(aggregates);
  }
}

function createGroupToggle(
  entry: ClientGroupRowEntry,
  runtime: GroupRowRuntime
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "og-grid__group-toggle";
  button.textContent = entry.expanded ? "-" : "+";
  button.setAttribute("aria-expanded", String(entry.expanded));
  button.setAttribute(
    "aria-label",
    `${entry.expanded ? "Collapse" : "Expand"} ${formatCellValue(entry.value)} group`
  );
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    runtime.onToggleGroup(entry.key, entry.expanded);
  });
  return button;
}

function createRow(
  className: string,
  columnTemplate: string,
  rowIndex: number,
  rowKey: string,
  exposeRowKey: boolean
): HTMLElement {
  const row = document.createElement("div");
  row.className = className;
  row.style.gridTemplateColumns = columnTemplate;
  row.setAttribute("role", "row");
  row.setAttribute("aria-rowindex", String(rowIndex + 1));
  if (exposeRowKey) {
    row.dataset.rowKey = rowKey;
  }
  return row;
}

function readGroupAggregate<TData>(
  column: NormalizedDataColumn<TData>,
  values: Readonly<Record<string, unknown>>
): { readonly key: string; readonly label: string; readonly value: string } | undefined {
  const summary = column.source.summary;
  if (!summary) {
    return undefined;
  }

  for (const key of getAggregateKeys(summary, column.field)) {
    if (Object.hasOwn(values, key)) {
      return {
        key,
        label: getSummaryLabel(summary),
        value: formatSummaryValue(values[key])
      };
    }
  }

  return undefined;
}

function getAggregateKeys<TData>(
  summary: SummaryKind | SummaryDef<TData>,
  field: string
): readonly string[] {
  const kind = typeof summary === "string" ? summary : summary.kind;
  const summaryField = typeof summary === "string" ? field : summary.field ?? field;
  return [
    ...(typeof summary === "object" && summary.aggregateKey ? [summary.aggregateKey] : []),
    `${kind}:${summaryField}`,
    `${summaryField}:${kind}`
  ];
}

function createGroupAggregateList(entry: ClientGroupRowEntry): HTMLElement | undefined {
  const aggregates = Object.entries(entry.aggregateValues);
  if (aggregates.length === 0) {
    return undefined;
  }

  const list = document.createElement("span");
  list.className = "og-grid__group-aggregate-list";

  for (const [key, value] of aggregates) {
    const chip = document.createElement("span");
    chip.className = "og-grid__group-aggregate-chip";
    chip.dataset.groupSummaryKey = key;
    chip.dataset.groupSummaryValue = formatCellValue(value);
    chip.textContent = `${formatAggregateLabel(key)} ${formatCellValue(value)}`;
    list.append(chip);
  }

  return list;
}

function formatGroupSummary(entry: ClientGroupRowEntry): string {
  return `${entry.field}: ${formatCellValue(entry.value)} (${entry.childCount} rows)`;
}

function formatGroupTitle(entry: ClientGroupRowEntry): string {
  const aggregateText = Object.entries(entry.aggregateValues)
    .map(([key, value]) => `${formatAggregateLabel(key)} ${formatCellValue(value)}`);
  return [formatGroupSummary(entry), ...aggregateText].join(" | ");
}

function formatAggregateLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_:]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getSummaryLabel<TData>(summary: SummaryKind | SummaryDef<TData>): string {
  if (typeof summary === "object" && summary.label) {
    return summary.label;
  }

  const kind = typeof summary === "string" ? summary : summary.kind;
  if (kind === "distinct-count") return "Distinct";
  if (kind === "count") return "Count";
  if (kind === "sum") return "Sum";
  if (kind === "avg") return "Avg";
  if (kind === "min") return "Min";
  if (kind === "max") return "Max";
  return "Summary";
}

function createInlineLabel(label: string): HTMLElement {
  const element = document.createElement("span");
  element.className = "og-grid__summary-label";
  element.textContent = label;
  return element;
}

function createInlineValue(value: string): HTMLElement {
  const element = document.createElement("span");
  element.className = "og-grid__summary-value";
  element.textContent = value;
  return element;
}

function getCellClassName<TData>(baseClassName: string, column: NormalizedDataColumn<TData>): string {
  return column.pinned ? `${baseClassName} ${baseClassName}--pinned-${column.pinned}` : baseClassName;
}

function formatCellValue(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatSummaryValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  return String(value);
}
