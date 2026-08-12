import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../apps/api/src/app.js";

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp({ maxBatchRecords: 10 });
});
afterAll(async () => {
  await app.close();
});

describe("REST API", () => {
  it("serves health and OpenAPI", async () => {
    expect((await app.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    const readiness = await app.inject({ method: "GET", url: "/ready" });
    expect(readiness.statusCode).toBe(200);
    expect(readiness.json().checks).toEqual({ h3: "ready", database: "not-required" });
    const spec = await app.inject({ method: "GET", url: "/documentation/json" });
    expect(spec.statusCode).toBe(200);
    expect(spec.json().paths["/v1/h3/coverage"]).toBeDefined();
  });

  it("indexes points", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/index",
      payload: { points: [{ longitude: 139.7671, latitude: 35.6812 }], resolution: 9 }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data[0].index).toBe("892f5a32d97ffff");
  });

  it("covers polygons", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/polygon/cover",
      payload: {
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [139.75, 35.67],
              [139.78, 35.67],
              [139.78, 35.69],
              [139.75, 35.69],
              [139.75, 35.67]
            ]
          ]
        },
        resolution: 9
      }
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.length).toBeGreaterThan(0);
  });

  it("runs neighbors, aggregation, coverage and flow", async () => {
    const cell = "892f5a32d97ffff";
    const neighbors = await app.inject({ method: "POST", url: "/v1/h3/neighbors", payload: { cell, radius: 1 } });
    expect(neighbors.json().data).toHaveLength(7);

    const aggregate = await app.inject({
      method: "POST",
      url: "/v1/h3/aggregate",
      payload: { records: [{ cell, value: 2 }], operation: "sum", resolution: 9 }
    });
    expect(aggregate.json().data[0].value).toBe(2);

    const area = {
      type: "Polygon",
      coordinates: [
        [
          [139.75, 35.67],
          [139.78, 35.67],
          [139.78, 35.69],
          [139.75, 35.69],
          [139.75, 35.67]
        ]
      ]
    };
    const coverage = await app.inject({
      method: "POST",
      url: "/v1/h3/coverage",
      payload: { area, resolution: 9, visitedCells: [cell] }
    });
    expect(coverage.statusCode).toBe(200);

    const flow = await app.inject({
      method: "POST",
      url: "/v1/h3/flow",
      payload: {
        resolution: 9,
        trajectories: [
          [
            { longitude: 139.7671, latitude: 35.6812 },
            { longitude: 139.78, latitude: 35.69 }
          ]
        ]
      }
    });
    expect(flow.json().data).toHaveLength(1);
  });

  it("rejects swapped/out-of-range coordinates", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/h3/index",
      payload: { points: [{ longitude: 35.6812, latitude: 139.7671 }], resolution: 9 }
    });
    expect(response.statusCode).toBe(400);
  });

  it("enforces batch limits", async () => {
    const points = Array.from({ length: 11 }, () => ({ longitude: 0, latitude: 0 }));
    const response = await app.inject({ method: "POST", url: "/v1/h3/index", payload: { points, resolution: 9 } });
    expect(response.statusCode).toBe(400);
  });
});
