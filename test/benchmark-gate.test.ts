import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  benchmarkExitCode,
  evaluateBenchmark,
  parseBenchmarkResult,
  parseCorrectnessBaseline,
  parsePerformanceBaselines,
  type BenchmarkResult,
  type CorrectnessBaseline,
  type PerformanceBaselines
} from "../benchmark/gate.js";

const [correctness, performance] = await Promise.all([
  loadJson("../benchmark/correctness-baseline.json").then(parseCorrectnessBaseline),
  loadJson("../benchmark/performance-baselines.json").then(parsePerformanceBaselines)
]);
const comparablePerformance = withKnownEnvironment(performance);

describe("benchmark gate parser", () => {
  it("rejects a machine result without the current schema version", () => {
    const fixture = validResult(correctness, comparablePerformance) as unknown as Record<string, unknown>;
    delete fixture.schemaVersion;
    expect(() => parseBenchmarkResult(fixture)).toThrow("benchmark result.schemaVersion must be 2");
  });

  it("rejects certifying methodology without warmup, three repetitions, and median", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.methodology = { mode: "certifying", warmupRuns: 0, recordedRuns: 2, statistic: "single" };
    expect(() => parseBenchmarkResult(fixture)).toThrow(
      "certifying methodology requires warmupRuns >= 1, recordedRuns >= 3, and median"
    );
  });

  it("rejects a certifying result with fewer samples than declared", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.pointToH3[0]!.samples!.pop();
    expect(() => parseBenchmarkResult(fixture)).toThrow("samples must contain exactly 3 recorded runs");
  });

  it("rejects a summary that is not the median of the recorded samples", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.pointToH3[0]!.durationMs += 1;
    expect(() => parseBenchmarkResult(fixture)).toThrow("durationMs must equal the declared median");
  });

  it("rejects a result without a recorded h3-js version", () => {
    const fixture = validResult(correctness, comparablePerformance);
    const environment = { ...fixture.environment } as Record<string, unknown>;
    delete environment.h3Js;
    expect(() => parseBenchmarkResult({ ...fixture, environment })).toThrow("environment.h3Js must be a string");
  });

  it("rejects a malformed timing instead of treating it as comparable", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.pointToH3[0]!.durationMs = Number.NaN;
    expect(() => parseBenchmarkResult(fixture)).toThrow("pointToH3[0].durationMs must be a finite number");
  });

  it("rejects a baseline configuration that omits the CPU identity key", () => {
    const source = structuredClone(performance) as unknown as Record<string, unknown>;
    source.matchingFields = (source.matchingFields as string[]).filter((field) => field !== "cpuModel");
    expect(() => parsePerformanceBaselines(source)).toThrow(
      "performance baselines.matchingFields must include cpuModel"
    );
  });

  it("rejects an empty performance timing map", () => {
    const source = structuredClone(comparablePerformance);
    source.baselines[0]!.aggregation = {};
    expect(() => parsePerformanceBaselines(source)).toThrow("aggregation must not be empty");
  });
});

describe("benchmark correctness and regression comparison", () => {
  it("passes an exact correctness fixture at the 20 percent duration boundary", () => {
    const fixture = validResult(correctness, comparablePerformance, 1.2);
    const evaluation = evaluateBenchmark(fixture, correctness, comparablePerformance);
    expect(evaluation.status).toBe("PASS");
    expect(evaluation.performance.comparisons).toHaveLength(9);
  });

  it("fails a one-unit checksum mutation without running the timed benchmark", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.pointToH3[0]!.checksum += 1;
    for (const sample of fixture.pointToH3[0]!.samples!) sample.checksum += 1;
    const evaluation = evaluateBenchmark(fixture, correctness, comparablePerformance);
    expect(evaluation.status).toBe("FAIL");
    expect(evaluation.correctness.failures).toEqual(["pointToH3:10000.checksum expected 777629, received 777630"]);
  });

  it("fails duplicate scenarios instead of accepting the last value", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.pointToH3.push({ ...fixture.pointToH3[0]! });
    const evaluation = evaluateBenchmark(fixture, correctness, comparablePerformance);
    expect(evaluation.status).toBe("FAIL");
    expect(evaluation.correctness.failures).toContain("pointToH3:10000 is duplicated");
  });

  it("fails a comparable result above the declared 20 percent threshold", () => {
    const fixture = validResult(correctness, comparablePerformance);
    const result = fixture.pointToH3.find((entry) => entry.records === 10_000_000)!;
    result.durationMs = 13_300;
    result.p95DurationMs = 13_300;
    for (const sample of result.samples!) sample.durationMs = 13_300;
    const evaluation = evaluateBenchmark(fixture, correctness, comparablePerformance);
    expect(evaluation.status).toBe("FAIL");
    expect(evaluation.performance.regressions[0]).toContain("pointToH3:10000000");
  });

  it("fails when a matching baseline omits a slow scenario", () => {
    const fixture = validResult(correctness, comparablePerformance);
    const incomplete = structuredClone(comparablePerformance);
    delete incomplete.baselines[0]!.pointToH3["10000000"];
    const evaluation = evaluateBenchmark(fixture, correctness, incomplete);
    expect(evaluation.status).toBe("FAIL");
    expect(evaluation.performance.regressions).toContain("baseline.pointToH3 is missing scenario 10000000");
  });

  it("fails when a matching baseline contains an undeclared scenario", () => {
    const fixture = validResult(correctness, comparablePerformance);
    const extra = structuredClone(comparablePerformance);
    extra.baselines[0]!.aggregation["20000000"] = { durationMs: 1, recordsPerSecond: 20_000_000 };
    const evaluation = evaluateBenchmark(fixture, correctness, extra);
    expect(evaluation.status).toBe("FAIL");
    expect(evaluation.performance.regressions).toContain("baseline.aggregation has unexpected scenario 20000000");
  });

  it("reports NOT_COMPARABLE, never PASS, when no environment baseline matches", () => {
    const fixture = validResult(correctness, comparablePerformance);
    fixture.environment = { ...fixture.environment, platform: "win32" };
    const evaluation = evaluateBenchmark(fixture, correctness, comparablePerformance);
    expect(evaluation.status).toBe("NOT_COMPARABLE");
    expect(evaluation.performance.status).toBe("NOT_COMPARABLE");
    expect(evaluation.correctness.status).toBe("PASS");
  });

  it("exposes the recorded Linux 10M Point-to-H3 regression", async () => {
    const historical = parseBenchmarkResult(await loadJson("../benchmark/results/linux-node24-2026-08-12.json"));
    const evaluation = evaluateBenchmark(historical, correctness, performance);
    const comparison = evaluation.performance.comparisons.find((entry) => entry.scenario === "pointToH3:10000000");
    expect(evaluation.status).toBe("NOT_COMPARABLE");
    expect(evaluation.performance.reason).toContain("unknown hardware or OS identity");
    expect(comparison).toMatchObject({
      baselineRecordsPerSecond: 902312,
      actualRecordsPerSecond: 575408,
      throughputChangePercent: -36.23,
      status: "FAIL"
    });
  });
});

describe("benchmark command exit semantics", () => {
  it("fails closed for FAIL and NOT_COMPARABLE in gate mode", () => {
    expect(benchmarkExitCode("PASS")).toBe(0);
    expect(benchmarkExitCode("FAIL")).toBe(1);
    expect(benchmarkExitCode("NOT_COMPARABLE")).toBe(1);
  });

  it("allows an explicitly diagnostic invocation to inspect any status", () => {
    expect(benchmarkExitCode("NOT_COMPARABLE", true)).toBe(0);
    expect(benchmarkExitCode("FAIL", true)).toBe(1);
  });
});

async function loadJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8")) as unknown;
}

function validResult(
  correctnessBaseline: CorrectnessBaseline,
  performanceBaselines: PerformanceBaselines,
  durationMultiplier = 1
): BenchmarkResult {
  const baseline = performanceBaselines.baselines[0]!;
  return {
    schemaVersion: 2,
    generatedAt: "2026-08-12T07:04:28.768Z",
    environment: { ...baseline.environment },
    methodology: { mode: "certifying", warmupRuns: 1, recordedRuns: 3, statistic: "median" },
    pointToH3: Object.entries(correctnessBaseline.pointToH3).map(([records, expected]) => {
      const durationMs = baseline.pointToH3[records]!.durationMs * durationMultiplier;
      const sample = {
        durationMs,
        recordsPerSecond: baseline.pointToH3[records]!.recordsPerSecond!,
        microsecondsPerRecord: 1,
        rssDeltaMb: 1,
        uniqueCells: expected.uniqueCells,
        checksum: expected.checksum
      };
      return {
        records: Number(records),
        ...sample,
        p95DurationMs: durationMs,
        samples: [structuredClone(sample), structuredClone(sample), structuredClone(sample)]
      };
    }),
    aggregation: Object.entries(correctnessBaseline.aggregation).map(([records, expected]) => {
      const durationMs = baseline.aggregation[records]!.durationMs * durationMultiplier;
      const sample = {
        durationMs,
        recordsPerSecond: baseline.aggregation[records]!.recordsPerSecond!,
        rssDeltaMb: 1,
        groups: expected.groups,
        total: expected.total
      };
      return {
        records: Number(records),
        ...sample,
        p95DurationMs: durationMs,
        samples: [structuredClone(sample), structuredClone(sample), structuredClone(sample)]
      };
    }),
    polygonToCells: Object.entries(correctnessBaseline.polygonToCells).map(([name, expected]) => {
      const durationMs = baseline.polygonToCells[name]!.durationMs * durationMultiplier;
      const sample = { durationMs, cells: expected.cells };
      return {
        name,
        resolution: expected.resolution,
        cells: expected.cells,
        durationMs,
        p95DurationMs: durationMs,
        samples: [structuredClone(sample), structuredClone(sample), structuredClone(sample)]
      };
    })
  };
}

function withKnownEnvironment(source: PerformanceBaselines): PerformanceBaselines {
  return {
    ...source,
    baselines: source.baselines.map((baseline) => ({
      ...baseline,
      methodology: { mode: "certifying", warmupRuns: 1, recordedRuns: 3, statistic: "median" },
      environment: {
        ...baseline.environment,
        cpuModel: "fixture cpu",
        osRelease: "fixture os",
        memoryBucket: "16-31GiB"
      }
    }))
  };
}
