import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../apps/api/src/app.js";
import { ApiMetrics, metricRoute } from "../apps/api/src/metrics.js";

describe("API metrics registry", () => {
  it("renders low-cardinality counters and cumulative duration buckets", () => {
    const metrics = new ApiMetrics();
    metrics.requestStarted();
    metrics.requestFinished({ method: "post", route: "/v1/h3/index", statusCode: 200 }, 0.02);
    metrics.error("/v1/h3/index", "INVALID_RESOLUTION");
    const output = metrics.render();
    expect(output).toContain('h3_http_requests_total{method="POST",route="/v1/h3/index",status_code="200"} 1');
    expect(output).toContain(
      'h3_http_request_duration_seconds_bucket{method="POST",route="/v1/h3/index",status_code="200",le="0.025"} 1'
    );
    expect(output).toContain('h3_http_errors_total{route="/v1/h3/index",code="INVALID_RESOLUTION"} 1');
    expect(output).toContain("h3_http_inflight_requests 0");
    expect(metricRoute(undefined)).toBe("unmatched");
  });
});

describe("GET /metrics", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it("exports route templates and normalized errors without request or location values", async () => {
    await app.inject({
      method: "POST",
      url: "/v1/h3/index",
      payload: { points: [{ longitude: 139.7671, latitude: 35.6812 }], resolution: 9 }
    });
    await app.inject({ method: "POST", url: "/v1/h3/neighbors", payload: { cell: "sensitive-invalid-cell" } });
    const response = await app.inject({ method: "GET", url: "/metrics" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toContain('route="/v1/h3/index"');
    expect(response.body).toContain('code="INVALID_H3_CELL"');
    expect(response.body).not.toContain("sensitive-invalid-cell");
    expect(response.body).not.toMatch(/req-\d+/);
  });

  it("can be disabled explicitly", async () => {
    const disabled = await buildApp({ metricsEnabled: false });
    try {
      expect((await disabled.inject({ method: "GET", url: "/metrics" })).statusCode).toBe(404);
    } finally {
      await disabled.close();
    }
  });
});
