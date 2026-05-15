import { runAllBenchmarkScenarios } from "./scenarios.js";
import type { BenchmarkScenarioReport } from "./scenarios.js";

export interface BenchmarkSuiteOptions {
  readonly operationScale?: number;
}

export interface BenchmarkSuiteReport {
  readonly generatedAt: string;
  readonly summary: BenchmarkSuiteSummary;
  readonly scenarios: readonly BenchmarkScenarioReport[];
}

export interface BenchmarkSuiteSummary {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly totalDurationMs: number;
}

export function runBenchmarkSuite(options: BenchmarkSuiteOptions = {}): BenchmarkSuiteReport {
  const scenarios = runAllBenchmarkScenarios(options);
  const totalDurationMs = scenarios.reduce((total, scenario) => total + scenario.durationMs, 0);
  const passed = scenarios.filter((scenario) => scenario.passed).length;

  return Object.freeze({
    generatedAt: new Date().toISOString(),
    summary: Object.freeze({
      total: scenarios.length,
      passed,
      failed: scenarios.length - passed,
      totalDurationMs: round(totalDurationMs)
    }),
    scenarios
  });
}

export function formatBenchmarkReport(report: BenchmarkSuiteReport): string {
  const lines = [
    "OneGrid benchmark report",
    `Generated: ${report.generatedAt}`,
    `Summary: ${report.summary.passed}/${report.summary.total} passed, ${report.summary.totalDurationMs}ms total`,
    ""
  ];

  for (const scenario of report.scenarios) {
    lines.push(
      `${scenario.passed ? "PASS" : "FAIL"} ${scenario.id}`,
      `  ${scenario.title}`,
      `  ${scenario.durationMs}ms / ${scenario.operations} ops / ${scenario.opsPerSecond} ops/s`,
      `  Threshold: ${scenario.thresholdMs}ms`
    );
    lines.push(...scenario.metrics.map((metric) =>
      `  - ${metric.name}: ${String(metric.value)} ${metric.unit}`
    ));
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

export function assertBenchmarkSuitePassed(report: BenchmarkSuiteReport): void {
  if (report.summary.failed === 0) {
    return;
  }

  const failed = report.scenarios
    .filter((scenario) => !scenario.passed)
    .map((scenario) => `${scenario.id} ${scenario.durationMs}ms > ${scenario.thresholdMs}ms`)
    .join(", ");
  throw new Error(`Benchmark thresholds failed: ${failed}`);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
