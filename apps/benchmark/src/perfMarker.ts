export interface PerformanceMeasure {
  readonly durationMs: number;
  readonly operations: number;
  readonly opsPerSecond: number;
  readonly checksum: number;
}

export interface PerformanceMetric {
  readonly name: string;
  readonly value: number | string;
  readonly unit: string;
}

export function measureOperations(
  operations: number,
  execute: (iteration: number) => number
): PerformanceMeasure {
  const totalOperations = Math.max(1, Math.trunc(operations));
  let checksum = 0;
  const start = now();

  for (let iteration = 0; iteration < totalOperations; iteration += 1) {
    checksum += execute(iteration);
  }

  const durationMs = Math.max(0.001, now() - start);
  return Object.freeze({
    durationMs: round(durationMs),
    operations: totalOperations,
    opsPerSecond: round(totalOperations / durationMs * 1000),
    checksum: round(checksum)
  });
}

export function measureOnce(execute: () => number): PerformanceMeasure {
  return measureOperations(1, execute);
}

export function createMeasureMetrics(measure: PerformanceMeasure): readonly PerformanceMetric[] {
  return Object.freeze([
    { name: "duration", value: measure.durationMs, unit: "ms" },
    { name: "operations", value: measure.operations, unit: "count" },
    { name: "avgOperation", value: round(measure.durationMs / measure.operations), unit: "ms/op" },
    { name: "opsPerSecond", value: measure.opsPerSecond, unit: "ops/s" },
    { name: "checksum", value: measure.checksum, unit: "hash" }
  ]);
}

export function round(value: number, precision = 3): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}
