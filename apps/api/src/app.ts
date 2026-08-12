import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { aggregate, type AggregateOperation, type AggregateRecord } from "@h3-toolkit/aggregation";
import {
  H3_ENGINE,
  H3_ENGINE_VERSION,
  H3_TOOLKIT_VERSION,
  H3ToolkitError,
  pointToCell,
  type GeoPoint,
  type ResolutionInput
} from "@h3-toolkit/core";
import { calculateCoverage, type CoverageInput } from "@h3-toolkit/coverage";
import { aggregateFlow, trajectoryToFlow, type TrajectoryPoint } from "@h3-toolkit/flow";
import { cellsToGeoJSON, geometryToCells, validatePolygonal, type Polygonal } from "@h3-toolkit/geometry";
import { gridDisk } from "@h3-toolkit/neighborhood";
import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import { ApiMetrics, metricRoute } from "./metrics.js";
import {
  assertAllowedResolution,
  assertDistinctLimit,
  assertFlowPointLimit,
  assertGeoJsonLimit,
  assertNeighborLimits,
  assertResultLimit,
  createResourcePolicy,
  preflightPolygon,
  type AppOptions
} from "./policy.js";

export type { AppOptions } from "./policy.js";

const pointSchema = {
  type: "object",
  additionalProperties: false,
  required: ["longitude", "latitude"],
  properties: {
    longitude: { type: "number", minimum: -180, maximum: 180 },
    latitude: { type: "number", minimum: -90, maximum: 90 }
  }
} as const;

const resolutionSchema = {
  anyOf: [
    { type: "integer", minimum: 0, maximum: 15 },
    { type: "string", enum: ["GLOBAL", "REGIONAL", "CITY", "DISTRICT", "STREET", "FINE"] }
  ]
} as const;

const polygonalSchema = {
  type: "object",
  additionalProperties: false,
  required: ["type", "coordinates"],
  properties: {
    type: { type: "string", enum: ["Polygon", "MultiPolygon"] },
    coordinates: { type: "array" }
  }
} as const;

const metaSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requestId", "durationMs", "toolkitVersion", "engine", "engineVersion", "warnings"],
  properties: {
    requestId: { type: "string" },
    durationMs: { type: "number", minimum: 0 },
    toolkitVersion: { type: "string" },
    engine: { type: "string" },
    engineVersion: { type: "string" },
    warnings: { type: "array", items: { type: "string" } }
  }
} as const;

const successSchema = {
  type: "object",
  additionalProperties: false,
  required: ["data", "meta"],
  properties: { data: {}, meta: metaSchema }
} as const;

const errorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["error", "meta"],
  properties: {
    error: {
      type: "object",
      additionalProperties: false,
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: { type: "object", additionalProperties: true }
      }
    },
    meta: metaSchema
  }
} as const;

const standardErrorResponses = {
  400: errorSchema,
  413: errorSchema,
  422: errorSchema,
  500: errorSchema
} as const;

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const policy = createResourcePolicy(options);
  const requestStartedAt = new WeakMap<FastifyRequest, bigint>();
  const metrics = new ApiMetrics();
  const app = Fastify({
    logger: policy.logger
      ? {
          level: policy.logLevel,
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              "req.headers.x-api-key",
              "request.headers.authorization",
              "request.headers.cookie",
              "request.headers.x-api-key"
            ],
            censor: "[REDACTED]"
          }
        }
      : false,
    requestTimeout: policy.requestTimeoutMs,
    bodyLimit: policy.bodyLimitBytes
  });

  await app.register(swagger as never, {
    openapi: {
      info: {
        title: "H3 Spatial Toolkit API",
        version: H3_TOOLKIT_VERSION,
        description: "Standard H3 indexing, geometry, aggregation, coverage and flow API."
      },
      servers: [{ url: "http://localhost:3000" }],
      tags: ["Index", "Geometry", "Neighborhood", "Analysis"].map((name) => ({ name }))
    }
  });
  await app.register(swaggerUi, { routePrefix: "/documentation" });

  app.addHook("onRequest", async (request, reply) => {
    requestStartedAt.set(request, process.hrtime.bigint());
    void reply.header("x-request-id", request.id);
    if (policy.metricsEnabled) metrics.requestStarted();
  });

  app.addHook("onResponse", async (request, reply) => {
    if (!policy.metricsEnabled) return;
    const startedAt = requestStartedAt.get(request);
    const durationSeconds = startedAt === undefined ? 0 : Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
    metrics.requestFinished(
      { method: request.method, route: metricRoute(request.routeOptions.url), statusCode: reply.statusCode },
      durationSeconds
    );
  });

  app.get(
    "/health",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["status", "engine", "toolkitVersion"],
            properties: {
              status: { type: "string" },
              engine: { type: "string" },
              toolkitVersion: { type: "string" }
            }
          }
        }
      }
    },
    async () => ({ status: "ok", engine: `${H3_ENGINE}@${H3_ENGINE_VERSION}`, toolkitVersion: H3_TOOLKIT_VERSION })
  );

  app.get(
    "/ready",
    {
      schema: {
        response: {
          200: {
            type: "object",
            additionalProperties: false,
            required: ["status", "checks", "toolkitVersion"],
            properties: {
              status: { type: "string", enum: ["ready"] },
              checks: {
                type: "object",
                additionalProperties: false,
                required: ["h3", "database"],
                properties: {
                  h3: { type: "string", enum: ["ready"] },
                  database: { type: "string", enum: ["not-required"] }
                }
              },
              toolkitVersion: { type: "string" }
            }
          }
        }
      }
    },
    async () => {
      const knownCell = pointToCell({ longitude: 139.7671, latitude: 35.6812 }, 9).index;
      if (knownCell !== "892f5a32d97ffff") throw new Error("H3 engine self-check failed");
      return { status: "ready", checks: { h3: "ready", database: "not-required" }, toolkitVersion: H3_TOOLKIT_VERSION };
    }
  );

  if (policy.metricsEnabled) {
    app.get(
      "/metrics",
      {
        schema: {
          tags: ["Operations"],
          response: { 200: { type: "string" } }
        }
      },
      async (_request, reply) => {
        void reply.type("text/plain; version=0.0.4; charset=utf-8");
        return metrics.render();
      }
    );
  }

  app.post<{ Body: { points: GeoPoint[]; resolution: ResolutionInput } }>(
    "/v1/h3/index",
    {
      schema: {
        tags: ["Index"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["points", "resolution"],
          properties: {
            points: { type: "array", minItems: 1, maxItems: policy.maxBatchRecords, items: pointSchema },
            resolution: resolutionSchema
          }
        },
        response: { 200: successSchema, ...standardErrorResponses }
      }
    },
    async (request) => {
      const resolution = assertAllowedResolution(request.body.resolution, policy);
      assertResultLimit(request.body.points.length, policy);
      return success(
        request,
        request.body.points.map((point) => pointToCell(point, resolution)),
        requestStartedAt
      );
    }
  );

  app.post<{ Body: { geometry: Polygonal; resolution: ResolutionInput; output?: "cells" | "geojson" } }>(
    "/v1/h3/polygon/cover",
    {
      schema: {
        tags: ["Geometry"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["geometry", "resolution"],
          properties: {
            geometry: polygonalSchema,
            resolution: resolutionSchema,
            output: { type: "string", enum: ["cells", "geojson"] }
          }
        },
        response: { 200: successSchema, ...standardErrorResponses }
      }
    },
    async (request) => {
      validatePolygonal(request.body.geometry);
      const resolution = assertAllowedResolution(request.body.resolution, policy);
      const { warnings } = preflightPolygon(request.body.geometry, resolution, policy);
      const cells = geometryToCells(request.body.geometry, resolution);
      assertResultLimit(cells.length, policy);
      const data = request.body.output === "geojson" ? cellsToGeoJSON(cells) : cells;
      if (request.body.output === "geojson") assertGeoJsonLimit(data, policy);
      return success(request, data, requestStartedAt, warnings);
    }
  );

  app.post<{ Body: { cell: string; radius?: number } }>(
    "/v1/h3/neighbors",
    {
      schema: {
        tags: ["Neighborhood"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["cell"],
          properties: {
            cell: { type: "string", minLength: 1, maxLength: 32 },
            radius: { type: "integer", minimum: 0, maximum: 1000, default: 1 }
          }
        },
        response: { 200: successSchema, ...standardErrorResponses }
      }
    },
    async (request) => {
      const radius = request.body.radius ?? 1;
      assertNeighborLimits(radius, policy);
      const data = gridDisk(request.body.cell, radius);
      assertResultLimit(data.length, policy);
      return success(request, data, requestStartedAt);
    }
  );

  app.post<{
    Body: { records: AggregateRecord[]; operation: AggregateOperation; resolution: ResolutionInput; metric?: string };
  }>(
    "/v1/h3/aggregate",
    {
      schema: {
        tags: ["Analysis"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["records", "operation", "resolution"],
          properties: {
            records: {
              type: "array",
              maxItems: policy.maxBatchRecords,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  cell: { type: "string", minLength: 1, maxLength: 32 },
                  longitude: { type: "number", minimum: -180, maximum: 180 },
                  latitude: { type: "number", minimum: -90, maximum: 90 },
                  value: { type: "number" },
                  weight: { type: "number" },
                  distinct: { anyOf: [{ type: "string" }, { type: "number" }] }
                }
              }
            },
            operation: {
              type: "string",
              enum: ["count", "sum", "average", "min", "max", "weightedAverage", "density", "distinctCount"]
            },
            resolution: resolutionSchema,
            metric: { type: "string", minLength: 1, maxLength: 128 }
          }
        },
        response: { 200: successSchema, ...standardErrorResponses }
      }
    },
    async (request) => {
      const resolution = assertAllowedResolution(request.body.resolution, policy);
      assertDistinctLimit(request.body.records, request.body.operation, policy);
      const data = aggregate(request.body.records, request.body.operation, resolution, request.body.metric);
      assertResultLimit(data.length, policy);
      return success(request, data, requestStartedAt);
    }
  );

  app.post<{ Body: CoverageInput }>(
    "/v1/h3/coverage",
    {
      schema: {
        tags: ["Analysis"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["area", "resolution"],
          properties: {
            area: polygonalSchema,
            resolution: resolutionSchema,
            visitedCells: {
              type: "array",
              maxItems: policy.maxBatchRecords,
              items: { type: "string", minLength: 1, maxLength: 32 }
            },
            visitedPoints: { type: "array", maxItems: policy.maxBatchRecords, items: pointSchema }
          }
        },
        response: { 200: successSchema, ...standardErrorResponses }
      }
    },
    async (request) => {
      validatePolygonal(request.body.area);
      const resolution = assertAllowedResolution(request.body.resolution, policy);
      const { warnings } = preflightPolygon(request.body.area, resolution, policy);
      const data = calculateCoverage({ ...request.body, resolution });
      assertResultLimit(data.requiredCount, policy);
      return success(request, data, requestStartedAt, warnings);
    }
  );

  app.post<{ Body: { trajectories: TrajectoryPoint[][]; resolution: ResolutionInput; directed?: boolean } }>(
    "/v1/h3/flow",
    {
      schema: {
        tags: ["Analysis"],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["trajectories", "resolution"],
          properties: {
            trajectories: {
              type: "array",
              maxItems: policy.maxBatchRecords,
              items: { type: "array", minItems: 2, maxItems: policy.maxFlowPoints, items: pointSchema }
            },
            resolution: resolutionSchema,
            directed: { type: "boolean", default: true }
          }
        },
        response: { 200: successSchema, ...standardErrorResponses }
      }
    },
    async (request) => {
      const resolution = assertAllowedResolution(request.body.resolution, policy);
      assertFlowPointLimit(request.body.trajectories, policy);
      const flows = request.body.trajectories
        .map((trajectory) => trajectoryToFlow(trajectory, resolution))
        .filter((flow) => flow !== null);
      const data = aggregateFlow(flows, request.body.directed ?? true);
      assertResultLimit(data.length, policy);
      return success(request, data, requestStartedAt);
    }
  );

  app.setNotFoundHandler((request, reply) => {
    void reply.code(404).send({
      error: { code: "ROUTE_NOT_FOUND", message: "Requested route was not found" },
      meta: responseMeta(request, requestStartedAt)
    });
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    const normalized = normalizeApiError(error);
    if (policy.metricsEnabled) metrics.error(metricRoute(request.routeOptions.url), normalized.code);
    if (normalized.statusCode === 500) {
      request.log.error({ errorName: error instanceof Error ? error.name : typeof error }, "Unhandled API error");
    }
    void reply.code(normalized.statusCode).send({
      error: {
        code: normalized.code,
        message: normalized.message,
        ...(normalized.details === undefined ? {} : { details: normalized.details })
      },
      meta: responseMeta(request, requestStartedAt)
    });
  });

  await app.ready();
  return app;
}

function success<T>(
  request: FastifyRequest,
  data: T,
  requestStartedAt: WeakMap<FastifyRequest, bigint>,
  warnings: string[] = []
): { data: T; meta: ResponseMeta } {
  return { data, meta: responseMeta(request, requestStartedAt, warnings) };
}

interface ResponseMeta {
  requestId: string;
  durationMs: number;
  toolkitVersion: string;
  engine: string;
  engineVersion: string;
  warnings: string[];
}

function responseMeta(
  request: FastifyRequest,
  requestStartedAt: WeakMap<FastifyRequest, bigint>,
  warnings: string[] = []
): ResponseMeta {
  const startedAt = requestStartedAt.get(request);
  const durationMs = startedAt === undefined ? 0 : Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return {
    requestId: request.id,
    durationMs: Number(durationMs.toFixed(3)),
    toolkitVersion: H3_TOOLKIT_VERSION,
    engine: H3_ENGINE,
    engineVersion: H3_ENGINE_VERSION,
    warnings
  };
}

export interface NormalizedError {
  statusCode: 400 | 404 | 408 | 413 | 422 | 500;
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export function normalizeApiError(error: unknown): NormalizedError {
  if (isFastifyValidationError(error)) {
    return {
      statusCode: 400,
      code: "REQUEST_VALIDATION_FAILED",
      message: "Request validation failed",
      details: {
        issues: error.validation.slice(0, 20).map((issue) => ({
          path: issue.instancePath ?? issue.dataPath ?? "",
          keyword: issue.keyword,
          message: issue.message ?? "invalid value"
        }))
      }
    };
  }
  if (isHttpError(error) && (error.statusCode === 413 || error.code === "FST_ERR_CTP_BODY_TOO_LARGE")) {
    return { statusCode: 413, code: "PAYLOAD_BYTE_LIMIT_EXCEEDED", message: "Request payload exceeds server policy" };
  }
  if (error instanceof H3ToolkitError) {
    return {
      statusCode: error.code.endsWith("_LIMIT_EXCEEDED") ? 413 : 422,
      code: error.code,
      message: error.message,
      ...(safeDetails(error.code, error.details) === undefined
        ? {}
        : { details: safeDetails(error.code, error.details) })
    };
  }
  if (isHttpError(error) && error.statusCode === 404) {
    return { statusCode: 404, code: "ROUTE_NOT_FOUND", message: "Requested route was not found" };
  }
  if (isHttpError(error) && error.statusCode === 408) {
    return { statusCode: 408, code: "REQUEST_TIMEOUT", message: "Request exceeded the configured timeout" };
  }
  return { statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected internal error" };
}

function safeDetails(code: string, details: unknown): Record<string, unknown> | undefined {
  if (!details || typeof details !== "object" || Array.isArray(details)) return undefined;
  const allowedByCode = new Map<string, string[]>([
    ["RESOLUTION_NOT_ALLOWED", ["resolution", "allowedResolutions"]],
    ["CELL_RESOLUTION_MISMATCH", ["expectedResolution", "actualResolution"]],
    ["NEIGHBOR_RADIUS_LIMIT_EXCEEDED", ["actual", "limit"]],
    ["FLOW_POINT_LIMIT_EXCEEDED", ["actual", "limit"]],
    ["DISTINCT_VALUE_LIMIT_EXCEEDED", ["actual", "limit"]],
    ["POLYGON_COORDINATE_LIMIT_EXCEEDED", ["actual", "limit"]],
    ["RESULT_CELL_LIMIT_EXCEEDED", ["actual", "limit", "recommendedResolution"]],
    ["GEOJSON_BYTE_LIMIT_EXCEEDED", ["actual", "limit"]]
  ]);
  const allowed = allowedByCode.get(code);
  if (!allowed) return undefined;
  const source = details as Record<string, unknown>;
  return Object.fromEntries(allowed.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
}

interface FastifyValidationIssue {
  instancePath?: string;
  dataPath?: string;
  keyword: string;
  message?: string;
}

function isFastifyValidationError(error: unknown): error is { validation: FastifyValidationIssue[] } {
  return (
    typeof error === "object" &&
    error !== null &&
    "validation" in error &&
    Array.isArray((error as { validation?: unknown }).validation)
  );
}

function isHttpError(error: unknown): error is { statusCode?: number; code?: string } {
  return typeof error === "object" && error !== null;
}
