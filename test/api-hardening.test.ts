import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, normalizeApiError } from "../apps/api/src/app.js";
import { loadServerConfig } from "../apps/api/src/config.js";
import { H3_TOOLKIT_VERSION } from "../packages/core/src/index.js";

const area = {
  type: "Polygon" as const,
  coordinates: [
    [
      [139.767, 35.681],
      [139.768, 35.681],
      [139.768, 35.682],
      [139.767, 35.682],
      [139.767, 35.681]
    ]
  ]
};

const coverageBudgetArea = {
  type: "Polygon" as const,
  coordinates: [
    [
      [139.75, 35.67],
      [139.772, 35.67],
      [139.772, 35.698],
      [139.75, 35.698],
      [139.75, 35.67]
    ]
  ]
};

let app: Awaited<ReturnType<typeof buildApp>>;
let limitedApp: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp({ maxBatchRecords: 10 });
  limitedApp = await buildApp({
    maxBatchRecords: 10,
    maxFlowPoints: 3,
    maxResultCells: 20,
    maxGeoJsonBytes: 20,
    maxPolygonCoordinates: 5,
    maxNeighborRadius: 1,
    maxDistinctValues: 2,
    allowedResolutions: [8, 9]
  });
});

afterAll(async () => {
  await Promise.all([app.close(), limitedApp.close()]);
});

describe("API response contract", () => {
  it("returns correlation, duration and version metadata", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/index",
      payload: { points: [{ longitude: 139.7671, latitude: 35.6812 }], resolution: 9 }
    });
    const body = response.json();
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe(body.meta.requestId);
    expect(body.meta).toMatchObject({
      toolkitVersion: H3_TOOLKIT_VERSION,
      engine: "h3-js",
      engineVersion: "4.5.0",
      warnings: []
    });
    expect(body.meta.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("uses a stable 400 validation envelope without internal details", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/index",
      payload: { points: [{ longitude: 35.6812, latitude: 139.7671 }], resolution: 9 }
    });
    assertError(response, 400, "REQUEST_VALIDATION_FAILED");
    expect(response.json().error.details.issues[0]).toHaveProperty("path");
  });

  it("uses stable 422 domain errors and does not echo an H3 cell", async () => {
    const invalidCell = "not-a-real-cell";
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/neighbors",
      payload: { cell: invalidCell, radius: 1 }
    });
    assertError(response, 422, "INVALID_H3_CELL");
    expect(response.body).not.toContain(invalidCell);
  });

  it("returns a stable route-not-found envelope", async () => {
    const response = await app.inject({ method: "GET", url: "/missing" });
    assertError(response, 404, "ROUTE_NOT_FOUND");
  });

  it("redacts unexpected errors behind a stable 500 contract", () => {
    const normalized = normalizeApiError(new Error("SQL failed at /workspace/private.ts with secret-value"));
    expect(normalized).toEqual({ statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected internal error" });
  });
});

describe("API resource policies", () => {
  it("publishes concrete success data schemas for every v1 endpoint", async () => {
    const document = app.swagger() as {
      paths: Record<
        string,
        Record<
          string,
          {
            responses?: Record<
              string,
              { content?: Record<string, { schema?: { properties?: { data?: Record<string, unknown> } } }> }
            >;
          }
        >
      >;
    };
    for (const [path, pathItem] of Object.entries(document.paths)) {
      if (!path.startsWith("/v1/")) continue;
      for (const operation of Object.values(pathItem)) {
        const dataSchema = operation.responses?.["200"]?.content?.["application/json"]?.schema?.properties?.data;
        expect(dataSchema, path).toBeDefined();
        expect(Object.keys(dataSchema ?? {}), path).not.toHaveLength(0);
      }
    }
  });

  it("rejects resolutions disabled by policy", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/index",
      payload: { points: [{ longitude: 139.7671, latitude: 35.6812 }], resolution: 7 }
    });
    assertError(response, 422, "RESOLUTION_NOT_ALLOWED");
    expect(response.json().error.details).toEqual({ resolution: 7, allowedResolutions: [8, 9] });
  });

  it("rejects unsafe neighbor radius before H3 traversal", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/neighbors",
      payload: { cell: "892f5a32d97ffff", radius: 2 }
    });
    assertError(response, 413, "NEIGHBOR_RADIUS_LIMIT_EXCEEDED");
    expect(response.json().error.details).toEqual({ actual: 2, limit: 1 });
  });

  it("limits total flow points rather than only trajectory count", async () => {
    const trajectory = [
      { longitude: 139.7671, latitude: 35.6812 },
      { longitude: 139.78, latitude: 35.69 }
    ];
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/flow",
      payload: { trajectories: [trajectory, trajectory], resolution: 9 }
    });
    assertError(response, 413, "FLOW_POINT_LIMIT_EXCEEDED");
  });

  it("limits the combined visitedCells and visitedPoints batch size", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/coverage",
      payload: {
        area,
        resolution: 9,
        visitedCells: Array.from({ length: 6 }, () => "892f5a32d97ffff"),
        visitedPoints: Array.from({ length: 5 }, () => ({ longitude: 139.7671, latitude: 35.6812 }))
      }
    });
    assertError(response, 413, "COVERAGE_VISIT_LIMIT_EXCEEDED");
    expect(response.json().error.details).toEqual({ actual: 11, limit: 10 });
  });

  it("counts every serialized coverage cell array in the result budget", async () => {
    const discoveryApp = await buildApp({ maxBatchRecords: 200, maxResultCells: 1_000 });
    const coverageBudgetApp = await buildApp({ maxBatchRecords: 200, maxResultCells: 150 });
    try {
      const discoveryResponse = await discoveryApp.inject({
        method: "POST",
        url: "/v1/h3/coverage",
        payload: { area: coverageBudgetArea, resolution: 9 }
      });
      const requiredCells = discoveryResponse.json().data.requiredCells as string[];
      expect(requiredCells).toHaveLength(64);

      const requiredResponse = await coverageBudgetApp.inject({
        method: "POST",
        url: "/v1/h3/coverage",
        payload: { area: coverageBudgetArea, resolution: 9 }
      });
      expect(requiredResponse.statusCode).toBe(200);
      expect(requiredResponse.json().data.missingCells).toHaveLength(64);

      const response = await coverageBudgetApp.inject({
        method: "POST",
        url: "/v1/h3/coverage",
        payload: { area: coverageBudgetArea, resolution: 9, visitedCells: [...requiredCells, ...requiredCells] }
      });
      assertError(response, 413, "RESULT_CELL_LIMIT_EXCEEDED");
      expect(response.json().error.details).toEqual({ actual: 192, limit: 150 });
    } finally {
      await Promise.all([discoveryApp.close(), coverageBudgetApp.close()]);
    }
  });

  it("limits distinct cardinality", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/aggregate",
      payload: {
        records: [
          { longitude: 139.7671, latitude: 35.6812, distinct: "a" },
          { longitude: 139.7671, latitude: 35.6812, distinct: "b" },
          { longitude: 139.7671, latitude: 35.6812, distinct: "c" }
        ],
        operation: "distinctCount",
        resolution: 9
      }
    });
    assertError(response, 413, "DISTINCT_VALUE_LIMIT_EXCEEDED");
  });

  it("limits polygon coordinate count", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/polygon/cover",
      payload: {
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0.1, 0],
              [0.1, 0.1],
              [0.05, 0.15],
              [0, 0.1],
              [0, 0]
            ]
          ]
        },
        resolution: 8
      }
    });
    assertError(response, 413, "POLYGON_COORDINATE_LIMIT_EXCEEDED");
  });

  it("rejects estimated polygon output before materializing cells", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/polygon/cover",
      payload: {
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [139.7, 35.6],
              [139.9, 35.6],
              [139.9, 35.8],
              [139.7, 35.8],
              [139.7, 35.6]
            ]
          ]
        },
        resolution: 9
      }
    });
    assertError(response, 413, "RESULT_CELL_LIMIT_EXCEEDED");
    expect(response.json().error.details.recommendedResolution).toBeLessThan(9);
  });

  it("limits serialized GeoJSON output bytes", async () => {
    const response = await limitedApp.inject({
      method: "POST",
      url: "/v1/h3/polygon/cover",
      payload: { geometry: area, resolution: 9, output: "geojson" }
    });
    assertError(response, 413, "GEOJSON_BYTE_LIMIT_EXCEEDED");
  });

  it("normalizes Fastify body-size errors", async () => {
    const bodyLimitedApp = await buildApp({ bodyLimitBytes: 100 });
    try {
      const response = await bodyLimitedApp.inject({
        method: "POST",
        url: "/v1/h3/index",
        payload: { points: Array.from({ length: 20 }, () => ({ longitude: 0, latitude: 0 })), resolution: 9 }
      });
      assertError(response, 413, "PAYLOAD_BYTE_LIMIT_EXCEEDED");
    } finally {
      await bodyLimitedApp.close();
    }
  });
});

describe("API semantic validation", () => {
  it("rejects coverage cells at a different resolution", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/coverage",
      payload: { area, resolution: 9, visitedCells: ["882f5a32d9fffff"] }
    });
    assertError(response, 422, "CELL_RESOLUTION_MISMATCH");
    expect(response.json().error.details).toEqual({ expectedResolution: 9, actualResolution: 8 });
  });

  it("rejects aggregate cells at a different resolution", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/aggregate",
      payload: { records: [{ cell: "882f5a32d9fffff", value: 1 }], operation: "sum", resolution: 9 }
    });
    assertError(response, 422, "CELL_RESOLUTION_MISMATCH");
  });

  it("rejects excessive GeoJSON position depth", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/polygon/cover",
      payload: {
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0, 0, 0],
              [1, 0],
              [1, 1],
              [0, 0]
            ]
          ]
        },
        resolution: 8
      }
    });
    assertError(response, 422, "INVALID_POSITION");
  });
});

describe("server configuration", () => {
  it("parses bounded integer and resolution environment values", () => {
    expect(
      loadServerConfig({
        PORT: "3100",
        MAX_RESULT_CELLS: "123",
        MAX_NEIGHBOR_RADIUS: "0",
        METRICS_ENABLED: "false",
        LOG_LEVEL: "debug",
        ALLOWED_RESOLUTIONS: "7,8,9,9"
      }).app
    ).toMatchObject({
      maxResultCells: 123,
      maxNeighborRadius: 0,
      metricsEnabled: false,
      logLevel: "debug",
      allowedResolutions: [7, 8, 9]
    });
  });

  it("fails startup configuration instead of accepting NaN or unsafe values", async () => {
    expect(() => loadServerConfig({ PORT: "not-a-number" })).toThrow("PORT");
    expect(() => loadServerConfig({ METRICS_ENABLED: "yes" })).toThrow("METRICS_ENABLED");
    expect(() => loadServerConfig({ LOG_LEVEL: "verbose" })).toThrow("LOG_LEVEL");
    expect(() => loadServerConfig({ ALLOWED_RESOLUTIONS: "7,16" })).toThrow("ALLOWED_RESOLUTIONS");
    await expect(() => buildApp({ maxResultCells: 0 })).rejects.toThrow("maxResultCells");
  });
});

function assertError(
  response: { statusCode: number; body: string; json(): { error: { code: string; message: string }; meta: unknown } },
  statusCode: number,
  code: string
): void {
  expect(response.statusCode).toBe(statusCode);
  expect(response.json().error.code).toBe(code);
  expect(response.json().meta).toBeDefined();
  expect(response.body).not.toMatch(/(?:stack|node_modules|\/workspace\/|\.ts:\d+)/i);
}
