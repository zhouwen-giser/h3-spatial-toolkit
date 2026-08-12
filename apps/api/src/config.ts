import { LOG_LEVELS, type AppOptions, type LogLevel } from "./policy.js";

export interface ServerConfig {
  host: string;
  port: number;
  app: AppOptions;
}

export function loadServerConfig(environment: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: environment.HOST ?? "127.0.0.1",
    port: integer(environment, "PORT", 3000, 1, 65_535),
    app: {
      logger: true,
      logLevel: logLevel(environment.LOG_LEVEL),
      metricsEnabled: boolean(environment, "METRICS_ENABLED", true),
      maxBatchRecords: integer(environment, "MAX_BATCH_RECORDS", 100_000, 1),
      maxFlowPoints: integer(environment, "MAX_FLOW_POINTS", 100_000, 1),
      maxResultCells: integer(environment, "MAX_RESULT_CELLS", 250_000, 1),
      maxGeoJsonBytes: integer(environment, "MAX_GEOJSON_BYTES", 10 * 1024 * 1024, 1),
      maxPolygonCoordinates: integer(environment, "MAX_POLYGON_COORDINATES", 50_000, 1),
      maxNeighborRadius: integer(environment, "MAX_NEIGHBOR_RADIUS", 20, 0),
      maxDistinctValues: integer(environment, "MAX_DISTINCT_VALUES", 50_000, 1),
      bodyLimitBytes: integer(environment, "BODY_LIMIT_BYTES", 10 * 1024 * 1024, 1),
      requestTimeoutMs: integer(environment, "REQUEST_TIMEOUT_MS", 30_000, 1),
      allowedResolutions: resolutions(environment.ALLOWED_RESOLUTIONS)
    }
  };
}

function boolean(environment: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = environment[name];
  if (raw === undefined) return fallback;
  if (raw === "true") return true;
  if (raw === "false") return false;
  throw new Error(`${name} must be true or false`);
}

function logLevel(raw: string | undefined): LogLevel {
  if (raw === undefined) return "info";
  if (!(LOG_LEVELS as readonly string[]).includes(raw)) {
    throw new Error(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}`);
  }
  return raw as LogLevel;
}

function integer(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum = Number.MAX_SAFE_INTEGER
): number {
  const raw = environment[name];
  if (raw === undefined) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return value;
}

function resolutions(raw: string | undefined): number[] | undefined {
  if (raw === undefined) return undefined;
  const values = raw.split(",").map((value) => value.trim());
  if (values.length === 0 || values.some((value) => !/^\d+$/.test(value))) {
    throw new Error("ALLOWED_RESOLUTIONS must be a comma-separated list of integers from 0 through 15");
  }
  const parsed = [...new Set(values.map(Number))];
  if (parsed.some((value) => value < 0 || value > 15)) {
    throw new Error("ALLOWED_RESOLUTIONS must be a comma-separated list of integers from 0 through 15");
  }
  return parsed;
}
