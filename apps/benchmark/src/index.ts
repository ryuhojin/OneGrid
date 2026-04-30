import { createFixtureRows } from "@onegrid/testing";

export interface BenchmarkScenario {
  readonly id: string;
  readonly rows: number;
  readonly description: string;
}

export const benchmarkScenarios: readonly BenchmarkScenario[] = [
  {
    id: "baseline-small-client",
    rows: createFixtureRows(10).length,
    description: "Smoke scenario for benchmark app wiring."
  }
];
