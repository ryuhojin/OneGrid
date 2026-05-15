import { createHeaderMatrixRows } from "./headerMatrix.js";
import type { ColumnModel } from "../column/index.js";
import type { HeaderMergeOptions, HeaderMergeRule } from "../types/grid-options.js";
import type { HeaderRow } from "./headerTypes.js";

export type HeaderMergeValidationIssueKind =
  | "empty-header-name"
  | "empty-rule-id"
  | "duplicate-rule-id"
  | "empty-column-list"
  | "empty-column-id"
  | "duplicate-column-id"
  | "unknown-column-id"
  | "non-leaf-column-id"
  | "invalid-presentation"
  | "overlapping-row-rule"
  | "non-contiguous-row-rule"
  | "missing-label-target";

export interface HeaderMergeValidationIssue {
  readonly kind: HeaderMergeValidationIssueKind;
  readonly ruleIndex: number;
  readonly ruleId: string | undefined;
  readonly columnId?: string;
  readonly message: string;
}

export interface HeaderMergeValidationResult {
  readonly valid: boolean;
  readonly issues: readonly HeaderMergeValidationIssue[];
}

export function assertValidHeaderMergeRules<TData>(
  columnModel: ColumnModel<TData>,
  options: HeaderMergeOptions | undefined,
  matrixRows?: readonly HeaderRow[]
): void {
  const validation = validateHeaderMergeRules(columnModel, options, matrixRows);
  if (!validation.valid) {
    throw new Error(formatHeaderMergeValidationError(validation));
  }
}

export function validateHeaderMergeRules<TData>(
  columnModel: ColumnModel<TData>,
  options: HeaderMergeOptions | undefined,
  matrixRows: readonly HeaderRow[] = createHeaderMatrixRows(columnModel)
): HeaderMergeValidationResult {
  if (options?.enabled === false || !options?.rules || options.rules.length === 0) {
    return freezeValidation([]);
  }

  const context = createValidationContext(columnModel, matrixRows);
  const issues: HeaderMergeValidationIssue[] = [];

  options.rules.forEach((rule, ruleIndex) => {
    validateRuleIdentity(rule, ruleIndex, context, issues);
    const validColumnIds = validateRuleColumns(rule, ruleIndex, context, issues);

    if (resolveHeaderMergePresentation(rule) === "label") {
      validateLabelTarget(rule, ruleIndex, validColumnIds, context, issues);
    } else {
      validateRowRule(rule, ruleIndex, validColumnIds, context, issues);
    }
  });

  return freezeValidation(issues);
}

export function formatHeaderMergeValidationError(
  validation: HeaderMergeValidationResult
): string {
  return `Invalid headerMerge rules: ${validation.issues.map((issue) => issue.message).join("; ")}`;
}

export function normalizeHeaderMergeColumnIds(columnIds: readonly string[]): readonly string[] {
  return Object.freeze(columnIds.map((columnId) => normalizeText(columnId)));
}

export function resolveHeaderMergeRuleId(rule: HeaderMergeRule): string {
  const fallbackPrefix = resolveHeaderMergePresentation(rule) === "label"
    ? "header-label"
    : "header-merge";
  return normalizeText(rule.id ?? `${fallbackPrefix}:${rule.headerName}`);
}

function validateRuleIdentity<TData>(
  rule: HeaderMergeRule,
  ruleIndex: number,
  context: HeaderMergeValidationContext<TData>,
  issues: HeaderMergeValidationIssue[]
): void {
  const ruleId = resolveHeaderMergeRuleId(rule);
  const presentation = rule.presentation;

  if (normalizeText(rule.headerName).length === 0) {
    issues.push(createIssue("empty-header-name", ruleIndex, ruleId, "headerName must not be empty."));
  }

  if (rule.id !== undefined && ruleId.length === 0) {
    issues.push(createIssue("empty-rule-id", ruleIndex, ruleId, "id must not be empty."));
  }

  if (presentation !== undefined && presentation !== "row" && presentation !== "label") {
    issues.push(createIssue(
      "invalid-presentation",
      ruleIndex,
      ruleId,
      `presentation must be "row" or "label". Received "${String(presentation)}".`
    ));
  }

  const existingIndex = context.ruleIds.get(ruleId);
  if (ruleId.length > 0 && existingIndex !== undefined) {
    issues.push(createIssue(
      "duplicate-rule-id",
      ruleIndex,
      ruleId,
      `Duplicate headerMerge rule id "${ruleId}" also used by rule ${existingIndex}.`
    ));
  } else {
    context.ruleIds.set(ruleId, ruleIndex);
  }
}

function validateRuleColumns<TData>(
  rule: HeaderMergeRule,
  ruleIndex: number,
  context: HeaderMergeValidationContext<TData>,
  issues: HeaderMergeValidationIssue[]
): readonly string[] {
  const ruleId = resolveHeaderMergeRuleId(rule);
  const columnIds = normalizeHeaderMergeColumnIds(rule.columnIds);
  const validColumnIds: string[] = [];
  const seenInRule = new Set<string>();

  if (columnIds.length === 0) {
    issues.push(createIssue("empty-column-list", ruleIndex, ruleId, "columnIds must not be empty."));
  }

  for (const columnId of columnIds) {
    if (columnId.length === 0) {
      issues.push(createIssue("empty-column-id", ruleIndex, ruleId, "columnIds must not contain empty ids."));
      continue;
    }

    if (seenInRule.has(columnId)) {
      issues.push(createIssue(
        "duplicate-column-id",
        ruleIndex,
        ruleId,
        `columnId "${columnId}" is duplicated inside the same headerMerge rule.`,
        columnId
      ));
      continue;
    }
    seenInRule.add(columnId);

    const column = context.columnModel.byId.get(columnId);
    if (!column) {
      issues.push(createIssue("unknown-column-id", ruleIndex, ruleId, `Unknown headerMerge columnId "${columnId}".`, columnId));
      continue;
    }

    if (column.kind !== "data") {
      issues.push(createIssue(
        "non-leaf-column-id",
        ruleIndex,
        ruleId,
        `headerMerge columnId "${columnId}" must reference a leaf data column, not a group column.`,
        columnId
      ));
      continue;
    }

    validColumnIds.push(columnId);
  }

  return Object.freeze(validColumnIds);
}

function validateRowRule<TData>(
  rule: HeaderMergeRule,
  ruleIndex: number,
  validColumnIds: readonly string[],
  context: HeaderMergeValidationContext<TData>,
  issues: HeaderMergeValidationIssue[]
): void {
  const ruleId = resolveHeaderMergeRuleId(rule);
  const visibleIndexes = validColumnIds
    .map((columnId) => context.visibleIndexById.get(columnId))
    .filter((index): index is number => index !== undefined)
    .sort((left, right) => left - right);

  if (!isContiguous(visibleIndexes)) {
    issues.push(createIssue(
      "non-contiguous-row-rule",
      ruleIndex,
      ruleId,
      `headerMerge row rule "${ruleId}" must reference contiguous visible leaf columns.`
    ));
  }

  for (const columnId of validColumnIds) {
    const existingIndex = context.rowColumnOwners.get(columnId);
    if (existingIndex !== undefined) {
      issues.push(createIssue(
        "overlapping-row-rule",
        ruleIndex,
        ruleId,
        `headerMerge row rule "${ruleId}" overlaps columnId "${columnId}" with rule ${existingIndex}.`,
        columnId
      ));
    } else {
      context.rowColumnOwners.set(columnId, ruleIndex);
    }
  }
}

function validateLabelTarget<TData>(
  rule: HeaderMergeRule,
  ruleIndex: number,
  validColumnIds: readonly string[],
  context: HeaderMergeValidationContext<TData>,
  issues: HeaderMergeValidationIssue[]
): void {
  const visibleColumnIds = validColumnIds.filter((columnId) => context.visibleIndexById.has(columnId));
  if (visibleColumnIds.length === 0) {
    return;
  }

  const hasTarget = context.matrixRows
    .flatMap((row) => row.cells)
    .some((cell) => cell.kind !== "merge" && containsAll(cell.columnIds, visibleColumnIds));
  if (!hasTarget) {
    const ruleId = resolveHeaderMergeRuleId(rule);
    issues.push(createIssue(
      "missing-label-target",
      ruleIndex,
      ruleId,
      `headerMerge label rule "${ruleId}" must target one existing group or leaf header cell.`
    ));
  }
}

interface HeaderMergeValidationContext<TData> {
  readonly columnModel: ColumnModel<TData>;
  readonly matrixRows: readonly HeaderRow[];
  readonly visibleIndexById: ReadonlyMap<string, number>;
  readonly ruleIds: Map<string, number>;
  readonly rowColumnOwners: Map<string, number>;
}

function createValidationContext<TData>(
  columnModel: ColumnModel<TData>,
  matrixRows: readonly HeaderRow[]
): HeaderMergeValidationContext<TData> {
  return {
    columnModel,
    matrixRows,
    visibleIndexById: new Map(columnModel.visibleLeafColumns.map((column, index) => [column.id, index])),
    ruleIds: new Map<string, number>(),
    rowColumnOwners: new Map<string, number>()
  };
}

function resolveHeaderMergePresentation(rule: HeaderMergeRule): "row" | "label" {
  return rule.presentation === "label" ? "label" : "row";
}

function createIssue(
  kind: HeaderMergeValidationIssueKind,
  ruleIndex: number,
  ruleId: string | undefined,
  message: string,
  columnId?: string
): HeaderMergeValidationIssue {
  return Object.freeze({
    kind,
    ruleIndex,
    ruleId,
    ...(columnId === undefined ? {} : { columnId }),
    message
  });
}

function containsAll(candidateColumnIds: readonly string[], requestedColumnIds: readonly string[]): boolean {
  const candidateIds = new Set(candidateColumnIds);
  return requestedColumnIds.every((columnId) => candidateIds.has(columnId));
}

function isContiguous(indexes: readonly number[]): boolean {
  return indexes.every((index, arrayIndex) => {
    const previousIndex = indexes[arrayIndex - 1];
    return arrayIndex === 0 || previousIndex === undefined || index === previousIndex + 1;
  });
}

function freezeValidation(issues: readonly HeaderMergeValidationIssue[]): HeaderMergeValidationResult {
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...issues])
  });
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value).trim();
}
