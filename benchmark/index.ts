import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cpus, release, totalmem } from "node:os";
import { performance } from "node:perf_hooks";
import { pointToCell } from "@h3-toolkit/core";
import { polygonToCells } from "@h3-toolkit/geometry";
import {
  benchmarkExitCode,
  evaluateBenchmark,
  formatEvaluation,
  parseBenchmarkResult,
  parseCorrectnessBaseline,
  parsePerformanceBaselines,
  type AggregationResult,
  type AggregationSample,
  type BenchmarkResult,
  type PerformanceBaseline,
  type PointResult,
  type PointSample,
  type PolygonResult,
  type PolygonSample
} from "./gate.js";

const scales = [10_000, 100_000, 1_000_000, 10_000_000];
const warmupRuns = 1;
const recordedRuns = 3;

function coordinate(index: number): { longitude: number; latitude: number } {
  return {
    longitude: 139.55 + (((index * 7919) % 100_000) / 100_000) * 0.5,
    latitude: 35.45 + (((index * 104729) % 100_000) / 100_000) * 0.5
  };
}

function measurePoint(records: number): PointSample {
  if (global.gc) global.gc();
  const rssBefore = process.memoryUsage().rss;
  const start = performance.now();
  const unique = new Set<string>();
  let checksum = 0;
  for (let index = 0; index < records; index += 1) {
    const cell = pointToCell(coordinate(index), 9).index;
    unique.add(cell);
    checksum = (checksum + cell.charCodeAt(index % cell.length)) >>> 0;
  }
  const durationMs = round(performance.now() - start);
  return {
    durationMs,
    recordsPerSecond: Math.round(records / (durationMs / 1000)),
    microsecondsPerRecord: round((durationMs * 1000) / records),
    rssDeltaMb: round((process.memoryUsage().rss - rssBefore) / 1024 / 1024),
    uniqueCells: unique.size,
    checksum
  };
}

function pointBenchmark(records: number): PointResult {
  const samples = runScenario(() => measurePoint(records));
  const durationMs = median(samples.map((sample) => sample.durationMs));
  return {
    records,
    durationMs,
    p95DurationMs: percentile95(samples.map((sample) => sample.durationMs)),
    recordsPerSecond: Math.round(records / (durationMs / 1000)),
    microsecondsPerRecord: round((durationMs * 1000) / records),
    rssDeltaMb: median(samples.map((sample) => sample.rssDeltaMb)),
    uniqueCells: samples[0]!.uniqueCells,
    checksum: samples[0]!.checksum,
    samples
  };
}

function measureAggregation(records: number): AggregationSample {
  if (global.gc) global.gc();
  const rssBefore = process.memoryUsage().rss;
  const start = performance.now();
  const counts = new Map<string, number>();
  for (let index = 0; index < records; index += 1) {
    const cell = pointToCell(coordinate(index), 8).index;
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  const durationMs = round(performance.now() - start);
  return {
    durationMs,
    recordsPerSecond: Math.round(records / (durationMs / 1000)),
    rssDeltaMb: round((process.memoryUsage().rss - rssBefore) / 1024 / 1024),
    groups: counts.size,
    total: [...counts.values()].reduce((sum, value) => sum + value, 0)
  };
}

function aggregationBenchmark(records: number): AggregationResult {
  const samples = runScenario(() => measureAggregation(records));
  const durationMs = median(samples.map((sample) => sample.durationMs));
  return {
    records,
    durationMs,
    p95DurationMs: percentile95(samples.map((sample) => sample.durationMs)),
    recordsPerSecond: Math.round(records / (durationMs / 1000)),
    rssDeltaMb: median(samples.map((sample) => sample.rssDeltaMb)),
    groups: samples[0]!.groups,
    total: samples[0]!.total,
    samples
  };
}

const areas = {
  small: [
    [
      [139.75, 35.67],
      [139.78, 35.67],
      [139.78, 35.69],
      [139.75, 35.69],
      [139.75, 35.67]
    ]
  ],
  medium: [
    [
      [139.5, 35.4],
      [140.0, 35.4],
      [140.0, 35.9],
      [139.5, 35.9],
      [139.5, 35.4]
    ]
  ],
  large: [
    [
      [138.5, 34.5],
      [141.0, 34.5],
      [141.0, 37.0],
      [138.5, 37.0],
      [138.5, 34.5]
    ]
  ]
} satisfies Record<string, GeoJSON.Position[][]>;

function measurePolygon(coordinates: GeoJSON.Position[][]): PolygonSample {
  const start = performance.now();
  const cells = polygonToCells({ type: "Polygon", coordinates }, 9);
  return { cells: cells.length, durationMs: round(performance.now() - start) };
}

function polygonBenchmark(name: string, coordinates: GeoJSON.Position[][]): PolygonResult {
  const samples = runScenario(() => measurePolygon(coordinates));
  const durations = samples.map((sample) => sample.durationMs);
  return {
    name,
    resolution: 9,
    cells: samples[0]!.cells,
    durationMs: median(durations),
    p95DurationMs: percentile95(durations),
    samples
  };
}

function runScenario<T>(run: () => T): T[] {
  for (let index = 0; index < warmupRuns; index += 1) run();
  return Array.from({ length: recordedRuns }, run);
}

const corePackage = JSON.parse(await readFile(new URL("../packages/core/package.json", import.meta.url), "utf8")) as {
  dependencies?: { "h3-js"?: unknown };
};
if (typeof corePackage.dependencies?.["h3-js"] !== "string") {
  throw new Error("packages/core/package.json must declare an exact h3-js version");
}

const result: BenchmarkResult = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: cpus().length,
    h3Js: corePackage.dependencies["h3-js"],
    cpuModel: normalizeCpuModel(cpus()[0]?.model),
    osRelease: release(),
    memoryBucket: memoryBucket(totalmem())
  },
  methodology: { mode: "certifying", warmupRuns, recordedRuns, statistic: "median" },
  pointToH3: scales.map(pointBenchmark),
  aggregation: [1_000_000, 10_000_000].map(aggregationBenchmark),
  polygonToCells: Object.entries(areas).map(([name, coordinates]) => polygonBenchmark(name, coordinates))
};

const [correctnessSource, performanceSource] = await Promise.all([
  readFile(new URL("./correctness-baseline.json", import.meta.url), "utf8"),
  readFile(new URL("./performance-baselines.json", import.meta.url), "utf8")
]);
const correctness = parseCorrectnessBaseline(JSON.parse(correctnessSource) as unknown);
const performanceBaselines = parsePerformanceBaselines(JSON.parse(performanceSource) as unknown);
const parsedResult = parseBenchmarkResult(result);
const evaluation = evaluateBenchmark(parsedResult, correctness, performanceBaselines);
const output = {
  ...result,
  guidance: {
    nodeInMemoryCeiling:
      "Use streaming/chunking from 1M records; move repeatable shared queries or datasets beyond 10M to PostgreSQL/OLAP.",
    interpretation:
      "Performance is the median of three recorded repetitions after one explicit warmup per scenario; p95 is diagnostic."
  },
  gate: evaluation
};

console.log(JSON.stringify(output, null, 2));
console.error(formatEvaluation(evaluation));

const resultName = process.argv.find((argument) => argument.startsWith("--result-name="))?.slice(14);
const baselineId = process.argv.find((argument) => argument.startsWith("--record-baseline="))?.slice(18);
if (resultName && !/^[a-z0-9][a-z0-9._-]*\.json$/i.test(resultName)) {
  throw new Error("--result-name must be a filename ending in .json without path separators");
}
if (baselineId && !/^[a-z0-9][a-z0-9._-]*$/i.test(baselineId)) {
  throw new Error("--record-baseline must be a stable identifier without whitespace or path separators");
}
if (baselineId && !resultName) throw new Error("--record-baseline requires --result-name");

if (process.argv.includes("--write")) {
  await mkdir(new URL("./results", import.meta.url), { recursive: true });
  const serialized = `${JSON.stringify(output, null, 2)}\n`;
  await writeFile(new URL("./results/latest.json", import.meta.url), serialized);
  if (resultName) await writeFile(new URL(`./results/${resultName}`, import.meta.url), serialized);
}

if (baselineId) {
  if (evaluation.correctness.status !== "PASS") {
    throw new Error("refusing to record a performance baseline with failed correctness checks");
  }
  const matching = performanceBaselines.baselines.find((baseline) =>
    performanceBaselines.matchingFields.every(
      (field) => baseline.environment[field] === parsedResult.environment[field]
    )
  );
  if (matching) throw new Error(`a performance baseline already exists for this environment: ${matching.id}`);
  performanceBaselines.baselines.push(
    toPerformanceBaseline(parsedResult, baselineId, `benchmark/results/${resultName}`)
  );
  await writeFile(
    new URL("./performance-baselines.json", import.meta.url),
    `${JSON.stringify(performanceBaselines, null, 2)}\n`
  );
  console.error(`Recorded certifying median baseline: ${baselineId}`);
}

const diagnostic = process.argv.includes("--diagnostic") || Boolean(baselineId);
process.exitCode = benchmarkExitCode(evaluation.status, diagnostic);

function toPerformanceBaseline(source: BenchmarkResult, id: string, resultSource: string): PerformanceBaseline {
  return {
    id,
    recordedAt: source.generatedAt,
    source: resultSource,
    environment: source.environment,
    methodology: source.methodology,
    pointToH3: Object.fromEntries(
      source.pointToH3.map((entry) => [
        String(entry.records),
        { durationMs: entry.durationMs, recordsPerSecond: entry.recordsPerSecond }
      ])
    ),
    aggregation: Object.fromEntries(
      source.aggregation.map((entry) => [
        String(entry.records),
        { durationMs: entry.durationMs, recordsPerSecond: entry.recordsPerSecond }
      ])
    ),
    polygonToCells: Object.fromEntries(
      source.polygonToCells.map((entry) => [entry.name, { durationMs: entry.durationMs }])
    )
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? round((sorted[middle - 1]! + sorted[middle]!) / 2) : sorted[middle]!;
}

function percentile95(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)]!;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeCpuModel(model: string | undefined): string {
  return model?.trim().replace(/\s+/g, " ").toLowerCase() || "unknown";
}

function memoryBucket(bytes: number): string {
  const gibibytes = bytes / 1024 ** 3;
  if (gibibytes < 8) return "<8GiB";
  if (gibibytes < 16) return "8-15GiB";
  if (gibibytes < 32) return "16-31GiB";
  if (gibibytes < 64) return "32-63GiB";
  if (gibibytes < 128) return "64-127GiB";
  return "128+GiB";
}
