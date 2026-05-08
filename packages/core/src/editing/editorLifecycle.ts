import { readField } from "../row/rowIdentity.js";
import { createLocaleFormatter } from "../i18n/index.js";
import { resolveDataColumnId } from "../column/index.js";
import type {
  CellContext,
  DataColumnDef,
  EditorOption,
  ValueValidator
} from "../types/column.js";
import type { EditingOptions } from "../types/grid-options.js";
import type { EditorKind, EditStartMode, RowKey, ValidationIssue } from "../types/shared.js";

export interface StartCellEditInput<TData = unknown> {
  readonly row: TData;
  readonly rowIndex: number;
  readonly rowKey: RowKey;
  readonly column: DataColumnDef<TData>;
  readonly field?: string;
  readonly currentValue?: unknown;
  readonly editing?: EditingOptions;
  readonly startedAt?: number;
  readonly locale?: string;
}

export interface CellEditSession<TData = unknown> {
  readonly id: string;
  readonly row: TData;
  readonly rowIndex: number;
  readonly rowKey: RowKey;
  readonly column: DataColumnDef<TData>;
  readonly columnId: string;
  readonly field: string;
  readonly previousValue: unknown;
  readonly editor: ResolvedEditorDef<TData>;
  readonly startedAt: number;
  readonly locale: string;
}

export interface ResolvedEditorDef<TData = unknown> {
  readonly kind: EditorKind;
  readonly options: readonly EditorOption[];
  readonly params?: Readonly<Record<string, unknown>>;
  readonly validate?: ValueValidator<TData>;
}

export interface ResolvedEditingKeyboardPolicy {
  readonly startOnEnter: boolean;
  readonly commitOnEnter: boolean;
  readonly moveOnTab: boolean;
  readonly commitOnTab: boolean;
  readonly cancelOnEscape: boolean;
  readonly clearOnBackspace: boolean;
}

export interface CommitCellEditInput<TData = unknown> {
  readonly session: CellEditSession<TData>;
  readonly rawValue: unknown;
  readonly validate?: boolean;
  readonly editing?: EditingOptions;
  readonly locale?: string;
}

export interface CellEditCommitResult<TData = unknown> {
  readonly valid: boolean;
  readonly session: CellEditSession<TData>;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly nextRow: TData;
  readonly issues: readonly ValidationIssue[];
}

export interface CellEditCancelResult<TData = unknown> {
  readonly session: CellEditSession<TData>;
  readonly previousValue: unknown;
  readonly reason: string;
}

export function startCellEdit<TData>(
  input: StartCellEditInput<TData>
): CellEditSession<TData> | undefined {
  const columnId = resolveDataColumnId(input.column);
  const field = input.field ?? input.column.field ?? columnId;
  const currentValue = input.currentValue
    ?? readEditedValue(input.row, input.rowIndex, input.rowKey, input.column, field);
  const context = createCellContext(
    input.row,
    input.rowIndex,
    input.rowKey,
    input.column,
    field,
    currentValue,
    input.locale
  );
  if (!isCellEditable(input.column, context, input.editing)) {
    return undefined;
  }

  return Object.freeze({
    id: `edit:${String(input.rowKey)}:${columnId}`,
    row: input.row,
    rowIndex: input.rowIndex,
    rowKey: input.rowKey,
    column: input.column,
    columnId,
    field,
    previousValue: currentValue,
    editor: resolveEditorDef(input.column),
    startedAt: input.startedAt ?? Date.now(),
    locale: context.locale
  });
}

export async function commitCellEdit<TData>(
  input: CommitCellEditInput<TData>
): Promise<CellEditCommitResult<TData>> {
  const session = input.session;
  const context = createCellContext(
    session.row,
    session.rowIndex,
    session.rowKey,
    session.column,
    session.field,
    session.previousValue,
    input.locale ?? session.locale
  );
  const nextValue = parseEditedValue(input.rawValue, session.editor.kind, session.column, context);
  const shouldValidate = input.validate !== false && input.editing?.validateOnCommit !== false;
  const issues = shouldValidate
    ? await validateEditedValue(nextValue, context, session.column, session.editor)
    : [];
  if (issues.some((issue) => issue.severity === "error")) {
    return Object.freeze({
      valid: false,
      session,
      previousValue: session.previousValue,
      nextValue,
      nextRow: session.row,
      issues
    });
  }

  return Object.freeze({
    valid: true,
    session,
    previousValue: session.previousValue,
    nextValue,
    nextRow: applyEditedValue(session.row, session.column, context, nextValue),
    issues
  });
}

export function cancelCellEdit<TData>(
  session: CellEditSession<TData>,
  reason = "cancel"
): CellEditCancelResult<TData> {
  return Object.freeze({ session, previousValue: session.previousValue, reason });
}

export function isCellEditable<TData>(
  column: DataColumnDef<TData>,
  context: CellContext<TData>,
  editing: EditingOptions | undefined
): boolean {
  if (editing?.enabled === false || column.editable === false) {
    return false;
  }

  if (typeof column.editable === "function") {
    return column.editable(context);
  }

  return column.editable === true || column.editor !== undefined;
}

export function resolveEditorDef<TData>(
  column: DataColumnDef<TData>
): ResolvedEditorDef<TData> {
  const editor = column.editor;
  const fallbackKind = inferEditorKind(column);
  if (typeof editor === "string" || editor === undefined) {
    return Object.freeze({ kind: editor ?? fallbackKind, options: Object.freeze([]) });
  }

  return Object.freeze({
    kind: editor.kind,
    options: Object.freeze([...(editor.options ?? getParamOptions(editor.params))]),
    ...(editor.params === undefined ? {} : { params: editor.params }),
    ...(editor.validate === undefined ? {} : { validate: editor.validate })
  });
}

export function resolveEditStartMode<TData>(
  column: DataColumnDef<TData>,
  editing: EditingOptions | undefined
): EditStartMode {
  if (column.editTrigger) {
    return column.editTrigger;
  }

  if (editing?.startMode) {
    return editing.startMode;
  }

  return resolveEditorDef(column).kind === "checkbox" ? "singleClick" : "doubleClick";
}

export function resolveEditKeyboardPolicy(
  editing: EditingOptions | undefined
): ResolvedEditingKeyboardPolicy {
  const keyboard = editing?.keyboard;
  return Object.freeze({
    startOnEnter: getKeyboardFlag(keyboard?.startOnEnter, true),
    commitOnEnter: getKeyboardFlag(keyboard?.commitOnEnter, true),
    moveOnTab: getKeyboardFlag(keyboard?.moveOnTab, true),
    commitOnTab: getKeyboardFlag(keyboard?.commitOnTab, true),
    cancelOnEscape: getKeyboardFlag(keyboard?.cancelOnEscape, true),
    clearOnBackspace: getKeyboardFlag(keyboard?.clearOnBackspace, true)
  });
}

function parseEditedValue<TData>(
  rawValue: unknown,
  editorKind: EditorKind,
  column: DataColumnDef<TData>,
  context: CellContext<TData>
): unknown {
  if (column.parser) {
    return column.parser(rawValue, context);
  }

  if (editorKind === "number") {
    if (rawValue === "" || rawValue === null || rawValue === undefined) {
      return null;
    }
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : rawValue;
  }

  if (editorKind === "checkbox") {
    return Boolean(rawValue);
  }

  if (editorKind === "multi-select") {
    return Array.isArray(rawValue) ? Object.freeze([...rawValue]) : [];
  }

  return rawValue === null || rawValue === undefined ? "" : String(rawValue);
}

async function validateEditedValue<TData>(
  value: unknown,
  context: CellContext<TData>,
  column: DataColumnDef<TData>,
  editor: ResolvedEditorDef<TData>
): Promise<readonly ValidationIssue[]> {
  const validators = [column.validator, editor.validate].filter(
    (validator): validator is ValueValidator<TData> => validator !== undefined
  );
  const issues: ValidationIssue[] = [];

  for (const validator of validators) {
    const messages = await validator(value, { ...context, value });
    issues.push(...messages.map((message) => ({
      field: context.field,
      rowKey: context.rowKey,
      message,
      severity: "error" as const
    })));
  }

  return Object.freeze(issues);
}

function applyEditedValue<TData>(
  row: TData,
  column: DataColumnDef<TData>,
  context: CellContext<TData>,
  nextValue: unknown
): TData {
  if (column.valueSetter) {
    return column.valueSetter(context, nextValue);
  }

  if (row === null || typeof row !== "object") {
    return row;
  }

  if (!column.field) {
    return row;
  }

  return { ...(row as Record<string, unknown>), [column.field]: nextValue } as TData;
}

function createCellContext<TData>(
  row: TData,
  rowIndex: number,
  rowKey: RowKey,
  column: DataColumnDef<TData>,
  field: string,
  value: unknown,
  locale: string | undefined
): CellContext<TData> {
  const columnId = resolveDataColumnId(column);
  return {
    ...createLocaleFormatter(locale),
    row,
    rowIndex,
    rowKey,
    column,
    columnId,
    field,
    value,
    position: { rowIndex, field, columnId, rowKey }
  };
}

function readEditedValue<TData>(
  row: TData,
  rowIndex: number,
  rowKey: RowKey,
  column: DataColumnDef<TData>,
  field: string
): unknown {
  if (column.valueGetter) {
    return column.valueGetter({ row, rowIndex, rowKey });
  }

  return column.field ? readField(row, column.field) : readField(row, field);
}

function inferEditorKind<TData>(column: DataColumnDef<TData>): EditorKind {
  if (column.type === "number") {
    return "number";
  }
  if (column.type === "date") {
    return "date";
  }
  if (column.type === "datetime") {
    return "datetime";
  }
  if (column.type === "boolean") {
    return "checkbox";
  }
  return "text";
}

function getKeyboardFlag(value: boolean | undefined, fallback: boolean): boolean {
  return value ?? fallback;
}

function getParamOptions(params: Readonly<Record<string, unknown>> | undefined): readonly EditorOption[] {
  const options = params?.options;
  return Array.isArray(options) ? options.filter(isEditorOption) : [];
}

function isEditorOption(value: unknown): value is EditorOption {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const option = value as Readonly<Record<string, unknown>>;
  return "value" in option && typeof option.label === "string";
}
