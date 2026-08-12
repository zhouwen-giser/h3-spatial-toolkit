#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { aggregate, type AggregateOperation, type AggregateRecord } from "@h3-toolkit/aggregation";
import { pointToCell, type ResolutionInput } from "@h3-toolkit/core";
import { calculateCoverage, type CoverageInput } from "@h3-toolkit/coverage";
import { aggregateFlow, trajectoryToFlow, type TrajectoryPoint } from "@h3-toolkit/flow";
import { cellsToGeoJSON, geometryToCells, type Polygonal } from "@h3-toolkit/geometry";
import { parseCsv, toCsv } from "@h3-toolkit/io";
import { gridDisk } from "@h3-toolkit/neighborhood";

export interface CliIo {
  read(path: string): Promise<string>;
  write(path: string, content: string): Promise<void>;
  stdout(content: string): void;
  stderr(content: string): void;
}

const defaultIo: CliIo = {
  read: (path) => readFile(path, "utf8"),
  write: (path, content) => writeFile(path, content, "utf8"),
  stdout: (content) => process.stdout.write(content),
  stderr: (content) => process.stderr.write(content)
};

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  try {
    const [command, ...rest] = argv;
    const args = parseArgs(rest);
    let result: unknown;
    switch (command) {
      case "point":
        result = pointToCell(
          { longitude: numberArg(args, "lng"), latitude: numberArg(args, "lat") },
          resolutionArg(args)
        );
        break;
      case "polygon": {
        const geometry = await readJson<Polygonal>(stringArg(args, "input"), io);
        const cells = geometryToCells(geometry, resolutionArg(args));
        result = args.outputType === "geojson" ? cellsToGeoJSON(cells) : cells;
        break;
      }
      case "neighbors":
        result = gridDisk(stringArg(args, "cell"), args.k === undefined ? 1 : Number(args.k));
        break;
      case "aggregate": {
        const records = await readRecords(stringArg(args, "input"), io);
        result = aggregate(
          records,
          (args.operation ?? "count") as AggregateOperation,
          resolutionArg(args),
          args.metric
        );
        break;
      }
      case "coverage": {
        const input = await readJson<Omit<CoverageInput, "resolution">>(stringArg(args, "input"), io);
        result = calculateCoverage({ ...input, resolution: resolutionArg(args) });
        break;
      }
      case "flow": {
        const trajectories = await readJson<TrajectoryPoint[][]>(stringArg(args, "input"), io);
        const flows = trajectories
          .map((trajectory) => trajectoryToFlow(trajectory, resolutionArg(args)))
          .filter((flow) => flow !== null);
        result = aggregateFlow(flows, args.directed !== "false");
        break;
      }
      case "help":
      case undefined:
        io.stdout(helpText);
        return 0;
      default:
        throw new Error(`Unknown command: ${command}`);
    }
    const output = formatResult(result, args.format ?? "json");
    if (args.output) await io.write(args.output, output);
    else io.stdout(output);
    return 0;
  } catch (error) {
    io.stderr(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

const helpText = `H3 Spatial Toolkit CLI

Commands:
  h3 point --lng <number> --lat <number> --resolution <0-15|POLICY>
  h3 polygon --input area.geojson --resolution 9 [--output-type geojson]
  h3 neighbors --cell <h3> [--k 1]
  h3 aggregate --input points.csv --resolution 9 --operation count
  h3 coverage --input coverage.json --resolution 9
  h3 flow --input trajectories.json --resolution 9

Common: --format json|csv --output <path>
`;

function parseArgs(tokens: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!;
    if (!token.startsWith("--")) continue;
    const key = token.slice(2).replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
    const next = tokens[index + 1];
    result[key] = next && !next.startsWith("--") ? ((index += 1), next) : "true";
  }
  return result;
}

function stringArg(args: Record<string, string>, key: string): string {
  const value = args[key];
  if (!value) throw new Error(`Missing --${key}`);
  return value;
}

function numberArg(args: Record<string, string>, key: string): number {
  const value = Number(stringArg(args, key));
  if (!Number.isFinite(value)) throw new Error(`--${key} must be a number`);
  return value;
}

function resolutionArg(args: Record<string, string>): ResolutionInput {
  const value = stringArg(args, "resolution");
  return /^\d+$/.test(value) ? Number(value) : (value as ResolutionInput);
}

async function readJson<T>(path: string, io: CliIo): Promise<T> {
  return JSON.parse(await io.read(path)) as T;
}

async function readRecords(path: string, io: CliIo): Promise<AggregateRecord[]> {
  const content = await io.read(path);
  if (!path.toLowerCase().endsWith(".csv")) return JSON.parse(content) as AggregateRecord[];
  return parseCsv(content).map((row) => ({
    ...(row.cell ? { cell: row.cell } : { longitude: Number(row.longitude), latitude: Number(row.latitude) }),
    ...(row.value ? { value: Number(row.value) } : {}),
    ...(row.weight ? { weight: Number(row.weight) } : {}),
    ...(row.distinct ? { distinct: row.distinct } : {})
  }));
}

function formatResult(result: unknown, format: string): string {
  if (format === "json") return `${JSON.stringify(result, null, 2)}\n`;
  if (format === "csv") {
    const rows = Array.isArray(result) ? result : [result];
    return toCsv(rows as Array<Record<string, unknown> | string>);
  }
  throw new Error("--format must be json or csv");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await runCli(process.argv.slice(2));
}
