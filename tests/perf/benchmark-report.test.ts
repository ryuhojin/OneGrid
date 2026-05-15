import { describe, expect, it } from "vitest";
import {
  benchmarkScenarios,
  formatBenchmarkReport,
  runBenchmarkSuite
} from "../../apps/benchmark/src/index.js";

describe("benchmark report", () => {
  it("publishes measurable benchmark scenarios", () => {
    expect(benchmarkScenarios.map((scenario) => scenario.id)).toEqual([
      "viewport-100m-window",
      "segmented-scroll-10m",
      "column-50k-window",
      "variable-row-height-20k",
      "merge-window-128",
      "frozen-virtual-merge"
    ]);
  });

  it("records actual duration, throughput, and bounded DOM metrics", () => {
    const report = runBenchmarkSuite({ operationScale: 0.01 });
    const text = formatBenchmarkReport(report);

    expect(report.summary.total).toBe(6);
    expect(report.summary.failed).toBe(0);
    expect(report.summary.totalDurationMs).toBeGreaterThan(0);
    expect(text).toContain("OneGrid benchmark report");
    expect(text).toContain("viewport-100m-window");

    for (const scenario of report.scenarios) {
      expect(scenario.durationMs).toBeGreaterThan(0);
      expect(scenario.opsPerSecond).toBeGreaterThan(0);
      expect(scenario.metrics.some((metric) => metric.name === "duration")).toBe(true);
      expect(scenario.metrics.some((metric) => metric.name === "opsPerSecond")).toBe(true);
    }
  });
});
