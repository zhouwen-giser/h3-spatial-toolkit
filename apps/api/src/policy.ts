import {
  H3ToolkitError,
  MAX_RESOLUTION,
  MIN_RESOLUTION,
  resolveResolution,
  type ResolutionInput
} from "@h3-toolkit/core";
import type { AggregateOperation, AggregateRecord } from "@h3-toolkit/aggregation";
import type { Polygonal } from "@h3-toolkit/geometry";
import { getHexagonAreaAvg, UNITS } from "h3-js";

export interface AppOptions {
  logger?: boolean;
  logLevel?: LogLevel;
  metricsEnabled?: boolean;
  maxBatchRecords?: number;
  maxFlowPoints?: number;
  maxResultCells?: number;
  maxGeoJsonBytes?: number;
  maxPolygonCoordinates?: number;
  maxNeighborRadius?: number;
  maxDistinctValues?: number;
  bodyLimitBytes?: number;
  requestTimeoutMs?: number;
  allowedResolutions?: number[];
}

export interface ResourcePolicy {
  logger: boolean;
  logLevel: LogLevel;
  metricsEnabled: boolean;
  maxBatchRecords: number;
  maxFlowPoints: number;
  maxResultCells: number;
  maxGeoJsonBytes: number;
  maxPolygonCoordinates: number;
  maxNeighborRadius: number;
  maxDistinctValues: number;
  bodyLimitBytes: number;
  requestTimeoutMs: number;
  allowedResolutions: ReadonlySet<number>;
}

export const DEFAULT_RESOURCE_POLICY = {
  logger: false,
  logLevel: "info",
  metricsEnabled: true,
  maxBatchRecords: 100_000,
  maxFlowPoints: 100_000,
  maxResultCells: 250_000,
  maxGeoJsonBytes: 10 * 1024 * 1024,
  maxPolygonCoordinates: 50_000,
  maxNeighborRadius: 20,
  maxDistinctValues: 50_000,
  bodyLimitBytes: 10 * 1024 * 1024,
  requestTimeoutMs: 30_000,
  allowedResolutions: Array.from({ length: MAX_RESOLUTION + 1 }, (_, resolution) => resolution)
} as const;

export const LOG_LEVELS = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export function createResourcePolicy(options: AppOptions = {}): ResourcePolicy {
  const allowedResolutions = options.allowedResolutions ?? [...DEFAULT_RESOURCE_POLICY.allowedResolutions];
  if (allowedResolutions.length === 0) throw new Error("allowedResolutions must not be empty");
  for (const resolution of allowedResolutions) {
    if (!Number.isInteger(resolution) || resolution < MIN_RESOLUTION || resolution > MAX_RESOLUTION) {
      throw new Error("allowedResolutions must contain only integers from 0 through 15");
    }
  }
  return {
    logger: options.logger ?? DEFAULT_RESOURCE_POLICY.logger,
    logLevel: logLevel(options.logLevel ?? DEFAULT_RESOURCE_POLICY.logLevel),
    metricsEnabled: options.metricsEnabled ?? DEFAULT_RESOURCE_POLICY.metricsEnabled,
    maxBatchRecords: positiveInteger(
      "maxBatchRecords",
      options.maxBatchRecords ?? DEFAULT_RESOURCE_POLICY.maxBatchRecords
    ),
    maxFlowPoints: positiveInteger("maxFlowPoints", options.maxFlowPoints ?? DEFAULT_RESOURCE_POLICY.maxFlowPoints),
    maxResultCells: positiveInteger("maxResultCells", options.maxResultCells ?? DEFAULT_RESOURCE_POLICY.maxResultCells),
    maxGeoJsonBytes: positiveInteger(
      "maxGeoJsonBytes",
      options.maxGeoJsonBytes ?? DEFAULT_RESOURCE_POLICY.maxGeoJsonBytes
    ),
    maxPolygonCoordinates: positiveInteger(
      "maxPolygonCoordinates",
      options.maxPolygonCoordinates ?? DEFAULT_RESOURCE_POLICY.maxPolygonCoordinates
    ),
    maxNeighborRadius: nonNegativeInteger(
      "maxNeighborRadius",
      options.maxNeighborRadius ?? DEFAULT_RESOURCE_POLICY.maxNeighborRadius
    ),
    maxDistinctValues: positiveInteger(
      "maxDistinctValues",
      options.maxDistinctValues ?? DEFAULT_RESOURCE_POLICY.maxDistinctValues
    ),
    bodyLimitBytes: positiveInteger("bodyLimitBytes", options.bodyLimitBytes ?? DEFAULT_RESOURCE_POLICY.bodyLimitBytes),
    requestTimeoutMs: positiveInteger(
      "requestTimeoutMs",
      options.requestTimeoutMs ?? DEFAULT_RESOURCE_POLICY.requestTimeoutMs
    ),
    allowedResolutions: new Set(allowedResolutions)
  };
}

function logLevel(value: string): LogLevel {
  if (!(LOG_LEVELS as readonly string[]).includes(value)) {
    throw new Error(`logLevel must be one of ${LOG_LEVELS.join(", ")}`);
  }
  return value as LogLevel;
}

export function assertAllowedResolution(input: ResolutionInput, policy: ResourcePolicy): number {
  const resolution = resolveResolution(input);
  if (!policy.allowedResolutions.has(resolution)) {
    throw new H3ToolkitError("RESOLUTION_NOT_ALLOWED", "Requested resolution is disabled by server policy", {
      resolution,
      allowedResolutions: [...policy.allowedResolutions].sort((left, right) => left - right)
    });
  }
  return resolution;
}

export function assertNeighborLimits(radius: number, policy: ResourcePolicy): void {
  if (radius > policy.maxNeighborRadius) {
    throw limitError("NEIGHBOR_RADIUS_LIMIT_EXCEEDED", "Neighbor radius exceeds server policy", {
      actual: radius,
      limit: policy.maxNeighborRadius
    });
  }
  const estimatedCells = 1 + 3 * radius * (radius + 1);
  if (estimatedCells > policy.maxResultCells) {
    throw limitError("RESULT_CELL_LIMIT_EXCEEDED", "Estimated neighbor result exceeds server policy", {
      actual: estimatedCells,
      limit: policy.maxResultCells
    });
  }
}

export function assertFlowPointLimit(
  trajectories: ReadonlyArray<ReadonlyArray<unknown>>,
  policy: ResourcePolicy
): void {
  let total = 0;
  for (const trajectory of trajectories) {
    total += trajectory.length;
    if (total > policy.maxFlowPoints) {
      throw limitError("FLOW_POINT_LIMIT_EXCEEDED", "Total trajectory point count exceeds server policy", {
        actual: total,
        limit: policy.maxFlowPoints
      });
    }
  }
}

export function assertDistinctLimit(
  records: AggregateRecord[],
  operation: AggregateOperation,
  policy: ResourcePolicy
): void {
  if (operation !== "distinctCount") return;
  const values = new Set<string | number>();
  for (const record of records) {
    if (record.distinct !== undefined) values.add(record.distinct);
    if (values.size > policy.maxDistinctValues) {
      throw limitError("DISTINCT_VALUE_LIMIT_EXCEEDED", "Distinct cardinality exceeds server policy", {
        actual: values.size,
        limit: policy.maxDistinctValues
      });
    }
  }
}

export function assertResultLimit(actual: number, policy: ResourcePolicy): void {
  if (actual > policy.maxResultCells) {
    throw limitError("RESULT_CELL_LIMIT_EXCEEDED", "Result cell count exceeds server policy", {
      actual,
      limit: policy.maxResultCells
    });
  }
}

export function preflightPolygon(
  geometry: Polygonal,
  resolution: number,
  policy: ResourcePolicy
): { estimatedCells: number; warnings: string[] } {
  const coordinates = countPolygonCoordinates(geometry);
  if (coordinates > policy.maxPolygonCoordinates) {
    throw limitError("POLYGON_COORDINATE_LIMIT_EXCEEDED", "Polygon coordinate count exceeds server policy", {
      actual: coordinates,
      limit: policy.maxPolygonCoordinates
    });
  }
  const estimatedCells = estimatePolygonCells(geometry, resolution);
  if (estimatedCells > policy.maxResultCells) {
    throw limitError("RESULT_CELL_LIMIT_EXCEEDED", "Estimated polygon result exceeds server policy", {
      actual: estimatedCells,
      limit: policy.maxResultCells,
      recommendedResolution: recommendResolution(geometry, resolution, policy.maxResultCells)
    });
  }
  return {
    estimatedCells,
    warnings:
      estimatedCells >= Math.floor(policy.maxResultCells * 0.75)
        ? ["Estimated result is close to the configured cell limit"]
        : []
  };
}

export function assertGeoJsonLimit(value: unknown, policy: ResourcePolicy): void {
  const actual = Buffer.byteLength(JSON.stringify(value));
  if (actual > policy.maxGeoJsonBytes) {
    throw limitError("GEOJSON_BYTE_LIMIT_EXCEEDED", "GeoJSON response exceeds server policy", {
      actual,
      limit: policy.maxGeoJsonBytes
    });
  }
}

export function countPolygonCoordinates(geometry: Polygonal): number {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.reduce(
    (total, polygon) => total + polygon.reduce((polygonTotal, ring) => polygonTotal + ring.length, 0),
    0
  );
}

export function estimatePolygonCells(geometry: Polygonal, resolution: number): number {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const boundingAreaKm2 = polygons.reduce((total, polygon) => total + ringBoundingAreaKm2(polygon[0] ?? []), 0);
  if (boundingAreaKm2 === 0) return 0;
  const averageCellAreaKm2 = getHexagonAreaAvg(resolution, UNITS.km2);
  return Math.max(1, Math.ceil((boundingAreaKm2 / averageCellAreaKm2) * 1.5));
}

function recommendResolution(geometry: Polygonal, requested: number, limit: number): number {
  for (let resolution = requested - 1; resolution >= MIN_RESOLUTION; resolution -= 1) {
    if (estimatePolygonCells(geometry, resolution) <= limit) return resolution;
  }
  return MIN_RESOLUTION;
}

function ringBoundingAreaKm2(ring: number[][]): number {
  if (ring.length === 0) return 0;
  const latitudes = ring.map((position) => position[1] ?? 0);
  const longitudes = ring.map((position) => normalizeLongitude(position[0] ?? 0)).sort((left, right) => left - right);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  let largestGap = 0;
  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index]!;
    const next = index === longitudes.length - 1 ? longitudes[0]! + 360 : longitudes[index + 1]!;
    largestGap = Math.max(largestGap, next - current);
  }
  const longitudeSpanRadians = toRadians(360 - largestGap);
  const latitudeFactor = Math.abs(Math.sin(toRadians(maximumLatitude)) - Math.sin(toRadians(minimumLatitude)));
  const earthRadiusKm = 6371.0088;
  return earthRadiusKm * earthRadiusKm * longitudeSpanRadians * latitudeFactor;
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function limitError(code: string, message: string, details: Record<string, number>): H3ToolkitError {
  return new H3ToolkitError(code, message, details);
}

function positiveInteger(name: string, value: number): number {
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

function nonNegativeInteger(name: string, value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${name} must be a non-negative integer`);
  return value;
}
