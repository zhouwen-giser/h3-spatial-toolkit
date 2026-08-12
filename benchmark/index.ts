import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { pointToCell } from "@h3-toolkit/core";
import { polygonToCells } from "@h3-toolkit/geometry";

const scales = [10_000, 100_000, 1_000_000, 10_000_000];

interface PointResult {
  records: number;
  durationMs: number;
  recordsPerSecond: number;
  microsecondsPerRecord: number;
  rssDeltaMb: number;
  uniqueCells: number;
  checksum: number;
}

function coordinate(index: number): { longitude: number; latitude: number } {
  return {
    longitude: 139.55 + (((index * 7919) % 100_000) / 100_000) * 0.5,
    latitude: 35.45 + (((index * 104729) % 100_000) / 100_000) * 0.5
  };
}

function runPointBenchmark(records: number): PointResult {
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
  const durationMs = performance.now() - start;
  return {
    records,
    durationMs: round(durationMs),
    recordsPerSecond: Math.round(records / (durationMs / 1000)),
    microsecondsPerRecord: round((durationMs * 1000) / records),
    rssDeltaMb: round((process.memoryUsage().rss - rssBefore) / 1024 / 1024),
    uniqueCells: unique.size,
    checksum
  };
}

function runStreamingAggregation(records: number) {
  if (global.gc) global.gc();
  const rssBefore = process.memoryUsage().rss;
  const start = performance.now();
  const counts = new Map<string, number>();
  for (let index = 0; index < records; index += 1) {
    const cell = pointToCell(coordinate(index), 8).index;
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  const durationMs = performance.now() - start;
  return {
    records,
    durationMs: round(durationMs),
    recordsPerSecond: Math.round(records / (durationMs / 1000)),
    rssDeltaMb: round((process.memoryUsage().rss - rssBefore) / 1024 / 1024),
    groups: counts.size,
    total: [...counts.values()].reduce((sum, value) => sum + value, 0)
  };
}

function polygonBenchmark() {
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
  return Object.entries(areas).map(([name, coordinates]) => {
    const start = performance.now();
    const cells = polygonToCells({ type: "Polygon", coordinates }, 9);
    return { name, resolution: 9, cells: cells.length, durationMs: round(performance.now() - start) };
  });
}

const pointToH3 = scales.map(runPointBenchmark);
const aggregation = [1_000_000, 10_000_000].map(runStreamingAggregation);
const result = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: (await import("node:os")).cpus().length
  },
  pointToH3,
  aggregation,
  polygonToCells: polygonBenchmark(),
  guidance: {
    nodeInMemoryCeiling:
      "Use streaming/chunking from 1M records; move repeatable shared queries or datasets beyond 10M to PostgreSQL/OLAP.",
    interpretation:
      "Throughput is machine-specific. Batch limits are governed by memory, response size and timeout, not only H3 computation speed."
  }
};

console.log(JSON.stringify(result, null, 2));
if (process.argv.includes("--write")) {
  await mkdir(new URL("./results", import.meta.url), { recursive: true });
  await writeFile(new URL("./results/latest.json", import.meta.url), `${JSON.stringify(result, null, 2)}\n`);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
