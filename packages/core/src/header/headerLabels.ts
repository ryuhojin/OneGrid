import {
  normalizeHeaderMergeColumnIds,
  resolveHeaderMergeRuleId
} from "./headerMergeValidation.js";
import type { HeaderMergeOptions, HeaderMergeRule } from "../types/grid-options.js";
import type { HeaderCell, HeaderLabel, HeaderRow } from "./headerTypes.js";

export function applyHeaderLabels(
  rows: readonly HeaderRow[],
  options: HeaderMergeOptions | undefined
): readonly HeaderRow[] {
  const labelRules = options?.rules?.filter((rule) => rule.presentation === "label") ?? [];
  if (options?.enabled === false || labelRules.length === 0) {
    return rows;
  }

  const labelsByCellId = new Map<string, HeaderLabel[]>();

  for (const rule of labelRules) {
    const targetCell = findLabelTargetCell(rows, rule);
    if (!targetCell) {
      continue;
    }

    const labels = labelsByCellId.get(targetCell.id) ?? [];
    labels.push(createHeaderLabel(rule, targetCell));
    labelsByCellId.set(targetCell.id, labels);
  }

  if (labelsByCellId.size === 0) {
    return rows;
  }

  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        depth: row.depth,
        cells: Object.freeze(row.cells.map((cell) => applyLabelsToCell(cell, labelsByCellId)))
      })
    )
  );
}

function findLabelTargetCell(
  rows: readonly HeaderRow[],
  rule: HeaderMergeRule
): HeaderCell | undefined {
  const columnIds = normalizeHeaderMergeColumnIds(rule.columnIds);
  const candidates = rows
    .flatMap((row) => row.cells)
    .filter((cell) => cell.kind !== "merge")
    .filter((cell) => containsAllColumnIds(cell.columnIds, columnIds))
    .sort(byBestLabelTarget);

  return candidates[0];
}

function createHeaderLabel(rule: HeaderMergeRule, targetCell: HeaderCell): HeaderLabel {
  const labelId = resolveHeaderMergeRuleId(rule);
  return Object.freeze({
    id: labelId,
    text: rule.headerName,
    targetCellId: targetCell.id,
    columnIds: normalizeHeaderMergeColumnIds(rule.columnIds),
    ariaLabel: rule.ariaLabel ?? rule.headerName
  });
}

function applyLabelsToCell(
  cell: HeaderCell,
  labelsByCellId: ReadonlyMap<string, readonly HeaderLabel[]>
): HeaderCell {
  const labels = labelsByCellId.get(cell.id);
  if (!labels || labels.length === 0) {
    return cell;
  }

  const labelText = labels.map((label) => label.ariaLabel).join(", ");
  return Object.freeze({
    ...cell,
    labels: Object.freeze(labels),
    ariaLabel: `${cell.ariaLabel}, ${labelText}`
  });
}

function containsAllColumnIds(
  candidateColumnIds: readonly string[],
  requestedColumnIds: readonly string[]
): boolean {
  const candidateIds = new Set(candidateColumnIds);
  return requestedColumnIds.every((columnId) => candidateIds.has(columnId));
}

function byBestLabelTarget(left: HeaderCell, right: HeaderCell): number {
  const widthComparison = left.columnIds.length - right.columnIds.length;
  if (widthComparison !== 0) {
    return widthComparison;
  }

  return right.depth - left.depth;
}
