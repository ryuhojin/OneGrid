import {
  calculateFixedColumnVirtualWindow,
  calculateFixedRowVirtualWindow,
  calculateVariableRowVirtualWindow,
  createCellSpanModel,
  createColumnModel,
  createColumnVirtualizationIndex,
  createGridLayoutModel,
  createSegmentedVirtualScroll
} from "@onegrid/core";
import {
  COLUMN_50K,
  ROW_10M,
  ROW_100M,
  ROW_20K,
  createColumnWidths,
  createFrozenColumns,
  createMergeColumns,
  createMergeRows,
  createVariableHeightIndex,
  iterationScroll
} from "./benchmarkData.js";
import {
  createMeasureMetrics,
  measureOnce,
  measureOperations,
  round
} from "./perfMarker.js";
import type { PerformanceMetric } from "./perfMarker.js";

export type BenchmarkCategory = "virtualization" | "layout" | "merge";

export interface BenchmarkScenario {
  readonly id: string;
  readonly title: string;
  readonly category: BenchmarkCategory;
  readonly logicalRows?: number;
  readonly logicalColumns?: number;
  readonly operations: number;
  readonly thresholdMs: number;
  readonly description: string;
}

export interface BenchmarkScenarioReport extends BenchmarkScenario {
  readonly durationMs: number;
  readonly opsPerSecond: number;
  readonly passed: boolean;
  readonly metrics: readonly PerformanceMetric[];
}

interface BenchmarkDefinition extends BenchmarkScenario {
  readonly run: (operations: number) => BenchmarkScenarioReport;
}

export const benchmarkScenarios: readonly BenchmarkScenario[] = Object.freeze(
  createBenchmarkDefinitions().map(toBenchmarkScenario)
);

export function runBenchmarkScenario(
  scenarioId: string,
  options: { readonly operationScale?: number } = {}
): BenchmarkScenarioReport {
  const definition = createBenchmarkDefinitions().find((scenario) => scenario.id === scenarioId);
  if (!definition) {
    throw new Error(`Unknown benchmark scenario: ${scenarioId}`);
  }

  return runDefinition(definition, options.operationScale);
}

export function runAllBenchmarkScenarios(
  options: { readonly operationScale?: number } = {}
): readonly BenchmarkScenarioReport[] {
  return Object.freeze(
    createBenchmarkDefinitions().map((definition) => runDefinition(definition, options.operationScale))
  );
}

function createBenchmarkDefinitions(): readonly BenchmarkDefinition[] {
  return Object.freeze([
    createViewport100mScenario(),
    createSegmented10mScenario(),
    createColumn50kScenario(),
    createVariableHeight20kScenario(),
    createMergeWindowScenario(),
    createFrozenVirtualMergeScenario()
  ]);
}

function createViewport100mScenario(): BenchmarkDefinition {
  return createDefinition({
    id: "viewport-100m-window",
    title: "100M viewport row window",
    category: "virtualization",
    logicalRows: ROW_100M,
    operations: 5_000,
    thresholdMs: 90,
    description: "Fixed-height 100M row viewport calculations without row allocation.",
    runMeasure: (operations) => {
      const maxScrollTop = ROW_100M * 32 - 640;
      return measureOperations(operations, (iteration) => {
        const window = calculateFixedRowVirtualWindow({
          rowCount: ROW_100M,
          rowHeight: 32,
          viewportHeight: 640,
          scrollTop: iterationScroll(iteration, maxScrollTop, 997_331),
          overscan: 6,
          maxDomRows: 96
        });

        return window.firstRow + window.renderedRowCount + window.visibleLastRow;
      });
    },
    extraMetrics: () => [
      { name: "maxDomRows", value: 96, unit: "rows" },
      { name: "rowAllocation", value: 0, unit: "rows" }
    ]
  });
}

function createSegmented10mScenario(): BenchmarkDefinition {
  return createDefinition({
    id: "segmented-scroll-10m",
    title: "10M segmented scroll mapping",
    category: "virtualization",
    logicalRows: ROW_10M,
    operations: 5_000,
    thresholdMs: 110,
    description: "Logical-to-physical scroll mapping under browser scroll-height limits.",
    runMeasure: (operations) => {
      const maxLogicalScrollTop = ROW_10M * 32 - 640;
      return measureOperations(operations, (iteration) => {
        const state = createSegmentedVirtualScroll({
          rowCount: ROW_10M,
          rowHeight: 32,
          viewportHeight: 640,
          logicalScrollTop: iterationScroll(iteration, maxLogicalScrollTop, 713_561)
        });

        return state.activeSegmentIndex + state.physicalScrollTop + state.segmentSizeRows;
      });
    },
    extraMetrics: () => {
      const state = createSegmentedVirtualScroll({
        rowCount: ROW_10M,
        rowHeight: 32,
        viewportHeight: 640
      });
      return [
        { name: "physicalScrollHeight", value: state.physicalScrollHeight, unit: "px" },
        { name: "segmentCount", value: state.segmentCount, unit: "segments" }
      ];
    }
  });
}

function createColumn50kScenario(): BenchmarkDefinition {
  return createDefinition({
    id: "column-50k-window",
    title: "50K horizontal column window",
    category: "virtualization",
    logicalColumns: COLUMN_50K,
    operations: 2_000,
    thresholdMs: 130,
    description: "Indexed horizontal virtualization with bounded rendered columns.",
    runMeasure: (operations) => {
      const widths = createColumnWidths(COLUMN_50K);
      const indexMeasure = measureOnce(() =>
        createColumnVirtualizationIndex({ columnWidths: widths }).totalWidth
      );
      const columnIndex = createColumnVirtualizationIndex({ columnWidths: widths });
      const maxScrollLeft = Math.max(0, columnIndex.totalWidth - 1_200);
      const measure = measureOperations(operations, (iteration) => {
        const window = calculateFixedColumnVirtualWindow({
          columnWidths: widths,
          columnVirtualizationIndex: columnIndex,
          scrollLeft: iterationScroll(iteration, maxScrollLeft, 19_901),
          viewportWidth: 1_200,
          overscan: 6,
          maxDomColumns: 32
        });

        return window.firstColumn + window.renderedColumnCount + window.visibleLastColumn;
      });

      return withSetupMetric(measure, indexMeasure.durationMs);
    },
    extraMetrics: () => [
      { name: "maxDomColumns", value: 32, unit: "columns" }
    ]
  });
}

function createVariableHeight20kScenario(): BenchmarkDefinition {
  return createDefinition({
    id: "variable-row-height-20k",
    title: "20K variable row-height window",
    category: "virtualization",
    logicalRows: ROW_20K,
    operations: 1_500,
    thresholdMs: 140,
    description: "Sparse variable row-height index lookup with bounded rendered rows.",
    runMeasure: (operations) => {
      const setupMeasure = measureOnce(() => createVariableHeightIndex().totalHeight);
      const rowHeightIndex = createVariableHeightIndex();
      const maxScrollTop = Math.max(0, rowHeightIndex.totalHeight - 640);
      const measure = measureOperations(operations, (iteration) => {
        const window = calculateVariableRowVirtualWindow({
          rowHeightIndex,
          scrollTop: iterationScroll(iteration, maxScrollTop, 7_529),
          viewportHeight: 640,
          overscan: 6,
          maxDomRows: 80
        });

        return window.firstRow + window.renderedRowCount + window.totalHeight;
      });

      return withSetupMetric(measure, setupMeasure.durationMs);
    },
    extraMetrics: () => [
      { name: "maxDomRows", value: 80, unit: "rows" }
    ]
  });
}

function createMergeWindowScenario(): BenchmarkDefinition {
  return createDefinition({
    id: "merge-window-128",
    title: "Merged cell window indexing",
    category: "merge",
    logicalRows: 10_000_000,
    logicalColumns: 6,
    operations: 700,
    thresholdMs: 1_500,
    description: "Cell span indexing over the current virtual window, not full logical rows.",
    runMeasure: (operations) => {
      const columns = createMergeColumns();
      const columnModel = createColumnModel(columns);
      const rows = createMergeRows(128);
      return measureOperations(operations, (iteration) => {
        const shiftedRows = rows.map((row) => ({
          ...row,
          rowIndex: row.rowIndex + iteration * 128
        }));
        const model = createCellSpanModel({
          rows: shiftedRows,
          columns: columnModel.visibleLeafColumns,
          options: { enabled: true }
        });

        return model.spans.length + model.byCell.size;
      });
    },
    extraMetrics: () => [
      { name: "windowRows", value: 128, unit: "rows" }
    ]
  });
}

function createFrozenVirtualMergeScenario(): BenchmarkDefinition {
  return createDefinition({
    id: "frozen-virtual-merge",
    title: "Frozen panes with virtual merge",
    category: "layout",
    logicalRows: 10_000_000,
    logicalColumns: 48,
    operations: 700,
    thresholdMs: 1_500,
    description: "Pinned layout, center virtualization, and visible-window merge calculation.",
    runMeasure: (operations) => {
      const columns = createFrozenColumns();
      const columnModel = createColumnModel(columns);
      const layout = createGridLayoutModel(columnModel, { hasFooter: true });
      const centerWidths = layout.panes.center.columns.map((column) => column.width);
      const columnIndex = createColumnVirtualizationIndex({ columnWidths: centerWidths });
      const rows = createMergeRows(96);
      return measureOperations(operations, (iteration) => {
        const window = calculateFixedColumnVirtualWindow({
          columnWidths: centerWidths,
          columnVirtualizationIndex: columnIndex,
          scrollLeft: iterationScroll(iteration, columnIndex.totalWidth - 960, 3_101),
          viewportWidth: 960,
          overscan: 4,
          maxDomColumns: 24
        });
        const visibleCenterColumns = layout.panes.center.columns.slice(window.firstColumn, window.lastColumn + 1);
        const model = createCellSpanModel({
          rows,
          columns: [...layout.panes.left.columns, ...visibleCenterColumns, ...layout.panes.right.columns],
          options: { enabled: true }
        });

        return layout.totalColumnWidth + window.renderedColumnCount + model.byCell.size;
      });
    },
    extraMetrics: () => [
      { name: "pinnedPanes", value: 2, unit: "panes" },
      { name: "maxCenterDomColumns", value: 24, unit: "columns" }
    ]
  });
}

function createDefinition(input: {
  readonly id: string;
  readonly title: string;
  readonly category: BenchmarkCategory;
  readonly logicalRows?: number;
  readonly logicalColumns?: number;
  readonly operations: number;
  readonly thresholdMs: number;
  readonly description: string;
  readonly runMeasure: (operations: number) => ReturnType<typeof measureOperations>;
  readonly extraMetrics?: () => readonly PerformanceMetric[];
}): BenchmarkDefinition {
  return Object.freeze({
    id: input.id,
    title: input.title,
    category: input.category,
    ...(input.logicalRows === undefined ? {} : { logicalRows: input.logicalRows }),
    ...(input.logicalColumns === undefined ? {} : { logicalColumns: input.logicalColumns }),
    operations: input.operations,
    thresholdMs: input.thresholdMs,
    description: input.description,
    run: (operations: number) => {
      const measure = input.runMeasure(operations);
      const metrics = [...createMeasureMetrics(measure), ...(input.extraMetrics?.() ?? [])];
      const duration = findMetricNumber(metrics, "duration");
      return Object.freeze({
        id: input.id,
        title: input.title,
        category: input.category,
        ...(input.logicalRows === undefined ? {} : { logicalRows: input.logicalRows }),
        ...(input.logicalColumns === undefined ? {} : { logicalColumns: input.logicalColumns }),
        operations,
        thresholdMs: input.thresholdMs,
        description: input.description,
        durationMs: duration,
        opsPerSecond: findMetricNumber(metrics, "opsPerSecond"),
        passed: duration <= input.thresholdMs,
        metrics: Object.freeze(metrics)
      });
    }
  });
}

function runDefinition(definition: BenchmarkDefinition, operationScale = 1): BenchmarkScenarioReport {
  const operations = Math.max(1, Math.round(definition.operations * operationScale));
  return definition.run(operations);
}

function withSetupMetric(
  measure: ReturnType<typeof measureOperations>,
  setupDurationMs: number
): ReturnType<typeof measureOperations> {
  const durationMs = round(measure.durationMs + setupDurationMs);
  return Object.freeze({
    ...measure,
    durationMs,
    opsPerSecond: round(measure.operations / durationMs * 1000)
  });
}

function toBenchmarkScenario(definition: BenchmarkDefinition): BenchmarkScenario {
  return Object.freeze({
    id: definition.id,
    title: definition.title,
    category: definition.category,
    ...(definition.logicalRows === undefined ? {} : { logicalRows: definition.logicalRows }),
    ...(definition.logicalColumns === undefined ? {} : { logicalColumns: definition.logicalColumns }),
    operations: definition.operations,
    thresholdMs: definition.thresholdMs,
    description: definition.description
  });
}

function findMetricNumber(metrics: readonly PerformanceMetric[], name: string): number {
  const metric = metrics.find((entry) => entry.name === name);
  return typeof metric?.value === "number" ? metric.value : 0;
}
