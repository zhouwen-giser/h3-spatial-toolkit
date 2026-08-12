export type GateStatus = "PASS" | "FAIL" | "NOT_COMPARABLE";

export interface BenchmarkMethodology {
  mode: "certifying" | "diagnostic";
  warmupRuns: number;
  recordedRuns: number;
  statistic: "median" | "single";
}

export interface PointSample {
  durationMs: number;
  recordsPerSecond: number;
  microsecondsPerRecord: number;
  rssDeltaMb: number;
  uniqueCells: number;
  checksum: number;
}

export interface AggregationSample {
  durationMs: number;
  recordsPerSecond: number;
  rssDeltaMb: number;
  groups: number;
  total: number;
}

export interface PolygonSample {
  durationMs: number;
  cells: number;
}

export interface BenchmarkEnvironment {
  node: string;
  platform: string;
  arch: string;
  cpus: number;
  h3Js: string;
  cpuModel: string;
  osRelease: string;
  memoryBucket: string;
}

export interface PointResult {
  records: number;
  durationMs: number;
  recordsPerSecond: number;
  microsecondsPerRecord: number;
  rssDeltaMb: number;
  uniqueCells: number;
  checksum: number;
  p95DurationMs?: number;
  samples?: PointSample[];
}

export interface AggregationResult {
  records: number;
  durationMs: number;
  recordsPerSecond: number;
  rssDeltaMb: number;
  groups: number;
  total: number;
  p95DurationMs?: number;
  samples?: AggregationSample[];
}

export interface PolygonResult {
  name: string;
  resolution: number;
  cells: number;
  durationMs: number;
  p95DurationMs?: number;
  samples?: PolygonSample[];
}

export interface BenchmarkResult {
  schemaVersion: 2;
  generatedAt: string;
  environment: BenchmarkEnvironment;
  methodology: BenchmarkMethodology;
  pointToH3: PointResult[];
  aggregation: AggregationResult[];
  polygonToCells: PolygonResult[];
}

interface PointCorrectness {
  uniqueCells: number;
  checksum: number;
}

interface AggregationCorrectness {
  groups: number;
  total: number;
}

interface PolygonCorrectness {
  resolution: number;
  cells: number;
}

export interface CorrectnessBaseline {
  schemaVersion: 1;
  h3Js: string;
  pointToH3: Record<string, PointCorrectness>;
  aggregation: Record<string, AggregationCorrectness>;
  polygonToCells: Record<string, PolygonCorrectness>;
}

interface TimedBaseline {
  durationMs: number;
  recordsPerSecond?: number;
}

export interface PerformanceBaseline {
  id: string;
  recordedAt: string;
  source: string;
  methodology: BenchmarkMethodology;
  environment: BenchmarkEnvironment;
  pointToH3: Record<string, TimedBaseline>;
  aggregation: Record<string, TimedBaseline>;
  polygonToCells: Record<string, TimedBaseline>;
}

export interface PerformanceBaselines {
  schemaVersion: 2;
  tolerancePercent: number;
  matchingFields: (keyof BenchmarkEnvironment)[];
  baselines: PerformanceBaseline[];
}

export interface PerformanceComparison {
  scenario: string;
  baselineDurationMs: number;
  actualDurationMs: number;
  allowedDurationMs: number;
  durationChangePercent: number;
  baselineRecordsPerSecond?: number;
  actualRecordsPerSecond?: number;
  throughputChangePercent?: number;
  status: "PASS" | "FAIL";
}

export interface BenchmarkEvaluation {
  status: GateStatus;
  correctness: {
    status: "PASS" | "FAIL";
    failures: string[];
  };
  performance: {
    status: GateStatus;
    environmentKey: string;
    baselineId: string | null;
    tolerancePercent: number;
    comparisons: PerformanceComparison[];
    regressions: string[];
    reason?: string;
  };
}

const environmentFields = [
  "node",
  "platform",
  "arch",
  "cpus",
  "h3Js",
  "cpuModel",
  "osRelease",
  "memoryBucket"
] as const;

export function parseBenchmarkResult(value: unknown): BenchmarkResult {
  const root = record(value, "benchmark result");
  if (root.schemaVersion !== 2) throw new Error("benchmark result.schemaVersion must be 2");
  const methodology = parseMethodology(root.methodology, "methodology");
  const environmentValue = record(root.environment, "environment");
  const environment: BenchmarkEnvironment = {
    node: stringValue(environmentValue.node, "environment.node"),
    platform: stringValue(environmentValue.platform, "environment.platform"),
    arch: stringValue(environmentValue.arch, "environment.arch"),
    cpus: integer(environmentValue.cpus, "environment.cpus"),
    h3Js: stringValue(environmentValue.h3Js, "environment.h3Js"),
    cpuModel: stringValue(environmentValue.cpuModel, "environment.cpuModel"),
    osRelease: stringValue(environmentValue.osRelease, "environment.osRelease"),
    memoryBucket: stringValue(environmentValue.memoryBucket, "environment.memoryBucket")
  };

  return {
    schemaVersion: 2,
    generatedAt: timestamp(root.generatedAt, "generatedAt"),
    environment,
    methodology,
    pointToH3: array(root.pointToH3, "pointToH3").map((entry, index) => {
      const item = record(entry, `pointToH3[${index}]`);
      const parsed: PointResult = {
        records: positiveInteger(item.records, `pointToH3[${index}].records`),
        durationMs: nonNegativeNumber(item.durationMs, `pointToH3[${index}].durationMs`),
        recordsPerSecond: positiveInteger(item.recordsPerSecond, `pointToH3[${index}].recordsPerSecond`),
        microsecondsPerRecord: nonNegativeNumber(
          item.microsecondsPerRecord,
          `pointToH3[${index}].microsecondsPerRecord`
        ),
        rssDeltaMb: finiteNumber(item.rssDeltaMb, `pointToH3[${index}].rssDeltaMb`),
        uniqueCells: positiveInteger(item.uniqueCells, `pointToH3[${index}].uniqueCells`),
        checksum: nonNegativeInteger(item.checksum, `pointToH3[${index}].checksum`)
      };
      if (item.p95DurationMs !== undefined) {
        parsed.p95DurationMs = nonNegativeNumber(item.p95DurationMs, `pointToH3[${index}].p95DurationMs`);
      }
      if (item.samples !== undefined) {
        parsed.samples = array(item.samples, `pointToH3[${index}].samples`).map((sample, sampleIndex) => {
          const value = record(sample, `pointToH3[${index}].samples[${sampleIndex}]`);
          return {
            durationMs: nonNegativeNumber(value.durationMs, `pointToH3[${index}].samples[${sampleIndex}].durationMs`),
            recordsPerSecond: positiveInteger(
              value.recordsPerSecond,
              `pointToH3[${index}].samples[${sampleIndex}].recordsPerSecond`
            ),
            microsecondsPerRecord: nonNegativeNumber(
              value.microsecondsPerRecord,
              `pointToH3[${index}].samples[${sampleIndex}].microsecondsPerRecord`
            ),
            rssDeltaMb: finiteNumber(value.rssDeltaMb, `pointToH3[${index}].samples[${sampleIndex}].rssDeltaMb`),
            uniqueCells: positiveInteger(value.uniqueCells, `pointToH3[${index}].samples[${sampleIndex}].uniqueCells`),
            checksum: nonNegativeInteger(value.checksum, `pointToH3[${index}].samples[${sampleIndex}].checksum`)
          };
        });
      }
      validateSamples(parsed, methodology, `pointToH3[${index}]`, ["uniqueCells", "checksum"]);
      return parsed;
    }),
    aggregation: array(root.aggregation, "aggregation").map((entry, index) => {
      const item = record(entry, `aggregation[${index}]`);
      const parsed: AggregationResult = {
        records: positiveInteger(item.records, `aggregation[${index}].records`),
        durationMs: nonNegativeNumber(item.durationMs, `aggregation[${index}].durationMs`),
        recordsPerSecond: positiveInteger(item.recordsPerSecond, `aggregation[${index}].recordsPerSecond`),
        rssDeltaMb: finiteNumber(item.rssDeltaMb, `aggregation[${index}].rssDeltaMb`),
        groups: positiveInteger(item.groups, `aggregation[${index}].groups`),
        total: positiveInteger(item.total, `aggregation[${index}].total`)
      };
      if (item.p95DurationMs !== undefined) {
        parsed.p95DurationMs = nonNegativeNumber(item.p95DurationMs, `aggregation[${index}].p95DurationMs`);
      }
      if (item.samples !== undefined) {
        parsed.samples = array(item.samples, `aggregation[${index}].samples`).map((sample, sampleIndex) => {
          const value = record(sample, `aggregation[${index}].samples[${sampleIndex}]`);
          return {
            durationMs: nonNegativeNumber(value.durationMs, `aggregation[${index}].samples[${sampleIndex}].durationMs`),
            recordsPerSecond: positiveInteger(
              value.recordsPerSecond,
              `aggregation[${index}].samples[${sampleIndex}].recordsPerSecond`
            ),
            rssDeltaMb: finiteNumber(value.rssDeltaMb, `aggregation[${index}].samples[${sampleIndex}].rssDeltaMb`),
            groups: positiveInteger(value.groups, `aggregation[${index}].samples[${sampleIndex}].groups`),
            total: positiveInteger(value.total, `aggregation[${index}].samples[${sampleIndex}].total`)
          };
        });
      }
      validateSamples(parsed, methodology, `aggregation[${index}]`, ["groups", "total"]);
      return parsed;
    }),
    polygonToCells: array(root.polygonToCells, "polygonToCells").map((entry, index) => {
      const item = record(entry, `polygonToCells[${index}]`);
      const parsed: PolygonResult = {
        name: stringValue(item.name, `polygonToCells[${index}].name`),
        resolution: nonNegativeInteger(item.resolution, `polygonToCells[${index}].resolution`),
        cells: positiveInteger(item.cells, `polygonToCells[${index}].cells`),
        durationMs: nonNegativeNumber(item.durationMs, `polygonToCells[${index}].durationMs`)
      };
      if (item.p95DurationMs !== undefined) {
        parsed.p95DurationMs = nonNegativeNumber(item.p95DurationMs, `polygonToCells[${index}].p95DurationMs`);
      }
      if (item.samples !== undefined) {
        parsed.samples = array(item.samples, `polygonToCells[${index}].samples`).map((sample, sampleIndex) => {
          const value = record(sample, `polygonToCells[${index}].samples[${sampleIndex}]`);
          return {
            durationMs: nonNegativeNumber(
              value.durationMs,
              `polygonToCells[${index}].samples[${sampleIndex}].durationMs`
            ),
            cells: positiveInteger(value.cells, `polygonToCells[${index}].samples[${sampleIndex}].cells`)
          };
        });
      }
      validateSamples(parsed, methodology, `polygonToCells[${index}]`, ["cells"]);
      return parsed;
    })
  };
}

export function parseCorrectnessBaseline(value: unknown): CorrectnessBaseline {
  const root = record(value, "correctness baseline");
  if (root.schemaVersion !== 1) throw new Error("correctness baseline.schemaVersion must be 1");
  return {
    schemaVersion: 1,
    h3Js: stringValue(root.h3Js, "correctness baseline.h3Js"),
    pointToH3: parseRecordOf(root.pointToH3, "correctness baseline.pointToH3", (item, path) => ({
      uniqueCells: positiveInteger(item.uniqueCells, `${path}.uniqueCells`),
      checksum: nonNegativeInteger(item.checksum, `${path}.checksum`)
    })),
    aggregation: parseRecordOf(root.aggregation, "correctness baseline.aggregation", (item, path) => ({
      groups: positiveInteger(item.groups, `${path}.groups`),
      total: positiveInteger(item.total, `${path}.total`)
    })),
    polygonToCells: parseRecordOf(root.polygonToCells, "correctness baseline.polygonToCells", (item, path) => ({
      resolution: nonNegativeInteger(item.resolution, `${path}.resolution`),
      cells: positiveInteger(item.cells, `${path}.cells`)
    }))
  };
}

export function parsePerformanceBaselines(value: unknown): PerformanceBaselines {
  const root = record(value, "performance baselines");
  if (root.schemaVersion !== 2) throw new Error("performance baselines.schemaVersion must be 2");
  const matchingFields = array(root.matchingFields, "performance baselines.matchingFields").map((entry, index) => {
    const field = stringValue(entry, `performance baselines.matchingFields[${index}]`);
    if (!environmentFields.includes(field as (typeof environmentFields)[number])) {
      throw new Error(`performance baselines.matchingFields[${index}] is unsupported: ${field}`);
    }
    return field as keyof BenchmarkEnvironment;
  });
  if (new Set(matchingFields).size !== matchingFields.length || matchingFields.length === 0) {
    throw new Error("performance baselines.matchingFields must be non-empty and unique");
  }
  for (const field of environmentFields) {
    if (!matchingFields.includes(field)) {
      throw new Error(`performance baselines.matchingFields must include ${field}`);
    }
  }

  const tolerancePercent = nonNegativeNumber(root.tolerancePercent, "performance baselines.tolerancePercent");
  if (tolerancePercent > 100) {
    throw new Error("performance baselines.tolerancePercent must not exceed 100");
  }

  return {
    schemaVersion: 2,
    tolerancePercent,
    matchingFields,
    baselines: array(root.baselines, "performance baselines.baselines").map((entry, index) => {
      const item = record(entry, `performance baselines.baselines[${index}]`);
      const environmentValue = record(item.environment, `performance baselines.baselines[${index}].environment`);
      return {
        id: stringValue(item.id, `performance baselines.baselines[${index}].id`),
        recordedAt: timestamp(item.recordedAt, `performance baselines.baselines[${index}].recordedAt`),
        source: stringValue(item.source, `performance baselines.baselines[${index}].source`),
        methodology: parseMethodology(item.methodology, `performance baselines.baselines[${index}].methodology`),
        environment: {
          node: stringValue(environmentValue.node, `baselines[${index}].environment.node`),
          platform: stringValue(environmentValue.platform, `baselines[${index}].environment.platform`),
          arch: stringValue(environmentValue.arch, `baselines[${index}].environment.arch`),
          cpus: positiveInteger(environmentValue.cpus, `baselines[${index}].environment.cpus`),
          h3Js: stringValue(environmentValue.h3Js, `baselines[${index}].environment.h3Js`),
          cpuModel: stringValue(environmentValue.cpuModel, `baselines[${index}].environment.cpuModel`),
          osRelease: stringValue(environmentValue.osRelease, `baselines[${index}].environment.osRelease`),
          memoryBucket: stringValue(environmentValue.memoryBucket, `baselines[${index}].environment.memoryBucket`)
        },
        pointToH3: parseTimedRecord(item.pointToH3, `performance baselines.baselines[${index}].pointToH3`, true),
        aggregation: parseTimedRecord(item.aggregation, `performance baselines.baselines[${index}].aggregation`, true),
        polygonToCells: parseTimedRecord(
          item.polygonToCells,
          `performance baselines.baselines[${index}].polygonToCells`,
          false
        )
      };
    })
  };
}

export function evaluateBenchmark(
  result: BenchmarkResult,
  correctnessBaseline: CorrectnessBaseline,
  performanceBaselines: PerformanceBaselines
): BenchmarkEvaluation {
  parseBenchmarkResult(result);
  const correctnessFailures = evaluateCorrectness(result, correctnessBaseline);
  const environmentKey = formatEnvironmentKey(result.environment, performanceBaselines.matchingFields);
  const matches = performanceBaselines.baselines.filter(
    (baseline) =>
      baseline.methodology.mode === result.methodology.mode &&
      baseline.methodology.warmupRuns === result.methodology.warmupRuns &&
      baseline.methodology.recordedRuns === result.methodology.recordedRuns &&
      baseline.methodology.statistic === result.methodology.statistic &&
      performanceBaselines.matchingFields.every((field) => baseline.environment[field] === result.environment[field])
  );

  if (matches.length > 1) {
    throw new Error(`multiple performance baselines match ${environmentKey}`);
  }

  let performance: BenchmarkEvaluation["performance"];
  const baseline = matches[0];
  if (!baseline) {
    performance = {
      status: "NOT_COMPARABLE",
      environmentKey,
      baselineId: null,
      tolerancePercent: performanceBaselines.tolerancePercent,
      comparisons: [],
      regressions: [],
      reason:
        result.methodology.mode === "diagnostic"
          ? "The result declares diagnostic methodology and cannot certify the performance gate."
          : "No certifying baseline matches every declared environment field and methodology field."
    };
  } else {
    const comparisons = comparePerformance(result, baseline, performanceBaselines.tolerancePercent);
    const regressions = evaluatePerformanceCoverage(result, baseline, correctnessBaseline);
    regressions.push(
      ...comparisons
        .filter((comparison) => comparison.status === "FAIL")
        .map(
          (comparison) =>
            `${comparison.scenario}: ${comparison.actualDurationMs}ms exceeds ${comparison.allowedDurationMs}ms ` +
            `(baseline ${comparison.baselineDurationMs}ms, +${comparison.durationChangePercent}%)`
        )
    );
    const unknownIdentity = performanceBaselines.matchingFields.some(
      (field) => result.environment[field] === "unknown" || baseline.environment[field] === "unknown"
    );
    const diagnosticMethodology =
      result.methodology.mode === "diagnostic" || baseline.methodology.mode === "diagnostic";
    performance = {
      status: unknownIdentity || diagnosticMethodology ? "NOT_COMPARABLE" : regressions.length === 0 ? "PASS" : "FAIL",
      environmentKey,
      baselineId: baseline.id,
      tolerancePercent: performanceBaselines.tolerancePercent,
      comparisons,
      regressions,
      ...(unknownIdentity || diagnosticMethodology
        ? {
            reason: unknownIdentity
              ? "The matching record contains unknown hardware or OS identity; timing differences are diagnostic only."
              : "The matching result or baseline declares diagnostic methodology; timing differences cannot certify the gate."
          }
        : {})
    };
  }

  const correctnessStatus = correctnessFailures.length === 0 ? "PASS" : "FAIL";
  const status: GateStatus =
    correctnessStatus === "FAIL" || performance.status === "FAIL"
      ? "FAIL"
      : performance.status === "NOT_COMPARABLE"
        ? "NOT_COMPARABLE"
        : "PASS";

  return {
    status,
    correctness: { status: correctnessStatus, failures: correctnessFailures },
    performance
  };
}

export function formatEvaluation(evaluation: BenchmarkEvaluation): string {
  const lines = [
    `G3 benchmark gate: ${evaluation.status}`,
    `Correctness: ${evaluation.correctness.status}`,
    `Performance: ${evaluation.performance.status}`,
    `Environment: ${evaluation.performance.environmentKey}`,
    `Tolerance: ${evaluation.performance.tolerancePercent}%`
  ];
  if (evaluation.performance.baselineId) {
    lines.push(`Baseline: ${evaluation.performance.baselineId}`);
  }
  if (evaluation.performance.reason) lines.push(`Reason: ${evaluation.performance.reason}`);
  for (const failure of evaluation.correctness.failures) lines.push(`CORRECTNESS FAILURE: ${failure}`);
  const differenceLabel = evaluation.performance.status === "NOT_COMPARABLE" ? "UNVERIFIED DIFFERENCE" : "REGRESSION";
  for (const regression of evaluation.performance.regressions) {
    lines.push(`${differenceLabel}: ${regression}`);
  }
  return lines.join("\n");
}

export function benchmarkExitCode(status: GateStatus, diagnostic = false): number {
  return status === "PASS" || (diagnostic && status === "NOT_COMPARABLE") ? 0 : 1;
}

function evaluateCorrectness(result: BenchmarkResult, baseline: CorrectnessBaseline): string[] {
  const failures: string[] = [];
  if (result.environment.h3Js !== baseline.h3Js) {
    failures.push(`h3-js version ${result.environment.h3Js} does not match ${baseline.h3Js}`);
  }

  reportDuplicates(
    failures,
    "pointToH3",
    result.pointToH3.map((entry) => String(entry.records))
  );
  const points = new Map(result.pointToH3.map((entry) => [String(entry.records), entry]));
  for (const [records, expected] of Object.entries(baseline.pointToH3)) {
    const actual = points.get(records);
    if (!actual) {
      failures.push(`pointToH3:${records} is missing`);
      continue;
    }
    compareExact(failures, `pointToH3:${records}.uniqueCells`, actual.uniqueCells, expected.uniqueCells);
    compareExact(failures, `pointToH3:${records}.checksum`, actual.checksum, expected.checksum);
  }
  reportUnexpected(failures, "pointToH3", points.keys(), Object.keys(baseline.pointToH3));

  reportDuplicates(
    failures,
    "aggregation",
    result.aggregation.map((entry) => String(entry.records))
  );
  const aggregations = new Map(result.aggregation.map((entry) => [String(entry.records), entry]));
  for (const [records, expected] of Object.entries(baseline.aggregation)) {
    const actual = aggregations.get(records);
    if (!actual) {
      failures.push(`aggregation:${records} is missing`);
      continue;
    }
    compareExact(failures, `aggregation:${records}.groups`, actual.groups, expected.groups);
    compareExact(failures, `aggregation:${records}.total`, actual.total, expected.total);
  }
  reportUnexpected(failures, "aggregation", aggregations.keys(), Object.keys(baseline.aggregation));

  reportDuplicates(
    failures,
    "polygonToCells",
    result.polygonToCells.map((entry) => entry.name)
  );
  const polygons = new Map(result.polygonToCells.map((entry) => [entry.name, entry]));
  for (const [name, expected] of Object.entries(baseline.polygonToCells)) {
    const actual = polygons.get(name);
    if (!actual) {
      failures.push(`polygonToCells:${name} is missing`);
      continue;
    }
    compareExact(failures, `polygonToCells:${name}.resolution`, actual.resolution, expected.resolution);
    compareExact(failures, `polygonToCells:${name}.cells`, actual.cells, expected.cells);
  }
  reportUnexpected(failures, "polygonToCells", polygons.keys(), Object.keys(baseline.polygonToCells));
  return failures;
}

function evaluatePerformanceCoverage(
  result: BenchmarkResult,
  baseline: PerformanceBaseline,
  correctness: CorrectnessBaseline
): string[] {
  const failures: string[] = [];
  compareScenarioKeys(
    failures,
    "baseline.pointToH3",
    Object.keys(baseline.pointToH3),
    Object.keys(correctness.pointToH3)
  );
  compareScenarioKeys(
    failures,
    "baseline.aggregation",
    Object.keys(baseline.aggregation),
    Object.keys(correctness.aggregation)
  );
  compareScenarioKeys(
    failures,
    "baseline.polygonToCells",
    Object.keys(baseline.polygonToCells),
    Object.keys(correctness.polygonToCells)
  );
  compareScenarioKeys(
    failures,
    "result.pointToH3",
    result.pointToH3.map((entry) => String(entry.records)),
    Object.keys(correctness.pointToH3)
  );
  compareScenarioKeys(
    failures,
    "result.aggregation",
    result.aggregation.map((entry) => String(entry.records)),
    Object.keys(correctness.aggregation)
  );
  compareScenarioKeys(
    failures,
    "result.polygonToCells",
    result.polygonToCells.map((entry) => entry.name),
    Object.keys(correctness.polygonToCells)
  );
  return failures;
}

function compareScenarioKeys(failures: string[], path: string, actual: string[], expected: string[]): void {
  const actualKeys = new Set(actual);
  const expectedKeys = new Set(expected);
  for (const key of expectedKeys) {
    if (!actualKeys.has(key)) failures.push(`${path} is missing scenario ${key}`);
  }
  for (const key of actualKeys) {
    if (!expectedKeys.has(key)) failures.push(`${path} has unexpected scenario ${key}`);
  }
}

function comparePerformance(
  result: BenchmarkResult,
  baseline: PerformanceBaseline,
  tolerancePercent: number
): PerformanceComparison[] {
  const comparisons: PerformanceComparison[] = [];
  const points = new Map(result.pointToH3.map((entry) => [String(entry.records), entry]));
  for (const [records, expected] of Object.entries(baseline.pointToH3)) {
    const actual = points.get(records);
    if (actual) comparisons.push(comparison(`pointToH3:${records}`, actual, expected, tolerancePercent));
  }
  const aggregations = new Map(result.aggregation.map((entry) => [String(entry.records), entry]));
  for (const [records, expected] of Object.entries(baseline.aggregation)) {
    const actual = aggregations.get(records);
    if (actual) comparisons.push(comparison(`aggregation:${records}`, actual, expected, tolerancePercent));
  }
  const polygons = new Map(result.polygonToCells.map((entry) => [entry.name, entry]));
  for (const [name, expected] of Object.entries(baseline.polygonToCells)) {
    const actual = polygons.get(name);
    if (actual) comparisons.push(comparison(`polygonToCells:${name}`, actual, expected, tolerancePercent));
  }
  return comparisons;
}

function comparison(
  scenario: string,
  actual: { durationMs: number; recordsPerSecond?: number },
  baseline: TimedBaseline,
  tolerancePercent: number
): PerformanceComparison {
  const allowedDuration = baseline.durationMs * (1 + tolerancePercent / 100);
  const allowedDurationMs = round(allowedDuration);
  const durationChangePercent = round((actual.durationMs / baseline.durationMs - 1) * 100);
  const throughputChangePercent =
    actual.recordsPerSecond !== undefined && baseline.recordsPerSecond !== undefined
      ? round((actual.recordsPerSecond / baseline.recordsPerSecond - 1) * 100)
      : undefined;
  return {
    scenario,
    baselineDurationMs: baseline.durationMs,
    actualDurationMs: actual.durationMs,
    allowedDurationMs,
    durationChangePercent,
    ...(baseline.recordsPerSecond === undefined ? {} : { baselineRecordsPerSecond: baseline.recordsPerSecond }),
    ...(actual.recordsPerSecond === undefined ? {} : { actualRecordsPerSecond: actual.recordsPerSecond }),
    ...(throughputChangePercent === undefined ? {} : { throughputChangePercent }),
    status: actual.durationMs <= allowedDuration + Number.EPSILON ? "PASS" : "FAIL"
  };
}

function compareExact(failures: string[], path: string, actual: number, expected: number): void {
  if (actual !== expected) failures.push(`${path} expected ${expected}, received ${actual}`);
}

function reportDuplicates(failures: string[], group: string, keys: string[]): void {
  const seen = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) failures.push(`${group}:${key} is duplicated`);
    seen.add(key);
  }
}

function reportUnexpected(failures: string[], group: string, keys: Iterable<string>, expected: string[]): void {
  const allowed = new Set(expected);
  for (const key of keys) {
    if (!allowed.has(key)) failures.push(`${group}:${key} is unexpected`);
  }
}

function formatEnvironmentKey(environment: BenchmarkEnvironment, fields: (keyof BenchmarkEnvironment)[]): string {
  return fields.map((field) => `${field}=${environment[field]}`).join(";");
}

function parseTimedRecord(value: unknown, path: string, throughputRequired: boolean) {
  const parsed = parseRecordOf(value, path, (item, itemPath) => ({
    durationMs: nonNegativeNumber(item.durationMs, `${itemPath}.durationMs`),
    ...(throughputRequired
      ? {
          recordsPerSecond: positiveInteger(item.recordsPerSecond, `${itemPath}.recordsPerSecond`)
        }
      : {})
  }));
  if (Object.keys(parsed).length === 0) throw new Error(`${path} must not be empty`);
  return parsed;
}

function parseMethodology(value: unknown, path: string): BenchmarkMethodology {
  const source = record(value, path);
  const mode = stringValue(source.mode, `${path}.mode`);
  if (mode !== "certifying" && mode !== "diagnostic") {
    throw new Error(`${path}.mode must be certifying or diagnostic`);
  }
  const warmupRuns = nonNegativeInteger(source.warmupRuns, `${path}.warmupRuns`);
  const recordedRuns = positiveInteger(source.recordedRuns, `${path}.recordedRuns`);
  const statistic = stringValue(source.statistic, `${path}.statistic`);
  if (statistic !== "median" && statistic !== "single") {
    throw new Error(`${path}.statistic must be median or single`);
  }
  if (mode === "certifying" && (warmupRuns < 1 || recordedRuns < 3 || statistic !== "median")) {
    throw new Error(`${path} certifying methodology requires warmupRuns >= 1, recordedRuns >= 3, and median`);
  }
  return { mode, warmupRuns, recordedRuns, statistic };
}

function validateSamples(
  result: { durationMs: number; p95DurationMs?: number; samples?: Array<{ durationMs: number }> },
  methodology: BenchmarkMethodology,
  path: string,
  exactFields: string[]
): void {
  if (methodology.mode !== "certifying") return;
  if (!result.samples) throw new Error(`${path}.samples is required for certifying methodology`);
  if (result.samples.length !== methodology.recordedRuns) {
    throw new Error(`${path}.samples must contain exactly ${methodology.recordedRuns} recorded runs`);
  }
  const durations = result.samples.map((sample) => sample.durationMs);
  const expectedMedian = median(durations);
  if (result.durationMs !== expectedMedian) {
    throw new Error(`${path}.durationMs must equal the declared median ${expectedMedian}`);
  }
  const expectedP95 = percentile95(durations);
  if (result.p95DurationMs === undefined) throw new Error(`${path}.p95DurationMs is required`);
  if (result.p95DurationMs !== expectedP95) {
    throw new Error(`${path}.p95DurationMs must equal the recorded p95 ${expectedP95}`);
  }
  const summary = result as Record<string, unknown>;
  for (const [sampleIndex, sample] of result.samples.entries()) {
    const source = sample as Record<string, unknown>;
    for (const field of exactFields) {
      if (source[field] !== summary[field]) {
        throw new Error(`${path}.samples[${sampleIndex}].${field} must equal ${path}.${field}`);
      }
    }
  }
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

function parseRecordOf<T>(
  value: unknown,
  path: string,
  parse: (item: Record<string, unknown>, path: string) => T
): Record<string, T> {
  const source = record(value, path);
  return Object.fromEntries(
    Object.entries(source).map(([key, item]) => [key, parse(record(item, `${path}.${key}`), `${path}.${key}`)])
  );
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value;
}

function stringValue(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${path} must be a string`);
  return value;
}

function timestamp(value: unknown, path: string): string {
  const text = stringValue(value, path);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${path} must be an ISO timestamp`);
  return text;
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
}

function nonNegativeNumber(value: unknown, path: string): number {
  const number = finiteNumber(value, path);
  if (number < 0) throw new Error(`${path} must be non-negative`);
  return number;
}

function integer(value: unknown, path: string): number {
  const number = finiteNumber(value, path);
  if (!Number.isInteger(number)) throw new Error(`${path} must be an integer`);
  return number;
}

function nonNegativeInteger(value: unknown, path: string): number {
  const number = integer(value, path);
  if (number < 0) throw new Error(`${path} must be non-negative`);
  return number;
}

function positiveInteger(value: unknown, path: string): number {
  const number = integer(value, path);
  if (number <= 0) throw new Error(`${path} must be positive`);
  return number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
