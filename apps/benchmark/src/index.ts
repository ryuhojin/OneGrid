export {
  createMeasureMetrics,
  measureOnce,
  measureOperations,
  round
} from "./perfMarker.js";
export type {
  PerformanceMeasure,
  PerformanceMetric
} from "./perfMarker.js";
export {
  benchmarkScenarios,
  runAllBenchmarkScenarios,
  runBenchmarkScenario
} from "./scenarios.js";
export type {
  BenchmarkCategory,
  BenchmarkScenario,
  BenchmarkScenarioReport
} from "./scenarios.js";
export {
  assertBenchmarkSuitePassed,
  formatBenchmarkReport,
  runBenchmarkSuite
} from "./report.js";
export type {
  BenchmarkSuiteOptions,
  BenchmarkSuiteReport,
  BenchmarkSuiteSummary
} from "./report.js";

if (isDirectCliRun()) {
  const { assertBenchmarkSuitePassed, formatBenchmarkReport, runBenchmarkSuite } = await import("./report.js");
  const report = runBenchmarkSuite();
  console.log(formatBenchmarkReport(report));
  assertBenchmarkSuitePassed(report);
}

function isDirectCliRun(): boolean {
  if (typeof process === "undefined") {
    return false;
  }

  const entry = process.argv[1];
  return entry !== undefined && import.meta.url === new URL(entry, "file:").href;
}
