import { createHeaderAriaLabel } from "./headerAria.js";
import type { ColumnModel } from "../column/index.js";
import type { HeaderMergeOptions, HeaderMergeRule } from "../types/grid-options.js";
import type { PinnedSide } from "../types/shared.js";
import type { HeaderCell, HeaderRow } from "./headerTypes.js";

export function createHeaderMergeRows<TData>(
  columnModel: ColumnModel<TData>,
  options: HeaderMergeOptions | undefined
): readonly HeaderRow[] {
  if (options?.enabled === false || !options?.rules || options.rules.length === 0) {
    return Object.freeze([]);
  }

  const rowRules = options.rules.filter((rule) => rule.presentation !== "label");
  const usedLeafIndexes = new Set<number>();
  const cells = rowRules.flatMap((rule) =>
    createMergeCellsForRule(rule, columnModel, usedLeafIndexes)
  );

  if (cells.length === 0) {
    return Object.freeze([]);
  }

  return Object.freeze([
    Object.freeze({
      depth: 0,
      cells: Object.freeze(cells)
    })
  ]);
}

function createMergeCellsForRule<TData>(
  rule: HeaderMergeRule,
  columnModel: ColumnModel<TData>,
  usedLeafIndexes: Set<number>
): readonly HeaderCell[] {
  const requestedIds = new Set(rule.columnIds);
  const matchingIndexes = columnModel.visibleLeafColumns
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) => requestedIds.has(column.id) && !usedLeafIndexes.has(index))
    .map(({ index }) => index);
  const segments = splitContiguousIndexes(matchingIndexes);

  return Object.freeze(
    segments.map((segment, segmentIndex) => {
      for (const index of segment) {
        usedLeafIndexes.add(index);
      }

      return createMergeCell(rule, segment, segmentIndex, columnModel);
    })
  );
}

function createMergeCell<TData>(
  rule: HeaderMergeRule,
  segment: readonly number[],
  segmentIndex: number,
  columnModel: ColumnModel<TData>
): HeaderCell {
  const startLeafIndex = segment[0] ?? 0;
  const endLeafIndex = segment[segment.length - 1] ?? startLeafIndex;
  const columnIds = Object.freeze(
    columnModel.visibleLeafColumns
      .slice(startLeafIndex, endLeafIndex + 1)
      .map((column) => column.id)
  );
  const id = rule.id ?? `header-merge:${rule.headerName}`;

  return Object.freeze({
    id: `${id}:${segmentIndex}`,
    kind: "merge",
    sourceId: id,
    headerName: rule.headerName,
    depth: 0,
    rowSpan: 1,
    colSpan: columnIds.length,
    startLeafIndex,
    endLeafIndex,
    columnIds,
    pinned: resolvePinnedState(columnModel, columnIds),
    ariaLabel: rule.ariaLabel ?? createHeaderAriaLabel(rule.headerName, columnIds.length, "merge")
  });
}

function splitContiguousIndexes(indexes: readonly number[]): readonly (readonly number[])[] {
  const segments: number[][] = [];

  for (const index of indexes) {
    const currentSegment = segments[segments.length - 1];
    const previousIndex = currentSegment?.[currentSegment.length - 1];

    if (currentSegment && previousIndex !== undefined && previousIndex + 1 === index) {
      currentSegment.push(index);
    } else {
      segments.push([index]);
    }
  }

  return Object.freeze(segments.map((segment) => Object.freeze(segment)));
}

function resolvePinnedState<TData>(
  columnModel: ColumnModel<TData>,
  columnIds: readonly string[]
): PinnedSide | undefined {
  const pinnedStates = new Set(
    columnIds.map((columnId) => {
      const column = columnModel.byId.get(columnId);
      return column?.kind === "data" ? column.pinned : undefined;
    })
  );

  return pinnedStates.size === 1 ? [...pinnedStates][0] : undefined;
}
