import type { ColumnModel, NormalizedDataColumn } from "../column/index.js";
import type {
  HeaderCell,
  HeaderPinnedRegion,
  HeaderRegion,
  HeaderRegionModel,
  HeaderRow
} from "./headerTypes.js";

export function createHeaderRegions<TData>(
  rows: readonly HeaderRow[],
  columnModel: ColumnModel<TData>
): HeaderRegionModel {
  return Object.freeze({
    left: createHeaderRegion("left", rows, columnModel.pinnedLeafColumns.left),
    center: createHeaderRegion("center", rows, columnModel.pinnedLeafColumns.center),
    right: createHeaderRegion("right", rows, columnModel.pinnedLeafColumns.right)
  });
}

export function clipHeaderRowsToColumns<TData>(
  rows: readonly HeaderRow[],
  region: HeaderPinnedRegion,
  columns: readonly NormalizedDataColumn<TData>[]
): readonly HeaderRow[] {
  return Object.freeze(
    rows.map((row) =>
      Object.freeze({
        depth: row.depth,
        cells: Object.freeze(clipCellsToRegion(row.cells, region, columns))
      })
    )
  );
}

function createHeaderRegion<TData>(
  region: HeaderPinnedRegion,
  rows: readonly HeaderRow[],
  columns: readonly NormalizedDataColumn<TData>[]
): HeaderRegion {
  return Object.freeze({
    region,
    rows: clipHeaderRowsToColumns(rows, region, columns)
  });
}

function clipCellsToRegion<TData>(
  cells: readonly HeaderCell[],
  region: HeaderPinnedRegion,
  columns: readonly NormalizedDataColumn<TData>[]
): readonly HeaderCell[] {
  const localIndexesById = new Map(columns.map((column, index) => [column.id, index] as const));
  const clippedCells = cells.flatMap((cell) =>
    splitRegionSegments(cell.columnIds, localIndexesById).map((segment, segmentIndex) =>
      clipCell(cell, region, segment, segmentIndex, columns)
    )
  );

  return Object.freeze(clippedCells);
}

function splitRegionSegments(
  columnIds: readonly string[],
  localIndexesById: ReadonlyMap<string, number>
): readonly (readonly number[])[] {
  const localIndexes = columnIds
    .map((columnId) => localIndexesById.get(columnId))
    .filter((index): index is number => index !== undefined)
    .sort((left, right) => left - right);
  const segments: number[][] = [];

  for (const index of localIndexes) {
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

function clipCell<TData>(
  cell: HeaderCell,
  region: HeaderPinnedRegion,
  segment: readonly number[],
  segmentIndex: number,
  columns: readonly NormalizedDataColumn<TData>[]
): HeaderCell {
  const startLeafIndex = segment[0] ?? 0;
  const endLeafIndex = segment[segment.length - 1] ?? startLeafIndex;
  const columnIds = Object.freeze(
    columns.slice(startLeafIndex, endLeafIndex + 1).map((column) => column.id)
  );

  return Object.freeze({
    ...cell,
    id: `${cell.id}:${region}:${segmentIndex}`,
    startLeafIndex,
    endLeafIndex,
    colSpan: columnIds.length,
    columnIds,
    pinned: region === "center" ? undefined : region
  });
}
