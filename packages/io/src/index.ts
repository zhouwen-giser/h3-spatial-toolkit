import type { H3Cell, H3Flow, H3Metric, H3TimeMetric } from "@h3-toolkit/core";

export const H3_CELL_SCHEMA = {
  $id: "https://schemas.h3-toolkit.dev/h3-cell.schema.json",
  type: "object",
  additionalProperties: false,
  required: ["index", "resolution"],
  properties: {
    index: { type: "string", pattern: "^[0-9a-f]{15}$" },
    resolution: { type: "integer", minimum: 0, maximum: 15 }
  }
} as const;

export const H3_METRIC_SCHEMA = {
  $id: "https://schemas.h3-toolkit.dev/h3-metric.schema.json",
  type: "object",
  additionalProperties: false,
  required: ["cell", "resolution", "metric", "value"],
  properties: {
    cell: { type: "string", pattern: "^[0-9a-f]{15}$" },
    resolution: { type: "integer", minimum: 0, maximum: 15 },
    metric: { type: "string", minLength: 1 },
    value: { type: "number" }
  }
} as const;

export const H3_TIME_METRIC_SCHEMA = {
  ...H3_METRIC_SCHEMA,
  $id: "https://schemas.h3-toolkit.dev/h3-time-metric.schema.json",
  required: [...H3_METRIC_SCHEMA.required, "timestamp", "bucket"],
  properties: {
    ...H3_METRIC_SCHEMA.properties,
    timestamp: { type: "string", format: "date-time" },
    bucket: { type: "string", enum: ["minute", "hour", "day", "week", "month"] }
  }
} as const;

export const H3_FLOW_SCHEMA = {
  $id: "https://schemas.h3-toolkit.dev/h3-flow.schema.json",
  type: "object",
  additionalProperties: false,
  required: ["origin", "destination", "count"],
  properties: {
    origin: { type: "string", pattern: "^[0-9a-f]{15}$" },
    destination: { type: "string", pattern: "^[0-9a-f]{15}$" },
    count: { type: "integer", minimum: 0 },
    weight: { type: "number" }
  }
} as const;

export function toCsv(rows: Array<Record<string, unknown> | string>): string {
  if (rows.length === 0) return "";
  const normalized = rows.map((row) => (typeof row === "string" ? { cell: row } : row));
  const columns = [...new Set(normalized.flatMap((row) => Object.keys(row)))];
  return (
    [columns.join(","), ...normalized.map((row) => columns.map((column) => escapeCsv(row[column])).join(","))].join(
      "\n"
    ) + "\n"
  );
}

export function parseCsv(input: string): Record<string, string>[] {
  const lines = input.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = splitCsvLine(lines[0]!);
  return lines
    .slice(1)
    .map((line) => Object.fromEntries(headers.map((header, index) => [header, splitCsvLine(line)[index] ?? ""])));
}

export function parseJson<T = unknown>(input: string): T {
  return JSON.parse(input) as T;
}

function escapeCsv(value: unknown): string {
  const text =
    value === undefined || value === null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      values.push(value);
      value = "";
    } else value += char;
  }
  values.push(value);
  return values;
}

export type StandardModel = H3Cell | H3Metric | H3TimeMetric | H3Flow;
